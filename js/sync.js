import {PRESET_KEYS,COOKIE_KEYS,sanitizePreset} from './preset-schema.js';

const dialog = document.getElementById('data-manage-dialog');
const panel = document.getElementById('preset-sync-panel');
const status = panel.querySelector('[data-sync-status]');
const login = panel.querySelector('[data-sync-login]');
const logout = panel.querySelector('[data-sync-logout]');
const syncButton = panel.querySelector('[data-sync-now]');
const auto = panel.querySelector('[data-sync-auto]');
const choices = panel.querySelector('[data-sync-conflict]');
const callbackProvider = new URL(location.href).searchParams.get('provider');
const providers={google:{name:'Google',endpoint:'/api/sync',storage:'预设保存在你的 Google Drive 应用专用空间。',missing:'服务端尚未配置 GOOGLE_KEY'},github:{name:'GitHub',endpoint:'/api/github',storage:'预设保存在你的 GitHub Secret Gist。',missing:'服务端尚未配置 GITHUB_CLIENT_ID 和 GITHUB_KEY'},microsoft:{name:'Microsoft',endpoint:'/api/microsoft',storage:'预设保存在你的 OneDrive 应用文件夹。',missing:'服务端尚未配置 MICROSOFT_CLIENT_ID 和 MICROSOFT_KEY'}};
const selectedProvider=callbackProvider || localStorage.getItem('navi_sync_provider');
let provider=Object.hasOwn(providers,selectedProvider)?selectedProvider:'google';
let account = null, busy = false, pending = null, configured = false, detailsRequested = false, authenticating = false;
let statusMessage = '';
const traditional = new Map([
    ['Microsoft 登录','Microsoft 登入'],['使用 Microsoft 登录','使用 Microsoft 登入'],
    ['使用同一 Microsoft 账号同步多个设备','使用同一 Microsoft 帳戶同步多個裝置'],
    ['预设保存在你的 OneDrive 应用文件夹。','預設儲存在你的 OneDrive 應用程式資料夾。'],
    ['服务端尚未配置 MICROSOFT_CLIENT_ID 和 MICROSOFT_KEY','伺服器尚未設定 MICROSOFT_CLIENT_ID 和 MICROSOFT_KEY'],
    ['Microsoft 登录成功。点击“立即同步”选择云端或本机预设。','Microsoft 登入成功。點擊「立即同步」選擇雲端或本機預設。'],
    ['已取消 Microsoft 授权，本机预设不受影响。','已取消 Microsoft 授權，本機預設不受影響。'],
    ['Microsoft 登录失败，请检查回调地址及 Entra 应用配置。','Microsoft 登入失敗，請檢查回呼網址及 Entra 應用程式設定。'],
    ['请允许本站访问 OneDrive 应用文件夹及基本资料后重新登录。','請允許本站存取 OneDrive 應用程式資料夾及基本資料後重新登入。'],
    ['Microsoft 授权已失效，请重新登录','Microsoft 授權已失效，請重新登入'],['请先使用 Microsoft 登录','請先使用 Microsoft 登入'],
    ['无法访问 OneDrive 应用文件夹，请确认权限及账号支持','無法存取 OneDrive 應用程式資料夾，請確認權限及帳戶支援'],
    ['OneDrive 暂时不可用，请稍后重试','OneDrive 暫時無法使用，請稍後重試'],['OneDrive 请求过于频繁，请稍后重试','OneDrive 請求過於頻繁，請稍後重試'],
    ['Microsoft 同步暂时不可用，请稍后重试','Microsoft 同步暫時無法使用，請稍後重試'],
    ['设置','設定'],['GitHub 登录','GitHub 登入'],['Google 登录','Google 登入'],
    ['多端预设同步','多端預設同步'],['使用同一 GitHub 账号同步多个设备','使用同一 GitHub 帳戶同步多個裝置'],
    ['使用 GitHub 登录','使用 GitHub 登入'],['预设保存在你的 Google Drive 应用专用空间。','預設儲存在你的 Google Drive 應用專用空間。'],
    ['预设保存在你的 GitHub Secret Gist。','預設儲存在你的 GitHub Secret Gist。'],
    ['Secret Gist 不是真正私有存储，知道链接的人可以读取预设。GitHub 的 gist 权限允许访问账号下的 Gist；本站仅定位并读写标记为本站预设的 Secret Gist，不申请仓库或私人邮箱权限。','Secret Gist 不是真正私有儲存，知道連結的人可以讀取預設。GitHub 的 gist 權限允許存取帳戶下的 Gist；本站僅定位並讀寫標記為本站預設的 Secret Gist，不申請儲存庫或私人電郵權限。'],
    ['同步包括书签、搜索引擎、RSS、CITY FEED 自选股票与显示配置、语言、天气地区、主题、照片及摄影机背景。各服务独立保存预设，切换服务不会自动复制或合并账号。','同步包括書籤、搜尋引擎、RSS、CITY FEED 自選股票與顯示設定、語言、天氣地區、主題、照片及攝影機背景。各服務獨立儲存預設，切換服務不會自動複製或合併帳戶。'],
    ['服务端尚未配置 GITHUB_CLIENT_ID 和 GITHUB_KEY','伺服器尚未設定 GITHUB_CLIENT_ID 和 GITHUB_KEY'],
    ['GitHub 登录成功。点击“立即同步”选择云端或本机预设。','GitHub 登入成功。點擊「立即同步」選擇雲端或本機預設。'],
    ['已取消 GitHub 授权，本机预设不受影响。','已取消 GitHub 授權，本機預設不受影響。'],
    ['GitHub 登录失败，请检查回调地址及 OAuth App 配置。','GitHub 登入失敗，請檢查回呼網址及 OAuth App 設定。'],
    ['请允许本站的 GitHub gist 权限后重新登录。','請允許本站的 GitHub gist 權限後重新登入。'],
    ['请先使用 GitHub 登录','請先使用 GitHub 登入'],['GitHub 授权已失效，请重新登录','GitHub 授權已失效，請重新登入'],
    ['GitHub Gist 暂时不可用，请稍后重试','GitHub Gist 暫時無法使用，請稍後重試'],
    ['GitHub 同步暂时不可用，请稍后重试','GitHub 同步暫時無法使用，請稍後重試'],
    ['GitHub 权限不足或请求过于频繁，请稍后重试或重新授权 gist','GitHub 權限不足或請求過於頻繁，請稍後重試或重新授權 gist'],
    ['预设同步与备份','預設同步與備份'],['Google 多端同步','Google 多端同步'],
    ['使用同一 Google 账号同步多个设备','使用同一 Google 帳戶同步多個裝置'],
    ['使用 Google 登录','使用 Google 登入'],['立即同步','立即同步'],['退出登录','登出'],
    ['此设备自动同步（每 30 秒检查）','此裝置自動同步（每 30 秒檢查）'],
    ['使用云端预设','使用雲端預設'],['用本机替换云端','用本機取代雲端'],
    ['预设保存在你的 Google Drive 应用专用空间，仅访问本站配置。包括书签、搜索引擎、RSS、CITY FEED 自选股票与显示配置、语言、天气地区、主题、照片及摄影机背景。','預設儲存在你的 Google Drive 應用專用空間，僅存取本站設定。包括書籤、搜尋引擎、RSS、CITY FEED 自選股票與顯示設定、語言、天氣地區、主題、照片及攝影機背景。'],
    ['首次同步或两端均有修改时，请选择保留哪一端。自动同步在编辑时暂停；退出登录不会删除预设。','首次同步或兩端均有修改時，請選擇保留哪一端。自動同步在編輯時暫停；登出不會刪除預設。'],
    ['导出预设（JSON）','匯出預設（JSON）'],['导入预设','匯入預設'],
    ['正在检查登录状态…','正在檢查登入狀態…'],['正在检查两端预设…','正在檢查兩端預設…'],
    ['同步服务暂时不可用，请稍后重试','同步服務暫時無法使用，請稍後重試'],
    ['同步失败，请稍后重试','同步失敗，請稍後重試'],
    ['已同步 · ','已同步 · '],['上次同步：','上次同步：'],
    ['两端预设不同。云端更新于 ','兩端預設不同。雲端更新於 '],
    ['，请选择使用哪一端；未选择前不会覆盖。','，請選擇使用哪一端；未選擇前不會覆蓋。'],
    ['服务端尚未配置 GOOGLE_KEY','伺服器尚未設定 GOOGLE_KEY'],
    ['已登录。点击“立即同步”创建或读取云端预设。','已登入。點擊「立即同步」建立或讀取雲端預設。'],
    ['尚未登录；本机设置仍可正常使用。','尚未登入；本機設定仍可正常使用。'],
    ['已退出此设备的登录，本机与云端预设均保留。','已登出此裝置，本機與雲端預設均保留。'],
    ['预设已导出，包含 CITY FEED 自选股票和显示设置。','預設已匯出，包含 CITY FEED 自選股票和顯示設定。'],
    ['导入失败：','匯入失敗：'],['预设文件过大','預設檔案過大'],
    ['Google 登录成功。点击“立即同步”选择云端或本机预设。','Google 登入成功。點擊「立即同步」選擇雲端或本機預設。'],
    ['已取消 Google 授权，本机预设不受影响。','已取消 Google 授權，本機預設不受影響。'],
    ['登录验证已过期，请从本站重新登录。','登入驗證已過期，請從本站重新登入。'],
    ['Google 登录失败，请检查回调地址、Drive API 及 OAuth 配置。','Google 登入失敗，請檢查回呼網址、Drive API 及 OAuth 設定。'],
    ['请允许本站访问 Google Drive 应用预设空间后重新登录。','請允許本站存取 Google Drive 應用預設空間後重新登入。'],
    ['请重新登录同步','請重新登入同步'],['请先使用 Google 登录','請先使用 Google 登入'],
    ['Google 授权已失效，请重新登录','Google 授權已失效，請重新登入'],
    ['云端预设已改变，请先重新同步','雲端預設已改變，請先重新同步'],
    ['另一台设备刚刚更新了预设，请重新同步','另一台裝置剛剛更新了預設，請重新同步'],
    ['Google Drive 暂时不可用，请稍后重试','Google Drive 暫時無法使用，請稍後重試'],
    ['无法访问应用预设空间，请启用 Google Drive API 并重新授权','無法存取應用預設空間，請啟用 Google Drive API 並重新授權']
]);
const traditionalPairs = [...traditional].sort((a,b)=>b[0].length-a[0].length);
const simplified = () => document.documentElement.lang === 'zh-CN';
function translate(text) {
    if (simplified()) return text;
    for (const [source,target] of traditionalPairs) text = text.split(source).join(target);
    return text;
}
const staticLabels = [...dialog.querySelectorAll('[slot="headline"],#preset-sync-panel strong,#preset-sync-panel .preset-sync-hint:not(:has(a)),#preset-sync-panel mdui-button,#preset-sync-panel mdui-checkbox,#export-data-btn,#import-data-btn')].map(element=>[element,element.textContent.trim()]);
function applyLanguage() {
    for (const [element,text] of staticLabels) if(!element.matches('[data-sync-provider],[data-sync-login]'))element.textContent = translate(text);
    status.textContent = translate(statusMessage);
    updateProviderText();
    renderFooterAccount();
    for (const link of document.querySelectorAll('[data-site-legal]')) {
        link.textContent = link.dataset.siteLegal === 'privacy' ? (simplified()?'隐私政策':'私隱政策') : (simplified()?'服务条款':'服務條款');
        link.href = '/'+link.dataset.siteLegal+'.html?lang='+(simplified()?'sc':'tc');
    }
}
new MutationObserver(applyLanguage).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
const stateKey = () => 'navi_sync_state:'+(provider === 'google' ? '' : provider+':')+account.id;
const autoKey = () => 'navi_sync_auto:'+(provider === 'google' ? '' : provider+':')+account.id;
const editing = () => document.visibilityState !== 'visible' || document.querySelector('.edit-active, mdui-dialog[open]') || document.activeElement?.matches('input,textarea,mdui-text-field');
function snapshot() {
    const values = {};
    for (const part of document.cookie.split(';')) {
        const index = part.indexOf('=');
        if (index < 0) continue;
        const name = part.slice(0,index).trim();
        if (COOKIE_KEYS.includes(name)) { try { values[name] = decodeURIComponent(part.slice(index+1)); } catch {} }
    }
    return sanitizePreset({localStorage:Object.fromEntries(PRESET_KEYS.map(key=>[key,localStorage.getItem(key)])),cookies:values});
}
function applyPreset(input) {
    const preset = sanitizePreset(input), before = snapshot();
    const write = data => {
        for (const [key,value] of Object.entries(data.localStorage)) {
            if (value === null) localStorage.removeItem(key); else localStorage.setItem(key,value);
        }
        for (const [key,value] of Object.entries(data.cookies)) {
            document.cookie = `${key}=${value === null ? '' : encodeURIComponent(value)}; Path=/; SameSite=Lax; Max-Age=${value === null ? 0 : 31536000}`;
        }
    };
    try { write(preset); } catch (error) { write(before); throw error; }
}
const hash = async preset => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(preset))))).map(byte=>byte.toString(16).padStart(2,'0')).join('');
async function request(action,body,selectedProvider=provider) {
    const response = await fetch(providers[selectedProvider].endpoint+'?action='+action,{credentials:'same-origin',cache:'no-store',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
    let data;
    try { data = await response.json(); } catch { throw new Error('同步服务暂时不可用，请稍后重试'); }
    if (!response.ok) {
        if (response.status === 401 && selectedProvider === provider) { account = null; updateControls(); }
        throw new Error(data.error || '同步失败，请稍后重试');
    }
    return data;
}
function renderLoginButton(button,id,text){
    let label=button.querySelector('[data-provider-label]');
    if(!label){const icon=document.createElement('img');icon.src='/img/login-'+id+'.svg';icon.alt='';icon.slot='icon';icon.width=20;icon.height=20;label=document.createElement('span');label.dataset.providerLabel='';button.replaceChildren(icon,label);}
    const icon=button.querySelector('img[slot="icon"]');if(icon)icon.src='/img/login-'+id+'.svg';
    label.textContent=translate(text);
}
function updateProviderText() {
    const name = providers[provider].name;
    panel.querySelector('[data-sync-account]').textContent = account ? name+' · '+(provider === 'github' ? '@'+account.login : account.email) : translate('使用同一 '+name+' 账号同步多个设备');
    renderLoginButton(login,provider,'使用 '+name+' 登录');
    panel.querySelector('[data-sync-storage]').textContent = translate(providers[provider].storage);
    panel.querySelector('[data-sync-github-warning]').hidden = provider !== 'github';
    for (const button of panel.querySelectorAll('[data-sync-provider]')) {
        const active = button.dataset.syncProvider === provider;
        renderLoginButton(button,button.dataset.syncProvider,providers[button.dataset.syncProvider].name+' 登录');
        button.setAttribute('aria-pressed',String(active && (!!account || detailsRequested)));button.setAttribute('variant',active && (!!account || detailsRequested)?'tonal':'outlined');button.disabled=busy || authenticating;
    }
}
function updateControls() {
    updateProviderText();
    panel.querySelector('[data-sync-details]').hidden = !account && !detailsRequested;
    login.disabled = busy || authenticating || !configured;
    login.hidden = !!account;
    logout.hidden = !account;
    syncButton.disabled = busy || !account;
    auto.disabled = busy || !account;
    logout.disabled = busy;
    document.getElementById('import-data-btn').disabled = busy;
    renderFooterAccount();
    for (const button of choices.querySelectorAll('mdui-button')) button.disabled = busy;
}
function show(message) { statusMessage = message; status.textContent = translate(message); }
function savedState() { try { return JSON.parse(localStorage.getItem(stateKey())) || {}; } catch { return {}; } }
function remember(baseHash,updatedAt) {
    localStorage.setItem(stateKey(),JSON.stringify({baseHash,updatedAt,syncedAt:new Date().toISOString()}));
    renderFooterAccount();
    show('已同步 · '+new Date(updatedAt).toLocaleString());
}
function renderFooterAccount() {
    const container=document.getElementById('footer-account');
    if(!container)return;
    container.hidden=!account;
    if(!account)return;
    const sc=simplified(),name=account.name || account.login || account.email;
    document.getElementById('footer-account-name').textContent=providers[provider].name+' · '+name;
    const avatar=document.getElementById('footer-avatar'),fallback=document.getElementById('footer-avatar-fallback');
    fallback.textContent=Array.from(name || '?')[0].toUpperCase();
    let avatarUrl=null;
    try {const url=new URL(account.avatar);if(url.protocol==='https:' && (provider==='github'?url.hostname==='avatars.githubusercontent.com':url.hostname.endsWith('.googleusercontent.com')))avatarUrl=url.href;}catch{}
    if(avatarUrl) {
        avatar.onerror=()=>{avatar.hidden=true;fallback.hidden=false;};
        if(avatar.getAttribute('src')!==avatarUrl)avatar.src=avatarUrl;
        avatar.alt=name+(sc?'的头像':'的頭像');avatar.hidden=false;fallback.hidden=true;
    } else {avatar.hidden=true;avatar.removeAttribute('src');fallback.hidden=false;}
    const state=savedState(),date=state.syncedAt || state.updatedAt;
    const label=document.getElementById('footer-last-sync');
    label.textContent=date && Number.isFinite(Date.parse(date))?(sc?'上次同步：':'上次同步：')+new Date(date).toLocaleString(sc?'zh-CN':'zh-HK',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}):(sc?'尚未同步':'尚未同步');
    label.title=date?'UTC+8 · '+date:'';
}
function showConflict(cloud) {
    pending = cloud;
    choices.hidden = false;
    show('两端预设不同。云端更新于 '+new Date(cloud.updatedAt).toLocaleString()+'，请选择使用哪一端；未选择前不会覆盖。');
}
async function sync(automatic=false) {
    if (busy || !account || pending) return;
    if (automatic && editing()) return;
    busy = true; updateControls();
    if (!automatic) show('正在检查两端预设…');
    try {
        const local = snapshot(), localHash = await hash(local), cloud = await request('pull');
        if (!cloud.exists) {
            const result = await request('push',{preset:local,revision:null});
            remember(localHash,result.updatedAt);
            return;
        }
        const remote = sanitizePreset(cloud.preset), remoteHash = await hash(remote), previous = savedState();
        if (localHash === remoteHash) { remember(localHash,cloud.updatedAt); return; }
        if (previous.baseHash === remoteHash) {
            const result = await request('push',{preset:local,revision:cloud.revision});
            remember(localHash,result.updatedAt);
        } else if (previous.baseHash === localHash) {
            // Recheck before reloading: edits made while the network was busy must survive.
            if (automatic && editing()) return;
            if (await hash(snapshot()) !== localHash) { showConflict(cloud); return; }
            applyPreset(remote); remember(remoteHash,cloud.updatedAt); location.reload();
        } else {
            showConflict(cloud);
            if (automatic) { panel.dataset.needsAttention = 'true'; document.getElementById('data-manage-btn')?.classList.add('sync-attention'); }
        }
    } catch (error) { show(error.message); }
    finally { busy = false; updateControls(); }
}
async function resolveConflict(useCloud) {
    if (busy || !pending) return;
    busy = true; updateControls();
    try {
        const latest = await request('pull');
        if (latest.revision !== pending.revision) { showConflict(latest); return; }
        if (useCloud) {
            const remote = sanitizePreset(latest.preset);
            applyPreset(remote); remember(await hash(remote),latest.updatedAt); location.reload();
        } else {
            const local = snapshot();
            const result = await request('push',{preset:local,revision:latest.revision});
            remember(await hash(local),result.updatedAt);
            pending = null; choices.hidden = true; delete panel.dataset.needsAttention;
            document.getElementById('data-manage-btn')?.classList.remove('sync-attention');
        }
    } catch (error) { show(error.message); }
    finally { busy = false; updateControls(); }
}
async function checkLogin() {
    const selectedProvider = provider;
    try {
        const result = await request('status',undefined,selectedProvider);
        if (selectedProvider !== provider) return;
        configured = result.configured;
        account = result.authenticated ? result.user : null;
        if(account)detailsRequested=true;
        updateProviderText();
        login.disabled = !configured;
        auto.checked = !!account && localStorage.getItem(autoKey()) === '1';
        const previous = account ? savedState() : {};
        if (!pending) show(!result.configured ? providers[provider].missing : account ? previous.updatedAt ? '上次同步：'+new Date(previous.updatedAt).toLocaleString() : '已登录。点击“立即同步”创建或读取云端预设。' : '尚未登录；本机设置仍可正常使用。');
    } catch (error) { if (selectedProvider !== provider) return; show(error.message); }
    updateControls();
    document.dispatchEvent(new Event('navi-sync-account-change'));
    return {authenticated:!!account,configured};
}
for (const button of panel.querySelectorAll('[data-sync-provider]')) button.onclick = async () => {
    if(busy || authenticating)return;
    const selected=button.dataset.syncProvider;
    if(selected===provider && account) {detailsRequested=true;updateControls();return;}
    authenticating=true;
    provider=selected;localStorage.setItem('navi_sync_provider',provider);
    account=null;configured=false;pending=null;auto.checked=false;choices.hidden=true;detailsRequested=true;
    document.getElementById('data-manage-btn')?.classList.remove('sync-attention');
    applyLanguage();updateControls();show('正在检查登录状态…');
    try {
        const state=await checkLogin();
        if(state?.configured && !state.authenticated) {
            location.href=providers[provider].endpoint+'?action=login';
        }
    } finally {authenticating=false;updateControls();}
};
login.onclick = () => { localStorage.setItem('navi_sync_provider',provider); location.href = providers[provider].endpoint+'?action=login'; };
logout.onclick = async () => {
    if (busy) return;
    busy = true; updateControls();
    try {
        await request('logout',{});
        if (account) localStorage.removeItem(autoKey());
        account = null; auto.checked = false; pending = null; choices.hidden = true; detailsRequested=false;
        document.dispatchEvent(new Event('navi-sync-account-change'));
        updateProviderText();
        document.getElementById('data-manage-btn')?.classList.remove('sync-attention');
        show('已退出此设备的登录，本机与云端预设均保留。');
    } catch (error) { show(error.message); }
    finally { busy = false; updateControls(); }
};
syncButton.onclick = () => sync();
auto.addEventListener('change',()=> { if (account) { localStorage.setItem(autoKey(),auto.checked?'1':'0'); if (auto.checked) sync(); } });
panel.querySelector('[data-sync-use-cloud]').onclick = () => resolveConflict(true);
panel.querySelector('[data-sync-use-local]').onclick = () => resolveConflict(false);
// Local file backup uses the same schema as Google Drive and never exports auth cookies.
document.getElementById('export-data-btn').onclick = () => {
    try {
        const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'}));
        const anchor = document.createElement('a'); anchor.href = url;
        anchor.download = `baipin_nav_backup_${new Date().toISOString().slice(0,10)}.json`;
        anchor.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
        show(simplified()?'完整预设已导出；若已启用日历凭据加密同步，也包含相应密文。':'完整預設已匯出；若已啟用日曆憑證加密同步，亦包含對應密文。');
    } catch (error) { show(error.message); }
};
document.getElementById('import-data-btn').onclick = () => document.getElementById('import-file-input').click();
document.getElementById('import-file-input').onchange = async event => {
    const file = event.target.files[0]; if (!file) return;
    try { if (file.size > 200000) throw new Error('预设文件过大'); applyPreset(JSON.parse(await file.text())); location.reload(); }
    catch (error) { show('导入失败：'+error.message); }
    finally { event.target.value = ''; }
};
// Reset only the shared preference allowlist; retain auth cookies and cloud files.
const resetDialog=document.getElementById('settings-reset-dialog');
const resetUndo=document.getElementById('settings-reset-undo');
const resetBackupKey='navi_before_preferences_reset';
function resetLabels() {
    const sc=simplified();
    resetDialog.querySelector('[data-reset-title]').textContent=sc?'恢复默认设置？':'還原預設設定？';
    resetDialog.querySelector('[data-reset-description]').textContent=sc?'将恢复本设备的书签、搜索引擎、RSS、CITY FEED、天气地区、语言、主题和背景。登录状态及云端预设保留；本设备自动同步将暂停。可先导出备份，恢复后也可在本标签页撤销。':'將還原本裝置的書籤、搜尋引擎、RSS、CITY FEED、天氣地區、語言、主題及背景。登入狀態及雲端預設保留；本裝置自動同步將暫停。可先匯出備份，還原後亦可在本分頁復原。';
    document.getElementById('settings-reset-export').textContent=sc?'先导出备份':'先匯出備份';
    document.getElementById('settings-reset-cancel').textContent=sc?'取消':'取消';
    document.getElementById('settings-reset-confirm').textContent=sc?'恢复默认设置':'還原預設設定';
    try {resetUndo.hidden=!sessionStorage.getItem(resetBackupKey);}catch {resetUndo.hidden=true;}
}
resetLabels();
new MutationObserver(resetLabels).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
document.getElementById('settings-reset-export').onclick=()=>document.getElementById('export-data-btn').click();
document.getElementById('settings-reset-cancel').onclick=()=>{resetDialog.open=false;};
function pauseAutoSync() {
    // Every provider and previously used account on this device.
    for(const key of Object.keys(localStorage))if(key.startsWith('navi_sync_auto:'))localStorage.removeItem(key);
    auto.checked=false;
}
document.getElementById('settings-reset-confirm').onclick=()=> {
    const error=resetDialog.querySelector('[data-reset-error]');
    if(busy) {error.textContent=simplified()?'同步正在进行，请稍后重试。':'同步正在進行，請稍後再試。';return;}
    try {
        sessionStorage.setItem(resetBackupKey,JSON.stringify(snapshot()));
        pauseAutoSync();pending=null;
        applyPreset({localStorage:{},cookies:{}});
        location.reload();
    } catch {error.textContent=simplified()?'无法保存撤销备份或恢复设置，请检查浏览器存储权限。':'無法儲存復原備份或還原設定，請檢查瀏覽器儲存權限。';}
};
resetUndo.onclick=()=> {
    try {
        if(busy)throw new Error('busy');
        const previous=sessionStorage.getItem(resetBackupKey);if(!previous)return;
        pauseAutoSync();pending=null;applyPreset(JSON.parse(previous));
        sessionStorage.removeItem(resetBackupKey);location.reload();
    } catch {show(simplified()?'暂时无法撤销，请稍后重试。':'暫時無法復原，請稍後再試。');}
};
const result = new URL(location.href).searchParams.get('sync');
if (result) {
    localStorage.setItem('navi_sync_provider',provider);
    const messages = {connected:'Google 登录成功。点击“立即同步”选择云端或本机预设。',cancelled:'已取消 Google 授权，本机预设不受影响。','state-error':'登录验证已过期，请从本站重新登录。','login-error':'Google 登录失败，请检查回调地址、Drive API 及 OAuth 配置。','permission-error':'请允许本站访问 Google Drive 应用预设空间后重新登录。'};
    if (provider === 'github') Object.assign(messages,{connected:'GitHub 登录成功。点击“立即同步”选择云端或本机预设。',cancelled:'已取消 GitHub 授权，本机预设不受影响。','login-error':'GitHub 登录失败，请检查回调地址及 OAuth App 配置。','permission-error':'请允许本站的 GitHub gist 权限后重新登录。'});
    if(provider==='microsoft')Object.assign(messages,{connected:'Microsoft 登录成功。点击“立即同步”选择云端或本机预设。',cancelled:'已取消 Microsoft 授权，本机预设不受影响。','login-error':'Microsoft 登录失败，请检查回调地址及 Entra 应用配置。','permission-error':'请允许本站访问 OneDrive 应用文件夹及基本资料后重新登录。'});
    const url = new URL(location.href); url.searchParams.delete('sync'); url.searchParams.delete('provider'); history.replaceState(null,'',url);
    detailsRequested=true;
    if(window.naviOpenSettings)window.naviOpenSettings('sync');else dialog.open=true;
    checkLogin().then(()=>show(messages[result] || '请重新登录同步'));
} else {
    checkLogin().then(()=> { if (auto.checked) sync(true); });
}
document.getElementById('data-manage-btn')?.addEventListener('click',checkLogin);
document.addEventListener('navi-settings-sync-open',checkLogin);
document.addEventListener('navi-calendar-account-change',checkLogin);
setInterval(()=> { if (auto.checked) sync(true); },30000);
document.addEventListener('visibilitychange',()=> { if (auto.checked && document.visibilityState === 'visible') sync(true); });
applyLanguage();
