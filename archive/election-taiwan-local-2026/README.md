# 2026 台湾地方选举：静态存档与下次复用

## 当前状态

选举内页 `/archive/election-taiwan-local-2026/` 已转为交互存档。2026-11-29 00:18:35（UTC+8）保存的 TVBS 数据中，县市长、议员两类均明确为 `FINISHED`，22 个县市长与 221 个议员选区全部都有来源当选标记。此为媒体完成开票时的快照，**不是中选会最终公告**。

- `archive-2026.json`：完整县市长及议员候选人、编号、党籍、票数、当选标记、来源时间与原始政党汇总。约 175 KiB，不含账号资料。
- `status-review.json`：存档核查及快照位置。
- 首页已移除容器、脚本、样式加载及设置开关；组件源码没有删除。
- 内页保留翻牌、地图、选区及县市汇总席次图；不再轮询外部来源。首次读取同源快照后在内存中复用；关闭页面后释放。
- 顶部横幅可关闭，刷新页面后重新出现；时间采用数据存档时间，而非访问时间。
- 版本历程中的截图保留为开票过程截图，不能替代完整结果数据。

## 文件关系

| 文件 | 用途 |
| --- | --- |
| `features/election/js/election-time.js` | 事件时间范围及 `ELECTION_ARCHIVE` 存档开关 |
| `features/election/js/election-archive.js` | 静态快照适配与单次缓存；设为直播时回到原请求 |
| `features/election/js/election.js` | 首页翻牌组件、县市长详情、单页视图切换 |
| `features/election/js/council-ticker.js` | 议员恒速跑马、地区选择、详情入口 |
| `features/election/js/council-details.js` | 内嵌／弹窗共用的议员表格和席次图 |
| `features/election/js/election-seats.js` | 仅来源明确当选者计席；半圆席次点位 |
| `features/election/js/election-map.js` | 可点击的台湾县市政党版图 |
| `features/election/server/election.js` | API 入口；存档模式直接返回同一快照，无源站请求 |
| `features/election/server/tvbs-election.js`, `features/election/server/setn-election.js`, `features/election/server/council-election.js` | 保留的直播抓取、校验和选区接口 |
| `archive/election-taiwan-local-2026/index.html`, `css/election*.css` | 独立页面与共享响应式样式 |
| `features/election/js/election-notice.js` | 可关闭的存档横幅 |

## 下次选举（例如 2030）

不要直接用 2026 的来源 URL／选区／日程推算下一届：必须重新检查媒体真实公开页面、接口、状态、选区和许可。

1. 2026 归档已经独立放在 `archive/election-taiwan-local-2026/`，拥有固定脚本、样式、党徽、地图和数据。**保持这个目录不变，不覆盖快照。** 新活动另建目录（例如 `elections/taiwan-local-2030/`），从保留的通用组件复制并配置新活动，不要让新活动使用 2026 存档的模块。
2. 在新活动的配置中将 `ELECTION_ARCHIVE` 设为 `null`。更新 `ELECTION_EVENT` 的 ID、日期、投票起止、展示结束及官方链接。`electionVisible()` 中开始日期也要更新。不要仅延长旧活动结束时间。
3. 检查并更新 `features/election/js/election.js` 中年份、标题、日期副标题，`election-taiwan-local-2026.html` 的静态文案、JSON 简繁翻译、canonical、存档横幅及说明。关闭新活动的存档横幅。
4. 更新 `features/election/server/tvbs-election.js` 的 BASE、年份路径与校验；`features/election/server/setn-election.js` 的年份地址；`features/election/server/election.js` 的官方专区及年份校验。新来源必须依据实际返回结构另写解析器，不臆造字段。
5. 更新 `council-districts.json`、党徽、党色、候选人编号和 source-confirmed `elected` 逻辑。核实行政区边界，不能假定仍是 22 县市／221 选区。
6. 恢复首页集成（资源版本请使用新值）：

   ```html
   <!-- head -->
   <link rel="stylesheet" href="/features/election/css/election.css?v=NEW_EVENT">
   <!-- .page-flow 内，在 #main-container 前；间距调节会覆盖整个区域 -->
   <section id="election-board" hidden aria-label="选举看板"></section>
   <!-- 页面末尾 -->
   <script type="module" src="/features/election/js/election.js?v=NEW_EVENT"></script>
   ```

   在 `js/widgets.js` 的 catalog 恢复 `['election','选举看板','選舉看板','#election-board']`。更新首页 widgets 脚本缓存版本，确认旧预设中的开关不会误隐藏新活动。原 preset schema 已保留 election 偏好兼容。

7. 保留在未开票时不冒充票数、来源隔离、零票与未公布区分、仅明确当选才计席、部分读取失败提示。`FINISHED` 才可作为该媒体开票完成的依据，不能由截止时间或全部县市有领先者推断。
8. 更新 fixtures，运行下列测试，并在桌面、320／390px 手机、深浅色及简繁环境验证。也验证 API 的活跃／存档分支和无可见视图时停止请求。

   ```sh
   node --test tests/election*.test.mjs tests/council*.test.mjs tests/setn-election.test.mjs tests/site-history.test.mjs
   ```

9. 完成后检查 `FINISHED` 与覆盖率，导出新届完整不可变快照，恢复存档模式，撤下首页集成并更新版本历程。若媒体缺区或未完成，应明确标为部分记录，不能标记完整存档。

## 县市显示地图来源

`taiwan-counties.json` 由 g0v/twgeojson 的 `json/twCounty2010merge.topo.json` 简化生成，下载于 2026-11-28。来源 https://github.com/g0v/twgeojson ，CC0 1.0（Chia-liang Kao）。桃园按现名显示，台／臺做连接归一化；离岛单独缩放，仅作县市概览，不作地籍图。地图运行时不请求外部图层。

## 独立目录约定

当前公开地址是 `/archive/election-taiwan-local-2026/`。本目录 `js/`、`css/`、`data/`、`img/parties/` 均为本次活动固定副本，运行不依赖其他选举的组件。仅导航站通用 logo、Material 图标／MDUI、`legal.css`、`js/legal.js` 与背景设置使用全站资源。`/election.html` 与 `/election-taiwan-local-2026.html` 由 Vercel 永久跳转到此目录，保留查询参数。通用原型仍在`features/election/` 目录，供下次重新接入直播；当前首页完全不加载它们。

可复用结构的维护入口为 [`../../features/election/README.md`](../../features/election/README.md)。独立存档只更正其自身错误，不随新活动修改。
