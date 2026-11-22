export function chartSeries(payload){
    const result=payload?.chart?.result?.[0],times=result?.timestamp,values=result?.indicators?.quote?.[0]?.close;
    if(!Array.isArray(times)||!Array.isArray(values))throw new Error('No trend');
    const zone=result.meta?.exchangeTimezoneName || 'UTC';
    const day=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'});
    const valid=times.flatMap((time,i)=>Number.isFinite(time)&&typeof values[i]==='number'&&Number.isFinite(values[i])&&values[i]>0?[{time,value:values[i]}]:[]);
    if(!valid.length)throw new Error('No trend');
    const latest=day.format(valid.at(-1).time*1000),points=valid.filter(p=>day.format(p.time*1000)===latest);
    if(points.length<2)throw new Error('Insufficient trend');
    return {points:points.slice(-400),date:latest,zone};
}
export default async function handler(req,res){
    if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
    const symbol=req.query?.symbol;
    if(typeof symbol!=='string'||!/^(?:\^[A-Z0-9]{2,8}|[A-Z]{1,6}|\d{4,5}\.HK|\d{6}\.(?:SS|SZ))$/.test(symbol))return res.status(400).json({error:'Invalid symbol'});
    try{
        const response=await fetch('https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(symbol)+'?interval=5m&range=5d',{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(8000),redirect:'error'});
        if(!response.ok)throw new Error('Unavailable');
        const series=chartSeries(await response.json());res.setHeader('Cache-Control','public, max-age=120, s-maxage=300, stale-while-revalidate=600');return res.status(200).json({symbol,...series});
    }catch{return res.status(502).json({error:'Market trend temporarily unavailable'});}
}
