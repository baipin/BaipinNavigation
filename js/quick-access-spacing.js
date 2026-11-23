// Apply before first paint so saved spacing does not shift the homepage on load.
(() => {
    const key='navi_quick_access_offset';
    const normalize=value=>value!==null && String(value).trim()!=='' && Number.isFinite(Number(value)) ? Math.max(-60,Math.min(4096,Math.round(Number(value)/4)*4)) : 0;
    function apply(value) {
        const offset=normalize(value);
        document.documentElement.style.setProperty('--quick-access-offset',offset+'px');
        return offset;
    }
    window.naviQuickAccessSpacing={key,apply};
    try { apply(localStorage.getItem(key)); } catch { apply(0); }
    window.addEventListener('storage',event=>{if(event.key===key || event.key===null)apply(event.newValue);});
})();
