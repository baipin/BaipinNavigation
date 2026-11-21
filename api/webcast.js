const AREAS=new Set(['HK','KL','TW','TM','BBI']);
const ORIGIN='https://www.hkemobility.gov.hk';
const filename=name=>/^(?:chunklist|media)_[A-Za-z0-9_-]+\.(?:m3u8|ts|m4s|mp4)$/.test(name) && name.length<=128;
const tokenValid=value=>/^[A-Za-z0-9._~=-]{1,512}$/.test(value);

export function rewriteWebcastPlaylist(text,area,base) {
    if(!AREAS.has(area) || !text.startsWith('#EXTM3U'))throw new Error('Invalid playlist');
    const rewrite=value=>{
        const url=new URL(value,base),prefix='/api/cctv/'+area.toLowerCase()+'/';
        const file=url.pathname.slice(prefix.length),token=url.searchParams.get('token');
        if(url.origin!==ORIGIN || !url.pathname.startsWith(prefix) || !filename(file) || (token && !tokenValid(token)))throw new Error('Invalid media URL');
        const params=new URLSearchParams({area,file});if(token)params.set('token',token);
        return '/api/webcast?'+params;
    };
    return text.split(/\r?\n/).map(line=>{
        if(!line.trim())return line;
        if(line.startsWith('#'))return line.replace(/URI="([^"]+)"/g,(_,value)=>'URI="'+rewrite(value)+'"');
        return rewrite(line.trim());
    }).join('\n');
}

export default async function handler(req,res) {
    res.setHeader('Cache-Control','no-store');
    if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
    const area=String(req.query?.area || '').toUpperCase(),file=req.query?.file,token=req.query?.token;
    if(!AREAS.has(area) || (file!==undefined && (typeof file!=='string' || !filename(file))) || (token!==undefined && (typeof token!=='string' || !tokenValid(token))))return res.status(400).json({error:'Invalid webcast request'});
    const url=new URL('/api/cctv/'+area.toLowerCase()+'/'+(file || ''),ORIGIN);
    if(token){url.searchParams.set('deviceid','WEBSITE');url.searchParams.set('token',token);}
    try {
        const upstream=await fetch(url,{headers:{Accept:'*/*',Referer:ORIGIN+'/', 'User-Agent':'Mozilla/5.0'},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
        if(!upstream.ok){await upstream.body?.cancel();throw new Error('unavailable');}
        const bytes=Buffer.from(await upstream.arrayBuffer());
        if(bytes.length>2*1024*1024)throw new Error('oversized');
        if(!file || file.endsWith('.m3u8')) {
            res.setHeader('Content-Type','application/vnd.apple.mpegurl');
            return res.status(200).send(rewriteWebcastPlaylist(bytes.toString('utf8'),area,url));
        }
        res.setHeader('Content-Type',file.endsWith('.ts')?'video/mp2t':'video/mp4');
        return res.status(200).send(bytes);
    } catch {return res.status(502).json({error:'Traffic webcast temporarily unavailable'});}
}
