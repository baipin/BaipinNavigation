(() => {
// The overview is public HTML; translation never depends on Google login or a sync request.
const overview = document.getElementById('app-overview');
const labels = {
    sc:{name:'百品导航',purpose:'一站式个人导航与香港资讯首页',features:'管理快捷书签、切换搜索引擎、订阅 RSS 新闻，查看香港天气、交通及市场资讯，并自定义首页布局与偏好。',access:'无需登录即可使用导航、搜索、资讯和本机设置。',sync:'Google 登录仅用于可选的多端预设同步：本站使用账号标识、姓名和邮箱识别同步账号，并在你自己的 Google Drive 应用专用空间保存本站预设。本站的 Google API 功能仅用于账号识别与预设同步；不提供 AI 图像生成，不将 Google API 或用户数据用于 AI 生成的未经当事人同意的私密图像（AI NCII），也不用于通用 AI 模型训练。本站不建立用户个人信息或预设数据库；同步所需资料仅在请求期间由服务器临时处理，不另行持久保存。',privacy:'隐私政策',terms:'服务条款'},
    tc:{name:'百品導航',purpose:'一站式個人導航與香港資訊首頁',features:'管理快捷書籤、切換搜尋引擎、訂閱 RSS 新聞，查看香港天氣、交通及市場資訊，並自訂首頁版面與偏好。',access:'毋須登入即可使用導航、搜尋、資訊和本機設定。',sync:'Google 登入僅用於可選的多端預設同步：本站使用帳戶識別碼、姓名和電郵識別同步帳戶，並在你自己的 Google Drive 應用專用空間儲存本站預設。本站的 Google API 功能僅用於帳戶識別與預設同步；不提供 AI 圖像生成，不將 Google API 或使用者資料用於 AI 生成的未經當事人同意的私密圖像（AI NCII），亦不用於通用 AI 模型訓練。本站不建立使用者個人資料或預設資料庫；同步所需資料僅在請求期間由伺服器暫時處理，不另行持久儲存。',privacy:'隱私政策',terms:'服務條款'}
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
