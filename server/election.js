// Election-day board. Source discovery follows links actually published by the CEC.
// No assumed election-results endpoint, party totals or winner declarations.
const HOME='https://www.cec.gov.tw/';
const INFO='https://info.cec.gov.tw/vote2026/';
const MENU=INFO+'static/contentJson/menu.json';
const NEWS=INFO+'static/contentJson/article/tag/1.json';
export const EVENT={id:'tw-local-2026',date:'2026-11-28',opens:'2026-11-28T08:00:00+08:00',closes:'2026-11-28T16:00:00+08:00',ends:'2026-11-29T00:00:00+08:00',source:INFO};
const decode=value=>String(value||'').replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g,x=>({'&nbsp;':' ','&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"})[x]);
const plain=value=>decode(String(value||'').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
export function officialLink(value,base=HOME){if(!value)return null;try{const u=new URL(decode(value),base);return u.protocol==='https:'&&(u.hostname==='cec.gov.tw'||u.hostname.endsWith('.cec.gov.tw'))&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function discoverResults(menu,html){
 const isResults=value=>/即時開票|開票結果|開票系統|開票資訊|開票統計|選舉結果|開票專區|開票網站|開票查詢/.test(value)&&!/投開票所|工作人員|訓練|歷屆|歷史/.test(value);
 const links=[];function walk(rows){if(!Array.isArray(rows))return;for(const row of rows){if(isResults(row.name||'')){const url=officialLink(row.target,INFO);if(url&&row.mode==='LNK')links.push(url);}walk(row.subList);}}walk(menu);
 for(const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){if(isResults(plain(match[2]))&&/2026|115年/.test(plain(match[2])+match[1])){const url=officialLink(match[1]);if(url)links.push(url);}}
 return [...new Set(links)].slice(0,2);
}
// Semantic HTML table reader, used only if a published official result page exposes real table rows.
// If a source uses an unsupported JS/API format, report unavailable instead of guessing its schema.
export function readResultTables(html){
 const races=[];const heading=plain((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'');
 if(!/(?:2026|115年)/.test(heading)||!/選舉|開票/.test(heading))return races;
 for(const table of html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)){
  const rows=[...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(row=>[...row[1].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map(cell=>plain(cell[1])));
  const at=rows.findIndex(row=>row.some(x=>/候選人/.test(x))&&row.some(x=>/得票數/.test(x)));if(at<0)continue;
  const header=rows[at],candidate=header.findIndex(x=>/候選人/.test(x)),votes=header.findIndex(x=>/得票數/.test(x)),region=header.findIndex(x=>/縣市|縣\(市\)|選舉區/.test(x)),party=header.findIndex(x=>/政黨|推薦/.test(x));
  const caption=plain(table[1].match(/<caption[^>]*>([\s\S]*?)<\/caption>/i)?.[1]);
  for(const row of rows.slice(at+1)){
   const name=row[candidate],raw=row[votes]?.replace(/[,，\s]/g,'');if(!name||!/^\d+$/.test(raw)||/合計|總計/.test(name))continue;
   const count=Number(raw);if(!Number.isSafeInteger(count)||count<0)continue;
   const area=row[region]||caption;if(!area)continue;
   let race=races.find(x=>x.name===area);if(!race){race={name:area,candidates:[]};races.push(race);}if(race.candidates.some(x=>x.name===name))continue;
   race.candidates.push({name:name.slice(0,80),party:(row[party]||'').slice(0,80),votes:count});
  }
 }
 return races.filter(race=>race.candidates.length).map(race=>({...race,candidates:race.candidates.sort((a,b)=>b.votes-a.votes)}));
}
export function electionPhase(now=Date.now()){return now<Date.parse(EVENT.opens)?'upcoming':now<Date.parse(EVENT.closes)?'voting':now<Date.parse(EVENT.ends)?'awaiting':'ended';}
async function get(url,json=false){const response=await fetch(url,{signal:AbortSignal.timeout(8000),cache:'no-store',redirect:'error'});if(!response.ok)throw Error('source unavailable');const body=await response.text();if(body.length>2500000)throw Error('source too large');return json?JSON.parse(body):body;}
let cached=null,pending=null;
async function snapshot(){
 const [home,menu,news]=await Promise.allSettled([get(HOME),get(MENU,true),get(NEWS,true)]);
 if(home.status==='rejected'&&menu.status==='rejected')throw Error('CEC unavailable');
 const links=discoverResults(menu.status==='fulfilled'?menu.value:[],home.status==='fulfilled'?home.value:'');
 let races=[],resultsSource=null;
 for(const url of electionPhase()==='awaiting'?links:[]){try{const parsed=readResultTables(await get(url));if(parsed.length){races=parsed;resultsSource=url;break;}}catch{}}
 const announcements=(news.status==='fulfilled'&&Array.isArray(news.value)?news.value:[]).slice(0,4).map(row=>({title:plain(row.title).slice(0,220),date:String(row.updTime||row.begTime||'').slice(0,8),url:officialLink(row.link)||INFO}));
 return {event:EVENT,phase:electionPhase(),resultsAvailable:races.length>0,races,resultsSource,resultsPage:links[0]||null,announcements,checkedAt:new Date().toISOString()};
}
export default async function election(req,res){
 res.setHeader('Cache-Control','no-store');if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
 if(electionPhase()==='ended')return res.status(200).json({event:EVENT,phase:'ended',resultsAvailable:false,races:[]});
 try{if(!cached||Date.now()-cached.at>60000){pending??=snapshot().then(data=>{cached={at:Date.now(),data};return data;}).finally(()=>pending=null);await pending;}return res.status(200).json({...cached.data,phase:electionPhase()});}
 catch{return res.status(502).json({event:EVENT,error:'選舉資料暫時無法讀取；請查看中選會官方資訊。'});}
}
