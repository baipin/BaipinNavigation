(() => {
    const sc=()=>document.documentElement.lang==='zh-CN',t=(s,c)=>sc()?s:c;
    const dialog=document.createElement('mdui-dialog');dialog.id='weather-detail-dialog';dialog.setAttribute('close-on-overlay-click','');
    dialog.innerHTML=`<span slot="headline" data-wd="title"></span>
      <mdui-tabs value="forecast" id="weather-detail-tabs" aria-label="天气详情分类">
        <mdui-tab value="forecast" data-wd="forecastTab"></mdui-tab><mdui-tab value="radar" data-wd="radarTab"></mdui-tab><mdui-tab value="satellite" data-wd="satelliteTab"></mdui-tab>
        <mdui-tab-panel slot="panel" value="forecast"><div class="weather-detail-overview"><section data-weather-narrative aria-live="polite"></section><section><h3 data-wd="nineDays"></h3><p data-weather-outlook></p><div class="weather-forecast-grid" data-weather-days></div><div class="weather-day-details" data-weather-day-details aria-live="polite"></div></section></div><p class="weather-detail-meta" data-weather-updated></p></mdui-tab-panel>
        <mdui-tab-panel slot="panel" value="radar"><figure class="weather-imagery" data-imagery="radar"><figcaption data-wd="radarCaption"></figcaption><p role="status"></p><img hidden><a target="_blank" rel="noopener noreferrer" data-weather-original></a></figure></mdui-tab-panel>
        <mdui-tab-panel slot="panel" value="satellite"><figure class="weather-imagery" data-imagery="satellite"><figcaption data-wd="satelliteCaption"></figcaption><p role="status"></p><img hidden><a target="_blank" rel="noopener noreferrer" data-weather-original></a></figure></mdui-tab-panel>
      </mdui-tabs><mdui-button slot="action" variant="text" icon="refresh" data-weather-refresh></mdui-button><mdui-button slot="action" variant="text" data-weather-close></mdui-button>`;
    document.body.append(dialog);
    const button=document.getElementById('weather-detail-btn'),tabs=dialog.querySelector('mdui-tabs');
    let revision=0,controller=null,forecastRows=[],selected=0,imagery={},imageRequests={},refreshTimer=null;
    const labels={title:['香港天气详情','香港天氣詳情'],forecastTab:['天气预报','天氣預報'],radarTab:['雷达图','雷達圖'],satelliteTab:['卫星图','衛星圖'],nineDays:['九天天气预报','九天天氣預報'],radarCaption:['天气雷达 · 256 公里范围 · 3 公里高','天氣雷達 · 256 公里範圍 · 3 公里高'],satelliteCaption:['气象卫星 · 红外云图（Himawari-8/9）','氣象衛星 · 紅外雲圖（Himawari-8/9）']};
    const el=tag=>document.createElement(tag);
    function paragraph(parent,text){const p=el('p');p.textContent=text || '--';parent.append(p);return p;}
    function section(parent,heading,text){const h=el('h3');h.textContent=heading;parent.append(h);paragraph(parent,text);}
    function timestamp(value) {const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleString(sc()?'zh-CN':'zh-HK',{timeZone:'Asia/Hong_Kong',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false})+' UTC+8':'--';}
    function labelsUpdate(){
        for(const [key,pair] of Object.entries(labels))dialog.querySelector('[data-wd="'+key+'"]').textContent=pair[sc()?0:1];
        button.setAttribute('aria-label',t('查看详细天气','查看詳細天氣'));button.title=t('详细天气','詳細天氣');
        tabs.setAttribute('aria-label',t('天气详情分类','天氣詳情分類'));
        dialog.querySelector('[data-weather-close]').textContent=t('关闭','關閉');dialog.querySelector('[data-weather-refresh]').textContent=t('刷新','重新整理');
        for(const type of ['radar','satellite']){const link=dialog.querySelector('[data-imagery="'+type+'"] a');link.textContent=t('香港天文台原始图像','香港天文台原始圖像');link.href='https://www.hko.gov.hk/'+(sc()?'sc':'tc')+'/wxinfo/'+(type==='radar'?'radars/radar.htm':'intersat/satellite/sate.htm');}
    }
    function showDay(){
        const target=dialog.querySelector('[data-weather-day-details]'),row=forecastRows[selected];target.replaceChildren();
        dialog.querySelectorAll('[data-weather-days] button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===selected)));
        if(!row)return;
        section(target,String(row.week || '')+' · '+t('天气预测','天氣預測'),row.forecastWeather);
        paragraph(target,t('风向及风力：','風向及風力：')+row.forecastWind);
    }
    function renderDays(rows){
        forecastRows=rows;selected=Math.min(selected,Math.max(0,rows.length-1));const grid=dialog.querySelector('[data-weather-days]');grid.tabIndex=0;grid.setAttribute('role','region');grid.setAttribute('aria-label',t('九天天气预报，可左右滑动','九天天氣預報，可左右滑動'));grid.replaceChildren();
        for(const [i,row] of rows.entries()){
            const card=el('button');card.type='button';card.className='weather-day-card';card.onclick=()=>{selected=i;showDay();};
            const date=String(row.forecastDate || ''),day=el('strong');day.textContent=date.slice(4,6)+'/'+date.slice(6,8);card.append(day);
            const week=el('span');week.textContent=row.week;card.append(week);
            const icon=Number(row.ForecastIcon);
            if(Number.isInteger(icon)&&icon>=50&&icon<=99){const img=el('img');img.src='https://www.hko.gov.hk/images/HKOWxIconOutline/pic'+icon+'.png';img.width=54;img.height=54;img.alt=row.forecastWeather || t('天气图示','天氣圖示');card.append(img);}
            const temperature=el('strong');temperature.textContent=(row.forecastMintemp?.value ?? '--')+'–'+(row.forecastMaxtemp?.value ?? '--')+'°C';card.append(temperature);
            const humidity=el('span');humidity.textContent=(row.forecastMinrh?.value ?? '--')+'–'+(row.forecastMaxrh?.value ?? '--')+'%';card.append(humidity);
            const rain=el('span');rain.className='weather-rain-chance';rain.textContent=t('显著降雨概率：','顯著降雨概率：')+(row.PSR || '--');card.append(rain);grid.append(card);
        }
        if(!rows.length)paragraph(grid,t('九天天气预报暂时无法取得。','九天天氣預報暫時無法取得。'));
        showDay();
    }
    async function loadForecast(){
        controller?.abort();controller=new AbortController();const signal=controller.signal,current=++revision;
        const narrative=dialog.querySelector('[data-weather-narrative]');narrative.textContent=t('正在读取天气资料…','正在讀取天氣資料…');
        dialog.querySelector('[data-weather-updated]').textContent='';dialog.querySelector('[data-weather-outlook]').textContent='';renderDays([]);dialog.querySelector('[data-weather-days]').textContent=t('正在读取九天天气预报…','正在讀取九天天氣預報…');
        const get=async type=>{const r=await fetch('https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType='+type+'&lang='+(sc()?'sc':'tc'),{cache:'no-store',signal:AbortSignal.any([signal,AbortSignal.timeout(15000)])});if(!r.ok)throw new Error('weather');return r.json();};
        const results=await Promise.allSettled(['flw','fnd','rhrread','swt','warnsum'].map(get));
        if(current!==revision || !dialog.open)return;
        const [flw,fnd,now,special,warnings]=results.map(r=>r.status==='fulfilled'?r.value:null);narrative.replaceChildren();
        if(now){const reading=el('div');reading.className='weather-detail-current';const temp=now.temperature?.data?.find(x=>x.place==='香港天文台') || now.temperature?.data?.[0];const humidity=now.humidity?.data?.[0];paragraph(reading,(temp?.value ?? '--')+'°C');paragraph(reading,t('相对湿度：','相對濕度：')+(humidity?.value ?? '--')+'%');narrative.append(reading);}
        if(flw){section(narrative,t('总体情况','總體情況'),flw.generalSituation);section(narrative,t('本港地区天气预测','本港地區天氣預測'),flw.forecastDesc);section(narrative,t('展望','展望'),flw.outlook);}
        else paragraph(narrative,t('本港天气预测暂时无法取得，请刷新重试。','本港天氣預測暫時無法取得，請重新整理。'));
        const active=Object.entries(warnings || {}).filter(([,x])=>x.actionCode!=='CANCEL' && (!x.expireTime || Date.parse(x.expireTime)>Date.now()));
        if(active.length){
            const heading=el('h3');heading.textContent=t('生效天气警告','生效天氣警告');narrative.prepend(heading);
            const warningList=el('div');warningList.className='weather-detail-warnings';heading.after(warningList);
            const icons={WCOLD:'cold',WHOT:'vhot',WMSGNL:'msn',WFROST:'frost',WFNTSA:'ntfl',WL:'landslip',WTMW:'tsunami-warn',WTM:'tsunami-warn',WFIREY:'firey',WFIRER:'firer',WRAINA:'raina',WRAINR:'rainr',WRAINB:'rainb',WTS:'ts',TC1:'tc1',TC3:'tc3',TC8NE:'tc8ne',TC8NW:'tc8nw',TC8SE:'tc8se',TC8SW:'tc8sw',TC9:'tc9',TC10:'tc10'};
            for(const [key,warning] of active){
                const control=el('button');control.type='button';control.setAttribute('aria-haspopup','dialog');control.title=t('查看警告详情','查看警告詳情');
                const icon=icons[warning.code] || icons[key];
                if(icon){const image=el('img');image.src='/img/hko-warnings/'+icon+'.gif';image.alt='';image.width=42;image.height=42;control.append(image);}
                const label=el('span');label.textContent=warning.name || warning.code || key;control.append(label);
                control.onclick=()=>window.naviOpenWeatherWarning?.({...warning,key});warningList.append(control);
            }
        }
        for(const item of special?.swt || [])section(narrative,t('特别天气提示','特別天氣提示'),item.desc);
        const uv=now?.uvindex?.data?.[0];if(uv)section(narrative,t('紫外线指数','紫外線指數'),uv.value+' · '+uv.desc);
        dialog.querySelector('[data-weather-outlook]').textContent=fnd?.generalSituation || '';renderDays(Array.isArray(fnd?.weatherForecast)?fnd.weatherForecast.slice(0,9):[]);
        dialog.querySelector('[data-weather-updated]').textContent=t('本港预报更新：','本港預報更新：')+timestamp(flw?.updateTime)+' · '+t('九天预报更新：','九天預報更新：')+timestamp(fnd?.updateTime)+' · 香港天文台';
    }
    async function loadImagery(type,force=false){
        if(imagery[type] && !force)return;
        const box=dialog.querySelector('[data-imagery="'+type+'"]'),status=box.querySelector('[role="status"]'),img=box.querySelector('img'),request=(imageRequests[type] || 0)+1;imageRequests[type]=request;
        status.textContent=t('正在载入图像…','正在載入圖像…');
        try {
            const r=await fetch('/api/weather-imagery?type='+type,{signal:AbortSignal.timeout(18000),cache:force?'reload':'default'});if(!r.ok)throw new Error('imagery');const data=await r.json();
            if(imageRequests[type]!==request || !dialog.open)return;
            const frame=data.frames?.at(-1),url=new URL(frame?.url);
            if(url.origin!=='https://www.hko.gov.hk' || !url.pathname.startsWith(type==='radar'?'/wxinfo/radars/rad_256_png/':'/wxinfo/intersat/satellite/image/images/'))throw new Error('image');
            const raw=frame.time,iso=raw.slice(0,4)+'-'+raw.slice(4,6)+'-'+raw.slice(6,8)+'T'+raw.slice(8,10)+':'+raw.slice(10,12)+':00'+(frame.utc?'Z':'+08:00');
            img.onload=()=>{if(imageRequests[type]!==request)return;img.hidden=false;status.textContent=t('图像时间：','圖像時間：')+timestamp(iso);imagery[type]=true;};
            img.onerror=()=>{img.hidden=true;status.textContent=t('图像载入失败，请刷新或查看天文台原始图像。','圖像載入失敗，請重新整理或查看天文台原始圖像。');};
            img.alt=t(type==='radar'?'香港天文台最新天气雷达图':'香港天文台最新红外卫星图',type==='radar'?'香港天文台最新天氣雷達圖':'香港天文台最新紅外衛星圖');img.src=url.href;
        } catch {if(imageRequests[type]===request)status.textContent=t('图像暂时无法取得，请刷新或查看天文台原始图像。','圖像暫時無法取得，請重新整理或查看天文台原始圖像。');}
    }
    const refresh=()=>{if(tabs.value==='forecast')loadForecast();else loadImagery(tabs.value,true);};
    button.onclick=()=>{labelsUpdate();dialog.open=true;loadForecast();if(tabs.value!=='forecast')loadImagery(tabs.value,true);clearInterval(refreshTimer);refreshTimer=setInterval(()=>{if(document.visibilityState==='visible')refresh();},300000);};
    tabs.addEventListener('change',e=>{if(e.target===tabs && tabs.value!=='forecast')loadImagery(tabs.value);});
    dialog.querySelector('[data-weather-close]').onclick=()=>{dialog.open=false;};dialog.querySelector('[data-weather-refresh]').onclick=refresh;
    dialog.addEventListener('closed',()=>{revision++;controller?.abort();clearInterval(refreshTimer);imageRequests.radar=(imageRequests.radar || 0)+1;imageRequests.satellite=(imageRequests.satellite || 0)+1;});
    new MutationObserver(()=>{labelsUpdate();if(dialog.open){imagery={};refresh();}}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});labelsUpdate();
})();
