/* Official HKO warning artwork and district-aware EPD AQHI. */
(() => {
    const sc = () => localStorage.getItem('navi_language') === 'sc';
    const t = (simple,traditional) => sc() ? simple : traditional;
    const stations = {
        'Central/Western':['中西区','中西區'],Southern:['南区','南區'],Eastern:['东区','東區'],
        'Kwun Tong':['观塘','觀塘'],'Sham Shui Po':['深水埗','深水埗'],'Kwai Chung':['葵涌','葵涌'],
        'Tsuen Wan':['荃湾','荃灣'],'Tseung Kwan O':['将军澳','將軍澳'],'Yuen Long':['元朗','元朗'],
        'Tuen Mun':['屯门','屯門'],'Tung Chung':['东涌','東涌'],'Tai Po':['大埔','大埔'],
        'Sha Tin':['沙田','沙田'],North:['北区','北區'],'Tap Mun':['塔门','塔門'],
        'Causeway Bay':['铜锣湾（路边）','銅鑼灣（路邊）'],Central:['中环（路边）','中環（路邊）'],
        'Mong Kok':['旺角（路边）','旺角（路邊）']
    };
    let rows = [], selected = localStorage.getItem('navi_aqhi_station') || 'Central/Western';
    const select = document.createElement('select');
    select.id = 'city-aqhi-station'; select.className = 'rain-station-select city-aqhi-select'; select.hidden = true;
    const panel = document.getElementById('home-aqhi-panel');
    const button = document.createElement('mdui-button-icon');
    button.id = 'city-aqhi-picker'; button.className = 'rain-station-picker'; button.setAttribute('icon','edit_location');
    button.setAttribute('aria-controls',select.id); button.setAttribute('aria-expanded','false');
    const place = document.getElementById('city-aqhi-place'); place?.after(button,select);
    button.addEventListener('click',()=> {select.hidden = !select.hidden; button.setAttribute('aria-expanded',String(!select.hidden)); if (!select.hidden) select.focus();});
    select.addEventListener('keydown',event=> {if(event.key === 'Escape') {select.hidden=true;button.setAttribute('aria-expanded','false');button.focus();}});
    function fillOptions() {
        const available = rows.length ? rows.map(row=>row.station) : Object.keys(stations);
        select.replaceChildren(...available.map(station=> {
            const option = document.createElement('option'); option.value = station;
            option.textContent = stations[station]?.[sc()?0:1] || station; return option;
        }));
        if (!available.includes(selected)) selected = available[0];
        select.value = selected;
        select.setAttribute('aria-label',t('空气质素监测地区','空氣質素監測地區'));
        button.title = t('选择空气质素监测地区','選擇空氣質素監測地區'); button.setAttribute('aria-label',button.title);
    }
    function render() {
        const row = rows.find(item=>item.station === selected);
        const value = String(row?.aqhi ?? '--');
        const number = Number.parseInt(value,10);
        const risk = String(row?.health_risk || '').toLowerCase();
        const level = /serious/.test(risk) || value.includes('+') ? 4 : /very high/.test(risk) ? 3 : /high/.test(risk) ? 2 : /moderate/.test(risk) ? 1 : /low/.test(risk) ? 0 : Number.isFinite(number) ? (number>10?4:number>=8?3:number>=7?2:number>=4?1:0) : -1;
        const valueElement = document.getElementById('city-aqhi');
        valueElement.textContent = value;
        valueElement.className = level < 0 ? '' : ['city-aqhi-low','city-aqhi-moderate','city-aqhi-high','city-aqhi-very-high','city-aqhi-serious'][level];
        document.getElementById('city-aqhi-place').textContent = stations[selected]?.[sc()?0:1] || selected;
        document.getElementById('city-aqhi-risk').textContent = level < 0 ? t('空气质素健康风险资料暂不可用','空氣質素健康風險資料暫不可用') : t('空气质素健康风险','空氣質素健康風險') + [t('低','低'),t('中等','中等'),t('高','高'),t('甚高','甚高'),t('严重','嚴重')][level];
        document.getElementById('city-aqhi-risk').title = row?.publish_date ? t('资料时间：','資料時間：') + row.publish_date.replace('T',' ') : '';
    }
    window.cityRenderAqhi = (data) => { rows = Array.isArray(data) ? data : []; fillOptions(); render(); };
    select.addEventListener('change',()=> { selected = select.value; localStorage.setItem('navi_aqhi_station',selected); select.hidden=true;button.setAttribute('aria-expanded','false');render(); });
    fillOptions(); render();

    const icons = {WCOLD:'cold',WHOT:'vhot',WMSGNL:'msn',WFROST:'frost',WFNTSA:'ntfl',WL:'landslip',WTMW:'tsunami-warn',WTM:'tsunami-warn',WFIREY:'firey',WFIRER:'firer',WRAINA:'raina',WRAINR:'rainr',WRAINB:'rainb',WTS:'ts',TC1:'tc1',TC3:'tc3',TC8NE:'tc8ne',TC8NW:'tc8nw',TC8SE:'tc8se',TC8SW:'tc8sw',TC9:'tc9',TC10:'tc10'};
    const warnings = document.createElement('span'); warnings.id = 'city-weather-warnings'; warnings.className = 'city-weather-warnings';
    const temperature = document.querySelector('.temp-display');
    const tempRow = document.createElement('div'); tempRow.className = 'city-temperature-row';
    temperature?.before(tempRow); if (temperature) tempRow.append(temperature,warnings);
    let summary = {};
    function renderWarnings() {
        warnings.replaceChildren();
        Object.entries(summary).forEach(([key,warning])=> {
            if (warning.actionCode === 'CANCEL' || (warning.expireTime && Date.parse(warning.expireTime) < Date.now())) return;
            const prefix = icons[warning.code] || icons[key];
            const link = document.createElement('a');
            link.href = 'https://www.hko.gov.hk/' + (sc()?'sc':'tc') + '/wxinfo/dailywx/wxwarntoday.htm';
            link.target = '_blank'; link.rel = 'noopener noreferrer'; link.title = warning.name || warning.code || key;
            if (prefix) {
                const image = document.createElement('img');
                image.src = 'img/hko-warnings/' + prefix + '.gif';
                image.alt = link.title; image.width = 42; image.height = 42;
                image.addEventListener('error',()=>link.replaceChildren(document.createTextNode(link.title)),{once:true});
                link.append(image);
            } else link.textContent = link.title;
            warnings.append(link);
        });
    }
    let request = 0;
    async function refreshWarnings() {
        const current = ++request;
        try {
            const response = await fetch('https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=warnsum&lang=' + (sc()?'sc':'tc'),{cache:'no-store',signal:AbortSignal.timeout(12000)});
            if (!response.ok) throw new Error('HKO warning unavailable');
            const data = await response.json(); if (current !== request) return;
            summary = data; renderWarnings(); warnings.removeAttribute('data-stale');
        } catch { if(current === request) {warnings.dataset.stale = 'true';warnings.title = t('天气警告更新失败','天氣警告更新失敗');} }
    }
    new MutationObserver(()=> { fillOptions(); render(); refreshWarnings(); }).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    refreshWarnings(); setInterval(refreshWarnings,60000);
})();
