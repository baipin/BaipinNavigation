const HKO='https://www.hko.gov.hk';
export function parseRadar(data) {
    const entries=data?.radar?.range0?.image;
    if(!Array.isArray(entries))throw new Error('Radar index unavailable');
    const frames=entries.flatMap(line=>{
        const match=String(line).match(/^picture\[0\]\[\d+\]="(rad_256_png\/2d256nradar_(\d{12})\.jpg)";$/);
        return match?[{url:HKO+'/wxinfo/radars/'+match[1],time:match[2]}]:[];
    }).sort((a,b)=>a.time.localeCompare(b.time));
    if(!frames.length)throw new Error('Radar frames unavailable');
    return frames.slice(-12);
}
export function parseSatellite(text) {
    // Extract filenames only. Never evaluate the upstream JavaScript.
    const frames=[...text.matchAll(/\["(h8_ir_x4M_(\d{14})\.jpg)","[^"\r\n]*",1,new Date\(\d+\)\]/g)].map(m=>({url:HKO+'/wxinfo/intersat/satellite/image/images/'+m[1],time:m[2].slice(0,12),utc:true})).sort((a,b)=>a.time.localeCompare(b.time));
    if(!frames.length)throw new Error('Satellite frames unavailable');
    return frames.slice(-12);
}
export default async function handler(req,res) {
    if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
    const type=req.query?.type;
    if(!['radar','satellite'].includes(type))return res.status(400).json({error:'Invalid imagery type'});
    try {
        const url=type==='radar'?HKO+'/wxinfo/radars/temp_json/nradar_img.json':HKO+'/wxinfo/intersat/satellite/image/data/infrared_h8_img.js';
        const response=await fetch(url,{signal:AbortSignal.timeout(12000),redirect:'error'});
        if(!response.ok)throw new Error('HKO unavailable');
        const frames=type==='radar'?parseRadar(await response.json()):parseSatellite(await response.text());
        res.setHeader('Cache-Control','public, max-age=60, s-maxage=120');
        return res.status(200).json({type,frames});
    }catch{return res.status(502).json({error:'HKO imagery temporarily unavailable'});}
}
