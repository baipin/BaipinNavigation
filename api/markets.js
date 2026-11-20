// One same-origin request supplies the broadcast strip; no API key is needed.
const instruments = {
    hkHSI:{id:'hsi',symbol:'^HSI',zone:'Asia/Hong_Kong'},
    usIXIC:{id:'nasdaq',symbol:'^IXIC',zone:'America/New_York'},
    usINX:{id:'sp500',symbol:'^GSPC',zone:'America/New_York'},
    ukUKX:{id:'ftse',symbol:'^FTSE',zone:'Europe/London'},
    hk00700:{id:'tencent',symbol:'0700.HK',zone:'Asia/Hong_Kong'},
    hk09988:{id:'alibaba',symbol:'9988.HK',zone:'Asia/Hong_Kong'},
    hk00005:{id:'hsbc',symbol:'0005.HK',zone:'Asia/Hong_Kong'},
    hk00939:{id:'ccb',symbol:'0939.HK',zone:'Asia/Hong_Kong'},
    usAAPL:{id:'apple',symbol:'AAPL',zone:'America/New_York'},
    usMSFT:{id:'microsoft',symbol:'MSFT',zone:'America/New_York'},
    usNVDA:{id:'nvidia',symbol:'NVDA',zone:'America/New_York'},
    usTSLA:{id:'tesla',symbol:'TSLA',zone:'America/New_York'}
};

export default async function handler(req,res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow','GET');
        return res.status(405).json({error:'Method not allowed'});
    }
    try {
        const response = await fetch('https://qt.gtimg.cn/q=' + Object.keys(instruments).join(','), {
            headers:{'User-Agent':'Mozilla/5.0'}, signal:AbortSignal.timeout(8000)
        });
        if (!response.ok) throw new Error('Market source unavailable');
        const raw = new TextDecoder('gb18030').decode(await response.arrayBuffer());
        const quotes = [];
        for (const match of raw.matchAll(/v_([\w]+)="([^"]*)"/g)) {
            const instrument = instruments[match[1]];
            if (!instrument) continue;
            const fields = match[2].split('~');
            const price = Number(fields[3]);
            const percent = Number(fields[32]);
            if (!fields[3] || !fields[32] || !Number.isFinite(price) || price <= 0 || !Number.isFinite(percent)) continue;
            quotes.push({...instrument,price,percent,time:fields[30] || ''});
        }
        if (!quotes.length) throw new Error('No valid market quotes');
        res.setHeader('Cache-Control','public, s-maxage=60, stale-while-revalidate=300');
        return res.status(200).json({source:'Tencent Finance',quotes,fetchedAt:new Date().toISOString()});
    } catch {
        return res.status(502).json({error:'Market quotes temporarily unavailable'});
    }
}
