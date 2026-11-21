import {PRESET_KEYS,COOKIE_KEYS,sanitizePreset} from './preset-schema.js';

const dialog = document.getElementById('data-manage-dialog');
const panel = document.getElementById('preset-sync-panel');
const status = panel.querySelector('[data-sync-status]');
const login = panel.querySelector('[data-sync-login]');
const logout = panel.querySelector('[data-sync-logout]');
const syncButton = panel.querySelector('[data-sync-now]');
const auto = panel.querySelector('[data-sync-auto]');
const choices = panel.querySelector('[data-sync-conflict]');
let account = null, busy = false, pending = null;
let statusMessage = '';
const traditional = new Map([
    ['预设同步与备份','預設同步與備份'],['Google 多端同步','Google 多端同步'],
    ['使用同一 Google 账号同步多个设备','使用同一 Google 帳戶同步多個裝置'],
    ['使用 Google 登录','使用 Google 登入'],['立即同步','立即同步'],['退出登录','登出'],
    ['此设备自动同步（每 30 秒检查）','此裝置自動同步（每 30 秒檢查）'],
    ['使用云端预设','使用雲端預設'],['用本机替换云端','用本機取代雲端'],
    ['预设保存在你的 Google Drive 应用专用空间，仅访问本站配置。包括书签、搜索引擎、RSS、CITY FEED 自选股票与显示配置、语言、天气地区、主题和背景。','預設儲存在你的 Google Drive 應用專用空間，僅存取本站設定。包括書籤、搜尋引擎、RSS、CITY FEED 自選股票與顯示設定、語言、天氣地區、主題和背景。'],
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
const simplified = () => document.documentElement.lang === 'zh-CN';
function translate(text) {
    if (simplified()) return text;
    for (const [source,target] of traditional) text = text.split(source).join(target);
    return text;
}
const staticLabels = [...dialog.querySelectorAll('[slot="headline"],#preset-sync-panel strong,#preset-sync-panel .preset-sync-hint:not(:has(a)),#preset-sync-panel mdui-button,#preset-sync-panel mdui-checkbox,#export-data-btn,#import-data-btn')].map(element=>[element,element.textContent.trim()]);
function applyLanguage() {
    for (const [element,text] of staticLabels) element.textContent = translate(text);
    status.textContent = translate(statusMessage);
    panel.querySelector('[data-sync-account]').textContent = account ? account.email : translate('使用同一 Google 账号同步多个设备');
    for (const link of document.querySelectorAll('[data-site-legal]')) {
        link.textContent = link.dataset.siteLegal === 'privacy' ? (simplified()?'隐私政策':'隱私政策') : (simplified()?'服务条款':'服務條款');
        link.href = '/'+link.dataset.siteLegal+'.html?lang='+(simplified()?'sc':'tc');
    }
}
new MutationObserver(applyLanguage).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
const stateKey = () => 'navi_sync_state:'+account.id;
const autoKey = () => 'navi_sync_auto:'+account.id;
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
async function request(action,body) {
    const response = await fetch('/api/sync?action='+action,{credentials:'same-origin',cache:'no-store',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
    let data;
    try { data = await response.json(); } catch { throw new Error('同步服务暂时不可用，请稍后重试'); }
    if (!response.ok) {
        if (response.status === 401) { account = null; updateControls(); }
        throw new Error(data.error || '同步失败，请稍后重试');
    }
    return data;
}
function updateControls() {
    login.hidden = !!account;
    logout.hidden = !account;
    syncButton.disabled = busy || !account;
    auto.disabled = busy || !account;
    logout.disabled = busy;
    document.getElementById('import-data-btn').disabled = busy;
    for (const button of choices.querySelectorAll('mdui-button')) button.disabled = busy;
}
function show(message) { statusMessage = message; status.textContent = translate(message); }
function savedState() { try { return JSON.parse(localStorage.getItem(stateKey())) || {}; } catch { return {}; } }
function remember(baseHash,updatedAt) {
    localStorage.setItem(stateKey(),JSON.stringify({baseHash,updatedAt}));
    show('已同步 · '+new Date(updatedAt).toLocaleString());
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
    try {
        const result = await request('status');
        account = result.authenticated ? result.user : null;
        panel.querySelector('[data-sync-account]').textContent = account ? account.email : translate('使用同一 Google 账号同步多个设备');
        login.disabled = !result.configured;
        auto.checked = !!account && localStorage.getItem(autoKey()) === '1';
        const previous = account ? savedState() : {};
        if (!pending) show(!result.configured ? '服务端尚未配置 GOOGLE_KEY' : account ? previous.updatedAt ? '上次同步：'+new Date(previous.updatedAt).toLocaleString() : '已登录。点击“立即同步”创建或读取云端预设。' : '尚未登录；本机设置仍可正常使用。');
    } catch (error) { show(error.message); }
    updateControls();
}
login.onclick = () => { location.href = '/api/sync?action=login'; };
logout.onclick = async () => {
    if (busy) return;
    busy = true; updateControls();
    try {
        await request('logout',{});
        if (account) localStorage.removeItem(autoKey());
        account = null; auto.checked = false; pending = null; choices.hidden = true;
        panel.querySelector('[data-sync-account]').textContent = translate('使用同一 Google 账号同步多个设备');
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
        show('预设已导出，包含 CITY FEED 自选股票和显示设置。');
    } catch (error) { show(error.message); }
};
document.getElementById('import-data-btn').onclick = () => document.getElementById('import-file-input').click();
document.getElementById('import-file-input').onchange = async event => {
    const file = event.target.files[0]; if (!file) return;
    try { if (file.size > 200000) throw new Error('预设文件过大'); applyPreset(JSON.parse(await file.text())); location.reload(); }
    catch (error) { show('导入失败：'+error.message); }
    finally { event.target.value = ''; }
};
const result = new URL(location.href).searchParams.get('sync');
if (result) {
    const messages = {connected:'Google 登录成功。点击“立即同步”选择云端或本机预设。',cancelled:'已取消 Google 授权，本机预设不受影响。','state-error':'登录验证已过期，请从本站重新登录。','login-error':'Google 登录失败，请检查回调地址、Drive API 及 OAuth 配置。','permission-error':'请允许本站访问 Google Drive 应用预设空间后重新登录。'};
    const url = new URL(location.href); url.searchParams.delete('sync'); history.replaceState(null,'',url);
    dialog.open = true;
    checkLogin().then(()=>show(messages[result] || '请重新登录同步'));
} else {
    checkLogin().then(()=> { if (auto.checked) sync(true); });
}
document.getElementById('data-manage-btn')?.addEventListener('click',checkLogin);
setInterval(()=> { if (auto.checked) sync(true); },30000);
document.addEventListener('visibilitychange',()=> { if (auto.checked && document.visibilityState === 'visible') sync(true); });
applyLanguage();
