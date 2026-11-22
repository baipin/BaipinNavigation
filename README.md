# BaipinNavigation
A pure Navigation 一个简单纯粹的导航页面，包含RSS订阅、自定义书签、自定义搜索引擎、自定义背景、夜间模式。同时支持导入导出所有自定义设置。  

<img width="1762" height="811" alt="image" src="https://github.com/user-attachments/assets/782b53c4-3ca8-4d1e-b16e-33a00d3737fa" />  

## Deployment
你需要自行设置环境变量`UNSPLASH_ACCESS_KEY`，以用于获取随机背景图片。API请移步[Unplash API](https://unsplash.com/developers) 申请。  
请修改或者删除html页面中的谷歌统计代码。即注释`  <!-- Google tag (gtag.js)  -->` 后紧跟的Script。  
然后克隆本仓库，部署到Vercel或类似环境即可。  


## Google 多端预设同步

数据管理面板支持 Google 登录、手动同步及每台设备单独开启的自动同步。预设保存在各用户 Google Drive 的 `appDataFolder`，不需要另建数据库。首次发现两端不同或两端均修改时，用户选择使用云端或本机；自动检查每 30 秒执行，在编辑期间暂停。登录凭证不会写入前端或 JSON 备份。

生产域名为 `https://123.baipon.com`。部署前需要：

1. 在同一 Google Cloud 项目启用 **Google Drive API**，配置 Google Auth Platform 的品牌信息、受众与数据访问范围。
2. OAuth 客户端类型选择 **Web application**，授权重定向 URI 精确填写 `https://123.baipon.com/api/sync?action=callback`。授权域名为 `baipon.com`；首页为 `https://123.baipon.com`，隐私政策为 `https://123.baipon.com/privacy.html`，服务条款为 `https://123.baipon.com/terms.html`。
3. 申请的范围仅为 `openid`、`email`、`profile` 和 `https://www.googleapis.com/auth/drive.appdata`。测试模式需把测试账号加入受众；Google 对测试应用刷新令牌的有效期有限制，公开使用请按控制台要求发布应用。
4. Vercel 设置服务端环境变量 **`GOOGLE_KEY`** 为 OAuth 客户端密钥，随后重新部署。不要把密钥写入 HTML、Git 或以 `PUBLIC_` / `NEXT_PUBLIC_` 开头的变量。客户端 ID 已预设；更换项目可设置 `GOOGLE_CLIENT_ID`。更换正式域名可设置 `GOOGLE_REDIRECT_URI` 为完整回调地址，并同步修改 Google 控制台和政策页面的域名。
5. 登录应从正式域名发起，预览域名和本地地址不会复用生产登录 Cookie。同步会话使用 AES-GCM 加密的 `HttpOnly; Secure; SameSite=Lax` Cookie，最长 30 天；OAuth 使用 state 与 PKCE，写入接口核验请求来源及云端版本。

统一预设范围包括书签、搜索引擎、RSS、CITY FEED 自选股票、显示项目、RSS 子项目与跑马速度、主题、语言、背景、雨量与 AQHI 地区。会话、自动同步开关、同步基线、实时资料缓存和统计 Cookie 不会导出或上传。旧 JSON 备份仍可导入；仅接收已知的预设键和背景 Cookie。

隐私政策与服务条款均提供简体、繁体版本，继承本站语言设置，也支持 `?lang=sc` / `?lang=tc`。页面本身不加载统计代码。正式对外使用前，维护者应确认政策内容与实际服务一致。

退出登录只清除本机同步会话，不删除云端预设。撤销权限请使用 Google 账号的第三方连接设置；删除云端预设可在 Google Drive 设置的“管理应用”中删除本站的隐藏应用数据。先关闭各设备自动同步并退出登录，避免再次上传。

运行接口与预设验证：`node tests/sync.test.mjs`。这些测试使用模拟 Google 服务，不会发送真实授权或预设数据；真实 Google 登录仍需上述控制台设置与用户授权。


### Google 审核中的公开页面

OAuth 品牌信息的“应用首页”必须使用 `https://123.baipon.com/`，不要填写 `/api/sync?action=login`、Google 授权地址或回调地址。首页的应用介绍、功能、Google 数据用途及政策链接均以静态 HTML 公开呈现，不依赖登录或同步接口。隐私政策使用 `https://123.baipon.com/privacy.html`，服务条款使用 `https://123.baipon.com/terms.html`；品牌名称和徽标应与首页的百品导航（Baipin Navigation）一致，并在 Google 控制台完成域名所有权验证。

隐私政策列明 Google 账号标识、姓名、邮箱、Drive 应用专用文件、OAuth 令牌的访问用途、处理及共享对象、安全措施、保留期限和删除流程，并明确 Limited Use、禁止通用 AI 模型训练和 AI NCII 用途。维护者应在实际数据处理方式改变前同步更新披露。提交审核时请使用不带登录参数的根域名首页；网页更新本身不代表 Google 已批准应用，控制台配置和重新提交仍需由项目所有者完成。


## GitHub 登录与 Secret Gist 同步

数据管理中可选择 Google Drive 或 GitHub Gist。两个服务的会话、账号基线与自动同步开关分开，不会按同名或邮箱自动合并；只有用户主动同步时，本机预设才上传到当前服务。JSON 导入导出仍使用同一白名单，不包含任何服务的会话或令牌。

请创建 **GitHub OAuth App**（Settings → Developer settings → OAuth Apps → New OAuth App），不要创建需要 Webhook、Private Key 和安装权限的 GitHub App：

- Application name：百品导航；Homepage URL：`https://123.baipon.com/`。
- Description：个人导航与香港资讯首页，支持 Secret Gist 预设同步。
- Authorization callback URL：`https://123.baipon.com/api/github?action=callback`。
- Enable Device Flow：关闭；OAuth App 不需要配置 Webhook URL、Webhook Secret 或 Private Key。
- 将 Client ID 写入 Vercel 环境变量 `GITHUB_CLIENT_ID`，Client Secret 写入 `GITHUB_KEY`，然后重新部署。密钥仅在服务端使用。
- 如更换域名，可配置 `GITHUB_REDIRECT_URI` 为完整回调 URL，同时更新 GitHub OAuth App。不要将客户端密钥放进任何前端环境变量、仓库或聊天记录。

本站登录请求仅携带 `gist` 范围，使用 state 与 PKCE。GitHub 的 `gist` OAuth 范围可以访问账号的 Gist，无法约束到一个应用文件；本站读取列表元数据来定位自有、非公开且带本站标记的 Gist，只读写 `baipin-navigation-presets-v1.json`，不申请仓库或私人邮箱权限。登录身份仅保留公开 ID、用户名和显示名称。支持提供商返回的过期令牌和刷新令牌；同步会话最长 30 天，独立 Cookie 使用 AES-GCM 加密、HttpOnly、Secure 和 SameSite=Lax。

**Secret Gist 不是私有存储**，知道链接的人可能读取未加密 JSON。界面会在登录前显示此限制；请勿同步敏感信息。Gist 更新前检查版本，遇到明确版本或条件请求冲突会要求重试；GitHub Gist 不是事务数据库，同时写入仍可能产生竞争，可通过 Gist 修订历史核对。首次同步或两端均修改时仍会要求用户选择保留版本。

退出当前服务不删除云端数据。删除 Gist 前，先关闭各设备的 GitHub 自动同步并退出，再在 gist.github.com 删除本站对应的预设 Gist。撤销应用授权使用 GitHub Settings → Applications → Authorized OAuth Apps。更完整的数据处理与使用范围见双语隐私政策和服务条款。

验证：`node tests/github.test.mjs` 和 `node tests/sync.test.mjs`。这些测试使用模拟服务，不构成真实 GitHub 授权验证；正式登录需完成 OAuth App 和 Vercel 配置。


## 统一设置与页脚

顶栏“设置”合并背景与同步入口，提供常规、背景、登录与备份三个分类。常规包含语言和主题切换、降雨量与 AQHI 预设地区，以及书签、搜索引擎、RSS 与 CITY FEED 的现有配置入口；天气地区直接复用页面原控件，仍使用原有导入导出和同步键。页脚语言切换继续保留。

登录页先展示 GitHub 登录和 Google 登录两个按钮；登录后才显示账号与同步详细设置。已有会话会直接展示详情。移动端顶栏搜索提供 300 ms 展开和 200 ms 收起的 Material 缓动，尊重减少动态效果设置；独立与顶栏共用输入框和清除按钮。清空输入会取消尚未触发的联想请求，并忽略过期结果。

紧凑页脚为单栏，显示香港时区的当前年份；登录后按当前服务显示头像（失败时显示文字占位）和本设备上次成功同步时间。头像 URL 仅放在原加密会话 Cookie，不加入预设或 JSON 备份。W3C WCAG 2.0 AA 图标来源为 https://www.w3.org/WAI/wcag2AA-blue.png （官方蓝色版本，本地资源：`img/wcag2AA-blue.png`），链接至标准说明，仅作为标准链接，不宣称本站经过合规认证或完整无障碍审计。

设置中的“恢复默认设置”仅还原预设允许列表中的本机偏好与背景，保留登录及云端文件，并暂停本设备所有账号的自动同步。确认框可先导出备份；同一标签页可用 sessionStorage 临时快照撤销恢复，快照不进入同步。

点击温度旁的天文台警告图标可打开跟随深浅主题的详情弹窗，查看当前警告内容及当天全部警告的发出／取消记录表格（包含天文台原版警告图标）。`api/weather-warnings.js` 使用固定天文台 warningInfo 和官方警告页面引用的 wxwarntoday_uc.json 数据源，支持简繁中文、部分失败提示和手动刷新，时间以 UTC+8 显示；旧记录会标明日期。接口回归检查：`node tests/weather-warnings.test.mjs`。

设置分类使用 MDUI 原生 `mdui-tabs`、`mdui-tab` 和 `mdui-tab-panel`，提供 Material 选中指示条、涟漪与键盘交互；OAuth 回调继续打开登录与备份标签。警告记录表采用 Material 数据表格排版、横向行分隔、圆角容器和主题色状态标签，保留语义化表头及原版警告图标。

背景设置增加天文台天气摄影机和运输署交通快拍：可搜索地点并点击缩略图设为背景，镜头每批展示 12 个，图像按可见范围载入。天气背景每 3 分钟、交通背景每 2 分钟更新，支持暂停自动更新、手动刷新及恢复照片背景；后台页面不定时请求图片，加载失败保留最后背景。`navi_camera_background` 只保存来源、镜头编号及刷新偏好，随预设导入导出、Google/GitHub 同步及恢复默认设置处理，照片 Cookie 保留为备用背景。

镜头目录 `data/background-cameras.json` 于 2026-11-22 取自 [天文台天气照片](https://www.hko.gov.hk/tc/wxinfo/ts/index_webcam.htm)（34 个）及 [运输署交通快拍官方目录](https://static.data.gov.hk/td/traffic-snapshot-images/code/Traffic_Camera_Locations_Tc.csv)（973 个）。交通快拍本身通常为 320×240，并非视频。广告保持在快捷访问容器底部，剩余高度由上方快捷访问区域承担。

交通直播背景提供香港、九龙、荃湾、屯门及屯门（汀九—大榄角）五组官方轮播，可选首帧静态背景或静音视频背景，支持缩略图选择。首帧截取后停止播放；视频每 2 分钟重新请求，切至后台暂停并保留静态画面，返回后重新连接。偏好随导入导出及同步保存，不包含视频或短期播放令牌。来源：https://www.hkemobility.gov.hk/sc/traffic-information/live/webcast 。

`api/webcast.js` 仅代理上述五组官方 HLS 清单与限定文件名的视频片段，不接受任意上游地址；响应不缓存。浏览器使用原生 HLS 或本地 `js/vendor/hls.light.min.js`（hls.js 1.6.15，BSD-2-Clause，许可证见同目录 hls-LICENSE）。

天气详情：点击本港天气标题右侧的展开按钮，可查看本港预测、九天天气、256 公里雷达及南中国红外卫星图；支持简繁中文、深浅主题及移动布局。图像索引由 `api/weather-imagery.js` 从固定官方地址读取，仅解析受限文件名，不执行上游脚本；图像直接引用天文台，标注实际图像时间，打开时加载，停留时每 5 分钟更新当前页签。

急症室轮候时间配色为本站视觉分级（并非医院管理局的临床分流级别）：不超过 1 小时绿色、超过 1 至不足 3 小时黄色、3 小时及以上红色，无法解析时灰色；T3 与 T45 分别按其原始时间着色。广告使用容器宽度的响应式广告位及受限外层，避免浏览器缩窄时已生成的广告撑破快捷访问卡片。

交通直播稳定性：视频片段代理超时提升至 20 秒，播放器允许 45 秒启动并采用有限重试，距实时边缘保留 3 个片段，避免抢读尚未完整发布的片段；仍每 2 分钟重连。

九天预报以单行 Material 阴影纸片展示，支持横向滑动和键盘选日；生效天气警告使用与首页相同的官方图标，点击后打开警告说明及当日记录。直播背景等待首帧绘制再展示，断线后每 10 秒自动重试（正常播放仍每 2 分钟重连）。

Material Design 图标字体由本站 `/fonts/material-icons.woff2` 提供，天气详情入口使用 `open_in_full`，关闭使用 `close`，不再依赖 Google Fonts 图标请求。字体来自 Google Material Icons（Apache-2.0），许可证随文件保存。

天气详情新增过去一小时分区雨量示意图，使用天文台现行 `cokrig_barnes` 图像，按官方 11 分钟发布延迟查找最近可用的季度小时图像，并标注图像时间。警告详情固定在天气详情上层。交通直播选择器使用已标注的同区域交通快拍预览，不再为五个缩略图排队启动视频；选中直播或首帧立即优先加载。手机点按主搜索框后会动画移动至顶栏，保持输入焦点，关闭后恢复原位置。

背景来源支持 Bing 每日图片，通过本站固定地址接口获取官方图片信息，浏览器直接载入图片；显示版权署名，可每小时自动检查、手动刷新，获取失败保留原背景。来源及更新偏好沿用预设导入导出与 Google/GitHub 同步；图片及其元数据不写入备份。

CITY FEED 股票与指数卡片加入最近交易日的真实 5 分钟价格走势 SVG 背景，来源为 Yahoo Finance chart，由 `/api/market-trend` 校验标的后请求。小工具、全屏及自选股票共用渲染，浏览器按需请求、最多并发 3 个、缓存 5 分钟；接口可缓存，缺失或失败时保留报价并省略走势，已有走势更新失败则保留上次数据。悬停标题标注最近交易日期与交易所时区；走势图仅作背景示意，无坐标轴。

天气详情新增空气质素页签，直接读取香港政府仪表板 AQHI 各站数据。香港轮廓为 datasets/geo-countries 所整理的 Natural Earth 公有领域数据，内嵌于本地 SVG；站点位置为近似示意，圆点为一般站、方块为路边站，颜色及数值表示各站 AQHI，支持键盘或点击选站、详情及全站表格。页面不将监测站数值推算为区域连续污染分布，并保留各站资料时间与环保署健康忠告链接。

天气详情新增热带气旋路径、分区气温及世界天气。气旋接口仅读取天文台固定清单及受限数字编号的资料，按纯文本重建描述与预报表，超过 24 小时的资料明显标记为旧资料。分区气温使用天文台各站实测；世界天气以 Open-Meteo 地名搜索及天气接口提供最多 20 个自选城市、当前天气及未来三天预报，可添加、删除并随预设导入导出、Google/GitHub 同步与恢复默认设置处理。城市仅保存名称、国家、城市坐标和首页显示偏好，不保存实时天气缓存。

分区气温增加可点击及键盘选站的香港 SVG 地图（Natural Earth 公有领域轮廓，监测站位置为近似示意）。世界天气的逐日预报显示 WMO 天气状况、天文台图标及温度范围；勾选「贴在首页」后，在首页天气小工具底部以紧凑行显示城市天气、温度及湿度，每 5 分钟更新。首页显示偏好随城市清单一并导入导出和同步，取消勾选或移除城市会立即移除该行。


## Microsoft 登录与 OneDrive 同步

只在自己的 OneDrive 应用文件夹读写 `baipin-navigation-presets-v1.json`，使用 eTag 条件更新和初次创建冲突保护。三种服务的会话、自动同步和账号版本基线独立；切换服务不会自动合并云端预设。Microsoft 用户资料由 Graph `/me` 获取，页脚以姓名首字作头像，不请求头像或其他文件。令牌以 AES-GCM 加密后放入最多三个独立的 HttpOnly Secure Cookie（每段不超过 3500 字符），总会话最长 30 天，刷新令牌轮换不延长原期限。退出不删除云端文件或撤销授权。

验证：`node tests/microsoft.test.mjs` 使用模拟 Microsoft 服务检查 OAuth、权限、会话、刷新、文件读写、冲突和异常，不构成真实授权验证。未配置环境变量时界面会显示配置提示，不发起无效登录。

天气卡片的「贴在首页」移到卡片底部的独立紧凑操作栏。Google、GitHub、Microsoft 登录图标为本站 SVG 文件，无外部图标请求。


## 日历

首页月历支持 Google Calendar、Microsoft Outlook Calendar 与 iCloud CalDAV，各服务一个账号、多本日历，查看、增加、编辑和确认删除日程，每 5 分钟自动刷新；显示与编辑时间采用设备本地时区，全日日程的结束日期不包含该日。Google/Microsoft 复用预设同步会话，但仅在用户主动点击日历授权时追加日历权限；同账号追加授权会校验账号 ID，避免替换已有账号。iCloud 独立连接，不需要 Apple Developer 或 Apple 登录；App 专用密码由用户在日历连接对话框输入，不作为全站环境变量。

日历显示偏好（服务、账号标识、所选日历 ID）纳入预设导入导出、恢复默认和多端同步；日程内容、OAuth 令牌与 iCloud 密码不进入预设。日程只保留页面内存，服务端请求期间临时处理。iCloud 凭证保存在最长 30 天的独立 AES-GCM 加密 HttpOnly Secure Cookie；用 ICLOUD_SESSION_KEY 加密。CalDAV 仅允许 Apple 官方固定主机格式，不接受任意服务器地址，XML 拒绝 DTD/实体声明。Google/Microsoft 和 CalDAV 更新使用 ETag 冲突检查；iCloud 重复日程修改/删除只影响本次，含邀请的 iCloud 日程在本站只读。

测试：`node tests/calendar.test.mjs`、`node tests/calendar-oauth.test.mjs`、`node tests/icloud.test.mjs`，并运行原有 sync/microsoft/github 测试。测试均使用模拟服务；真实授权仍需提供商权限和应用配置。

日历对话框的 Google/Microsoft 退出仅停用当前设备的日历连接，预设同步会话和自动同步状态保留；服务器会阻止已停用连接的日历读写，普通预设重新登录不会自动重新连接日历，需用户再次点击日历授权。iCloud 断开仍只清除其独立会话。
