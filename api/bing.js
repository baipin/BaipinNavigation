const ORIGIN='https://www.bing.com';
export function bingImage(data){
    const image=data?.images?.[0];
    if(!image || typeof image.urlbase!=='string' || !/^\/th\?id=OHR\.[A-Za-z0-9_.-]+$/.test(image.urlbase) || !/^\d{8}$/.test(image.startdate))throw new Error('Invalid Bing image');
    const link=new URL(image.copyrightlink || '/',ORIGIN);
    return {url:ORIGIN+image.urlbase+'_1920x1080.jpg',thumbnail:ORIGIN+image.urlbase+'_640x360.jpg',title:String(image.title || ''),copyright:String(image.copyright || ''),date:image.startdate,link:link.origin===ORIGIN?link.href:ORIGIN};
}
export default async function handler(req,res){
    if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
    try{
        const market=req.query?.lang==='tc'?'zh-HK':'zh-CN';
        const response=await fetch(ORIGIN+'/HPImageArchive.aspx?format=js&idx=0&n=1&mkt='+market,{signal:AbortSignal.timeout(10000),redirect:'error'});
        if(!response.ok)throw new Error('Bing unavailable');
        const image=bingImage(await response.json());res.setHeader('Cache-Control','public, max-age=300, s-maxage=900');return res.status(200).json(image);
    }catch{return res.status(502).json({error:'Bing daily image temporarily unavailable'});}
}
