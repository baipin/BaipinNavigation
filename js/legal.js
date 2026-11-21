const translations = JSON.parse(document.getElementById('legal-translations').textContent);
const params = new URLSearchParams(location.search);
let language = params.get('lang') || localStorage.getItem('navi_language') || (/zh-(CN|SG)|Hans/i.test(navigator.language)?'sc':'tc');
function render() {
    language = language === 'sc' ? 'sc' : 'tc';
    const text = translations[language];
    document.documentElement.lang = language === 'sc' ? 'zh-CN' : 'zh-HK';
    document.title = text.title+' · '+text.brand;
    document.querySelectorAll('[data-legal-text]').forEach(element=> { element.textContent = text[element.dataset.legalText]; });
    document.getElementById('legal-language').setAttribute('title',language === 'sc' ? '切换繁体中文' : '切換簡體中文');
    updateThemeLabel();
    document.getElementById('legal-language').setAttribute('aria-label',language === 'sc' ? '切换繁体中文' : '切換簡體中文');
    document.querySelectorAll('[data-legal-page]').forEach(link=> { link.href = link.dataset.legalPage+'?lang='+language; });
}
document.getElementById('legal-language').onclick = () => {
    language = language === 'sc' ? 'tc' : 'sc'; localStorage.setItem('navi_language',language);
    const url = new URL(location.href); url.searchParams.set('lang',language); history.replaceState(null,'',url);
    render();
};
const themeButton = document.getElementById('legal-theme');
const systemTheme = matchMedia('(prefers-color-scheme:dark)');
function updateThemeLabel() {
    const dark = document.documentElement.classList.contains('mdui-theme-dark');
    themeButton.setAttribute('icon',dark ? 'dark_mode' : 'light_mode');
    const label = language === 'sc' ? (dark ? '切换浅色模式' : '切换深色模式') : (dark ? '切換淺色模式' : '切換深色模式');
    themeButton.setAttribute('aria-label',label); themeButton.setAttribute('title',label);
}
function applyTheme() {
    const saved = localStorage.getItem('theme_mode');
    const dark = saved === 'dark' || (!saved && systemTheme.matches);
    document.documentElement.classList.toggle('mdui-theme-dark',dark);
    document.documentElement.classList.toggle('mdui-theme-light',!dark);
    updateThemeLabel();
}
themeButton.onclick = () => {
    localStorage.setItem('theme_mode',document.documentElement.classList.contains('mdui-theme-dark') ? 'light' : 'dark');
    applyTheme();
};
systemTheme.addEventListener('change',applyTheme);
window.addEventListener('storage',event=> { if (event.key === 'theme_mode') applyTheme(); });
// Reuse the homepage wallpaper preference without changing it or adding page-specific settings.
try {
    const cookie = document.cookie.split(';').map(part=>part.trim()).find(part=>part.startsWith('homepage_bg='));
    if (cookie) {
        const raw = decodeURIComponent(cookie.slice('homepage_bg='.length));
        let saved; try { saved = JSON.parse(raw); } catch { saved = {url:raw}; }
        const url = new URL(saved.url);
        if (['https:','http:'].includes(url.protocol)) {
            document.documentElement.style.setProperty('--legal-wallpaper','url('+JSON.stringify(url.href)+')');
            const credit = document.getElementById('legal-photo-credit');
            credit.textContent = '';
            if (saved.info?.user && saved.info?.userLink) {
                const authorUrl = new URL(saved.info.userLink);
                if (['https:','http:'].includes(authorUrl.protocol)) {
                    const author = document.createElement('a'); author.href = authorUrl.href; author.textContent = saved.info.user;
                    const provider = document.createElement('a'); provider.href = 'https://unsplash.com'; provider.textContent = 'Unsplash';
                    for (const link of [author,provider]) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
                    credit.append('Photo by ',author,' / ',provider);
                }
            }
        }
    }
} catch { /* Keep the default wallpaper if a saved preference is invalid. */ }
applyTheme();
render();
