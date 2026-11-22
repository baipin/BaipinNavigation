(() => {
function waitMinutes(value) {
    const text=String(value ?? '').trim();
    if(!text || /^(?:--|不適用|不适用|N\/?A)$/i.test(text))return null;
    let minutes=0,matched=false;
    for(const match of text.matchAll(/(\d+(?:\.\d+)?)\s*(小時|小时|hours?|hrs?|分鐘|分钟|minutes?|mins?)/gi)) {
        matched=true;minutes+=Number(match[1])*(/小時|小时|hour|hr/i.test(match[2])?60:1);
    }
    return matched?minutes:null;
}
function waitLevel(value) {
    const minutes=waitMinutes(value);
    return minutes===null?'unknown':minutes<=60?'short':minutes<180?'medium':'long';
}

window.naviWaitLevel=waitLevel;
})();
