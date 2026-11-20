// Recalculate masonry spans when live data, fonts, or viewport widths change.
(() => {
    const grid = document.querySelector('.city-dashboard-grid');
    if (!grid || typeof ResizeObserver === 'undefined') return;
    const mobile = matchMedia('(max-width:900px)');
    const observed = new Set();
    let frame = 0;
    function arrange() {
        frame = 0;
        const gap = Number.parseFloat(getComputedStyle(grid).rowGap) || 18;
        const cards = [...grid.children].filter(node=>node.matches('article'));
        // Batch height reads before writing spans to avoid repeated layout work.
        const spans = cards.map(card=> {
            const height = card.getBoundingClientRect().height;
            return !mobile.matches && height > 0 ? 'span ' + Math.ceil((height + gap) / (4 + gap)) : '';
        });
        cards.forEach((card,index)=> {
            if (card.style.gridRowEnd !== spans[index]) card.style.gridRowEnd = spans[index];
        });
        grid.classList.toggle('city-masonry-ready',!mobile.matches);
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(arrange); }
    const resize = new ResizeObserver(schedule);
    function observeCards() {
        for (const card of observed) if (card.parentElement !== grid) { resize.unobserve(card); observed.delete(card); }
        for (const card of grid.children) if (card.matches('article') && !observed.has(card)) { observed.add(card); resize.observe(card); }
        schedule();
    }
    new MutationObserver(observeCards).observe(grid,{childList:true});
    mobile.addEventListener('change',schedule);
    observeCards();
})();
