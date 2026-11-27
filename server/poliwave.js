// Licensed Results API: https://www.poliwave.com/about/api
// Never scrape or replay browser clearance cookies against the protected data host.
export const POLIWAVE_PAGE='https://www.poliwave.com/tw/live/local-2026';
const ENDPOINT='https://www.poliwave.com/api/v1/live/tw/local-2026';
const clean=value=>typeof value==='string'?value.replace(/<[^>]*>/g,'').trim().slice(0,240):'';
const count=value=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?value:null;
export class PoliwaveError extends Error{constructor(code){super(code);this.code=code;}}
export function normalizePoliwave(data){
 if(!data||typeof data!=='object'||typeof data.available!=='boolean'||!Number.isFinite(Date.parse(data.fetchedAt)))throw new PoliwaveError('invalid_response');
 if(data.rehearsal===true)throw new PoliwaveError('rehearsal');
 if(data.page){let page;try{page=new URL(data.page);}catch{throw new PoliwaveError('invalid_response');}if(page.origin!=='https://www.poliwave.com'||page.pathname!=='/tw/live/local-2026')throw new PoliwaveError('wrong_election');}
 const units=Array.isArray(data.units)?data.units:data.units&&typeof data.units==='object'?Object.entries(data.units).map(([code,unit])=>({...unit,code})):[];
 const races=units.slice(0,100).map(unit=>{
  if(!unit||typeof unit!=='object')return null;const name=clean(unit.name),code=clean(unit.code||unit.id||name);if(!name||!Array.isArray(unit.candidates))return null;
  const candidates=unit.candidates.slice(0,30).map(candidate=>{if(!candidate||typeof candidate!=='object')return null;const name=clean(candidate.name);if(!name)return null;return {name,party:clean(candidate.partyLabel||candidate.party),votes:data.available?count(candidate.votes):null};}).filter(Boolean);
  const status=data.available&&['awaiting','tied','leading','won'].includes(unit.status)?unit.status:'awaiting';
  return candidates.length?{id:code,name,candidates,status,counted:data.available&&typeof unit.counted==='number'&&unit.counted>=0&&unit.counted<=100?unit.counted:null}:null;
 }).filter(Boolean);
 // Fail explicitly if live data has an unsupported shape; never turn it into an empty successful count.
 if(data.available&&!races.some(race=>race.candidates.some(candidate=>candidate.votes!==null)))throw new PoliwaveError('unsupported_response');
 return {races,resultsAvailable:data.available,ballotAvailable:races.length>0,resultsSource:POLIWAVE_PAGE,resultsPage:POLIWAVE_PAGE,provider:'poliwave',providerState:'connected',sourceTime:typeof data.sourceTime==='string'&&Number.isFinite(Date.parse(data.sourceTime))?data.sourceTime:null,fetchedAt:data.fetchedAt,attribution:clean(data.attribution)||'Poliwave · 中央選舉委員會'};
}
export async function loadPoliwave(){
 const key=process.env.POLIWAVE_API_KEY?.trim();if(!key)throw new PoliwaveError('not_configured');
 let response;try{response=await fetch(ENDPOINT,{headers:{Authorization:'Bearer '+key,Accept:'application/json'},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});}catch{throw new PoliwaveError('unavailable');}
 if(!response.ok)throw new PoliwaveError(({401:'invalid_key',403:'scope_required',429:'rate_limited'})[response.status]||'unavailable');
 try{const raw=await response.text();if(raw.length>2000000)throw new PoliwaveError('invalid_response');return normalizePoliwave(JSON.parse(raw));}catch(error){if(error instanceof PoliwaveError)throw error;throw new PoliwaveError('invalid_response');}
}
