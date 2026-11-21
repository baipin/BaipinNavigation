// Fixed HKO sources only; no caller-provided upstream URLs.
export default async function handler(req,res) {
    res.setHeader('Cache-Control','no-store');
    if(req.method!=='GET') {res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
    const lang=req.query?.lang==='sc'?'sc':'tc';
    const get=async url=> {
        const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(8000)});
        if(!response.ok)throw new Error('HKO unavailable');
        return response.json();
    };
    const [details,history]=await Promise.allSettled([
        get('https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=warningInfo&lang='+lang),
        get('https://www.hko.gov.hk/'+(lang==='sc'?'dps/sc/':'')+'wxinfo/dailywx/wxwarntoday_uc.json')
    ]);
    const detailsOk=details.status==='fulfilled' && Array.isArray(details.value?.details);
    const historyOk=history.status==='fulfilled' && Array.isArray(history.value?.WARNING_DATABASE) && /^\d{12}$/.test(history.value.UPDATE_TIME);
    if(!detailsOk && !historyOk)return res.status(502).json({error:'HKO warnings unavailable'});
    return res.status(200).json({
        details:detailsOk?details.value.details.map(item=>({code:String(item.warningStatementCode || ''),subtype:String(item.subtype || ''),contents:Array.isArray(item.contents)?item.contents.filter(text=>typeof text==='string'):[],updateTime:String(item.updateTime || '')})):null,
        history:historyOk?history.value.WARNING_DATABASE.map(item=>({code:String(item.WarningCode || ''),name:String(item.WarningName || ''),type:String(item.Type || ''),action:String(item.ActionCode || ''),issueTime:String(item.IssueTime || ''),expireTime:String(item.ExpireTime || '')})):null,
        historyUpdatedAt:historyOk?history.value.UPDATE_TIME:null
    });
}
