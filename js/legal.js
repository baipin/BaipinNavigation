const translations = JSON.parse(document.getElementById('legal-translations').textContent);
const params = new URLSearchParams(location.search);
let language = params.get('lang') || localStorage.getItem('navi_language') || (/zh-(CN|SG)|Hans/i.test(navigator.language)?'sc':'tc');
function render() {
    language = language === 'sc' ? 'sc' : 'tc';
    const text = translations[language];
    document.documentElement.lang = language === 'sc' ? 'zh-CN' : 'zh-HK';
    document.title = text.title+' · '+text.brand;
    document.querySelectorAll('[data-legal-text]').forEach(element=> { element.textContent = text[element.dataset.legalText]; });
    document.getElementById('legal-language').textContent = language === 'sc' ? '繁體中文' : '简体中文';
    document.getElementById('legal-language').setAttribute('aria-label',language === 'sc' ? '切换繁体中文' : '切換簡體中文');
    document.querySelectorAll('[data-legal-page]').forEach(link=> { link.href = link.dataset.legalPage+'?lang='+language; });
}
document.getElementById('legal-language').onclick = () => {
    language = language === 'sc' ? 'tc' : 'sc'; localStorage.setItem('navi_language',language);
    const url = new URL(location.href); url.searchParams.set('lang',language); history.replaceState(null,'',url);
    render();
};
render();
