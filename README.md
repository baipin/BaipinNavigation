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
