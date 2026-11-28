# 可复用选举看板

2026 直播已结束，固定存档在 [archive/election-taiwan-local-2026](../../archive/election-taiwan-local-2026/README.md)。本目录为下次活动保留可修改的代码；不要改动历史存档模块来接入新选举。

## 结构

- js/: 县市长翻牌、议员跑马、席次图、地图、来源／日期配置、数据适配器、横幅。
- css/: 小工具与独立页样式。
- server/: 三立／TVBS 抓取与校验、议员选区服务、总入口；根目录 server/election.js 仅保留 API 兼容转发。
- data/: 选区目录、地图和党徽索引；img/parties/: 本地党徽与出处。

## 新活动步骤

1. 阅读 [详细复用步骤](../../archive/election-taiwan-local-2026/README.md)，另建新的活动目录。
2. 将本目录 js/election-time.js 的 ELECTION_ARCHIVE 设为 null，更新所有活动日期、年份与来源校验。当前配置指向 2026 静态快照，不能直接当作新的直播数据。
3. 重新核实 server/ 中公开源的真实响应、选区和当选字段，更新 fixtures。不要假定四年后接口仍相同。
4. 按说明恢复首页容器、/features/election/css/election.css 与 /features/election/js/election.js 的加载和 js/widgets.js 的 catalog 项。首页当前不加载本功能。
5. 更新 js/ 中资源路径、页面双语文案、canonical 和 API 路由。对不同选举分别建立配置／目录；不覆盖历史快照。
6. 运行 node --test tests/election*.test.mjs tests/council*.test.mjs tests/setn-election.test.mjs tests/site-history.test.mjs，再验证手机、桌面、深浅色、简繁和不活跃时停止轮询。
7. 结束后确认实际源 FINISHED 与覆盖率再快照归档，撤下首页小工具。媒体快照须注明不代表官方最终公告。
