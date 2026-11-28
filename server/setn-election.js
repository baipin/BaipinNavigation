// Verified on 2026-11-28 against https://elect.setn.com/2026/vote.
// The page's refresh() / getUrl() functions issue these public HTML GET requests.
export const SETN_PAGE='https://elect.setn.com/2026/vote';
export const SETN_FEEDS=[{id:'mayor',url:SETN_PAGE+'/getsixmunicipalitiesmayor'},...['north','central','south','east','offshore'].map(id=>({id,url:SETN_PAGE+'/getcountymayor?reg='+id}))];
const text=value=>String(value||'').replace(/<[^>]*>/g,' ').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,code)=>{const n=code[0].toLowerCase()==='x'?parseInt(code.slice(1),16):Number(code);return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}).replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
function blocks(html,className){
 const found=[];const opening=/<div\b[^>]*>/gi;let match;
 while((match=opening.exec(html))){const classes=match[0].match(/\bclass=["']([^"']*)["']/i)?.[1].split(/\s+/)||[];if(!classes.includes(className))continue;
  let depth=1,end=opening.lastIndex;const tags=/<\/?div\b[^>]*>/gi;tags.lastIndex=end;let tag;
  while(depth&&(tag=tags.exec(html))){depth+=/^<\//.test(tag[0])?-1:1;end=tag.index;}
  if(depth)throw Error('Incomplete SETN fragment');found.push({open:match[0],html:html.slice(opening.lastIndex,end)});opening.lastIndex=tags.lastIndex;
 }return found;
}
export function parseSetnResults(html,{counting=false,preserveZeros=false}={}){
 if(typeof html!=='string'||html.length>1000000)throw Error('Invalid SETN response');
 const races=blocks(html,'candidate-region').map(region=>{
  const id=region.open.match(/data-city=["']([a-z-]+)["']/)?.[1],name=text(blocks(region.html,'region-title')[0]?.html);if(!id||!name)throw Error('Missing SETN region');
  const candidates=blocks(region.html,'candidate').map(candidate=>{
   const name=text(candidate.html.match(/<h3\b[^>]*class=["'][^"']*\bidentity-name\b[^"']*["'][^>]*>([\s\S]*?)<\/h3>/i)?.[1]);
   const raw=text(candidate.html.match(/<span\b[^>]*class=["'][^"']*\bvotes-number\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1]).replace(/[,，]/g,'');
   const party=text(blocks(candidate.html,'identity-party')[0]?.html);const number=text(blocks(candidate.html,'number')[0]?.html);
   if(!name||!/^\d+$/.test(raw)||!Number.isSafeInteger(Number(raw)))throw Error('Unrecognized SETN candidate');
   return {name,party,number,votes:counting?Number(raw):null};
  });if(!candidates.length)throw Error('Empty SETN ballot');
  // Pre-count zero placeholders are not votes. Only a positive count establishes reporting in this race.
  const hasVotes=counting&&candidates.some(candidate=>candidate.votes>0);if(!hasVotes&&!preserveZeros)for(const candidate of candidates)candidate.votes=null;
  if(hasVotes)candidates.sort((a,b)=>b.votes-a.votes);
  return {id,name,candidates,status:hasVotes?(candidates[1]?.votes===candidates[0].votes?'tied':'leading'):'awaiting',counted:null};
 });if(!races.length)throw Error('No SETN results');return races;
}
export async function loadSetnResults({counting=false}={}){
 const batches=await Promise.allSettled(SETN_FEEDS.map(async feed=>{
  const response=await fetch(feed.url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error('SETN source unavailable');
  return parseSetnResults(await response.text(),{counting});
 }));
 const races=batches.filter(batch=>batch.status==='fulfilled').flatMap(batch=>batch.value);if(!races.length)throw Error('SETN unavailable');
 if(new Set(races.map(race=>race.id)).size!==races.length)throw Error('Duplicate SETN district');
 return {races,resultsAvailable:races.some(race=>race.candidates.some(candidate=>candidate.votes!==null)),ballotAvailable:true,resultsSource:SETN_PAGE,resultsPage:SETN_PAGE,provider:'setn',providerState:batches.some(batch=>batch.status==='rejected')?'partial':'connected',attribution:'三立新聞網 · 媒體即時開票（非中選會正式公告）',missingRegions:SETN_FEEDS.filter((_,i)=>batches[i].status==='rejected').map(feed=>feed.id)};
}
