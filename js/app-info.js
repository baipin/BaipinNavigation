(() => {
// The overview is public HTML; translation never depends on Google login or a sync request.
const overview = document.getElementById('app-overview');
const labels = {
    sc:{name:'百品导航',purpose:'一站式个人导航与香港资讯首页',features:'管理快捷书签、切换搜索引擎、订阅 RSS 新闻，查看香港天气、交通、市场资讯及日历，并自定义首页布局与偏好；支持通过 Google Drive、GitHub Secret Gist、Microsoft OneDrive 或飞书云空间在设备间同步个人预设，也可另行授权连接 Google、Microsoft、飞书、iCloud 或学校 Canvas 日历。',access:'无需登录即可使用导航、搜索、资讯和本机设置。',privacy:'隐私政策',terms:'服务条款',history:'版本历程',projects:'其他项目'},
    tc:{name:'百品導航',purpose:'一站式個人導航與香港資訊首頁',features:'管理快捷書籤、切換搜尋引擎、訂閱 RSS 新聞，查看香港天氣、交通、市場資訊及日曆，並自訂首頁版面與偏好；支援透過 Google Drive、GitHub Secret Gist、Microsoft OneDrive 或飛書雲空間在裝置間同步個人預設，亦可另外授權連接 Google、Microsoft、飛書、iCloud 或學校 Canvas 日曆。',access:'毋須登入即可使用導航、搜尋、資訊和本機設定。',privacy:'私隱政策',terms:'服務條款',history:'版本歷程',projects:'其他項目'}
};
// The initial HTML and sharing metadata retain the descriptive site title.
// Greetings use the visitor's device timezone, independently of the Hong Kong clocks.
function renderTitle() {
    const simple=document.documentElement.lang==='zh-CN';
    const hour=new Date().getHours();
    const greeting=hour<5 || hour>=23?(simple?'这么晚了，早点睡啦~早唞~':'咁夜，早點瞓啦~早唞~'):
        hour<11?'Good Morning! 早晨~':hour<14?'午安吶~ 中午好~':hour<18?'Good Afternoon! 下午好~':'Good evening~ 晚上好~';
    document.title=(simple?'百品导航':'百品導航')+' - '+greeting;
}
function renderOverview() {
    const language = document.documentElement.lang === 'zh-CN' ? 'sc' : 'tc';
    const text = labels[language];
    overview.querySelectorAll('[data-app-info]').forEach(element=> { element.textContent = text[element.dataset.appInfo]; });
    overview.querySelectorAll('[data-app-policy]').forEach(link=> { link.href = '/'+link.dataset.appPolicy+'.html?lang='+language; });
    renderTitle();
}
document.getElementById('footer-year').textContent=new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Asia/Hong_Kong'}).format(new Date());
renderOverview();
setInterval(renderTitle,60000);
window.addEventListener('focus',renderTitle);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')renderTitle();});
new MutationObserver(renderOverview).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});

})();
