// One same-origin request supplies the broadcast strip; no API key is needed.
const instruments = {
    usPDD:{id:'pdd',symbol:'PDD',zone:'America/New_York'},
    usBABA:{id:'babaadr',symbol:'BABA',zone:'America/New_York'},
    usQCOM:{id:'qualcomm',symbol:'QCOM',zone:'America/New_York'},
    usORCL:{id:'oracle',symbol:'ORCL',zone:'America/New_York'},
    usCOST:{id:'costco',symbol:'COST',zone:'America/New_York'},
    usXOM:{id:'exxon',symbol:'XOM',zone:'America/New_York'},
    usGS:{id:'goldman',symbol:'GS',zone:'America/New_York'},
    usSONY:{id:'sony',symbol:'SONY',zone:'America/New_York'},
    hk09961:{id:'trip',symbol:'9961.HK',zone:'Asia/Hong_Kong'},
    hk09999:{id:'netease',symbol:'9999.HK',zone:'Asia/Hong_Kong'},
    hk06618:{id:'jdhealth',symbol:'6618.HK',zone:'Asia/Hong_Kong'},
    sz000333:{id:'midea',symbol:'000333.SZ',zone:'Asia/Shanghai'},

    hkHSI:{id:'hsi',symbol:'^HSI',zone:'Asia/Hong_Kong'},
    usDJI:{id:'dow',symbol:'^DJI',zone:'America/New_York'},
    usIXIC:{id:'nasdaq',symbol:'^IXIC',zone:'America/New_York'},
    usINX:{id:'sp500',symbol:'^GSPC',zone:'America/New_York'},
    ukUKX:{id:'ftse',symbol:'^FTSE',zone:'Europe/London'},
    sh000001:{id:'shanghai',symbol:'000001.SS',zone:'Asia/Shanghai'},
    sz399001:{id:'shenzhen',symbol:'399001.SZ',zone:'Asia/Shanghai'},
    hk01810:{id:'xiaomi',symbol:'1810.HK',zone:'Asia/Hong_Kong'},
    hk03690:{id:'meituan',symbol:'3690.HK',zone:'Asia/Hong_Kong'},
    hk01211:{id:'byd',symbol:'1211.HK',zone:'Asia/Hong_Kong'},
    hk00981:{id:'smic',symbol:'0981.HK',zone:'Asia/Hong_Kong'},
    sh600519:{id:'moutai',symbol:'600519.SS',zone:'Asia/Shanghai'},
    sz300750:{id:'catl',symbol:'300750.SZ',zone:'Asia/Shanghai'},
    usAMZN:{id:'amazon',symbol:'AMZN',zone:'America/New_York'},
    usGOOGL:{id:'alphabet',symbol:'GOOGL',zone:'America/New_York'},
    usMETA:{id:'meta',symbol:'META',zone:'America/New_York'},
    usAMD:{id:'amd',symbol:'AMD',zone:'America/New_York'},
    usTSM:{id:'tsmc',symbol:'TSM',zone:'America/New_York'},
    usJD:{id:'jd',symbol:'JD',zone:'America/New_York'},
    usBIDU:{id:'baidu',symbol:'BIDU',zone:'America/New_York'},
    usNFLX:{id:'netflix',symbol:'NFLX',zone:'America/New_York'},
    usAVGO:{id:'broadcom',symbol:'AVGO',zone:'America/New_York'},
    usINTC:{id:'intel',symbol:'INTC',zone:'America/New_York'},
    usJPM:{id:'jpm',symbol:'JPM',zone:'America/New_York'},
    usV:{id:'visa',symbol:'V',zone:'America/New_York'},
    usWMT:{id:'walmart',symbol:'WMT',zone:'America/New_York'},
    usDIS:{id:'disney',symbol:'DIS',zone:'America/New_York'},
    usKO:{id:'coke',symbol:'KO',zone:'America/New_York'},
    hk00857:{id:'petrochina',symbol:'0857.HK',zone:'Asia/Hong_Kong'},
    hk00883:{id:'cnooc',symbol:'0883.HK',zone:'Asia/Hong_Kong'},
    hk01299:{id:'aia',symbol:'1299.HK',zone:'Asia/Hong_Kong'},
    hk00388:{id:'hkex',symbol:'0388.HK',zone:'Asia/Hong_Kong'},
    hk02318:{id:'pingan',symbol:'2318.HK',zone:'Asia/Hong_Kong'},
    hk01398:{id:'icbc',symbol:'1398.HK',zone:'Asia/Hong_Kong'},
    hk00941:{id:'cm',symbol:'0941.HK',zone:'Asia/Hong_Kong'},
    hk00992:{id:'lenovo',symbol:'0992.HK',zone:'Asia/Hong_Kong'},
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
    const rawSymbols = req.query?.symbols ?? (req.url ? new URL(req.url,'http://localhost').searchParams.get('symbols') : '') ?? '';
    const symbols = typeof rawSymbols === 'string' ? [...new Set(rawSymbols.split(',').filter(Boolean))] : null;
    if (!symbols || symbols.length>20 || symbols.some(symbol=>!/^(?:[A-Z]{1,6}|\d{4,5}\.HK|\d{6}\.(?:SS|SZ))$/.test(symbol))) return res.status(400).json({error:'Invalid stock symbols'});
    const requestedInstruments={...instruments};
    symbols.forEach(symbol=> {
        let code,zone;
        if(symbol.endsWith('.HK')) {code='hk'+symbol.split('.')[0].padStart(5,'0');zone='Asia/Hong_Kong';}
        else if(symbol.endsWith('.SS') || symbol.endsWith('.SZ')) {code=(symbol.endsWith('.SS')?'sh':'sz')+symbol.slice(0,6);zone='Asia/Shanghai';}
        else {code='us'+symbol;zone='America/New_York';}
        if(!requestedInstruments[code]) requestedInstruments[code]={id:'custom:'+symbol,symbol,zone};
    });
    try {
        const referenceRequest = Promise.allSettled([
            (async()=> {
                const response=await fetch('https://hq.sinajs.cn/list=hf_XAU',{headers:{'User-Agent':'Mozilla/5.0','Referer':'https://finance.sina.com.cn/'},signal:AbortSignal.timeout(7000)});
                if(!response.ok) throw Error('Gold unavailable');
                const raw=await response.text(),match=raw.match(/hq_str_hf_XAU="([^"]*)"/),fields=match?.[1].split(',');
                // hf_XAU fields: last, change, bid, ask, high, low, time, previous close ... date.
                const price=Number(fields?.[3]),close=Number(fields?.[7]);
                if(!fields?.[3] || !Number.isFinite(price)||price<=0||!Number.isFinite(close)||close<=0) throw Error('Invalid gold ask');
                return {id:'gold',price,percent:(price-close)/close*100,time:[fields[12],fields[6]].join(' '),zone:'Asia/Shanghai',unit:'USD/troy oz',quoteType:'ask'};
            })()
        ]);
        const internationalRequest = Promise.all([
            {id:'taiwan',symbol:'^TWII',zone:'Asia/Taipei'},
            {id:'nikkei',symbol:'^N225',zone:'Asia/Tokyo'},
            {id:'kospi',symbol:'^KS11',zone:'Asia/Seoul'}
        ].map(async instrument=> {
            try {
                const response=await fetch('https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(instrument.symbol)+'?interval=1d&range=1d',{
                    headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(7000)
                });
                if(!response.ok) return null;
                const payload=await response.json(),meta=payload.chart?.result?.[0]?.meta;
                const price=Number(meta?.regularMarketPrice),close=Number(meta?.previousClose ?? meta?.chartPreviousClose);
                if(!Number.isFinite(price)||price<=0||!Number.isFinite(close)||close<=0) return null;
                return {...instrument,price,percent:Number.isFinite(meta.regularMarketChangePercent)?meta.regularMarketChangePercent:(price-close)/close*100,time:meta.regularMarketTime?new Date(meta.regularMarketTime*1000).toLocaleString('sv-SE',{timeZone:instrument.zone}):''};
            } catch {return null;}
        }));
        const response = await fetch('https://qt.gtimg.cn/q=' + Object.keys(requestedInstruments).join(','), {
            headers:{'User-Agent':'Mozilla/5.0'}, signal:AbortSignal.timeout(8000)
        });
        if (!response.ok) throw new Error('Market source unavailable');
        const raw = new TextDecoder('gb18030').decode(await response.arrayBuffer());
        const quotes = [];
        for (const match of raw.matchAll(/v_([\w]+)="([^"]*)"/g)) {
            const instrument = requestedInstruments[match[1]];
            if (!instrument) continue;
            const fields = match[2].split('~');
            const price = Number(fields[3]);
            const percent = Number(fields[32]);
            if (!fields[3] || !fields[32] || !Number.isFinite(price) || price <= 0 || !Number.isFinite(percent)) continue;
            quotes.push({...instrument,...(instrument.id.startsWith('custom:') ? {name:fields[1]} : {}),price,percent,time:fields[30] || ''});
        }
        const international = (await internationalRequest).filter(Boolean);
        quotes.push(...international);
        quotes.push(...(await referenceRequest).flatMap(result=>result.status==='fulfilled'?[result.value]:[]));
        if (!quotes.length) throw new Error('No valid market quotes');
        res.setHeader('Cache-Control','public, s-maxage=60, stale-while-revalidate=300');
        return res.status(200).json({source:international.length?'Tencent Finance / Yahoo Finance':'Tencent Finance',quotes,fetchedAt:new Date().toISOString()});
    } catch {
        return res.status(502).json({error:'Market quotes temporarily unavailable'});
    }
}
