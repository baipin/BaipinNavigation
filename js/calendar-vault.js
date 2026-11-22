import {validateVault} from './calendar-vault-format.js';
const VAULT_KEY='navi_calendar_vault';
export function installCalendarVault({api,t,node,button,connections,reload}){
 let working=false,queued=false,queuedRestore=false,lastError='';const captured=new Set(),queuedProviders=new Set();
 const empty=()=>({version:2,algorithm:'AES-256-GCM-SERVER',accounts:{}});
 function saved(){try{const value=validateVault(JSON.parse(localStorage.getItem(VAULT_KEY)));return value.version===2?value:empty();}catch{return empty();}}
 const dialog=node('mdui-dialog');dialog.id='calendar-vault-dialog';dialog.setAttribute('close-on-overlay-click','');
 const title=node('div');title.slot='headline';const content=node('div');content.className='calendar-vault-content';const close=button('');close.slot='action';close.onclick=()=>dialog.open=false;dialog.append(title,content,close);document.body.append(dialog);
 const removeDialog=node('mdui-dialog');removeDialog.id='calendar-vault-remove-dialog';const heading=node('div');heading.slot='headline';const description=node('p'),check=node('mdui-checkbox'),error=node('p'),cancel=button(''),confirm=button('','delete');check.id='calendar-vault-remove-confirm';error.setAttribute('role','status');cancel.slot=confirm.slot='action';confirm.variant='tonal';confirm.disabled=true;removeDialog.append(heading,description,check,error,cancel,confirm);document.body.append(removeDialog);cancel.onclick=()=>removeDialog.open=false;check.addEventListener('change',()=>confirm.disabled=!check.checked);let removalSnapshot=null;
 const label=()=>t('取消iCloud及Canvas日历登录状态在云端及导出文件中的储存','取消iCloud及Canvas日曆登入狀態在雲端及匯出檔案中的儲存');
 function status(){if(localStorage.getItem('navi_calendar_cloud_disabled')==='1')return t('已取消日历登录状态的云端及导出储存；已连接的日历继续使用。','已取消日曆登入狀態的雲端及匯出儲存；已連接的日曆繼續使用。');return lastError||t('iCloud／Canvas 登录状态默认加密保存，登录预设同步账号后自动同步。','iCloud／Canvas 登入狀態預設加密儲存，登入預設同步帳戶後自動同步。');}
 function changed(){const hint=document.getElementById('settings-calendar-vault-status');if(hint)hint.textContent=status();if(dialog.open)render();}
 async function sync(restore=true,provider){
  if(working){queued=true;queuedRestore=queuedRestore||restore;if(provider)for(const id of Array.isArray(provider)?provider:[provider])queuedProviders.add(id);return;}working=true;lastError='';
  try{
   let value=saved();
   for(const id of ['icloud','canvas'])if(connections()[id]?.authenticated&&connections()[id]?.calendarAuthorized&&(provider===id||provider?.includes(id)||!captured.has(id))){
    const result=await api(id,'calendar-vault-capture',{});value.accounts[id]=result.encrypted;captured.add(id);
   }
   if(Object.keys(value.accounts).length)localStorage.setItem(VAULT_KEY,JSON.stringify(value));
   if(window.naviSyncCalendarLogins)value=await window.naviSyncCalendarLogins(value,Object.keys(connections()).filter(id=>connections()[id]?.authenticated&&connections()[id]?.calendarAuthorized))||value;
   if(restore)for(const [id,encrypted]of Object.entries(value.accounts)){
    const state=connections()[id];if(state?.unavailable||state?.authenticated&&state?.calendarAuthorized)continue;
    try{await api(id,'calendar-vault-restore',{encrypted});}catch(e){lastError+=id+'：'+e.message+' ';}
   }
   if(restore)await reload();
  }catch(e){lastError=e.message;}
  finally{working=false;changed();if(queued){const restore=queuedRestore,providers=[...queuedProviders];queuedProviders.clear();queued=queuedRestore=false;void sync(restore,providers);}}
 }
 function requestRemoval(){removalSnapshot=localStorage.getItem(VAULT_KEY);heading.textContent=label()+'？';description.textContent=t('将自动移除当前同步账号的云端备份，之后导出也不再包含登录状态。已连接的日历和日程不受影响。其他账号、设备及旧导出文件需分别处理。','將自動移除目前同步帳戶的雲端備份，往後匯出亦不再包含登入狀態。已連接的日曆及日程不受影響。其他帳戶、裝置及舊匯出檔案需分別處理。');check.textContent=t('我已了解并确认取消储存','我已了解並確認取消儲存');check.checked=false;confirm.disabled=true;cancel.textContent=t('返回','返回');confirm.textContent=t('确认取消储存','確認取消儲存');error.textContent='';removeDialog.open=true;}
 function render(){title.textContent=t('日历登录状态同步','日曆登入狀態同步');close.textContent=t('关闭','關閉');content.replaceChildren(node('p',status()),node('small',t('使用服务器密钥加密，无需独立密码。只保存 iCloud／Canvas 登录状态；Google／Microsoft 日历仍需各自授权。本机退出日历不会删除云端备份。','使用伺服器密鑰加密，毋須獨立密碼。只儲存 iCloud／Canvas 登入狀態；Google／Microsoft 日曆仍需各自授權。本機登出日曆不會刪除雲端備份。')));
  if(localStorage.getItem('navi_calendar_cloud_disabled')==='1'){const resume=button(t('恢复默认自动同步','恢復預設自動同步'),'cloud_sync');resume.onclick=()=>{localStorage.removeItem('navi_calendar_cloud_disabled');captured.clear();void sync(true);};content.append(resume);}
  const raw=localStorage.getItem(VAULT_KEY);if(raw&&(()=>{try{return JSON.parse(raw).version===1;}catch{return false;}})())content.append(node('small',t('旧的独立密码备份不会自动转换；请重新连接 iCloud／Canvas，生成新的加密备份。','舊的獨立密碼備份不會自動轉換；請重新連接 iCloud／Canvas，產生新的加密備份。')));
  if(raw){const remove=button(label(),'delete_outline');remove.disabled=working;remove.onclick=requestRemoval;content.append(remove);}
 }
 confirm.onclick=async()=>{if(!check.checked||working)return;working=true;confirm.disabled=cancel.disabled=check.disabled=close.disabled=true;error.textContent=t('正在取消储存…','正在取消儲存…');try{
  if(!window.naviCancelCalendarVaultStorage)throw Error(t('同步暂不可用，请刷新重试。','同步暫時無法使用，請重新整理再試。'));
  const result=await window.naviCancelCalendarVaultStorage(removalSnapshot);localStorage.setItem('navi_calendar_cloud_disabled','1');lastError=result;removeDialog.open=false;
 }catch(e){error.textContent=e.message;}finally{working=false;confirm.disabled=!check.checked;cancel.disabled=check.disabled=close.disabled=false;changed();}};
 function open(){render();dialog.open=true;}
 function section(){const host=node('section');host.className='calendar-account-section calendar-vault-section';host.append(node('small',status()));
  if(localStorage.getItem(VAULT_KEY)){const remove=button(label(),'delete_outline');remove.disabled=working;remove.onclick=requestRemoval;host.append(remove);}
  return host;
 }
 async function capture(provider){localStorage.removeItem('navi_calendar_cloud_disabled');await sync(false,provider);}
 document.addEventListener('navi-sync-account-change',()=>{if(localStorage.getItem('navi_calendar_cloud_disabled')!=='1')void sync(true);});
 const start=()=>{document.removeEventListener('navi-calendar-updated',start);if(localStorage.getItem('navi_calendar_cloud_disabled')!=='1')void sync(true);};document.addEventListener('navi-calendar-updated',start);if(document.getElementById('home-calendar')?.getAttribute('aria-busy')==='false')start();
 window.naviOpenCalendarVault=open;document.querySelector('[data-open-calendar-vault]')?.addEventListener('click',()=>{document.getElementById('data-manage-dialog').open=false;setTimeout(open,200);});
 function labels(){const entry=document.querySelector('[data-open-calendar-vault]');if(entry)entry.textContent=t('日历登录状态同步','日曆登入狀態同步');changed();}new MutationObserver(labels).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});labels();
 return {section,capture};
}
