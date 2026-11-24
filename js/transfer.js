const providers={google:['Google','/api/sync'],github:['GitHub','/api/github'],microsoft:['Microsoft','/api/microsoft'],feishu:['飞书','/api/feishu']};
const t=(sc,tc)=>document.documentElement.lang==='zh-CN'?sc:tc;
const el=(tag,text)=>{const node=document.createElement(tag);if(text)node.textContent=text;return node;};
const dialog=el('mdui-dialog');dialog.id='transfer-dialog';dialog.setAttribute('close-on-overlay-click','');
const title=el('span');const headline=el('div');headline.slot='headline';headline.className='transfer-headline';
const info=el('p');info.className='transfer-hint';const caution=el('p');caution.className='transfer-caution';
const composer=el('div');composer.className='transfer-composer';const text=el('textarea');text.rows=3;text.maxLength=20000;
const actions=el('div');actions.className='transfer-composer-actions';
const file=el('input');file.type='file';file.hidden=true;file.id='transfer-file';
const pick=el('mdui-button');pick.variant='outlined';pick.icon='attach_file';
const selection=el('span');selection.className='transfer-selection';
const clearFile=el('mdui-button-icon');clearFile.icon='close';clearFile.hidden=true;clearFile.onclick=()=>{file.value='';renderSelection();};
const send=el('mdui-button');send.variant='tonal';send.icon='send';
const tools=el('div');tools.className='transfer-tools';const heading=el('strong'),refresh=el('mdui-button-icon');refresh.icon='refresh';tools.append(heading,refresh);
const clearAll=el('mdui-button');clearAll.variant='text';clearAll.icon='delete_sweep';tools.insertBefore(clearAll,refresh);
const clearPanel=el('div');clearPanel.className='transfer-clear-panel';clearPanel.hidden=true;const clearHint=el('p'),clearCancel=el('mdui-button'),clearConfirm=el('mdui-button');clearConfirm.variant='tonal';clearCancel.onclick=()=>clearPanel.hidden=true;clearAll.onclick=()=>{clearPanel.hidden=false;};clearPanel.append(clearHint,clearCancel,clearConfirm);
const progress=el('mdui-linear-progress');progress.hidden=true;
const status=el('p');status.className='transfer-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const list=el('div');list.className='transfer-list';const detail=el('div');detail.className='transfer-detail';detail.hidden=true;
const close=el('mdui-button-icon');close.icon='close';close.onclick=()=>dialog.open=false;headline.append(title,close);
const history=el('div');history.className='transfer-history';history.append(clearPanel,status,list,detail);
actions.append(pick,selection,clearFile,send);composer.append(text,file,actions);dialog.append(headline,info,caution,tools,progress,history,composer);document.body.append(dialog);
const loginNotice=el('mdui-snackbar');loginNotice.id='transfer-login-notice';loginNotice.autoCloseDelay=5000;loginNotice.closeable=true;document.body.append(loginNotice);
// iOS and Android keyboards can resize only the visual viewport, leaving 100dvh unchanged.
let viewportFrame=0;
function fitViewport(){
 cancelAnimationFrame(viewportFrame);viewportFrame=requestAnimationFrame(()=>{
  if(!dialog.open)return;const viewport=window.visualViewport;
  dialog.style.setProperty('--transfer-viewport-height',`${viewport?.height||window.innerHeight}px`);
  dialog.style.setProperty('--transfer-viewport-top',`${viewport?.offsetTop||0}px`);
 });
}
function watchViewport(){window.visualViewport?.addEventListener('resize',fitViewport);window.visualViewport?.addEventListener('scroll',fitViewport);window.addEventListener('resize',fitViewport);fitViewport();}
function unwatchViewport(){window.visualViewport?.removeEventListener('resize',fitViewport);window.visualViewport?.removeEventListener('scroll',fitViewport);window.removeEventListener('resize',fitViewport);cancelAnimationFrame(viewportFrame);dialog.classList.remove('is-composing');}
text.addEventListener('focus',()=>{dialog.classList.add('is-composing');fitViewport();});
text.addEventListener('blur',()=>{dialog.classList.remove('is-composing');fitViewport();});
const header=el('mdui-button-icon');header.id='transfer-open';header.icon='devices';
document.getElementById('data-manage-btn').before(header);
const settings=el('mdui-button');settings.variant='outlined';settings.icon='devices';settings.id='settings-transfer';settings.hidden=true;document.querySelector('#settings-calendar')?.after(settings);
let controller=null,timer=null,active=null,generation=0,inFlight=false,working=false,lastItems=[];
const account=()=>window.naviSyncAccount?.();
const identity=state=>state?.user?state.provider+':'+state.user.id:null;
const current=()=>dialog.open&&!document.hidden&&active&&identity(account())===identity(active);
function message(value,error=false){status.textContent=value;status.classList.toggle('is-error',error);}
function controls(){const busy=working||inFlight;progress.hidden=!busy;send.disabled=busy;clearAll.disabled=busy;clearConfirm.disabled=busy;pick.disabled=busy;clearFile.disabled=busy;refresh.disabled=busy;text.disabled=working;send.loading=working;}
function stop(){generation++;clearTimeout(timer);timer=null;controller?.abort();controller=null;inFlight=false;working=false;controls();}
function schedule(){clearTimeout(timer);if(current())timer=setTimeout(()=>void load(),15000);}
async function request(action,body,id){
 if(!active)throw Error(t('请先登录同步账号','請先登入同步帳戶'));
 const endpoint=providers[active.provider][1],url=endpoint+'?'+new URLSearchParams({action,...(id?{id}:{})});
 const response=await fetch(url,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{}),signal:controller.signal});
 let result;try{result=await response.json();}catch{throw Error(t('传输接口暂不可用，请稍后重试','傳輸介面暫時無法使用，請稍後重試'));}
 if(!response.ok)throw Error(result.error||t('传输失败，请重试','傳輸失敗，請重試'));return result;
}
function readableDate(value){return new Date(value).toLocaleString(document.documentElement.lang==='zh-CN'?'zh-CN':'zh-HK',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});}
function draw(){
 list.replaceChildren();
 if(!lastItems.length){const empty=el('p',t('暂存区暂无内容。在另一台登录同一平台、同一账号的设备打开传输助手即可接收。','暫存區暫無內容。在另一台登入同一平台、同一帳戶的裝置開啟傳輸助手即可接收。'));empty.className='transfer-hint';list.append(empty);return;}
 for(const item of lastItems){
  const row=el('article');row.className='transfer-item';const icon=el('span',item.kind==='file'?'description':'notes');icon.className='material-icons';icon.setAttribute('aria-hidden','true');
  const content=el('div');content.className='transfer-item-content';content.append(el('strong',item.label||(item.kind==='file'?t('文件','檔案'):t('文字','文字'))),el('small',readableDate(item.createdAt)+' · '+t('到期 ','到期 ')+readableDate(item.expiresAt)));
  const open=el('mdui-button-icon');open.icon=item.kind==='file'?'download':'visibility';open.setAttribute('aria-label',item.kind==='file'?t('下载文件','下載檔案'):t('查看文字','查看文字'));open.title=open.getAttribute('aria-label');open.disabled=working;open.onclick=()=>void operate(async()=>{
   const record=await request('transfer-read',null,item.id);if(!current())return;
   if(record.kind==='file'){
    const binary=atob(record.base64),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0)),blob=new Blob([bytes],{type:'application/octet-stream'}),url=URL.createObjectURL(blob),link=el('a');link.href=url;link.download=record.name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);message(t('文件已准备下载','檔案已準備下載'));
   }else{
    const value=el('textarea');value.readOnly=true;value.rows=6;value.value=record.text;value.setAttribute('aria-label',t('收到的文字','收到的文字'));
    const copy=el('mdui-button',t('复制文字','複製文字'));copy.icon='content_copy';copy.variant='tonal';copy.onclick=async()=>{try{await navigator.clipboard.writeText(record.text);message(t('已复制','已複製'));}catch{value.focus();value.select();message(t('请复制已选中的文字','請複製已選取的文字'));}};
    const dismiss=el('mdui-button',t('收起','收起'));dismiss.onclick=()=>{detail.hidden=true;detail.replaceChildren();};detail.replaceChildren(value,copy,dismiss);detail.hidden=false;detail.scrollIntoView({block:'nearest',behavior:'smooth'});message('');
   }
  });
  const remove=el('mdui-button-icon');remove.icon='delete_outline';remove.title=t('从暂存区删除','從暫存區刪除');remove.setAttribute('aria-label',remove.title);remove.disabled=working;remove.onclick=()=>void operate(async()=>{await request('transfer-delete',{id:item.id});if(!current())return;lastItems=lastItems.filter(row=>row.id!==item.id);detail.hidden=true;detail.replaceChildren();message(t('已从暂存区删除','已從暫存區刪除'));});
  row.append(icon,content,open,remove);list.append(row);
 }
}
async function load(){
 if(!current()||inFlight||working)return;clearTimeout(timer);const token=generation;inFlight=true;controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),45000);controls();
 try{const result=await request('transfer-list');if(token!==generation||!current())return;lastItems=result.items||[];draw();message(result.cleanupPending?t('部分过期内容未能从云端清理，将在下次打开时重试。','部分到期內容未能從雲端清理，將於下次開啟時重試。'):t('已更新 · ','已更新 · ')+new Date().toLocaleTimeString());}
 catch(error){if(token===generation&&current()){message(error.name==='AbortError'?t('连接超时，请点击刷新重试','連線逾時，請點擊更新重試'):error.message,true);}}
 finally{clearTimeout(timeout);if(token===generation){inFlight=false;controller=null;controls();schedule();}}
}
async function operate(task){
 if(!current()||working||inFlight)return;clearTimeout(timer);const token=generation;working=true;controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),45000);controls();draw();
 try{await task();}catch(error){if(token===generation&&current())message(error.name==='AbortError'?t('连接超时，请刷新确认是否已发送，再决定重试','連線逾時，請更新確認是否已傳送，再決定重試'):error.message,true);}
 finally{clearTimeout(timeout);if(token===generation){working=false;controller=null;controls();draw();schedule();}}
}
function fileBase64(value){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error(t('无法读取文件','無法讀取檔案')));reader.readAsDataURL(value);});}
pick.onclick=()=>file.click();file.onchange=()=>{const value=file.files[0];if(value&&(!value.size||value.size>512*1024)){file.value='';message(t('文件大小须为 1 字节至 512 KB','檔案大小須為 1 位元組至 512 KB'),true);}renderSelection();};
function renderSelection(){clearFile.hidden=!file.files[0];selection.textContent=file.files[0]?file.files[0].name+' ('+Math.ceil(file.files[0].size/1024)+' KB)':'';}
send.onclick=()=>void operate(async()=>{
 const value=file.files[0],draft=text.value;
 if(value&&draft.trim())throw Error(t('文字和文件请分开发送，以免遗漏内容','文字和檔案請分開傳送，以免遺漏內容'));
 const body=value?{kind:'file',name:value.name,base64:await fileBase64(value)}:{kind:'text',text:draft};
 if(!current())return;await request('transfer-send',body);if(!current())return;text.value='';file.value='';renderSelection();try{const result=await request('transfer-list');if(!current())return;lastItems=result.items||[];draw();message(t('已发送，另一台设备打开窗口后即可查看','已傳送，另一台裝置開啟視窗後即可查看'));}catch{if(current())message(t('已发送，但列表更新失败，请刷新查看，无需重复发送','已傳送，但清單更新失敗，請更新查看，毋須重複傳送'),true);}
});
refresh.onclick=()=>void load();
clearConfirm.onclick=()=>void operate(async()=>{const result=await request('transfer-clear',{confirm:true});if(!current())return;clearPanel.hidden=true;detail.hidden=true;detail.replaceChildren();const latest=await request('transfer-list');if(!current())return;lastItems=latest.items||[];message(result.remaining?t('部分项目未能删除，请再次清理或稍后重试','部分項目未能刪除，請再次清理或稍後重試'):t('已清空当前账号的传输暂存区','已清空目前帳戶的傳輸暫存區'),!!result.remaining);});
function render(){
 const state=account(),signed=!!state?.user;settings.hidden=!signed;
 clearAll.textContent=t('清空暂存区','清空暫存區');clearHint.textContent=t('清空当前账号的全部传输文字和文件？所有设备将无法再接收这些内容。预设和日历不受影响。您选择的登录平台可能为您另留历史版本或回收站。','清空目前帳戶的所有傳輸文字及檔案？所有裝置將無法再接收這些內容。預設及日曆不受影響。您選擇的登入平台可能為您另留歷史版本或回收站。');clearCancel.textContent=t('取消','取消');clearConfirm.textContent=t('确认清空','確認清空');
 const label=t('传输助手','傳輸助手');header.title=label;header.setAttribute('aria-label',label);settings.textContent=label;title.textContent=label;
 text.placeholder=t('输入文字（最多 20,000 字）；文件请单独发送','輸入文字（最多 20,000 字）；檔案請單獨傳送');text.setAttribute('aria-label',t('待传送文字','待傳送文字'));pick.textContent=t('选择小文件','選擇小檔案');clearFile.setAttribute('aria-label',t('取消所选文件','取消所選檔案'));send.textContent=t('发送','傳送');heading.textContent=t('云端暂存区','雲端暫存區');close.title=t('关闭','關閉');close.setAttribute('aria-label',close.title);refresh.setAttribute('aria-label',t('刷新暂存区','更新暫存區'));
 info.textContent=(active?providers[active.provider][0]+' · '+(active.user.email||active.user.name||'')+'\n':'')+t('文件 ≤512 KB，最多 20 项，保留 24 小时。每 15 秒自动更新一次。','檔案 ≤512 KB，最多 20 項，保留 24 小時。每 15 秒自動更新一次。');
 caution.textContent=(active?.provider==='github'?t(' GitHub 使用 Secret Gist，知道链接的人可读取内容，请勿传送敏感资料。',' GitHub 使用 Secret Gist，知道連結的人可讀取內容，請勿傳送敏感資料。'):active?.provider==='feishu'?t(' 飞书文件沿用云空间访问权限。',' 飛書檔案沿用雲空間存取權限。'):'');caution.hidden=!caution.textContent;
 if(dialog.open&&identity(state)!==identity(active)){stop();dialog.open=false;}
}
function open(){const state=account();if(!state?.user){loginNotice.textContent=t('请先登录，再使用传输助手。','請先登入，再使用傳輸助手。');loginNotice.open=true;return;}stop();active={...state};clearPanel.hidden=true;lastItems=[];detail.hidden=true;detail.replaceChildren();text.value='';file.value='';renderSelection();render();draw();dialog.open=true;}
header.onclick=open;settings.onclick=()=>{const settingsDialog=document.getElementById('data-manage-dialog');if(settingsDialog.open){settingsDialog.addEventListener('closed',open,{once:true});settingsDialog.open=false;}else open();};
dialog.addEventListener('open',watchViewport);dialog.addEventListener('opened',()=>{fitViewport();void load();});dialog.addEventListener('close',()=>{stop();unwatchViewport();});dialog.addEventListener('closed',()=>{stop();active=null;lastItems=[];list.replaceChildren();detail.replaceChildren();text.value='';file.value='';});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else if(dialog.open)void load();});document.addEventListener('navi-sync-account-change',render);new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});render();
