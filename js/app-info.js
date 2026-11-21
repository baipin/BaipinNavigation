(() => {
// The overview is public HTML; translation never depends on Google login or a sync request.
const overview = document.getElementById('app-overview');
const labels = {
    sc:{name:'百品导航 · Baipin Navigation',purpose:'一站式个人导航与香港资讯首页',features:'管理快捷书签、切换搜索引擎、订阅 RSS 新闻，查看香港天气、交通及市场资讯，并自定义首页布局与偏好。',access:'无需登录即可使用导航、搜索、资讯和本机设置，也可直接阅读本站的隐私政策与服务条款。',sync:'Google 登录仅用于可选的多端预设同步：用账号标识、姓名和邮箱识别同步账号，在你自己的 Google Drive 应用专用空间保存本站预设。只申请 drive.appdata，不读取其他 Drive 文件、Gmail、通讯录或日历。',limits:'本站的 Google API 功能仅用于账号识别与预设同步；不提供 AI 图像生成，不将 Google API 或用户数据用于 AI 生成的未经当事人同意的私密图像（AI NCII），也不用于通用 AI 模型训练。',continue:'无需登录，直接使用',privacy:'隐私政策',terms:'服务条款'},
    tc:{name:'百品導航 · Baipin Navigation',purpose:'一站式個人導航與香港資訊首頁',features:'管理快捷書籤、切換搜尋引擎、訂閱 RSS 新聞，查看香港天氣、交通及市場資訊，並自訂首頁版面與偏好。',access:'毋須登入即可使用導航、搜尋、資訊和本機設定，亦可直接閱讀本站的隱私政策與服務條款。',sync:'Google 登入僅用於可選的多端預設同步：用帳戶識別碼、姓名和電郵識別同步帳戶，在你自己的 Google Drive 應用專用空間儲存本站預設。僅申請 drive.appdata，不讀取其他 Drive 檔案、Gmail、通訊錄或日曆。',limits:'本站的 Google API 功能僅用於帳戶識別與預設同步；不提供 AI 圖像生成，不將 Google API 或使用者資料用於 AI 生成的未經當事人同意的私密圖像（AI NCII），亦不用於通用 AI 模型訓練。',continue:'毋須登入，直接使用',privacy:'隱私政策',terms:'服務條款'}
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
