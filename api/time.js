// Same-origin proxy keeps network clock synchronization independent of browser CORS.
export default async function handler(req,res) {
    res.setHeader('Cache-Control','no-store, max-age=0');
    if (req.method !== 'GET') {
        res.setHeader('Allow','GET');
        return res.status(405).json({error:'Method not allowed'});
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
