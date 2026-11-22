export function cycloneIds(text){
 if(/^\s*NIL\s*;?\s*$/.test(text))return [];
 const matches=[...text.matchAll(/["'](\d{4}),[^"'\r\n]*["']/g)];
 if(!matches.length)throw new Error('Invalid cyclone list');return [...new Set(matches.map(m=>m[1]))].slice(0,8);
}
export default async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
 try{
  const response=await fetch('https://www.hko.gov.hk/wxinfo/currwx/tc_gis_list.js',{signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error('TC');const ids=cycloneIds(await response.text());
  const results=await Promise.allSettled(ids.map(async id=>{const r=await fetch('https://www.hko.gov.hk/wxinfo/currwx/tc_posc_'+id+'.json',{signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('TC');const data=(await r.json()).tc_fixarea_c_htm;if(!data)throw Error('TC');return {id,name:String(data.name_c || ''),time:String(data.datetime || ''),description:String(data.desc || ''),forecast:String(data.fcstpos_htm || ''),image:'https://www.hko.gov.hk/wxinfo/currwx/nwp_'+id+'.png'};}));
  const storms=results.flatMap(r=>r.status==='fulfilled'?[r.value]:[]);if(ids.length && !storms.length)throw Error('TC');res.setHeader('Cache-Control','public, max-age=120, s-maxage=300');return res.status(200).json({storms,partial:storms.length<ids.length,fetchedAt:new Date().toISOString()});
 }catch{return res.status(502).json({error:'Tropical cyclone information unavailable'});}
}
