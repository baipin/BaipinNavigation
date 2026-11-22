(() => {
    const dialog=document.getElementById('data-manage-dialog');
    const tabs=document.getElementById('settings-tabs');
    let current='general';
    const texts={
        sc:{title:'设置',general:'常规',background:'背景',sync:'登录与备份',appearance:'语言与显示',content:'内容配置',engine:'当前搜索引擎',weather:'天气预设地区',rain:'降雨量监测地区',aqhi:'空气质素 AQHI 监测地区',bookmarks:'快捷访问配置',engines:'搜索引擎配置',rss:'RSS 配置',city:'CITY FEED 配置',backgroundTitle:'首页背景',random:'从 Unsplash 获取随机背景',reset:'恢复默认背景',resetAll:'恢复默认设置',undoReset:'撤销上次恢复',backgroundHint:'背景会保存在此设备，开启同步后也可随预设同步。'},
        tc:{title:'設定',general:'一般',background:'背景',sync:'登入與備份',appearance:'語言與顯示',content:'內容設定',engine:'目前搜尋引擎',weather:'天氣預設地區',rain:'降雨量監測地區',aqhi:'空氣質素 AQHI 監測地區',bookmarks:'快速訪問設定',engines:'搜尋引擎設定',rss:'RSS 設定',city:'CITY FEED 設定',backgroundTitle:'首頁背景',random:'從 Unsplash 取得隨機背景',reset:'還原預設背景',resetAll:'還原預設設定',undoReset:'復原上次還原',backgroundHint:'背景會儲存在此裝置，開啟同步後亦可隨預設同步。'}
    };
    function render() {
        const sc=document.documentElement.lang==='zh-CN',labels=texts[sc?'sc':'tc'];
        dialog.querySelectorAll('[data-settings-text]').forEach(element=>{element.textContent=labels[element.dataset.settingsText];});
        document.getElementById('settings-language').textContent=sc?'切换为繁体中文':'切換為簡體中文';
        const dark=document.documentElement.classList.contains('mdui-theme-dark');
        document.getElementById('settings-theme').textContent=sc?(dark?'切换浅色模式':'切换深色模式'):(dark?'切換淺色模式':'切換深色模式');
        document.getElementById('data-manage-btn').setAttribute('aria-label',labels.title);
        document.getElementById('data-manage-btn').setAttribute('title',labels.title);
        document.getElementById('data-manage-close').textContent=sc?'关闭':'關閉';
        tabs.setAttribute('aria-label',sc?'设置分类':'設定分類');
        document.getElementById('settings-rain-region').setAttribute('aria-label',labels.rain);
        document.getElementById('settings-aqhi-region').setAttribute('aria-label',labels.aqhi);
        document.getElementById('settings-current-engine').setAttribute('aria-label',labels.engine);
        document.getElementById('settings-preset-scope-hint').textContent=sc?'导出与同步使用相同的完整预设范围；不包含明文登录凭证或实时数据缓存，默认包含 iCloud／Canvas 日历登录状态的密文（如果有）。':'匯出與同步使用相同的完整預設範圍；不包含明文登入憑證或即時資料快取，啟用日曆帳戶加密同步後會包含對應密文。';
        document.getElementById('settings-calendar-heading').textContent=sc?'日历账号与授权':'日曆帳戶與授權';
        document.querySelector('[data-open-calendar-accounts]').textContent=sc?'日历账号与显示':'日曆帳戶與顯示';
        document.getElementById('settings-calendar').textContent=sc?'日历账号与显示':'日曆帳戶與顯示';
        refreshDistricts();refreshEngines();
    }
    function select(tab) {
        refreshDistricts();refreshEngines();
        current=['general','background','sync'].includes(tab)?tab:'general';
        if(tabs.value!==current)tabs.value=current;
        if(current==='sync') document.dispatchEvent(new Event('navi-settings-sync-open'));
    }
    window.naviOpenSettings=(tab=current)=>{select(tab);dialog.open=true;};
    tabs.addEventListener('change',event=>{if(event.target===tabs)select(tabs.value);});
    document.getElementById('settings-language').onclick=()=>document.getElementById('language-toggle-btn').click();
    document.getElementById('settings-theme').onclick=()=>document.getElementById('theme-btn').click();
    function shortcut(id) {
        let opened=false;
        const open=()=>{if(opened)return;opened=true;clearTimeout(timer);dialog.removeEventListener('closed',open);if(typeof id==='function')id();else document.getElementById(id)?.click();};
        const timer=setTimeout(open,350);
        dialog.addEventListener('closed',open,{once:true});dialog.open=false;
    }
    document.getElementById('settings-reset').onclick=()=>shortcut(()=>{document.getElementById('settings-reset-dialog').open=true;});
    document.getElementById('settings-calendar').onclick=()=>shortcut(()=>window.naviOpenCalendarAccounts?.());
    document.querySelector('[data-open-calendar-accounts]').onclick=()=>shortcut(()=>window.naviOpenCalendarAccounts?.());
    document.getElementById('settings-rss').onclick=()=>shortcut('manage-rss-btn');
    document.getElementById('settings-city-feed').onclick=()=>shortcut('city-feed-stock-settings');
    document.getElementById('settings-bookmarks').onclick=()=>shortcut(()=> {
        const main=document.getElementById('main-container');
        if(!main.classList.contains('edit-active'))document.getElementById('edit-btn').click();
        main.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});
    });
    document.getElementById('settings-engines').onclick=()=>shortcut(()=>showManageEngineDialog());
    function refreshEngines() {
        const select=document.getElementById('settings-current-engine');
        const items=Array.from(document.querySelectorAll('#engine-menu mdui-menu-item')).filter(item=>item.value);
        select.replaceChildren(...items.map(item=> {const option=document.createElement('option');option.value=item.value;option.textContent=item.textContent.trim();return option;}));
        if(typeof curEng!=='undefined')select.value=curEng;
    }
    document.getElementById('settings-current-engine').onchange=event=> {
        window.naviSetSearchEngine?.(event.target.value,false);event.target.focus();
    };
    document.addEventListener('navi-search-engine-change',refreshEngines);
    new MutationObserver(refreshEngines).observe(document.getElementById('engine-menu'),{childList:true,subtree:true});
    function refreshDistricts() {
        let rain=document.querySelector('#home-rainfall .rain-station-select');
        if(!rain && typeof cityAddRainStationPicker==='function') {cityAddRainStationPicker();rain=document.querySelector('#home-rainfall .rain-station-select');}
        for(const [target,source] of [[document.getElementById('settings-rain-region'),rain],[document.getElementById('settings-aqhi-region'),document.getElementById('city-aqhi-station')]]) {
            target.disabled=!source;
            if(source) {target.replaceChildren(...Array.from(source.options,option=>option.cloneNode(true)));target.value=source.value;}
        }
    }
    for(const [id,selector] of [['settings-rain-region','#home-rainfall .rain-station-select'],['settings-aqhi-region','#city-aqhi-station']]) {
        document.getElementById(id).onchange=event=> {
            const source=document.querySelector(selector);
            if(source) {source.value=event.target.value;source.dispatchEvent(new Event('change',{bubbles:true}));}
        };
    }
    for(const id of ['home-rainfall','home-aqhi-panel']) {
        const source=document.getElementById(id);
        if(source) {new MutationObserver(refreshDistricts).observe(source,{childList:true,subtree:true});source.addEventListener('change',refreshDistricts);}
    }
    new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang','class']});
    render();
})();
