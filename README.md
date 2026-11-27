# 百品导航 · Baipin Navigation

可自定义的个人网址导航与香港资讯首页。无需登录即可使用书签、搜索及公开资讯；登录仅用于可选的多端预设同步和日历授权。

**在线体验：[123.baipon.com](https://123.baipon.com/)** · [版本历程](https://123.baipon.com/history.html) · [隐私政策](https://123.baipon.com/privacy.html) · [服务条款](https://123.baipon.com/terms.html)

## 功能

- **导航与搜索**：快捷访问编辑、排序，自定义搜索引擎，移动端搜索框上浮，搜索建议及一键清空。添加书签时自动补齐缺少的网站标题、真实 favicon；图标选择器支持分类及中英文关键词。
- **个性化首页**：简繁中文、深浅色渐变、按屏幕高度调整快捷访问起始位置、18 项小工具开关、背景欣赏模式。支持照片、Unsplash、Bing、天文台摄影机、交通快拍及交通直播背景。
- **香港资讯**：天文台实时天气、警告及当日记录、九天预报、雷达、卫星、分区雨量及气温、AQHI、热带气旋路径；世界城市天气可贴在首页。交通小工具涵盖行车时间、港铁、航班、巴士、急症室及陆路口岸等。
- **CITY FEED**：指数、汇率、自选股票与走势，全球天气、交通及 RSS 跑马灯，独立全屏大屏；可设置显示项目、RSS 子项和速度。
- **热门内容**：GitHub 近期热门仓库、Bilibili／YouTube 热门影片，Apple Music 地区热门歌曲、QQ 音乐多个榜单；横向卡片支持换一批及返回上一批。
- **日历**：Google、Microsoft、飞书及 iCloud 日程读写；Canvas 课程和作业 Due 为只读。提供农历、节气、香港公众假期、今天／明天事件提醒、地图选点。iCloud 使用 App 专用密码，无需 Apple 开发者账户。
- **备份与同步**：JSON 导入导出；Google Drive 应用专用空间、GitHub Secret Gist、Microsoft OneDrive 应用文件夹、飞书云空间同步。支持冲突处理、清除云端预设及恢复默认设置。

## 2026 台湾选举看板

显示在快捷访问上方，随整个小工具区域的间距调整一起移动。2026-11-28 至 11-29（UTC+8）保留展示，11 月 30 日 00:00 自动隐藏；也可在小工具设置关闭。

票数使用 [三立新闻网公开开票页面](https://elect.setn.com/2026/vote) 实际使用的六个 HTML GET 接口：六都市长，以及北部、中部、南部、东部和离岛县市长。已实际验证可公开读取 22 县市、81 位候选人，无需密钥、Cookie 或模拟浏览器授权；不依赖 Poliwave。来源保留明确署名与链接，不混合媒体和官方的票数，不把领先推断成当选；正式结果以中选会公告为准。来源页面结构变动、访问限制或停更仍会影响更新，不能保证未来数据持续可用。

首页及详情按台湾时间自动显示：11 月 28 日 08:00 前投票尚未开始，08:00–16:00 投票进行中，16:00 起开票进行中。不需要刷新页面；接口响应中的服务器时间用于校正显示时钟。投票前及仍只有零值占位的县市显示 —，收到该县市首个正票数后才显示真实票数，接受后续更正。部分地区读取失败会标示并重试，未知字段或无法解析的内容不会被当成正常结果。

页面可见且看板接近视野或详情打开时每 30 秒请求，服务器短暂合并相同请求，阶段变化会使投票前缓存失效。中选会已发布的当届 HTML 结果表可作为独立备用来源。测试保存了开票前真实公开 HTML 样本，验证候选人、占位值、后续票数变动、部分失败、投票时间边界和跨日展示；测试修改的票数明确只用于测试，不是实际选情。

## 部署

项目使用 HTML、CSS、原生 JavaScript、MDUI 2 和 Vercel Node.js Functions，无前端构建步骤。服务端依赖为 `fast-xml-parser` 和 `ical.js`。

1. 克隆仓库并运行 `npm install`。
2. 导入 Vercel 项目，使用仓库根目录；保留 `vercel.json` 的接口重写规则及函数配置。
3. 按需设置以下环境变量，重新部署。未配置的服务不影响其余公开导航功能。
4. 更换域名时，同步调整 OAuth 平台回调、站点公开政策信息、静态品牌信息，以及项目中的广告和统计配置。

| 功能 | 环境变量 |
| --- | --- |
| Unsplash 随机图片 | `UNSPLASH_ACCESS_KEY` |
| Google 登录／预设／日历 | `GOOGLE_KEY`；更换 OAuth 应用时设置 `GOOGLE_CLIENT_ID` |
| GitHub 登录／预设 | `GITHUB_CLIENT_ID`、`GITHUB_KEY` |
| Microsoft 登录／预设／日历 | `MICROSOFT_CLIENT_ID`、`MICROSOFT_KEY` |
| 飞书登录／预设／日历 | `FEISHU_APP_ID`、`FEISHU_APP_SECRET`，建议独立设置 `FEISHU_SESSION_KEY` |
| iCloud 日历会话 | `ICLOUD_SESSION_KEY` |
| Canvas 日历会话 | 建议独立设置 `CANVAS_SESSION_KEY`，也支持现有会话密钥回退 |
| iCloud／Canvas 登录状态云端加密 | `CALENDAR_SYNC_KEY`，至少 32 个随机字符；各部署必须保持一致才能解密旧备份 |
| YouTube 热门 | 已启用 YouTube Data API v3 的 `YOUTUBE_API_KEY` |

OAuth 回调可分别通过 `GOOGLE_REDIRECT_URI`、`GITHUB_REDIRECT_URI`、`MICROSOFT_REDIRECT_URI`、`FEISHU_REDIRECT_URI` 覆盖。Google Drive／Calendar 等服务必须在对应项目中启用 API，配置 scope 不等于启用 API。日历权限可能需要追加授权；学校 Canvas 需有效的个人访问令牌。

所有密钥仅放在服务端环境变量，勿提交到 Git 或放进公开 HTML。本站默认广告与统计代码属于原站点，二次部署者应替换或移除。

## 数据与隐私

普通预设包含书签、搜索引擎、RSS、CITY FEED、自选城市、主题、语言、背景、地区、间距、小工具显示及音乐来源／榜单。实时行情、资讯、图片和换批浏览历史不写入预设。

iCloud App 专用密码及 Canvas 令牌由服务端使用 AES-256-GCM 加密后纳入完整预设，随云端同步及 JSON 导出保存；这属于服务端持钥加密，不是用户独立密码的端到端加密。不要丢失 `CALENDAR_SYNC_KEY`。Google／Microsoft／飞书 OAuth 令牌不复制到其他设备，日历可能需要重新授权。

GitHub Secret Gist 不是真正的私有空间，知道链接的人可以读取其中的普通预设；飞书文件沿用云空间权限。本站不建立用户预设数据库，但同步请求会临时处理资料；各平台、Vercel、外部图片、地图、广告和统计服务各有自己的数据处理政策。完整披露以本站政策页面为准。

退出日历、退出同步账号、清除云端预设和撤销第三方授权是不同操作。清除云端文件不会自动撤销所有平台授权，也不会删除日程。

## 传输助手

同一平台、同一同步账号的设备可以通过顶栏或设置中的传输助手交换文字与小文件，无需新增环境变量或授权范围。文字最多 20,000 字，文件最多 512 KB；每个账号通常保留最多 20 项。每次发送创建独立云端文件，两个设备同时发送不会互相覆盖。

- Google：Drive `appDataFolder` 内独立临时文件；Microsoft：OneDrive 应用文件夹内独立临时文件。
- GitHub：每项使用独立 Secret Gist；知道链接的人可以读取，请勿传敏感内容。
- 飞书：独立 `BaipinNavigation-Transfers` 文件夹，沿用云空间访问权限。
- 24 小时后本站拒绝读取过期项目；实际云端删除在下次打开或请求时清理。可主动逐项删除或确认清空，平台历史版本／回收站不由本站控制。
- 仅打开窗口并且页面可见时每 15 秒刷新列表，关闭／后台／切换账号停止并取消未完成的读取请求。仅点击查看／下载时读取正文，不把传输内容存入 localStorage、预设或 JSON 备份。
- 内容通过本站服务器临时转发，并非端到端加密；清除预设与清理传输区互相独立。

验证：`node tests/transfer.test.mjs`、`node tests/transfer-auth.test.mjs`、`node tests/transfer-polling.test.mjs`。云平台授权和真实服务可用性仍需登录后的实际环境验证。

## 加载与性能

- 图标选择器首次打开时加载，按滚动位置分批渲染；完整 Material 字体在本地以 WOFF2 提供。
- 热门仓库、影片、音乐接近视野后请求，封面图片懒加载；音乐缓存按来源／榜单限制范围，换批历史仅在内存保留少量记录。
- 交通、航班、巴士等轻量面板保持原有实时请求时机；关闭对应小工具后停止该面板的自动刷新。CITY FEED 自己使用的共享数据仍可能请求。
- 大面积资讯卡片使用稳定的半透明背景，避免长页面反复模糊采样引起的滚动合成残留。顶栏和页脚保留毛玻璃效果。

## 本地开发与检查

仅检查静态界面可使用 `python -m http.server 8803`；需要真实 `/api/*` 路由时使用 Vercel 本地开发环境及测试用环境变量。不要在本地测试里复用生产登录 Cookie。

```sh
node tests/sync.test.mjs
node tests/widgets.test.mjs
node tests/music.test.mjs
node tests/discovery-batches.test.mjs
node tests/discovery-focus.test.mjs
node tests/calendar.test.mjs
node tests/server-imports.test.mjs
node tests/site-history.test.mjs
```

`tests/` 还包含各日历平台、背景、天气、市场、云端清除及接口恢复的专项检查。大部分测试模拟上游响应；通过测试不代表外部平台永远可用。

## 目录

| 路径 | 内容 |
| --- | --- |
| `index.html` | 首页及原有小工具逻辑 |
| `js/` | 设置、同步、日历、CITY FEED、热门内容和背景模块 |
| `api/`、`server/` | Vercel 入口与平台／数据服务 |
| `data/` | 公众假期、节气及版本记录等静态数据 |
| `fonts/`、`img/` | 本地字体、图标及品牌资源 |
| `privacy.html`、`terms.html`、`history.html` | 简繁体公开政策与版本页面 |

第三方资源保留各自版权和许可声明，例如 Material Icons 的 Apache-2.0 与 Leaflet 的 BSD-2-Clause。天气、交通、市场、音乐、影片及地图内容的权利归相应提供方。

维护联系：<root@baipin.pw>
