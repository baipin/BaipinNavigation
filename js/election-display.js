// Color follows the published party name; unknown affiliations remain neutral.
export function partyColor(party=''){
 const name=String(party).replace(/\s+/g,'');
 if(/國民黨|国民党/.test(name))return '#3478cd';
 if(/民進黨|民进党|民主進步黨|民主进步党/.test(name))return '#25945a';
 if(/民眾黨|民众党/.test(name))return '#219b9c';
 if(/時代力量|时代力量/.test(name))return '#bb921b';
 if(/親民黨|亲民党/.test(name))return '#cf7426';
 if(/台灣基進|台湾基进/.test(name))return '#b24e48';
 if(/新黨|新党/.test(name))return '#a89420';
 return '#80858c';
}
export function electionPage(races,offset,size){
 size=Math.max(1,Math.floor(size)||1);const pages=Math.ceil(races.length/size);
 const page=pages?((Math.floor(offset)||0)%pages+pages)%pages:0;
 return {page,pages,items:races.slice(page*size,(page+1)*size)};
}

export const countyKey=name=>String(name||'').replaceAll('台','臺');
export function rankedCandidates(candidates=[]){return [...candidates].sort((a,b)=>{const av=a.votes,bv=b.votes;return (Number.isFinite(bv)?bv:-1)-(Number.isFinite(av)?av:-1);});}
export function raceOutcome(race){
 const candidates=rankedCandidates(race?.candidates),first=candidates.find(candidate=>candidate.elected===true)||candidates[0],second=candidates.find(candidate=>candidate!==first);
 if(!first||!Number.isFinite(first.votes)||first.votes<=0)return {state:'awaiting',party:'',color:'#80858c'};
 if(!first.elected&&second&&first.votes===second.votes)return {state:'tied',party:'',color:'#80858c'};
 return {state:first.elected===true?'won':'leading',party:first.party||'',name:first.name,votes:first.votes,color:partyColor(first.party)};
}
