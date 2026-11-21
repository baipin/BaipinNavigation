(() => {
    const sc=()=>document.documentElement.lang==='zh-CN';
    const t=(s,c)=>sc()?s:c;
    const dialog=document.createElement('mdui-dialog');
    dialog.id='weather-warning-dialog';dialog.setAttribute('close-on-overlay-click','');
    dialog.innerHTML='<span slot="headline"></span><div class="warning-dialog-content"><h3 data-warning-heading="details"></h3><div data-warning-details role="status" aria-live="polite"></div><h3 data-warning-heading="history"></h3><p data-warning-history-date class="warning-meta"></p><div data-warning-history role="status" aria-live="polite"></div><p class="warning-meta">UTC+8 · <a data-warning-source target="_blank" rel="noopener noreferrer"></a></p></div><mdui-button slot="action" variant="text" data-warning-refresh></mdui-button><mdui-button slot="action" variant="text" data-warning-close></mdui-button>';
    document.body.append(dialog);
    const details=dialog.querySelector('[data-warning-details]'),history=dialog.querySelector('[data-warning-history]'),dateLabel=dialog.querySelector('[data-warning-history-date]');
    let revision=0,selected=null;
    const date=value=>/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)?Date.parse(value.replace(' ','T')+'+08:00'):Date.parse(value);
    const day=timestamp=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).format(timestamp);
    const time=value=>Number.isFinite(date(value))?new Date(date(value)).toLocaleString(sc()?'zh-CN':'zh-HK',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}):t('时间未提供','時間未提供');
    function paragraph(parent,text,className='') {const p=document.createElement('p');p.textContent=text;p.className=className;parent.append(p);return p;}
    function labels() {
        dialog.querySelector('[slot="headline"]').textContent=t('天气警告','天氣警告');
        dialog.querySelector('[data-warning-heading="details"]').textContent=selected?.name || t('警告详情','警告詳情');
        dialog.querySelector('[data-warning-heading="history"]').textContent=t('当日警告记录','當日警告記錄');
        dialog.querySelector('[data-warning-close]').textContent=t('关闭','關閉');
        dialog.querySelector('[data-warning-refresh]').textContent=t('刷新','重新整理');
        const source=dialog.querySelector('[data-warning-source]');source.textContent=t('香港天文台原始记录','香港天文台原始記錄');source.href='https://www.hko.gov.hk/'+(sc()?'sc':'tc')+'/wxinfo/dailywx/wxwarntoday.htm';
    }
    async function load() {
        const current=++revision;labels();details.textContent=history.textContent=t('正在读取…','正在讀取…');dateLabel.textContent='';
        try {
            const response=await fetch('/api/weather-warnings?lang='+(sc()?'sc':'tc'),{cache:'no-store',signal:AbortSignal.timeout(12000)});
            if(!response.ok)throw new Error('unavailable');
            const data=await response.json();if(current!==revision || !dialog.open)return;
            details.replaceChildren();history.replaceChildren();
            if(Array.isArray(data.details)) {
                const matching=data.details.filter(item=>!selected || item.subtype===selected.code || item.code===selected.key || item.code===selected.code);
                if(!matching.length)paragraph(details,t('此警告暂无详情，可能已取消，请查看当日记录。','此警告暫無詳情，可能已取消，請查看當日記錄。'));
                for(const item of matching) {for(const text of item.contents || [])paragraph(details,text);if(item.updateTime)paragraph(details,t('更新：','更新：')+time(item.updateTime),'warning-meta');}
            } else paragraph(details,t('警告详情暂时无法取得，请刷新重试。','警告詳情暫時無法取得，請重新整理。'));
            if(Array.isArray(data.history)) {
                const stamp=data.historyUpdatedAt || '',today=day(Date.now());
                const dataDay=stamp.slice(0,4)+'-'+stamp.slice(4,6)+'-'+stamp.slice(6,8);
                dateLabel.textContent=t('记录更新：','記錄更新：')+dataDay+' '+stamp.slice(8,10)+':'+stamp.slice(10,12);
                if(dataDay!==today)paragraph(history,t('天文台尚未提供今天的记录；以下为最近一份记录。','天文台尚未提供今天的記錄；以下為最近一份記錄。'),'warning-meta');
                const rows=[...data.history].sort((a,b)=>date(b.issueTime)-date(a.issueTime));
                if(!rows.length)paragraph(history,t('当天没有警告记录。','當天沒有警告記錄。'));
                if(rows.length) {
                    const table=document.createElement('table');table.className='warning-history-table';
                    table.setAttribute('aria-label',t('当日警告记录','當日警告記錄'));
                    const head=table.createTHead().insertRow();
                    for(const text of [t('警告信号','警告信號'),t('发出时间','發出時間'),t('取消时间／状态','取消時間／狀態')]) {
                        const th=document.createElement('th');th.scope='col';th.textContent=text;head.append(th);
                    }
                    const body=table.createTBody();
                    const icons={WCOLD:'cold',WHOT:'vhot',WMSGNL:'msn',WFROST:'frost',WFNTSA:'ntfl',WL:'landslip',WTMW:'tsunami-warn',WTM:'tsunami-warn',WFIREY:'firey',WFIRER:'firer',WRAINA:'raina',WRAINR:'rainr',WRAINB:'rainb',WTS:'ts',TC1:'tc1',TC3:'tc3',TC8NE:'tc8ne',TC8NW:'tc8nw',TC8SE:'tc8se',TC8SW:'tc8sw',TC9:'tc9',TC10:'tc10'};
                    const addTime=(cell,value)=> {
                        const stamp=date(value);
                        if(!Number.isFinite(stamp)){cell.textContent=t('时间未提供','時間未提供');return;}
                        const element=document.createElement('time');element.dateTime=new Date(stamp).toISOString();
                        element.textContent=new Date(stamp).toLocaleTimeString(sc()?'zh-CN':'zh-HK',{timeZone:'Asia/Hong_Kong',hour:'2-digit',minute:'2-digit',hour12:false});
                        const day=document.createElement('small');day.textContent=new Date(stamp).toLocaleDateString(sc()?'zh-CN':'zh-HK',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'});
                        element.append(day);cell.append(element);
                    };
                    for(const item of rows) {
                        const row=body.insertRow(),name=[item.type,item.name].filter(Boolean).join(' · ');
                        const label=document.createElement('th');label.scope='row';
                        const icon=icons[item.code] || (item.code.startsWith('WMSGNL')?'msn':null);
                        if(icon){const image=document.createElement('img');image.src='/img/hko-warnings/'+icon+'.gif';image.width=42;image.height=42;image.alt=name;label.append(image);}
                        label.append(document.createTextNode(name));row.append(label);
                        addTime(row.insertCell(),item.issueTime);
                        const state=row.insertCell(),expired=item.action==='CANCEL' || date(item.expireTime)<=Date.now();
                        if(expired)addTime(state,item.expireTime);
                        else {state.textContent=t('现正生效','現正生效');state.className='warning-active';}
                    }
                    history.append(table);
                }
            } else paragraph(history,t('当日记录暂时无法取得，请刷新重试或查看天文台原始记录。','當日記錄暫時無法取得，請重新整理或查看天文台原始記錄。'));
        } catch {if(current===revision){details.textContent=t('警告详情暂时无法取得。','警告詳情暫時無法取得。');history.textContent=t('当日记录暂时无法取得，请刷新重试或查看下方原始记录。','當日記錄暫時無法取得，請重新整理或查看下方原始記錄。');}}
    }
    window.naviOpenWeatherWarning=warning=>{selected=warning;dialog.open=true;load();};
    dialog.querySelector('[data-warning-close]').onclick=()=>{dialog.open=false;};
    dialog.querySelector('[data-warning-refresh]').onclick=load;
    dialog.addEventListener('closed',()=>{revision++;});
    new MutationObserver(()=>{if(dialog.open){selected=null;load();}}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
})();
