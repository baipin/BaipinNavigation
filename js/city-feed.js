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
    top.innerHTML = '<div class="city-feed-clock"><time id="city-feed-time" aria-label="香港时间"></time><small>UTC+8</small></div><a class="city-feed-featured" target="_blank" rel="noopener noreferrer" aria-label="全球指数与汇率"></a><div class="city-feed-markets" aria-label="个股行情"></div>';
    const bottom = document.createElement('div');
    bottom.className = 'city-feed-bottom';
    bottom.append(label, windowElement);
    const source = document.createElement('div');
    source.className = 'city-feed-source';
    const controls = document.createElement('div'); controls.className = 'city-feed-controls';
    const fullscreenButton = document.createElement('button');
    fullscreenButton.type = 'button'; fullscreenButton.id = 'city-feed-fullscreen'; fullscreenButton.className = 'city-feed-fullscreen-button';
    fullscreenButton.innerHTML = '<span class="material-icons" aria-hidden="true">fullscreen</span><span class="city-feed-fullscreen-label"></span>';
    fullscreenButton.setAttribute('aria-pressed','false');
    controls.append(source,fullscreenButton);
    const board = document.createElement('div'); board.className = 'city-feed-board'; board.hidden = true;
    const heading = document.createElement('div'); heading.className = 'city-feed-board-title'; heading.textContent = 'CITY FEED'; top.append(heading);
    const weather = document.createElement('div'); weather.className = 'city-feed-weather';
    const weatherLabel = document.createElement('span'); weatherLabel.className = 'city-feed-weather-label';
    const weatherWindow = document.createElement('div'); weatherWindow.className = 'city-feed-weather-window';
    const weatherTrack = document.createElement('div'); weatherTrack.className = 'city-feed-weather-track';
    const weatherFlip = document.createElement('div'); weatherFlip.className = 'city-feed-weather-flip';
    weatherWindow.append(weatherFlip,weatherTrack); weather.append(weatherLabel,weatherWindow);
    card.replaceChildren(top, board, weather, bottom, controls);

    const isSC = () => localStorage.getItem('navi_language') === 'sc';
    const text = (sc, tc) => isSC() ? sc : tc;
    const state = new Map();
    let marketSource = 'Tencent Finance / Yahoo Finance';
    const markets = [
        { id:'hsi', symbol:'^HSI', names:['恒生指数','恒生指數'] },
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
        { id:'cny', dom:'city-fx', names:['港币 / 人民币','港幣 / 人民幣'] },
        { id:'jpy', dom:'city-jpy', names:['港币 / 日圆','港幣 / 日圓'] },
        { id:'chf', dom:'city-chf', names:['港币 / 瑞郎','港幣 / 瑞郎'] },
        { id:'usd', dom:'city-usd', names:['美元 / 港币','美元 / 港幣'] }
    ];
    const featuredMarkets = markets.filter((market) => ['hsi','nasdaq','sp500','ftse'].includes(market.id) || market.index || market.dom);
    const stocks = markets.filter((market) => market.symbol && !featuredMarkets.includes(market));
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
        (index === 0 ? group : group.slice(0,12)).forEach((market,offset)=> {
            const slot = document.createElement('a'); slot.className = 'city-feed-board-quote'; slot.target = '_blank'; slot.rel = 'noopener noreferrer';
            list.append(slot); boardQuotes.push({slot,market,stock:index === 1,offset});
        });
        container.append(title,list); board.append(container);
    });
    let expanded = false, nativeFullscreen = false, previousOverflow = '', previousFocus = null;
    function finishFullscreen() {
        if (!expanded) return;
        expanded = false; nativeFullscreen = false;
        section.classList.remove('city-feed-expanded'); board.hidden = true;
        document.body.style.overflow = previousOverflow;
        fullscreenButton.setAttribute('aria-pressed','false');
        renderMarkets(); previousFocus?.focus({preventScroll:true});
    }
    fullscreenButton.addEventListener('click',async()=> {
        if (expanded) {
            if (document.fullscreenElement === section) {try {await document.exitFullscreen();} catch {}}
            finishFullscreen(); return;
        }
        previousFocus = document.activeElement; previousOverflow = document.body.style.overflow;
        expanded = true; board.hidden = false; document.body.style.overflow = 'hidden';
        section.classList.add('city-feed-expanded'); fullscreenButton.setAttribute('aria-pressed','true'); renderMarkets();
        try { if (section.requestFullscreen) {await section.requestFullscreen(); nativeFullscreen = true;} } catch { /* Keep the viewport-filling board when native fullscreen is unavailable. */ }
    });
    document.addEventListener('fullscreenchange',()=> {if (expanded && nativeFullscreen && document.fullscreenElement !== section) finishFullscreen();});
    document.addEventListener('keydown',event=> {if(event.key === 'Escape' && expanded && document.fullscreenElement !== section) finishFullscreen();});
    let page = 0, featuredPage = 0, boardPage = 0;
    const timers = new WeakMap();
    function renderQuote(slot, market) {
        const quote = state.get(market.id);
        slot.href = market.symbol ? 'https://finance.yahoo.com/quote/' + encodeURIComponent(market.symbol) + '/' : 'https://www.google.com/finance/quote/' + ({cny:'HKD-CNY',jpy:'HKD-JPY',chf:'HKD-CHF',usd:'USD-HKD'}[market.id]);
        const name = market.names[isSC() ? 0 : 1];
        const price = quote?.price || '--';
        const change = quote?.change || (quote?.failed ? text('不可用','不可用') : text('读取中','讀取中'));
        const signature = [market.id,name,price,change,quote?.stale].join('|');
        if (slot.dataset.signature === signature) return;
        slot.dataset.signature = signature;
        clearTimeout(timers.get(slot));
        slot.querySelectorAll('.city-feed-outgoing').forEach((node) => node.remove());
        const previous = slot.firstElementChild;
        const face = document.createElement('div');
        face.className = 'city-feed-face';
        face.dataset.direction = quote?.direction || 'flat';
        [ ['city-feed-name',name], ['city-feed-price',price], ['city-feed-change',change] ].forEach(([className,value]) => {
            const span = document.createElement('span');
            span.className = className;
            span.textContent = value;
            face.append(span);
        });
        slot.title = name + (quote?.time ? ' · ' + text('行情时间 ','行情時間 ') + quote.time : '') + (quote?.stale ? text(' · 更新失败，保留上次数据',' · 更新失敗，保留上次數據') : '');
        if (previous) {
            previous.className = 'city-feed-face city-feed-outgoing';
            previous.setAttribute('aria-hidden','true');
            face.classList.add('city-feed-incoming');
        }
        slot.append(face);
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
        renderQuote(featured, featuredMarkets[featuredPage % featuredMarkets.length]);
        // Index/currency and individual-stock pages rotate independently.
        const count = matchMedia('(max-width:600px)').matches ? 2 : 4;
        slots.forEach((slot,index) => renderQuote(slot, stocks[(page * count + index) % stocks.length]));
        boardQuotes.forEach(({slot,market,stock,offset})=>renderQuote(slot,stock ? stocks[(boardPage * 12 + offset) % stocks.length] : market));
        boardLabels[0].textContent = text('全球指数与汇率','全球指數與匯率');
        boardLabels[1].textContent = text('重点个股 · 第 ','重點個股 · 第 ') + (boardPage % Math.ceil(stocks.length/12) + 1) + ' / ' + Math.ceil(stocks.length/12) + text(' 页',' 頁');
        const fullscreenLabel = text(expanded?'退出全屏':'全屏行情',expanded?'退出全屏':'全屏行情');
        fullscreenButton.querySelector('.city-feed-fullscreen-label').textContent = fullscreenLabel;
        fullscreenButton.querySelector('.material-icons').textContent = expanded?'fullscreen_exit':'fullscreen';
        fullscreenButton.setAttribute('aria-label',fullscreenLabel);
        source.textContent = text('市场：','市場：') + marketSource + text(' · 汇率：ExchangeRate-API · 天气：Open-Meteo · 行情可能延迟',' · 匯率：ExchangeRate-API · 天氣：Open-Meteo · 行情可能延遲');
    }
    function syncRates() {
        markets.filter((item) => item.dom).forEach((market) => {
            const value = document.getElementById(market.dom)?.textContent || '';
            const price = value.replace(/^(HK\$1 = |US\$1 = )/, '');
            const valid = /\d/.test(price) && !price.includes('--');
            if (valid) state.set(market.id, { price, change:text('参考','參考') });
            else {
                const previous = state.get(market.id);
                state.set(market.id, previous ? {...previous, stale:true} : {failed:true});
            }
        });
        renderMarkets();
    }
    function clock() {
        const now = new Date();
        const time = document.getElementById('city-feed-time');
        time.textContent = now.toLocaleTimeString('en-GB', {timeZone:'Asia/Hong_Kong',hour:'2-digit',minute:'2-digit'});
        time.dateTime = now.toISOString();
    }
    function syncHeadlines() {
        if (track.querySelector('.city-feed-copy')) return;
        const first = document.createElement('span');
        first.className = 'city-feed-copy';
        const children = [...track.children];
        if (children.length) children.forEach(child=> {
            const item = document.createElement('span'); item.textContent = child.textContent.replace(/\s+/g,' ').trim(); first.append(item);
        });
        else {
            const item = document.createElement('span');
            item.textContent = track.textContent;
            first.append(item);
        }
        const second = first.cloneNode(true);
        second.setAttribute('aria-hidden','true');
        track.style.setProperty('--feed-duration', Math.max(35, first.textContent.length / 4) + 's');
        track.replaceChildren(first, second);
    }
    async function refreshStocks() {
        const available = new Set();
        try {
            const response = await fetch('/api/markets',{cache:'no-store',signal:AbortSignal.timeout(12000)});
            if (!response.ok) throw new Error('Market API unavailable');
            const payload = await response.json();
            for (const quote of payload.quotes || []) {
                if (!Number.isFinite(quote.price) || !Number.isFinite(quote.percent)) continue;
                state.set(quote.id, {
                    price:quote.price.toLocaleString('en-HK',{minimumFractionDigits:2,maximumFractionDigits:2}),
                    change:(quote.percent>0?'+':'') + quote.percent.toFixed(2) + '%',
                    direction:quote.percent>0?'up':quote.percent<0?'down':'flat',
                    time:quote.time + ' (' + quote.zone + ')'
                });
                available.add(quote.id);
            }
            if (available.size) { marketSource = payload.source || 'Tencent Finance'; renderMarkets(); }
        } catch { /* Static hosting can still use the public chart fallback. */ }
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
    function renderWeatherFlip() {
        const item = weatherTrack.querySelector('.city-feed-weather-copy')?.children[weatherPage % cities.length];
        if (!item) return;
        const signature = item.textContent;
        if (weatherFlip.dataset.signature === signature) return;
        weatherFlip.dataset.signature = signature;
        clearTimeout(timers.get(weatherFlip));
        weatherFlip.querySelectorAll('.city-feed-outgoing').forEach(node=>node.remove());
        const previous = weatherFlip.firstElementChild;
        const face = document.createElement('div'); face.className = 'city-feed-face';
        face.textContent = signature; weatherFlip.title = item.title;
        if (previous) {
            previous.className = 'city-feed-face city-feed-outgoing'; previous.setAttribute('aria-hidden','true');
            face.classList.add('city-feed-incoming');
        }
        weatherFlip.append(face);
        timers.set(weatherFlip,setTimeout(()=> {previous?.remove();face.classList.remove('city-feed-incoming');},650));
    }
    async function refreshWorldWeather() {
        try {
            const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + cities.map(c=>c[2]).join(',') + '&longitude=' + cities.map(c=>c[3]).join(',') + '&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1';
            const response = await fetch(url,{signal:AbortSignal.timeout(15000)});
            if (!response.ok) throw new Error('Weather unavailable');
            const data = await response.json();
            if (!Array.isArray(data) || data.length !== cities.length) throw new Error('Incomplete weather');
            worldWeather = data; weatherUpdated = new Date().toISOString();
            localStorage.setItem('navi_world_weather',JSON.stringify({data,time:Date.now()}));
        } catch { /* Retain the last successful observation instead of inventing temperatures. */ }
        renderWorldWeather();
    }
    try {const cached = JSON.parse(localStorage.getItem('navi_world_weather')); if (cached?.data?.length === cities.length && Date.now()-cached.time < 3600000) worldWeather = cached.data;} catch {}
    renderWorldWeather(); refreshWorldWeather();
    setInterval(()=> {if (!document.hidden) refreshWorldWeather();},600000);

    new MutationObserver(syncHeadlines).observe(track,{childList:true});
    const finance = document.getElementById('city-finance');
    if (finance) new MutationObserver(syncRates).observe(finance,{childList:true,subtree:true,characterData:true});
    new MutationObserver(() => { renderMarkets(); renderWorldWeather(); }).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    matchMedia('(max-width:600px)').addEventListener('change',() => { page = 0; renderMarkets(); });
    clock(); syncHeadlines(); syncRates(); refreshStocks();
    setInterval(clock,1000);
    setInterval(() => { if (!document.hidden) { page++; weatherPage++; renderWeatherFlip(); boardPage = (boardPage + 1) % Math.ceil(stocks.length/12); renderMarkets(); } },6000);
    setInterval(() => { if (!document.hidden) { featuredPage++; renderMarkets(); } },8000);
    setInterval(() => { if (!document.hidden) refreshStocks(); },120000);
})();
