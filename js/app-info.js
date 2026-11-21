(() => {
// The overview is public HTML; translation never depends on Google login or a sync request.
const overview = document.getElementById('app-overview');
const labels = {
    sc:{name:'百品导航',purpose:'一站式个人导航与香港资讯首页',features:'管理快捷书签、切换搜索引擎、订阅 RSS 新闻，查看香港天气、交通及市场资讯，并自定义首页布局与偏好；支持通过 Google Drive 或 GitHub Secret Gist 在设备间同步个人预设。',access:'无需登录即可使用导航、搜索、资讯和本机设置。',privacy:'隐私政策',terms:'服务条款',projects:'其他项目'},
    tc:{name:'百品導航',purpose:'一站式個人導航與香港資訊首頁',features:'管理快捷書籤、切換搜尋引擎、訂閱 RSS 新聞，查看香港天氣、交通及市場資訊，並自訂首頁版面與偏好；支援透過 Google Drive 或 GitHub Secret Gist 在裝置間同步個人預設。',access:'毋須登入即可使用導航、搜尋、資訊和本機設定。',privacy:'隱私政策',terms:'服務條款',projects:'其他項目'}
};
function renderOverview() {
    const language = document.documentElement.lang === 'zh-CN' ? 'sc' : 'tc';
    const text = labels[language];
    overview.querySelectorAll('[data-app-info]').forEach(element=> { element.textContent = text[element.dataset.appInfo]; });
    overview.querySelectorAll('[data-app-policy]').forEach(link=> { link.href = '/'+link.dataset.appPolicy+'.html?lang='+language; });
}
renderOverview();
new MutationObserver(renderOverview).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});

})();
