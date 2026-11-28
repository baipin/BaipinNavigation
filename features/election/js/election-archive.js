import {ELECTION_ARCHIVE} from './election-time.js';
export function archiveResult(snapshot,query){
 const common={event:snapshot.event,archived:true,phase:'ended',provider:snapshot.provider,providerState:'archived',checkedAt:snapshot.archivedAt,resultsPage:snapshot.source,attribution:'TVBS · 開票完成時媒體資料存檔（非中選會最終公告）'};
 if(query.get('council')==='1'){const race=snapshot.council.find(r=>r.cityId===query.get('city')&&r.district===query.get('district'));return race?{...common,race,sourceTime:snapshot.sourceTimes.council}:null;}
 return {...common,races:snapshot.mayor,resultsAvailable:true,ballotAvailable:true,sourceTime:snapshot.sourceTimes.mayor,announcements:[]};
}
let pending;
export async function electionFetch(url,options){
 if(!ELECTION_ARCHIVE)return fetch(url,options);
 pending??=fetch(ELECTION_ARCHIVE.path).then(r=>{if(!r.ok)throw Error('Archive unavailable');return r.json();}).catch(error=>{pending=null;throw error;});
 const snapshot=await pending;if(options?.signal?.aborted)throw new DOMException('Aborted','AbortError');const result=archiveResult(snapshot,new URL(url,location.origin).searchParams);return {ok:!!result,json:async()=>result||{error:'存檔中沒有此選區。'}};
}
