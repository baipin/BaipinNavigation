// Same-origin proxy keeps network clock synchronization independent of browser CORS.
export default async function handler(req,res) {
    res.setHeader('Cache-Control','no-store, max-age=0');
    if (req.method !== 'GET') {
        res.setHeader('Allow','GET');
        return res.status(405).json({error:'Method not allowed'});
    }
    // HTTP Date is independent of the failing public time APIs and has one-second precision.
    for (const provider of [
        {source:'Hong Kong Observatory (HTTPS Date)',url:'https://www.hko.gov.hk/'},
        {source:'Cloudflare (HTTPS Date)',url:'https://www.cloudflare.com/cdn-cgi/trace'}
    ]) {
        try {
            const response=await fetch(provider.url+(provider.url.includes('?')?'&':'?')+'_='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(2500)});
            const date=response.headers.get('date'),age=Number(response.headers.get('age') || 0);
            const timestamp=date ? Date.parse(date)+age*1000 : NaN;
            await response.body?.cancel();
            if(response.ok && Number.isFinite(timestamp) && timestamp>=1577836800000 && timestamp<=4102444800000 && Number.isFinite(age) && age>=0 && age<=60) return res.status(200).json({timestamp,source:provider.source});
        } catch { /* Try another independent HTTPS clock. */ }
    }
    const providers = [
        {source:'TimeAPI.io',url:'https://timeapi.io/api/time/current/zone?timeZone=Asia%2FHong_Kong',parse:data=>data.timeZone === 'Asia/Hong_Kong' && typeof data.dateTime === 'string' ? Date.parse(data.dateTime.replace(/(\.\d{3})\d+/,'$1') + '+08:00') : NaN},
        {source:'WorldTimeAPI',url:'https://worldtimeapi.org/api/timezone/Asia/Hong_Kong',parse:data=>typeof data.utc_datetime === 'string' ? Date.parse(data.utc_datetime) : NaN}
    ];
    for (const provider of providers) {
        try {
            const response = await fetch(provider.url + (provider.url.includes('?')?'&':'?') + '_=' + Date.now(),{cache:'no-store',signal:AbortSignal.timeout(4000)});
            if (!response.ok) continue;
            const timestamp = provider.parse(await response.json());
            if (!Number.isFinite(timestamp) || timestamp < 1577836800000 || timestamp > 4102444800000) continue;
            return res.status(200).json({timestamp,source:provider.source});
        } catch { /* Try the next independent network clock. */ }
    }
    return res.status(502).json({error:'Network time unavailable'});
}
