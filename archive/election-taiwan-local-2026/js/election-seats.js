// Only explicit source-confirmed winners count as seats. Never infer seats from rank.
export function confirmedSeats(races=[]){
 const seats=races.flatMap(race=>(race.candidates||[]).filter(c=>c.elected===true).map(c=>({...c,district:race.name})));
 const parties=new Map();for(const c of seats){const party=c.party||'無黨籍';parties.set(party,(parties.get(party)||0)+1);}
 return {seats:seats.sort((a,b)=>(parties.get(b.party)||0)-(parties.get(a.party)||0)||String(a.party).localeCompare(String(b.party))),parties:[...parties].map(([party,count])=>({party,count})).sort((a,b)=>b.count-a.count)};
}
export function seatPositions(total){
 if(!Number.isSafeInteger(total)||total<1||total>2000)return [];
 const rows=Math.min(5,Math.max(1,Math.ceil(Math.sqrt(total)/2))),radii=Array.from({length:rows},(_,i)=>rows===1?110:55+i*80/(rows-1));
 const sum=radii.reduce((a,b)=>a+b,0),counts=radii.map(r=>Math.floor(total*r/sum));let rest=total-counts.reduce((a,b)=>a+b,0);for(let i=rows-1;rest>0;i=(i+rows-1)%rows,rest--)counts[i]++;
 return counts.flatMap((count,row)=>Array.from({length:count},(_,i)=>{const a=count===1?Math.PI/2:Math.PI*(.04+.92*i/(count-1));return {x:160-Math.cos(a)*radii[row],y:150-Math.sin(a)*radii[row]};})).sort((a,b)=>Math.atan2(150-a.y,a.x-160)-Math.atan2(150-b.y,b.x-160));
}
