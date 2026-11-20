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
    card.replaceChildren(top, bottom, source);

    const isSC = () => localStorage.getItem('navi_language') === 'sc';
    const text = (sc, tc) => isSC() ? sc : tc;
    const state = new Map();
    let marketSource = 'Tencent Finance / Yahoo Finance';
    const markets = [
        { id:'hsi', symbol:'^HSI', names:['恒生指数','恒生指數'] },
        { id:'nasdaq', symbol:'^IXIC', names:['纳斯达克','納斯達克'] },
        { id:'sp500', symbol:'^GSPC', names:['标普500','標普500'] },
        { id:'ftse', symbol:'^FTSE', names:['富时100','富時100'] },
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
    const featuredMarkets = markets.filter((market) => ['hsi','nasdaq','sp500','ftse'].includes(market.id) || market.dom);
    const stocks = markets.filter((market) => market.symbol && !featuredMarkets.includes(market));
    const featured = top.querySelector('.city-feed-featured');
    const slots = Array.from({length:4}, () => {
        const slot = document.createElement('a');
        slot.className = 'city-feed-quote';
        slot.target = '_blank';
        slot.rel = 'noopener noreferrer';
        top.lastElementChild.append(slot);
        return slot;
    });
    let page = 0, featuredPage = 0;
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
        source.textContent = text('市场：','市場：') + marketSource + text(' · 汇率：ExchangeRate-API · 行情可能延迟',' · 匯率：ExchangeRate-API · 行情可能延遲');
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
        if (children.length) first.append(...children);
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
    new MutationObserver(syncHeadlines).observe(track,{childList:true});
    const finance = document.getElementById('city-finance');
    if (finance) new MutationObserver(syncRates).observe(finance,{childList:true,subtree:true,characterData:true});
    new MutationObserver(() => { renderMarkets(); }).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    matchMedia('(max-width:600px)').addEventListener('change',() => { page = 0; renderMarkets(); });
    clock(); syncHeadlines(); syncRates(); refreshStocks();
    setInterval(clock,1000);
    setInterval(() => { if (!document.hidden && !section.matches(':hover, :focus-within')) { page++; renderMarkets(); } },6000);
    setInterval(() => { if (!document.hidden && !section.matches(':hover, :focus-within')) { featuredPage++; renderMarkets(); } },8000);
    setInterval(() => { if (!document.hidden) refreshStocks(); },120000);
})();
