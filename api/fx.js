// ECB daily reference rates: compare the latest available fixing with the previous business day.
export default async function handler(req,res) {
    if(req.method!=='GET') {res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
    try {
        // TWD is outside the ECB reference basket; use the direct daily CNY/TWD quote.
        const twdRequest=(async()=> {
            try {
                const response=await fetch('https://query1.finance.yahoo.com/v8/finance/chart/CNYTWD%3DX?interval=1d&range=1d',{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(6000)});
                if(!response.ok)return null;
                const meta=(await response.json()).chart?.result?.[0]?.meta;
                const price=Number(meta?.regularMarketPrice),close=Number(meta?.previousClose ?? meta?.chartPreviousClose);
                if(!Number.isFinite(price)||price<=0||!Number.isFinite(close)||close<=0)return null;
                return {id:'cny_twd',price,percent:(price-close)/close*100,date:meta.regularMarketTime?new Date(meta.regularMarketTime*1000).toISOString().slice(0,10):'',previousDate:'previous close',source:'Yahoo Finance'};
            } catch {return null;}
        })();
        const read=async date=> {const response=await fetch('https://api.frankfurter.dev/v1/'+date+'?base=HKD&symbols=CNY,JPY,CHF,USD,EUR,GBP,AUD,CAD,SGD,KRW',{signal:AbortSignal.timeout(5000)});if(!response.ok)throw Error('FX unavailable');return response.json();};
        const latest=await read('latest');
        if(!/^\d{4}-\d{2}-\d{2}$/.test(latest.date))throw Error('Invalid rate date');
        const previousDate=new Date(latest.date+'T00:00:00Z');previousDate.setUTCDate(previousDate.getUTCDate()-1);
        const previous=await read(previousDate.toISOString().slice(0,10));
        if(!previous.date || previous.date>=latest.date)throw Error('Invalid comparison date');
        const quotes=[['cny','CNY'],['jpy','JPY'],['chf','CHF'],['usd','USD']].map(([id,currency])=> {
            let price=latest.rates?.[currency],close=previous.rates?.[currency];
            if(!Number.isFinite(price)||price<=0||!Number.isFinite(close)||close<=0)throw Error('Invalid FX rate');
            if(id==='usd'){price=1/price;close=1/close;}
            return {id,price,percent:(price-close)/close*100,date:latest.date,previousDate:previous.date};
        });
        for(const currency of ['USD','CHF','JPY','HKD','EUR','GBP','AUD','CAD','SGD','KRW']) {
            const price=currency==='HKD'?1/latest.rates.CNY:latest.rates?.[currency]/latest.rates.CNY;
            const close=currency==='HKD'?1/previous.rates.CNY:previous.rates?.[currency]/previous.rates.CNY;
            if(!Number.isFinite(price)||price<=0||!Number.isFinite(close)||close<=0)continue;
            quotes.push({id:'cny_'+currency.toLowerCase(),price,percent:(price-close)/close*100,date:latest.date,previousDate:previous.date});
        }
        const twd=await twdRequest;if(twd)quotes.push(twd);
        res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=600');
        return res.status(200).json({source:'Frankfurter / ECB',quotes});
    } catch {return res.status(502).json({error:'FX change temporarily unavailable'});}
}
