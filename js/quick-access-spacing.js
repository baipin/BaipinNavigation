// Apply before first paint; svh stays stable when the mobile keyboard/browser bars move.
(() => {
    const key='navi_quick_access_offset_vh';
    const normalize=value=>value!==null && String(value).trim()!=='' && Number.isFinite(Number(value)) ? Math.max(-8,Math.min(100,Math.round(Number(value)))) : 0;
    function read() {
        try {
            const saved=localStorage.getItem(key);
            if(saved!==null)return normalize(saved);
            // Older presets stored pixels. Convert once when the user next saves the slider.
            return normalize(Number(localStorage.getItem('navi_quick_access_offset'))/Math.max(1,window.innerHeight)*100);
        } catch {return 0;}
    }
    function apply(value) {
        const offset=normalize(value);
        document.documentElement.style.setProperty('--quick-access-offset',offset+'vh');
        if(window.CSS?.supports('height','1svh'))document.documentElement.style.setProperty('--quick-access-offset',offset+'svh');
        return offset;
    }
    window.naviQuickAccessSpacing={key,apply,read};
    apply(read());
    window.addEventListener('storage',event=>{if([key,'navi_quick_access_offset',null].includes(event.key))apply(read());});
})();
