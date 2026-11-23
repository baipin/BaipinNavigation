/* Keep quote nodes independent of photo credit and the existing finance cards. */
(() => {
    const section = document.getElementById('city-ticker');
    if (!section) return;
    const card = section.querySelector('.city-ticker-card');
    const track = document.getElementById('city-ticker-track');
    const windowElement = track.parentElement;
    const label = card.querySelector('.city-ticker-label');
    const top = document.createElement('div');
    top.className = 'city-feed-top';
    top.innerHTML = '<div class="city-feed-clock"><time id="city-feed-time" aria-label="香港时间"></time><small>UTC+8</small><small class="city-feed-time-source" aria-live="polite"></small></div><a class="city-feed-featured" target="_blank" rel="noopener noreferrer" aria-label="全球指数与汇率"></a><div class="city-feed-markets" aria-label="个股行情"></div>';
    const bottom = document.createElement('div');
    bottom.className = 'city-feed-bottom';
    bottom.append(label, windowElement);
    const controls = document.createElement('div'); controls.className = 'city-feed-controls';
    const fullscreenButton = document.createElement('button');
    fullscreenButton.type = 'button'; fullscreenButton.id = 'city-feed-fullscreen'; fullscreenButton.className = 'city-feed-fullscreen-button';
    fullscreenButton.innerHTML = '<span class="material-icons" aria-hidden="true">fullscreen</span>';
    fullscreenButton.setAttribute('aria-pressed','false');
    const updates = document.createElement('div'); updates.className = 'city-feed-updates';
    const information = document.createElement('div'); information.className = 'city-feed-information'; information.append(updates);
    const stockButton = document.createElement('button'); stockButton.type = 'button'; stockButton.id = 'city-feed-stock-settings'; stockButton.className = 'city-feed-fullscreen-button';
    stockButton.innerHTML = '<span class="material-icons" aria-hidden="true">tune</span>';
    controls.append(information,stockButton,fullscreenButton);
    const board = document.createElement('div'); board.className = 'city-feed-board'; board.hidden = true;
    const heading = document.createElement('div'); heading.className = 'city-feed-board-title'; const logo = document.createElement('img'); logo.src='img/logo.png'; logo.alt=''; logo.className='city-feed-logo'; heading.append(logo,document.createTextNode('CITY FEED')); top.append(heading);
    const weather = document.createElement('div'); weather.className = 'city-feed-weather';
    const weatherLabel = document.createElement('span'); weatherLabel.className = 'city-feed-weather-label';
    const weatherWindow = document.createElement('div'); weatherWindow.className = 'city-feed-weather-window';
    const weatherTrack = document.createElement('div'); weatherTrack.className = 'city-feed-weather-track';
    const weatherFlip = document.createElement('div'); weatherFlip.className = 'city-feed-weather-flip';
    const weatherFull = document.createElement('div'); weatherFull.className = 'city-feed-weather-full';
    const weatherFullSlots = Array.from({length:2},()=> {const slot=document.createElement('div');slot.className='city-feed-info-flip';weatherFull.append(slot);return slot;});
    const trafficFlip = document.createElement('div'); trafficFlip.className = 'city-feed-info-flip city-feed-traffic-flip';
    weatherWindow.append(weatherFlip,weatherTrack,weatherFull); weather.append(weatherLabel,weatherWindow,trafficFlip);
    top.append(weather);
    card.replaceChildren(top, board, bottom, controls);

    const isSC = () => localStorage.getItem('navi_language') === 'sc';
    const text = (sc, tc) => isSC() ? sc : tc;
    const displayDefaults = {clock:true,indices:true,fx:true,stocks:true,weather:true,traffic:true,ticker:true,rss:true,trafficNews:true,rateTicker:true,weatherTicker:true,rssSources:null,compactSpeed:72,fullscreenSpeed:72};
    const validMarqueeSpeed = value=>Number.isFinite(value) && value>=24 && value<=160 && value%4===0;
    let displaySettings = {...displayDefaults};
    try {
        const saved=JSON.parse(localStorage.getItem('navi_city_feed'));
        for (const key of Object.keys(displayDefaults)) {
            if (typeof displayDefaults[key]==='boolean' && typeof saved?.[key]==='boolean') displaySettings[key]=saved[key];
        }
        ['compactSpeed','fullscreenSpeed'].forEach(key=>{if(validMarqueeSpeed(saved?.[key]))displaySettings[key]=saved[key];});
        if (Array.isArray(saved?.rssSources)) displaySettings.rssSources=saved.rssSources.filter(url=>typeof url==='string');
    } catch {}
    const shownFeatured = ()=>featuredMarkets.filter(market=>(market.dom || market.fx) ? displaySettings.fx : displaySettings.indices);
    function applyDisplay() {
        const featuredVisible=shownFeatured().length>0, mobile=matchMedia('(max-width:600px)').matches;
        const clockElement=top.querySelector('.city-feed-clock'), stockElement=top.querySelector('.city-feed-markets');
        clockElement.hidden=!displaySettings.clock;
        featured.hidden=expanded || !featuredVisible; stockElement.hidden=expanded || !displaySettings.stocks;
        weather.hidden=!displaySettings.weather && !(expanded && displaySettings.traffic);
        weatherLabel.hidden=weatherWindow.hidden=!displaySettings.weather;
        trafficFlip.hidden=!displaySettings.traffic;
        bottom.hidden=!displaySettings.ticker;
        board.children[0].hidden=!featuredVisible; board.children[1].hidden=!displaySettings.stocks;
        board.hidden=!expanded || (!featuredVisible && !displaySettings.stocks);
        board.style.gridTemplateColumns=expanded && (!featuredVisible || !displaySettings.stocks) ? 'minmax(0,1fr)' : '';
        board.style.gridTemplateRows=expanded && mobile && (!featuredVisible || !displaySettings.stocks) ? 'minmax(0,1fr)' : '';
        section.classList.toggle('city-feed-no-markets',!featuredVisible && !displaySettings.stocks);
        top.hidden=!expanded && !displaySettings.clock && !featuredVisible && !displaySettings.weather && !displaySettings.stocks;
        if (expanded) {
            top.style.gridTemplateColumns=displaySettings.clock ? (mobile?'100px 1fr':'150px 1fr') : '1fr';
            top.style.gridTemplateRows='auto';
            clockElement.style.gridColumn='1';clockElement.style.gridRow='1';
            heading.style.gridColumn=displaySettings.clock?'2':'1';
            return;
        }
        const broadcast=featuredVisible || displaySettings.weather;
        const columns=[displaySettings.clock ? (mobile?'72px':'96px') : '',broadcast?'minmax(0,1fr)':'',!mobile && displaySettings.stocks?'minmax(0,2fr)':''].filter(Boolean);
        top.style.gridTemplateColumns=columns.join(' ') || '1fr';
        const rowCount=Math.max(1,Number(featuredVisible)+Number(displaySettings.weather));
        top.style.gridTemplateRows=(broadcast && rowCount===2 ? '40px 32px' : displaySettings.clock || broadcast ? '72px' : '')+(mobile && displaySettings.stocks?' auto':'');
        weatherFlip.style.height=displaySettings.weather && !featuredVisible?'72px':'';
        clockElement.style.gridColumn='1';clockElement.style.gridRow='1 / '+(rowCount+1);
        featured.style.gridColumn=weather.style.gridColumn=displaySettings.clock?'2':'1';
        featured.style.gridRow='1'; weather.style.gridRow=featuredVisible?'2':'1';
        stockElement.style.gridColumn=mobile?'1 / -1':String(columns.length);
        stockElement.style.gridRow=mobile?String(!broadcast && !displaySettings.clock ? 1 : rowCount+1):'1 / '+(rowCount+1);
    }
    const state = new Map();
    let marketSource = 'Tencent Finance / Yahoo Finance';
    const markets = [
        { id:'gold', index:true, external:true, url:'https://finance.sina.com.cn/futures/quotes/XAU.shtml', names:['伦敦金卖出/盎司','倫敦金賣出/盎司'] },
        { id:'hsi', symbol:'^HSI', names:['恒生指数','恒生指數'] },
        { id:'dow', symbol:'^DJI', index:true, names:['道琼斯工业','道瓊斯工業'] },
        { id:'nikkei', symbol:'^N225', index:true, names:['日经225','日經225'] },
        { id:'kospi', symbol:'^KS11', index:true, names:['韩国KOSPI','韓國KOSPI'] },
        { id:'nasdaq', symbol:'^IXIC', names:['纳斯达克','納斯達克'] },
        { id:'sp500', symbol:'^GSPC', names:['标普500','標普500'] },
        { id:'ftse', symbol:'^FTSE', names:['富时100','富時100'] },
        { id:'shanghai', symbol:'000001.SS', index:true, names:['上证综指','上證綜指'] },
        { id:'shenzhen', symbol:'399001.SZ', index:true, names:['深证成指','深證成指'] },
        { id:'taiwan', symbol:'^TWII', index:true, names:['台湾加权','臺灣加權'] },
        { id:'xiaomi', symbol:'1810.HK', names:['小米集团','小米集團'] },
        { id:'meituan', symbol:'3690.HK', names:['美团','美團'] },
        { id:'byd', symbol:'1211.HK', names:['比亚迪','比亞迪'] },
        { id:'smic', symbol:'0981.HK', names:['中芯国际','中芯國際'] },
        { id:'moutai', symbol:'600519.SS', names:['贵州茅台','貴州茅台'] },
        { id:'catl', symbol:'300750.SZ', names:['宁德时代','寧德時代'] },
        { id:'amazon', symbol:'AMZN', names:['亚马逊','亞馬遜'] },
        { id:'alphabet', symbol:'GOOGL', names:['谷歌','Google'] },
        { id:'meta', symbol:'META', names:['Meta','Meta'] },
        { id:'amd', symbol:'AMD', names:['AMD','AMD'] },
        { id:'tsmc', symbol:'TSM', names:['台积电 ADR','台積電 ADR'] },
        { id:'jd', symbol:'JD', names:['京东','京東'] },
        { id:'baidu', symbol:'BIDU', names:['百度','百度'] },
        { id:'netflix', symbol:'NFLX', names:['奈飞','Netflix'] },
        { id:'broadcom', symbol:'AVGO', names:['博通','博通'] },
        { id:'intel', symbol:'INTC', names:['英特尔','Intel'] },
        { id:'jpm', symbol:'JPM', names:['摩根大通','摩根大通'] },
        { id:'visa', symbol:'V', names:['Visa','Visa'] },
        { id:'walmart', symbol:'WMT', names:['沃尔玛','沃爾瑪'] },
        { id:'disney', symbol:'DIS', names:['迪士尼','迪士尼'] },
        { id:'coke', symbol:'KO', names:['可口可乐','可口可樂'] },
        { id:'petrochina', symbol:'0857.HK', names:['中国石油','中國石油'] },
        { id:'cnooc', symbol:'0883.HK', names:['中国海洋石油','中國海洋石油'] },
        { id:'aia', symbol:'1299.HK', names:['友邦保险','友邦保險'] },
        { id:'hkex', symbol:'0388.HK', names:['香港交易所','香港交易所'] },
        { id:'pingan', symbol:'2318.HK', names:['中国平安','中國平安'] },
        { id:'icbc', symbol:'1398.HK', names:['工商银行','工商銀行'] },
        { id:'cm', symbol:'0941.HK', names:['中国移动','中國移動'] },
        { id:'lenovo', symbol:'0992.HK', names:['联想集团','聯想集團'] },
        { id:'tencent', symbol:'0700.HK', names:['腾讯控股','騰訊控股'] },
        { id:'alibaba', symbol:'9988.HK', names:['阿里巴巴','阿里巴巴'] },
        { id:'hsbc', symbol:'0005.HK', names:['汇丰控股','滙豐控股'] },
        { id:'ccb', symbol:'0939.HK', names:['建设银行','建設銀行'] },
        { id:'apple', symbol:'AAPL', names:['苹果','蘋果'] },
        { id:'microsoft', symbol:'MSFT', names:['微软','微軟'] },
        { id:'nvidia', symbol:'NVDA', names:['英伟达','輝達'] },
        { id:'tesla', symbol:'TSLA', names:['特斯拉','特斯拉'] },
        { id:'pdd', symbol:'PDD', names:['拼多多','拼多多'] },
        { id:'babaadr', symbol:'BABA', names:['阿里巴巴 ADR','阿里巴巴 ADR'] },
        { id:'qualcomm', symbol:'QCOM', names:['高通','高通'] },
        { id:'oracle', symbol:'ORCL', names:['甲骨文','甲骨文'] },
        { id:'costco', symbol:'COST', names:['好市多','好市多'] },
        { id:'exxon', symbol:'XOM', names:['埃克森美孚','埃克森美孚'] },
        { id:'goldman', symbol:'GS', names:['高盛','高盛'] },
        { id:'sony', symbol:'SONY', names:['索尼 ADR','索尼 ADR'] },
        { id:'trip', symbol:'9961.HK', names:['携程集团','攜程集團'] },
        { id:'netease', symbol:'9999.HK', names:['网易','網易'] },
        { id:'jdhealth', symbol:'6618.HK', names:['京东健康','京東健康'] },
        { id:'midea', symbol:'000333.SZ', names:['美的集团','美的集團'] },
        { id:'cny', dom:'city-fx', names:['港币 / 人民币','港幣 / 人民幣'] },
        { id:'jpy', dom:'city-jpy', names:['港币 / 日圆','港幣 / 日圓'] },
        { id:'chf', dom:'city-chf', names:['港币 / 瑞郎','港幣 / 瑞郎'] },
        { id:'usd', dom:'city-usd', names:['美元 / 港币','美元 / 港幣'] }
    ];
    const cnyCurrencies=[['usd','美元','美元'],['chf','瑞士法郎','瑞士法郎'],['twd','100新台币','100新臺幣'],['jpy','100日元','100日圓'],['eur','欧元','歐元'],['gbp','英镑','英鎊'],['aud','澳元','澳元'],['cad','加元','加元'],['sgd','新加坡元','新加坡元'],['krw','100韩元','100韓圜']];
    cnyCurrencies.forEach(([currency,sc,tc])=> {
        markets.push({id:currency+'_cny',fx:true,url:'https://finance.yahoo.com/quote/'+currency.toUpperCase()+'CNY%3DX/',names:[sc+' / 人民币',tc+' / 人民幣'],unitNames:[(['jpy','twd','krw'].includes(currency)?'每'+sc:'每1'+sc)+'可兑换的人民币金额',(['jpy','twd','krw'].includes(currency)?'每'+tc:'每1'+tc)+'可兌換的人民幣金額']});
    });
    const featuredMarkets = markets.filter((market) => ['hsi','nasdaq','sp500','ftse'].includes(market.id) || market.index || market.dom || market.fx);
    const defaultStocks = markets.filter((market) => market.symbol && !featuredMarkets.includes(market));
    const validSymbol = symbol=>/^(?:[A-Z]{1,6}|\d{4,5}\.HK|\d{6}\.(?:SS|SZ))$/.test(symbol);
    let stockSelection = null;
    try {const saved = JSON.parse(localStorage.getItem('navi_city_stocks'));if (saved && Array.isArray(saved.ids) && Array.isArray(saved.symbols)) stockSelection = {ids:saved.ids.filter(id=>defaultStocks.some(stock=>stock.id===id)),symbols:[...new Set(saved.symbols.filter(symbol=>typeof symbol==='string' && validSymbol(symbol)))].slice(0,20)};} catch {}
    let stocks = [];
    function applyStockSelection() {
        const custom = (stockSelection?.symbols || []).filter(symbol=>!defaultStocks.some(stock=>stock.symbol===symbol)).map(symbol=>({id:'custom:'+symbol,symbol,names:[symbol,symbol]}));
        markets.splice(0,markets.length,...markets.filter(m=>!m.id.startsWith('custom:')), ...custom);
        stocks = stockSelection ? defaultStocks.filter(stock=>stockSelection.ids.includes(stock.id) || stockSelection.symbols.includes(stock.symbol)).concat(custom) : [...defaultStocks];
        if (!stocks.length && displaySettings.stocks) {stockSelection=null;stocks=[...defaultStocks];}
    }
    applyStockSelection();
    const featured = top.querySelector('.city-feed-featured');
    const slots = Array.from({length:4}, () => {
        const slot = document.createElement('a');
        slot.className = 'city-feed-quote';
        slot.target = '_blank';
        slot.rel = 'noopener noreferrer';
        top.querySelector('.city-feed-markets').append(slot);
        return slot;
    });
    const boardQuotes = [];
    const boardLabels = [];
    [featuredMarkets,stocks].forEach((group,index)=> {
        const container = document.createElement('section'); container.className = 'city-feed-board-group';
        const title = document.createElement('h2'); boardLabels.push(title);
        const list = document.createElement('div'); list.className = 'city-feed-board-grid';
        (index === 0 ? group : Array.from({length:12},(_,i)=>group[i % group.length])).forEach((market,offset)=> {
            const slot = document.createElement('a'); slot.className = 'city-feed-board-quote'; slot.target = '_blank'; slot.rel = 'noopener noreferrer';
            list.append(slot); boardQuotes.push({slot,market,stock:index === 1,offset});
        });
        container.append(title,list); board.append(container);
    });
    let expanded = false, nativeFullscreen = false, previousOverflow = '', previousFocus = null;
    function finishFullscreen() {
        if (!expanded) return;
        expanded = false; nativeFullscreen = false;
        section.classList.remove('city-feed-expanded'); board.hidden = true; top.append(weather);
        document.body.style.overflow = previousOverflow;
        fullscreenButton.setAttribute('aria-pressed','false');
        clock(); renderMarkets(); renderWeatherFlip(); refreshMarquee(); previousFocus?.focus({preventScroll:true});
    }
    fullscreenButton.addEventListener('click',async()=> {
        if (expanded) {
            if (document.fullscreenElement === section) {try {await document.exitFullscreen();} catch {}}
            finishFullscreen(); return;
        }
        previousFocus = document.activeElement; previousOverflow = document.body.style.overflow;
        expanded = true; board.hidden = false; card.insertBefore(weather,bottom); document.body.style.overflow = 'hidden';
        section.classList.add('city-feed-expanded'); fullscreenButton.setAttribute('aria-pressed','true'); clock(); renderMarkets(); renderWeatherFlip(); refreshMarquee(); refreshFeedSources();
        try { if (section.requestFullscreen) {await section.requestFullscreen(); nativeFullscreen = true;} } catch { /* Keep the viewport-filling board when native fullscreen is unavailable. */ }
    });
    document.addEventListener('fullscreenchange',()=> {if (expanded && nativeFullscreen && document.fullscreenElement !== section) finishFullscreen();});
    document.addEventListener('keydown',event=> {if(event.key === 'Escape' && !stockDialog.open && expanded && document.fullscreenElement !== section) finishFullscreen();});
    let page = 0, featuredPage = 0, boardPage = 0;
    let boardCapacity = [featuredMarkets.length,12];
    function fitBoard() {
        if (!expanded) return;
        const capacity = [...board.querySelectorAll('.city-feed-board-grid')].map((grid,index)=> {
            const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
            const rows = Math.max(1,Math.floor((grid.clientHeight + 6) / 54));
            return Math.min(index === 0 ? featuredMarkets.length : 12,columns * rows);
        });
        if (capacity.some((count,index)=>count !== boardCapacity[index])) {
            boardCapacity=capacity; boardPage=0; renderMarkets();
        }
    }
    const boardObserver = new ResizeObserver(()=>requestAnimationFrame(fitBoard));
    board.querySelectorAll('.city-feed-board-grid').forEach(grid=>boardObserver.observe(grid));
    const trendCache=new Map(),trendQueue=new Map();let trendActive=0;
    function paintTrend(slot,market){
        const data=trendCache.get(market.symbol)?.data,face=slot.querySelector('.city-feed-face:not(.city-feed-outgoing)');
        if(!face || face.dataset.market!==market.id)return;
        face.querySelector('.city-feed-trend')?.remove();
        if(!data || data.points.length<2)return;
        const points=data.points,min=Math.min(...points.map(p=>p.value)),max=Math.max(...points.map(p=>p.value)),start=points[0].time,end=points.at(-1).time;
        const coords=points.map(p=>[(p.time-start)/(end-start || 1)*300,52-(p.value-min)/(max-min || 1)*44]);
        if(max===min)coords.forEach(p=>p[1]=30);
        const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('city-feed-trend');svg.setAttribute('viewBox','0 0 300 60');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
        const line=coords.map((p,i)=>(i?'L':'M')+p.map(n=>n.toFixed(2)).join(',')).join(' ');
        const area=document.createElementNS(svg.namespaceURI,'path');area.setAttribute('d',line+' L300,60 L0,60 Z');area.setAttribute('class','city-feed-trend-area');
        const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',line);path.setAttribute('class','city-feed-trend-line');svg.append(area,path);face.prepend(svg);
        slot.title=slot.title.replace(/ · (?:最近交易日走势|最近交易日走勢).*$/,'');
        slot.title+=' · '+text('最近交易日走势 ','最近交易日走勢 ')+data.date+' ('+data.zone+')';
    }
    function requestTrend(slot,market){
        if(!market.symbol)return;
        paintTrend(slot,market);
        const cached=trendCache.get(market.symbol);if(cached && Date.now()-cached.time<300000)return;
        if(!trendQueue.has(market.symbol))trendQueue.set(market.symbol,{market,slots:new Set()});
        trendQueue.get(market.symbol).slots.add(slot);drainTrends();
    }
    function drainTrends(){
        for(const [symbol,job] of trendQueue){
            if(trendActive>=3)break;if(job.running)continue;job.running=true;trendActive++;
            fetch('/api/market-trend?symbol='+encodeURIComponent(symbol),{signal:AbortSignal.timeout(12000)}).then(r=>{if(!r.ok)throw Error('trend');return r.json();}).then(data=>{
                if(data.symbol!==symbol || !Array.isArray(data.points) || data.points.length<2 || data.points.length>400 || data.points.some(p=>!Number.isFinite(p.time)||!Number.isFinite(p.value)||p.value<=0))throw Error('trend');
                data.points.sort((a,b)=>a.time-b.time);trendCache.set(symbol,{time:Date.now(),data});
                for(const slot of job.slots){slot.title=slot.title.replace(/ · (?:最近交易日走势|最近交易日走勢).*$/,'');paintTrend(slot,job.market);}
            }).catch(()=>{trendCache.set(symbol,{time:Date.now(),data:trendCache.get(symbol)?.data});}).finally(()=>{trendActive--;trendQueue.delete(symbol);drainTrends();});
        }
    }
    const timers = new WeakMap();
    function renderQuote(slot, market) {
        const quote = state.get(market.id);
        slot.href = market.url || (market.symbol ? 'https://finance.yahoo.com/quote/' + encodeURIComponent(market.symbol) + '/' : 'https://www.google.com/finance/quote/' + ({cny:'HKD-CNY',jpy:'HKD-JPY',chf:'HKD-CHF',usd:'USD-HKD'}[market.id]));
        const name = market.names[isSC() ? 0 : 1];
        const price = quote?.price || '--';
        const change = quote?.change || (quote?.failed ? text('不可用','不可用') : text('读取中','讀取中'));
        const signature = [market.id,name,price,change,quote?.stale].join('|');
        if (slot.dataset.signature === signature) {requestTrend(slot,market);return;}
        slot.dataset.signature = signature;
        clearTimeout(timers.get(slot));
        slot.querySelectorAll('.city-feed-outgoing').forEach((node) => node.remove());
        const previous = slot.firstElementChild;
        const face = document.createElement('div');
        face.className = 'city-feed-face';
        face.dataset.direction = quote?.direction || 'flat';
        face.dataset.market=market.id;
        [ ['city-feed-name',name], ['city-feed-price',price], ['city-feed-change',change] ].forEach(([className,value]) => {
            const span = document.createElement('span');
            span.className = className;
            span.textContent = value;
            face.append(span);
        });
        slot.title = name + (market.unitNames ? ' · '+market.unitNames[isSC()?0:1] : '') + (quote?.time ? ' · ' + text('行情时间 ','行情時間 ') + quote.time : '') + (quote?.stale ? text(' · 更新失败，保留上次数据',' · 更新失敗，保留上次數據') : '');
        if (previous) {
            previous.className = 'city-feed-face city-feed-outgoing';
            previous.setAttribute('aria-hidden','true');
            face.classList.add('city-feed-incoming');
        }
        slot.append(face);
        requestTrend(slot,market);
        timers.set(slot, setTimeout(() => { previous?.remove(); face.classList.remove('city-feed-incoming'); }, 650));
    }
    function renderMarkets() {
        const index = state.get('hsi');
        const indexElement = document.getElementById('city-hsi');
        if (index?.price && indexElement) {
            const value = index.price + ' ' + index.change;
            if (indexElement.textContent !== value) indexElement.textContent = value;
            indexElement.style.color = index.direction === 'up' ? '#f27f76' : index.direction === 'down' ? '#65d4be' : '';
            const note = document.getElementById('city-hsi-note');
            const noteText = text('行情时间 ','行情時間 ') + index.time;
            if (note && note.textContent !== noteText) note.textContent = noteText;
        }
        const featuredPool=shownFeatured();
        if (featuredPool.length) renderQuote(featured, featuredPool[featuredPage % featuredPool.length]);
        // Index/currency and individual-stock pages rotate independently.
        const count = 4;
        slots.forEach((slot,index) => {slot.hidden = index >= stocks.length; if(!slot.hidden) renderQuote(slot, stocks[(page * count + index) % stocks.length]);});
        boardQuotes.forEach(({slot,stock,offset})=> {
            const pool=stock ? stocks : featuredPool, capacity=boardCapacity[stock ? 1 : 0];
            slot.hidden=offset>=Math.min(capacity,pool.length);
            if (!slot.hidden) renderQuote(slot,pool[((boardPage % Math.ceil(pool.length / capacity)) * capacity + offset) % pool.length]);
        });
        boardLabels[0].textContent = displaySettings.indices && displaySettings.fx ? text('全球指数与汇率','全球指數與匯率') : displaySettings.indices ? text('全球指数','全球指數') : text('汇率','匯率');
        boardLabels[1].textContent = text('重点个股 · 第 ','重點個股 · 第 ') + (boardPage % Math.max(1,Math.ceil(stocks.length/boardCapacity[1])) + 1) + ' / ' + Math.max(1,Math.ceil(stocks.length/boardCapacity[1])) + text(' 页',' 頁');
        const fullscreenLabel = text(expanded?'退出全屏':'全屏行情',expanded?'退出全屏':'全屏行情');
        fullscreenButton.querySelector('.material-icons').textContent = expanded?'fullscreen_exit':'fullscreen';
        fullscreenButton.setAttribute('aria-label',fullscreenLabel); fullscreenButton.title = fullscreenLabel;
        stockButton.setAttribute('aria-label',text('CITY FEED 设置','CITY FEED 設定')); stockButton.title=stockButton.getAttribute('aria-label');
        applyDisplay();

    }
    const stockDialog = document.createElement('mdui-dialog'); stockDialog.className='city-feed-stock-dialog'; stockDialog.id='city-feed-stock-dialog';
    stockDialog.innerHTML=`<form><h2></h2>
        <nav class="city-feed-settings-tabs"><button type="button" data-panel="display" aria-pressed="true"></button><button type="button" data-panel="stocks" aria-pressed="false"></button></nav>
        <section class="city-feed-settings-panel" data-settings-panel="display"><div class="city-feed-display-options"></div><fieldset class="city-feed-ticker-options"><legend></legend><div class="city-feed-speed-settings"></div><div class="city-feed-ticker-switches"></div><div class="city-feed-rss-options"></div><p class="city-feed-rss-hint"></p></fieldset></section>
        <section class="city-feed-settings-panel" data-settings-panel="stocks" hidden><p class="city-feed-stock-hint"></p><label class="city-feed-symbol-label" for="city-feed-custom-symbols"></label><div class="city-feed-symbol-entry"><input id="city-feed-custom-symbols" type="text" placeholder="BABA, 0700.HK, 600000.SS, 000001.SZ"><button type="button" data-stock-action="add"></button></div><p class="city-feed-stock-error" role="alert" aria-live="polite"></p><p class="city-feed-stock-feedback" role="status"></p><div class="city-feed-custom-list"></div><div class="city-feed-stock-options"></div></section>
        <div class="city-feed-stock-actions"><button type="button" data-stock-action="reset"></button><button type="button" data-stock-action="cancel"></button><button type="submit" data-stock-action="save"></button></div></form>`;
    const headline=stockDialog.querySelector('h2');headline.slot='headline';stockDialog.prepend(headline);
    const actions=stockDialog.querySelector('.city-feed-stock-actions');
    for(const old of [...actions.querySelectorAll('button')]){const button=document.createElement('mdui-button');button.dataset.stockAction=old.dataset.stockAction;button.variant=old.type==='submit'?'tonal':'text';button.type='button';if(old.type==='submit')button.onclick=()=>stockDialog.querySelector('form').requestSubmit();button.slot='action';stockDialog.append(button);}actions.remove();
    const oldTabs=stockDialog.querySelector('.city-feed-settings-tabs'),tabs=document.createElement('mdui-tabs');tabs.className='city-feed-material-tabs';tabs.value='display';tabs.fullWidth=true;
    for(const key of ['display','stocks']){const tab=document.createElement('mdui-tab');tab.value=key;tab.dataset.panel=key;tabs.append(tab);}oldTabs.replaceWith(tabs);
    document.body.append(stockDialog);
    let draftSymbols=[];
    function switchSettingsPanel(panel) {
        stockDialog.querySelectorAll('[data-settings-panel]').forEach(node=>node.hidden=node.dataset.settingsPanel!==panel);
        tabs.value=panel;
    }
    tabs.addEventListener('change',()=>switchSettingsPanel(tabs.value));
    function checkbox(parent,value,title,checked,kind) {
        const label=document.createElement('label'),input=document.createElement('mdui-checkbox'); input.value=value;input.setAttribute('value',value); input.checked=checked; input.dataset.settingKind=kind;
        const caption=document.createElement('span');caption.textContent=title;label.append(input,caption);parent.append(label);return input;
    }
    function renderCustomList() {
        const list=stockDialog.querySelector('.city-feed-custom-list');list.replaceChildren();
        draftSymbols.forEach(symbol=> {
            const row=document.createElement('div');row.className='city-feed-custom-row';
            const name=document.createElement('span');name.textContent=symbol;
            const button=document.createElement('button');button.type='button';button.className='city-feed-fullscreen-button';button.setAttribute('aria-label',text('移除 ','移除 ')+symbol);button.innerHTML='<span class="material-icons" aria-hidden="true">close</span>';
            button.addEventListener('click',()=>{draftSymbols=draftSymbols.filter(item=>item!==symbol);renderCustomList();});row.append(name,button);list.append(row);
        });
    }
    function addSymbols() {
        const entry=stockDialog.querySelector('#city-feed-custom-symbols'), error=stockDialog.querySelector('.city-feed-stock-error');
        const symbols=[...new Set(entry.value.toUpperCase().split(/[\s,，;；]+/).filter(Boolean).map(symbol=>/^\d{4,5}\.HK$/.test(symbol) ? String(Number(symbol.split('.')[0])).padStart(4,'0')+'.HK' : symbol))];
        if(symbols.some(symbol=>!validSymbol(symbol)) || new Set([...draftSymbols,...symbols]).size>20) {switchSettingsPanel('stocks');entry.focus();error.textContent=text('请使用有效的美股、港股或沪深股票代码，最多添加 20 个。','請使用有效的美股、港股或滬深股票代碼，最多加入 20 個。');return false;}
        symbols.forEach(symbol=> {
            const preset=defaultStocks.find(stock=>stock.symbol===symbol);
            if(preset) stockDialog.querySelectorAll('[data-setting-kind="stock"]').forEach(input=>{if(input.value===preset.id)input.checked=true;});
            else if(!draftSymbols.includes(symbol)) draftSymbols.push(symbol);
        });
        entry.value='';error.textContent='';if(symbols.length)stockDialog.querySelector('.city-feed-stock-feedback').textContent=text('已加入：','已加入：')+symbols.join(', ');renderCustomList();return true;
    }
    stockDialog.querySelector('[data-stock-action="add"]').addEventListener('click',addSymbols);
    stockDialog.querySelector('#city-feed-custom-symbols').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();addSymbols();}});
    function syncRssControls() {
        const checked=key=>stockDialog.querySelector('[data-setting-kind="display"][value="'+key+'"]').checked;
        stockDialog.querySelectorAll('[data-setting-kind="rss"]').forEach(input=>input.disabled=!checked('ticker') || !checked('rss'));
        ['rss','trafficNews','rateTicker','weatherTicker'].forEach(key=>stockDialog.querySelector('[data-setting-kind="display"][value="'+key+'"]').disabled=!checked('ticker'));
    }
    stockButton.addEventListener('click',()=> {
        stockDialog.querySelector('h2').textContent=text('CITY FEED 设置','CITY FEED 設定');
        stockDialog.querySelector('[data-panel="display"]').textContent=text('显示内容','顯示內容');
        stockDialog.querySelector('[data-panel="stocks"]').textContent=text('自选股','自選股');
        stockDialog.querySelector('.city-feed-stock-hint').textContent=text('勾选预设股票；添加的其他代码会显示在下方列表，可逐一移除。保存后应用，设置支持导入导出。','勾選預設股票；加入的其他代碼會顯示在下方清單，可逐一移除。儲存後套用，設定支援匯入匯出。');
        stockDialog.querySelector('.city-feed-symbol-label').textContent=text('添加股票代码（逗号或换行分隔，最多 20 个）','加入股票代碼（逗號或換行分隔，最多 20 個）');
        stockDialog.querySelector('#city-feed-custom-symbols').value='';
        stockDialog.querySelector('[data-stock-action="add"]').textContent=text('添加','加入');
        const options=stockDialog.querySelector('.city-feed-stock-options'); options.replaceChildren();
        defaultStocks.forEach(stock=>checkbox(options,stock.id,stock.names[isSC()?0:1]+' · '+stock.symbol,stocks.some(item=>item.id===stock.id),'stock'));
        draftSymbols=(stockSelection?.symbols || []).filter(symbol=>!defaultStocks.some(stock=>stock.symbol===symbol));renderCustomList();
        const display=stockDialog.querySelector('.city-feed-display-options'),ticker=stockDialog.querySelector('.city-feed-ticker-switches');display.replaceChildren();ticker.replaceChildren();
        const labels={clock:['香港时间','香港時間'],indices:['全球指数','全球指數'],fx:['汇率','匯率'],stocks:['个股行情','個股行情'],weather:['全球天气','全球天氣'],traffic:['全屏行车时间','全屏行車時間'],ticker:['文字走马灯','文字跑馬燈'],rss:['RSS 新闻','RSS 新聞'],trafficNews:['交通消息','交通消息'],rateTicker:['汇率摘要','匯率摘要'],weatherTicker:['天文台天气与警告','天文台天氣與警告']};
        Object.entries(labels).forEach(([key,names])=>{const input=checkbox(['rss','trafficNews','rateTicker','weatherTicker'].includes(key)?ticker:display,key,text(...names),displaySettings[key],'display');input.addEventListener('change',syncRssControls);});
        stockDialog.querySelector('legend').textContent=text('走马灯设置','跑馬燈設定');
        const speedSettings=stockDialog.querySelector('.city-feed-speed-settings');speedSettings.replaceChildren();
        ['compactSpeed','fullscreenSpeed'].forEach((key,index)=> {
            const row=document.createElement('div');row.className='city-feed-speed-row';
            const label=document.createElement('label');label.htmlFor='city-feed-'+key;
            label.textContent=text(index?'全屏速度':'小工具速度',index?'全屏速度':'小工具速度');
            const input=document.createElement('input');input.type='range';input.id='city-feed-'+key;input.min='24';input.max='160';input.step='4';input.value=displaySettings[key];input.dataset.speedKey=key;
            const output=document.createElement('output');output.htmlFor=input.id;
            const update=()=>{output.textContent=input.value+text(' 像素/秒',' 像素/秒');input.setAttribute('aria-valuetext',output.textContent);};input.addEventListener('input',update);update();
            row.append(label,output,input);speedSettings.append(row);
        });
        const speedHint=document.createElement('p');speedHint.className='city-feed-speed-hint';speedHint.textContent=text('数值越大越快，保存后生效；速度设置会随用户数据一并导入导出。','數值越大越快，儲存後生效；速度設定會隨使用者資料一併匯入匯出。');speedSettings.append(speedHint);
        const resetSpeed=document.createElement('button');resetSpeed.type='button';resetSpeed.className='city-feed-speed-reset';resetSpeed.textContent=text('恢复默认速度','恢復預設速度');resetSpeed.addEventListener('click',()=>speedSettings.querySelectorAll('input').forEach(input=>{input.value=displayDefaults[input.dataset.speedKey];input.dispatchEvent(new Event('input'));}));speedSettings.append(resetSpeed);
        const rss=stockDialog.querySelector('.city-feed-rss-options');rss.replaceChildren();
        const sources=typeof customRSS!=='undefined'?customRSS:[];
        const names={'hk.news.yahoo.com':'Yahoo 香港新闻','rthk.hk':'香港电台','www.chinanews.com.cn':'中国新闻网','news.mingpao.com':'明报','www.rti.org.tw':'中央广播电台'};
        sources.forEach(url=>{let host=url;try{host=new URL(url).hostname;}catch{}const input=checkbox(rss,url,(names[host] || host)+' · '+url,displaySettings.rssSources===null || displaySettings.rssSources.includes(url),'rss');input.closest('label').title=url;});
        stockDialog.querySelector('.city-feed-rss-hint').textContent=text('这里只选择 CITY FEED 显示哪些 RSS。RSS 列表的添加、编辑和移除，请到上方「香港新闻」容器的 RSS 图标管理；这些设置均支持导入导出。','這裡只選擇 CITY FEED 顯示哪些 RSS。RSS 清單的新增、編輯和移除，請到上方「香港新聞」容器的 RSS 圖示管理；這些設定均支援匯入匯出。');
        stockDialog.querySelector('.city-feed-stock-error').textContent='';stockDialog.querySelector('.city-feed-stock-feedback').textContent='';
        ['reset','cancel','save'].forEach((action,index)=> {stockDialog.querySelector('[data-stock-action="'+action+'"]').textContent=text(['恢复全部默认','取消','保存'][index],['恢復全部預設','取消','儲存'][index]);});
        syncRssControls();switchSettingsPanel('display');stockDialog.open=true;
    });
    function applySettings() {
        applyStockSelection();page=boardPage=featuredPage=0;renderMarkets();renderFreshness();renderWeatherFlip();requestAnimationFrame(fitBoard);refreshMarquee();refreshStocks();
        if(typeof updateCityTicker==='function') updateCityTicker();
    }
    stockDialog.querySelector('[data-stock-action="cancel"]').addEventListener('click',()=>stockDialog.open=false);
    stockDialog.querySelector('[data-stock-action="reset"]').addEventListener('click',()=> {stockSelection=null;displaySettings={...displayDefaults};localStorage.removeItem('navi_city_stocks');localStorage.removeItem('navi_city_feed');applySettings();stockDialog.open=false;});
    stockDialog.querySelector('form').addEventListener('submit',event=> {
        event.preventDefault();if(!addSymbols())return;
        const ids=[...stockDialog.querySelectorAll('[data-setting-kind="stock"]')].filter(input=>input.checked).map(input=>input.value);
        const next={...displaySettings};stockDialog.querySelectorAll('[data-setting-kind="display"]').forEach(input=>next[input.value]=input.checked);
        stockDialog.querySelectorAll('[data-speed-key]').forEach(input=>{const value=Number(input.value);next[input.dataset.speedKey]=validMarqueeSpeed(value)?value:displayDefaults[input.dataset.speedKey];});
        const rssInputs=[...stockDialog.querySelectorAll('[data-setting-kind="rss"]')];
        next.rssSources=rssInputs.every(input=>input.checked)?null:rssInputs.filter(input=>input.checked).map(input=>input.value);
        if(next.stocks && !ids.length && !draftSymbols.length) {switchSettingsPanel('stocks');stockDialog.querySelector('.city-feed-stock-error').textContent=text('请至少选择或添加一只股票，或关闭个股行情。','請至少選擇或加入一隻股票，或關閉個股行情。');return;}
        stockSelection={ids,symbols:[...draftSymbols]};displaySettings=next;
        localStorage.setItem('navi_city_stocks',JSON.stringify(stockSelection));localStorage.setItem('navi_city_feed',JSON.stringify(displaySettings));applySettings();stockDialog.open=false;
    });
    function syncRates() {
        markets.filter((item) => item.dom).forEach((market) => {
            if (state.get(market.id)?.fxSource) return;
            const value = document.getElementById(market.dom)?.textContent || '';
            const price = value.replace(/^(HK\$1 = |US\$1 = )/, '');
            const valid = /\d/.test(price) && !price.includes('--');
            if (valid) state.set(market.id, { price, change:text('涨跌暂不可用','漲跌暫不可用') });
            else {
                const previous = state.get(market.id);
                state.set(market.id, previous ? {...previous, stale:true} : {failed:true});
            }
        });
        renderMarkets();
    }
    // Inline seven-segment display stays sharp without a downloaded clock font.
    const digitSegments = ['abcdef','bc','abdeg','abcdg','bcfg','acdfg','acdefg','abc','abcdefg','abcdfg'];
    const segmentShapes = {
        a:'4,2 18,2 21,5 18,8 4,8 1,5',
        b:'22,6 22,18 19,21 16,18 16,9',
        c:'22,24 22,36 19,39 16,36 16,27',
        d:'4,36 18,36 21,39 18,42 4,42 1,39',
        e:'0,24 3,21 6,24 6,35 3,38 0,35',
        f:'0,8 3,5 6,8 6,17 3,20 0,17',
        g:'4,19 18,19 21,22 18,25 4,25 1,22'
    };
    let lastTimeSyncFailed=false;
    let networkEpoch = null, networkAnchor = 0, networkSource = '', syncingTime = false, lastTimeAttempt = -Infinity;
    async function syncClock() {
        if (syncingTime) return;
        syncingTime = true; lastTimeAttempt = performance.now();
        const started = performance.now();
        try {
            const response = await fetch('/api/time?_=' + Date.now(),{cache:'no-store',signal:AbortSignal.timeout(15000)});
            if (!response.ok) throw new Error('Network clock unavailable');
            const data = await response.json();
            if (!Number.isFinite(data.timestamp) || data.timestamp < 1577836800000 || data.timestamp > 4102444800000) throw new Error('Invalid network time');
            const received = performance.now();
            networkEpoch = data.timestamp + (received-started)/2;
            networkAnchor = received; networkSource = data.source || 'Network';lastTimeSyncFailed=false;
        } catch {
            lastTimeSyncFailed=true;
        } finally {syncingTime = false; clock();}
    }
    function clock() {
        const now = new Date(networkEpoch === null ? Date.now() : networkEpoch + performance.now() - networkAnchor);
        const time = document.getElementById('city-feed-time');
        const value = now.toLocaleTimeString('en-GB', {timeZone:'Asia/Hong_Kong',hour:'2-digit',minute:'2-digit',...(expanded ? {second:'2-digit'} : {})});
        const status = top.querySelector('.city-feed-time-source');
        status.textContent = networkEpoch !== null ? text('网络时间','網絡時間') : syncingTime ? text('正在校时','正在校時') : text('本地时间','本地時間');
        status.title = networkEpoch !== null ? networkSource : text('网络时间未连接，使用设备本地时间','網絡時間未連接，使用裝置本地時間');
        status.dataset.local = String(networkEpoch === null && !syncingTime);
        time.dateTime = now.toISOString();
        time.setAttribute('aria-label',text('香港时间 ','香港時間 ') + value);
        if (time.dataset.value === value) return;
        time.dataset.value = value;
        const digits = value.replaceAll(':','').split('');
        const display = digits.map((digit,index)=> '<g transform="translate(' + [0,26,62,88,124,150][index] + ',0)">' + Object.entries(segmentShapes).map(([segment,points])=> '<polygon points="' + points + '" opacity="' + (digitSegments[Number(digit)].includes(segment) ? '1' : '.07') + '"/>').join('') + '</g>').join('');
        const colons = (expanded ? [55,117] : [55]).map(x=>'<circle cx="' + x + '" cy="15" r="2.5"/><circle cx="' + x + '" cy="30" r="2.5"/>').join('');
        time.innerHTML = '<svg class="city-feed-digital-clock" viewBox="-1 0 ' + (expanded ? 174 : 112) + ' 44" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" fill="currentColor">' + display + colons + '</svg>';
    }
    // Keep visible headline nodes and their pixel positions across source refreshes.
    class HeadlineMarquee {
        constructor(track,viewport) {
            this.track=track;this.viewport=viewport;this.playlist=[];this.pending=null;
            this.next=0;this.offset=0;this.animation=null;this.speed=48;this.active=true;this.reduced=false;
            this.bootstrap=true;
        }
        setEntries(entries) {
            const normalized=[...new Set(entries.map(entry=>String(entry).replace(/\s+/g,' ').trim()).filter(Boolean))];
            if(!normalized.length) return;
            const loading=normalized.every(entry=>/正在.*(?:汇集|匯集|加载|載入|資料|资料)/.test(entry));
            if(!this.playlist.length || this.bootstrap && !loading) {
                this.stop();this.playlist=normalized;this.pending=null;this.next=0;this.offset=0;
                this.bootstrap=loading;this.track.replaceChildren();this.fill();this.start();
            } else if(JSON.stringify(normalized)!==JSON.stringify(this.pending || this.playlist)) {
                this.pending=normalized;
                if(this.reduced) this.refresh();
            }
        }
        fill() {
            if(!this.playlist.length || !this.viewport.clientWidth) return;
            let width=[...this.track.children].reduce((sum,node)=>sum+node.getBoundingClientRect().width,0);
            // Preload enough text for the entire current animation, including its end.
            // A fixed 100px buffer runs dry when the leading headline is much longer.
            let leadingWidth=this.track.firstElementChild?.getBoundingClientRect().width || 0;
            for(let count=0;width<this.viewport.clientWidth+leadingWidth+100 && count<100;count++) {
                const item=document.createElement('span');item.className='city-feed-headline';
                item.textContent=this.playlist[this.next++ % this.playlist.length];this.track.append(item);
                const itemWidth=item.getBoundingClientRect().width;
                if(!itemWidth) break;
                width+=itemWidth;
                if(!leadingWidth) leadingWidth=itemWidth;
            }
        }
        applyPending(completedText) {
            if(!this.pending) return;
            let position=-this.offset;
            for(const node of [...this.track.children]) {
                const width=node.getBoundingClientRect().width;
                if(position>=this.viewport.clientWidth) node.remove();
                position+=width;
            }
            // Resume after the last retained headline, rather than restarting the feed.
            const anchor=this.track.lastElementChild?.textContent || completedText;
            const anchorIndex=this.pending.indexOf(anchor);
            this.next=anchorIndex>=0 ? anchorIndex+1 : this.next % this.pending.length;
            this.playlist=this.pending;this.pending=null;
        }
        stop() {
            if(this.animation) {
                this.offset+=Number(this.animation.currentTime || 0)*this.speed/1000;
                this.animation.onfinish=null;this.animation.cancel();this.animation=null;
            }
        }
        start() {
            this.track.style.transform='translate3d('+(-this.offset)+'px,0,0)';
            if(!this.active || this.reduced || this.animation || !this.viewport.clientWidth) return;
            const first=this.track.firstElementChild,width=first?.getBoundingClientRect().width || 0;
            if(!width) return;
            if(this.offset>=width) {this.offset-=width;first.remove();this.applyPending(first.textContent);this.fill();this.start();return;}
            // Browser-composited linear motion: no per-frame JavaScript or layout reads.
            this.animation=this.track.animate([
                {transform:'translate3d('+(-this.offset)+'px,0,0)'},
                {transform:'translate3d('+(-width)+'px,0,0)'}
            ],{duration:(width-this.offset)/this.speed*1000,easing:'linear',fill:'forwards'});
            this.animation.onfinish=()=> {
                this.animation.cancel();this.animation=null;this.offset=0;first.remove();
                this.applyPending(first.textContent);this.fill();this.start();
            };
        }
        refresh(active=this.active,reduced=this.reduced,speed=this.speed) {
            this.stop();this.speed=speed;this.active=active;this.reduced=reduced;
            if(reduced && this.pending) {this.playlist=this.pending;this.pending=null;this.next=0;this.offset=0;this.track.replaceChildren();}
            this.fill();this.start();
        }
    }
    const marquee=new HeadlineMarquee(track,windowElement);
    const initialHeadlines=[...track.children].map(node=>node.textContent);
    window.cityFeedSetHeadlines=(entries,options={})=>{if(!options.initialOnly || marquee.bootstrap)marquee.setEntries(entries);};
    const reducedMarqueeMotion=matchMedia('(prefers-reduced-motion:reduce)');
    const refreshMarquee=()=>marquee.refresh(!document.hidden && displaySettings.ticker,reducedMarqueeMotion.matches,displaySettings[expanded?'fullscreenSpeed':'compactSpeed']);
    marquee.speed=displaySettings.compactSpeed;
    marquee.active=!document.hidden && displaySettings.ticker;marquee.reduced=reducedMarqueeMotion.matches;
    marquee.setEntries(initialHeadlines.length?initialHeadlines:[track.textContent]);
    new ResizeObserver(refreshMarquee).observe(windowElement);
    document.addEventListener('visibilitychange',refreshMarquee);
    reducedMarqueeMotion.addEventListener('change',refreshMarquee);
    async function refreshStocks() {
        const available = new Set();
        try {
            const customSymbols=stockSelection?.symbols || [];
            const response = await fetch('/api/markets' + (customSymbols.length ? '?symbols='+encodeURIComponent(customSymbols.join(',')) : ''),{cache:'no-store',signal:AbortSignal.timeout(12000)});
            if (!response.ok) throw new Error('Market API unavailable');
            const payload = await response.json();
            for (const quote of payload.quotes || []) {
                if (!Number.isFinite(quote.price) || !Number.isFinite(quote.percent)) continue;
                const custom=markets.find(item=>item.id===quote.id && item.id.startsWith('custom:'));
                if (custom && quote.name) custom.names=[String(quote.name),String(quote.name)];
                state.set(quote.id, {
                    price:(quote.id==='gold'?'US$':'')+quote.price.toLocaleString('en-HK',{minimumFractionDigits:2,maximumFractionDigits:2}),
                    change:Number.isFinite(quote.changePoints) ? (quote.changePoints>0?'+':'')+quote.changePoints.toFixed(2)+text('点','點') : (quote.percent>0?'+':'') + quote.percent.toFixed(2) + '%',
                    direction:quote.percent>0?'up':quote.percent<0?'down':'flat',
                    time:quote.time + ' (' + quote.zone + ')'
                });
                available.add(quote.id);
            }
            markets.filter(item=>item.external && !available.has(item.id)).forEach(item=>{const previous=state.get(item.id);state.set(item.id,previous?{...previous,stale:true}:{failed:true});});
            if (available.size) { markFresh('markets',true); marketSource = payload.source || 'Tencent Finance'; renderMarkets(); }
        } catch { markets.filter(item=>item.external).forEach(item=>{const previous=state.get(item.id);state.set(item.id,previous?{...previous,stale:true}:{failed:true});});markFresh('markets',false); /* Static hosting can still use the public chart fallback. */ }
        await Promise.allSettled(markets.filter((item) => item.symbol && !available.has(item.id)).map(async (market) => {
            try {
                const url = 'https://query2.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(market.symbol) + '?interval=1d&range=1d&_=' + Date.now();
                const response = await fetch('https://r.jina.ai/' + url, {cache:'no-store', signal:AbortSignal.timeout(15000)});
                if (!response.ok) throw new Error('Market HTTP ' + response.status);
                const raw = await response.text();
                const payload = JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}') + 1));
                const meta = payload.chart?.result?.[0]?.meta;
                const price = Number(meta?.regularMarketPrice);
                const close = Number(meta?.previousClose ?? meta?.chartPreviousClose);
                if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(close) || close <= 0) throw new Error('Quote unavailable');
                const percent = Number.isFinite(meta.regularMarketChangePercent) ? meta.regularMarketChangePercent : (price - close) / close * 100;
                state.set(market.id, {
                    price:price.toLocaleString('en-HK',{minimumFractionDigits:2,maximumFractionDigits:2}),
                    change:(percent > 0 ? '+' : '') + percent.toFixed(2) + '%',
                    direction:percent > 0 ? 'up' : percent < 0 ? 'down' : 'flat',
                    time:meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toLocaleString('zh-HK',{timeZone:'Asia/Hong_Kong'}) : ''
                });
                marketSource = available.size ? 'Tencent Finance / Yahoo Finance' : 'Yahoo Finance';
            } catch {
                const previous = state.get(market.id);
                state.set(market.id, previous ? {...previous, stale:true} : {failed:true});
            }
            renderMarkets();
        }));
    }

    async function refreshFX() {
        try {
            const response=await fetch('/api/fx',{signal:AbortSignal.timeout(12000)});
            if(!response.ok)throw Error('FX unavailable');
            const data=await response.json();
            if(!Array.isArray(data.quotes)||data.quotes.length<4)throw Error('Incomplete FX');
            const ids=data.quotes.map(quote=>quote.id);
            if(new Set(ids).size!==ids.length || !['cny','jpy','chf','usd'].every(id=>ids.includes(id)) || data.quotes.some(quote=>!Number.isFinite(quote.price)||quote.price<=0||!Number.isFinite(quote.percent)))throw Error('Invalid FX quote');
            for(const quote of data.quotes) {
                const currency=quote.id.endsWith('_cny') ? 'CNY ' : quote.id.startsWith('cny_') ? quote.id.slice(4).toUpperCase()+' ' : {cny:'¥',jpy:'¥',chf:'CHF ',usd:'HK$'}[quote.id];
                if(!currency || !markets.some(item=>item.id===quote.id))continue;
                state.set(quote.id,{price:currency+quote.price.toFixed(4),change:(quote.percent>0?'+':'')+quote.percent.toFixed(2)+'%',direction:quote.percent>0?'up':quote.percent<0?'down':'flat',time:quote.date+text(' · 较 ',' · 較 ')+(quote.previousDate==='previous close'?text('前收市','前收市'):quote.previousDate),fxSource:true});
            }
            markets.filter(item=>item.fx && !ids.includes(item.id)).forEach(item=>{const previous=state.get(item.id);state.set(item.id,previous?{...previous,stale:true}:{failed:true});});
            markFresh('fx',true);renderMarkets();
        } catch {
            markets.filter(item=>item.dom || item.fx).forEach(market=> {const previous=state.get(market.id);if(previous?.fxSource)state.set(market.id,{...previous,stale:true});else if(market.fx)state.set(market.id,{failed:true});});
            markFresh('fx',false);renderMarkets();
        }
    }
    const cities = [
        ['香港','香港',22.32,114.17],['北京','北京',39.90,116.40],['上海','上海',31.23,121.47],
        ['台北','臺北',25.03,121.57],['东京','東京',35.68,139.69],['首尔','首爾',37.57,126.98],
        ['新加坡','新加坡',1.35,103.82],['悉尼','悉尼',-33.87,151.21],['伦敦','倫敦',51.51,-.13],
        ['巴黎','巴黎',48.86,2.35],['纽约','紐約',40.71,-74.01],['洛杉矶','洛杉磯',34.05,-118.24]
    ];
    let worldWeather = [], weatherUpdated = '', weatherPage = 0;
    function weatherDescription(code) {
        if (code === 0) return ['晴','晴','☀'];
        if (code <= 3) return ['多云','多雲','☁'];
        if (code <= 48) return ['雾','霧','🌫'];
        if (code <= 67 || (code >= 80 && code <= 82)) return ['雨','雨','🌧'];
        if (code <= 77 || (code >= 85 && code <= 86)) return ['雪','雪','❄'];
        return ['雷雨','雷雨','⛈'];
    }
    function renderWorldWeather() {
        weatherLabel.textContent = text('全球天气','全球天氣');
        const copy = document.createElement('div'); copy.className = 'city-feed-weather-copy';
        cities.forEach((city,index)=> {
            const data = worldWeather[index], current = data?.current, daily = data?.daily;
            const item = document.createElement('span');
            const condition = current ? weatherDescription(current.weather_code) : null;
            const temp = value=>Number.isFinite(value) ? Math.round(value) + '°' : '--';
            item.textContent = city[isSC()?0:1] + '  ' + (condition ? condition[2] + ' ' + text(condition[0],condition[1]) + '  ' + temp(current.temperature_2m) + 'C  ' + temp(daily?.temperature_2m_min?.[0]) + '–' + temp(daily?.temperature_2m_max?.[0]) : text('天气暂不可用','天氣暫不可用'));
            item.title = 'Open-Meteo · ' + (current?.time || weatherUpdated);
            copy.append(item);
        });
        const duplicate = copy.cloneNode(true); duplicate.setAttribute('aria-hidden','true'); duplicate.inert = true;
        weatherTrack.replaceChildren(copy,duplicate);
        renderWeatherFlip();
    }
    function renderInfoFlip(slot,signature,title='') {
        if (slot.dataset.signature===signature) return;
        slot.dataset.signature=signature; slot.title=title;
        clearTimeout(timers.get(slot));slot.querySelectorAll('.city-feed-outgoing').forEach(node=>node.remove());
        const previous=slot.firstElementChild, face=document.createElement('div');face.className='city-feed-face';face.textContent=signature;
        if(previous) {previous.className='city-feed-face city-feed-outgoing';previous.setAttribute('aria-hidden','true');face.classList.add('city-feed-incoming');}
        slot.append(face);timers.set(slot,setTimeout(()=> {previous?.remove();face.classList.remove('city-feed-incoming');},650));
    }
    function renderWeatherFlip() {
        const items=weatherTrack.querySelector('.city-feed-weather-copy')?.children;
        if (!items?.length) return;
        const item=items[weatherPage % cities.length]; renderInfoFlip(weatherFlip,item.textContent,item.title);
        weatherFullSlots.forEach((slot,index)=> {const item=items[(weatherPage*2+index)%cities.length];renderInfoFlip(slot,item.textContent,item.title);});
        const journeys=[...document.querySelectorAll('#city-journey-grid .city-journey-card')];
        const row=journeys[weatherPage % Math.max(1,journeys.length)];
        const value=row ? [row.querySelector('.city-journey-name')?.textContent,row.querySelector('.city-journey-direction')?.textContent,row.querySelector('.city-journey-value')?.textContent,row.querySelector('.city-journey-status')?.textContent].filter(Boolean).join(' · ').replace(/\s+/g,' ') : text('行车时间暂不可用','行車時間暫不可用');
        renderInfoFlip(trafficFlip,value,document.getElementById('city-journey-updated')?.textContent || '');
    }
    const freshness = {};
    function markFresh(kind,success=true) {
        const previous=freshness[kind];
        freshness[kind]={time:success ? (networkEpoch === null ? Date.now() : networkEpoch+performance.now()-networkAnchor) : previous?.time,success};renderFreshness();
    }
    function renderFreshness() {
        const labels={rss:text('RSS','RSS'),traffic:text('行车','行車'),markets:text('行情','行情'),weather:text('天气','天氣'),fx:text('汇率','匯率')};
        updates.textContent=text('更新：','更新：')+Object.entries(labels).map(([kind,label])=> {const data=freshness[kind];return label+' '+(data?.time ? new Date(data.time).toLocaleTimeString('en-GB',{timeZone:'Asia/Hong_Kong',hour12:false}) : '--')+(data?.success===false ? text('（失败）','（失敗）') : '');}).join(' · ')+text(' · 行情可能延迟',' · 行情可能延遲');
    }
    document.addEventListener('city-feed-source-update',event=> {if(event.detail?.kind) markFresh(event.detail.kind,event.detail.success);});
    let refreshingFeed=false;
    async function refreshFeedSources() {
        if(refreshingFeed) return;refreshingFeed=true;
        try {await Promise.allSettled([
            typeof fetchHKNews==='function' ? fetchHKNews(true) : Promise.resolve(),
            typeof updateCityJourneys==='function' ? updateCityJourneys() : Promise.resolve(),
            refreshStocks(),refreshWorldWeather(),refreshFX()
        ]);} finally {refreshingFeed=false;renderWeatherFlip();}
    }
    renderFreshness();
    setInterval(()=> {if(expanded && !document.hidden) refreshFeedSources();},60000);
    async function refreshWorldWeather() {
        try {
            const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + cities.map(c=>c[2]).join(',') + '&longitude=' + cities.map(c=>c[3]).join(',') + '&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1';
            const response = await fetch(url,{signal:AbortSignal.timeout(15000)});
            if (!response.ok) throw new Error('Weather unavailable');
            const data = await response.json();
            if (!Array.isArray(data) || data.length !== cities.length) throw new Error('Incomplete weather');
            worldWeather = data; weatherUpdated = new Date().toISOString(); markFresh('weather',true);
            localStorage.setItem('navi_world_weather',JSON.stringify({data,time:Date.now()}));
        } catch { markFresh('weather',false); /* Retain the last successful observation instead of inventing temperatures. */ }
        renderWorldWeather();
    }
    try {const cached = JSON.parse(localStorage.getItem('navi_world_weather')); if (cached?.data?.length === cities.length && Date.now()-cached.time < 3600000) worldWeather = cached.data;} catch {}
    renderWorldWeather(); refreshWorldWeather();
    setInterval(()=> {if (!document.hidden) refreshWorldWeather();},600000);

    const finance = document.getElementById('city-finance');
    if (finance) new MutationObserver(syncRates).observe(finance,{childList:true,subtree:true,characterData:true});
    new MutationObserver(() => { renderMarkets(); renderWorldWeather(); renderFreshness(); }).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    matchMedia('(max-width:600px)').addEventListener('change',() => { page = 0; renderMarkets(); });
    window.addEventListener('resize',applyDisplay);
    clock(); syncClock(); syncRates(); refreshStocks(); refreshFX();
    setInterval(()=> {if (!document.hidden && performance.now()-lastTimeAttempt >= (lastTimeSyncFailed?30000:300000)) syncClock();},30000);
    window.addEventListener('online',syncClock);
    document.addEventListener('visibilitychange',()=> {if (!document.hidden && performance.now()-lastTimeAttempt >= 300000) syncClock();});
    setInterval(clock,1000);
    setInterval(() => { if (!document.hidden) { page++; featuredPage++; weatherPage++; renderWeatherFlip(); boardPage++; renderMarkets(); } },6000);
    setInterval(() => { if (!document.hidden) {refreshStocks();refreshFX();} },120000);
})();
