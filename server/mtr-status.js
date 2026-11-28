import {XMLParser} from 'fast-xml-parser';
const SOURCE='https://www.mtr.com.hk/alert/ryg_line_status.xml';
const STATUS_DETAILS='https://www.mtr.com.hk/alert/ryg_line_status.json';
// Values verified against https://www.mtr.com.hk/alert/legend_remarks_v2.xml.
// Red means disruption, not necessarily a full-line suspension; grey means non-service hours.
export const MTR_STATUSES=['green','yellow','red','grey','pink','typhoon'];
const FULL_ALERTS='https://tnews.mtr.com.hk/alert/alert.json';
const DETAILS='https://www.mtr.com.hk/alert/alert_simpletxt_title_tc.html';
export function parseMtrStatus(xml){
 if(typeof xml!=='string'||xml.length>200000||!xml.includes('<ryg_status>'))throw Error('Invalid MTR feed');
 const feed=new XMLParser({ignoreAttributes:true}).parse(xml).ryg_status;
 const rows=Array.isArray(feed?.line)?feed.line:feed?.line?[feed.line]:[];
 const lines={};
 for(const row of rows){const code=String(row.line_code||'').trim(),status=String(row.status||'').trim().toLowerCase();if(!/^[A-Z]{2,3}$/.test(code))continue;
 let url=DETAILS;try{const candidate=new URL(String(row.url_tc||''));if(candidate.protocol==='https:'&&['www.mtr.com.hk','tnews.mtr.com.hk'].includes(candidate.hostname))url=candidate.href;}catch{}
 lines[code]={status:MTR_STATUSES.includes(status)?status:'unknown',url};}
 if(!Object.keys(lines).length)throw Error('Empty MTR feed');
 return {lines,updatedAt:Number.isFinite(Date.parse(feed.lastBuildDate))?new Date(feed.lastBuildDate).toISOString():null};
}
export function addMtrDetails(result,data){
 const rows=data?.ryg_status?.line;if(!Array.isArray(rows))return result;
 const rawDate=data.ryg_status.lastBuildDate;
 const detailDate=typeof rawDate==='string'?Date.parse(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(rawDate)?rawDate.replace(' ','T')+'Z':rawDate):NaN;
 if(result.updatedAt&&Number.isFinite(detailDate)&&Date.parse(result.updatedAt)!==detailDate)return result;
 for(const row of rows){
  if(!row||typeof row!=='object')continue;const line=result.lines[row.line_code];
  // Never attach details from a different status snapshot, or interpret prose as a status code.
  if(!line||line.status==='unknown'||row.status!==line.status)continue;
  const raw=row.messages?.message,messages=Array.isArray(raw)?raw:raw?[raw]:[];
  line.messages=messages.filter(message=>message&&typeof message==='object').slice(0,5).map(message=>({
   id:/^\d{1,12}$/.test(String(message.id||''))?String(message.id):null,
   title:typeof message.title_tc==='string'?message.title_tc.replace(/<[^>]*>/g,'').trim().slice(0,500):'',
   cause:typeof message.cause_tc==='string'?message.cause_tc.replace(/<[^>]*>/g,'').trim().slice(0,500):''
  })).filter(message=>message.title||message.cause);
 }
 return result;
}
// The official full alert can override generic cause labels in the summary feed.
const plainAlert=value=>String(value||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&ndash;/gi,'–').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
export function addMtrFullAlerts(result,data){
 if(!Array.isArray(data?.data))return result;
 for(const [code,line] of Object.entries(result.lines))for(const message of line.messages||[]){
  const alert=data.data.find(item=>item?.newsType==='Alert'&&String(item.id)===message.id&&Array.isArray(item.lineCodes)&&item.lineCodes.includes(code)&&item.status===line.status&&plainAlert(item.alertTitleTc)===message.title);
  if(!alert||typeof alert.alertContentTc!=='string'||alert.alertContentTc.length>100000)continue;
  const paragraphs=[...alert.alertContentTc.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(match=>plainAlert(match[1])).filter(Boolean);
  if(!paragraphs.length)continue;
  message.description=paragraphs[0].slice(0,600);
  // Full-alert cause may intentionally be empty; never retain a conflicting generic cause.
  message.cause=plainAlert(alert.causeTc).slice(0,500);
  if(/配合.*工程/.test(message.description)&&/提早完結/.test(message.description))message.arrangement='early-closure';
 }
 return result;
}
export default async function mtrStatus(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
 try{
  const options={cache:'no-store',signal:AbortSignal.timeout(10000),redirect:'error'};
  const detailRequest=fetch(STATUS_DETAILS+'?_='+Date.now(),options).then(async response=>{if(!response.ok)return null;const raw=await response.text();return raw.length<=500000?JSON.parse(raw.replace(/^\uFEFF/,'')):null;}).catch(()=>null);
  const fullRequest=fetch(FULL_ALERTS+'?_='+Date.now(),options).then(async response=>{if(!response.ok)return null;const raw=await response.text();return raw.length<=1000000?JSON.parse(raw.replace(/^\uFEFF/,'')):null;}).catch(()=>null);
  const response=await fetch(SOURCE+'?_='+Date.now(),options);if(!response.ok)throw Error('MTR unavailable');
  const result=parseMtrStatus(await response.text());addMtrDetails(result,await detailRequest);addMtrFullAlerts(result,await fullRequest);
  return res.status(200).json({...result,checkedAt:new Date().toISOString()});
 }
 catch{return res.status(502).json({error:'港鐵車務狀態暫時無法確認'});}
}
