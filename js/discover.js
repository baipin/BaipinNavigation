import {createVideoFeedAd} from './discover-ad.js?v=dismiss-v4';
const sc=()=>document.documentElement.lang==='zh-CN',t=(s,c)=>sc()?s:c;
const node=(tag,content)=>{const el=document.createElement(tag);if(content)el.textContent=content;return el;};
function metadataButton(button,urlField,target,kind){
 const hint=node('p');hint.className='metadata-hint';hint.setAttribute('role','status');button.parentElement.after(hint);
 button.onclick=async()=>{const entered=urlField.value.trim();let url;try{url=new URL(entered);if(!['https:','http:'].includes(url.protocol))throw Error();}catch{hint.textContent=t('请先填写完整网页网址','請先填寫完整網頁網址');return;}
 button.disabled=true;button.loading=true;hint.textContent=t('正在读取网页资料…','正在讀取網頁資料…');const prior=target.value;
 try{const response=await fetch('/api/site-metadata?'+new URLSearchParams({url:url.href}),{signal:AbortSignal.timeout(35000),cache:'no-store'});if(!response.ok)throw Error();const data=await response.json();if(urlField.value.trim()!==entered||target.value!==prior){hint.textContent=t('输入已变更，请重新抓取','輸入已變更，請重新擷取');return;}const value=kind==='title'?data.title:data.icon;if(!value){hint.textContent=kind==='title'?t('页面未提供标题，请手动填写','頁面未提供標題，請手動填寫'):t('未找到可读取的图标，请手动填写或挑选图标','未找到可讀取的圖示，請手動填寫或挑選圖示');return;}target.value=value;hint.replaceChildren(document.createTextNode(t('已识别：','已識別：')+(kind==='title'?value:t('网站图标','網站圖示'))));if(kind==='icon'){const img=node('img');img.src=value;img.alt='';img.referrerPolicy='no-referrer';img.onerror=()=>img.remove();hint.prepend(img);}}
 catch{hint.textContent=t('无法读取网页（可能需要登录或阻止抓取），请稍后重试或手动填写','無法讀取網頁（可能需要登入或阻止擷取），請稍後重試或手動填寫');}finally{button.disabled=false;button.loading=false;}
 };
}
const titleButton=document.getElementById('btn-get-title');
metadataButton(document.getElementById('btn-get-icon'),document.getElementById('f-url'),document.getElementById('f-icon'),'icon');
metadataButton(titleButton,document.getElementById('f-url'),document.getElementById('f-name'),'title');
metadataButton(document.getElementById('btn-get-engine-icon'),document.getElementById('engine-url'),document.getElementById('engine-icon'),'icon');
const region=document.getElementById('discover'),picker=document.getElementById('discover-platform'),data=new Map(),errors=new Map(),pending=new Set();let started=false,videoFeedAd=null,videoAdDismissed=false,videoBatchChanged=false;const pages=new Map(),batchHistory=new Map();
try{picker.value=localStorage.getItem('navi_discover_platform')==='youtube'?'youtube':'bilibili';}catch{}
function moreLink(source){
 const more=node('button');more.type='button';more.className='discover-more';more.dataset.discoverNext=source==='github'?'github':'video';more.disabled=pending.has(source);more.setAttribute('aria-label',t('换一批','換一批'));more.setAttribute('aria-busy',String(pending.has(source)));
 const circle=node('span');circle.className='discover-more-circle';const icon=node('span','shuffle');icon.className='material-icons';icon.setAttribute('aria-hidden','true');circle.append(icon);more.append(circle,node('span',t('换一批','換一批')));more.onclick=()=>void load(source,true,true);return more;
}

function draw(source){
 const isRepo=source==='github',list=document.getElementById(isRepo?'discover-repos':'discover-videos'),status=document.getElementById(isRepo?'discover-repo-status':'discover-video-status'),position=list.dataset.source===source?list.scrollLeft:0;
 list.dataset.source=source;const result=data.get(source);
 if(!isRepo){
  if(result?.items.length>=4&&!videoFeedAd&&!videoAdDismissed)videoFeedAd=createVideoFeedAd({onClose:()=>{videoAdDismissed=true;}});if(videoBatchChanged)videoFeedAd?.enableClose();
  // Leave the ad and its iframe attached while rebuilding the surrounding cards.
  for(const child of [...list.children])if(child!==videoFeedAd?.element)child.remove();
  if(videoFeedAd){videoFeedAd.updateLabel();videoFeedAd.element.hidden=!result?.items.length||videoAdDismissed||videoFeedAd.failed||videoFeedAd.unfilled;if(videoFeedAd.element.parentElement!==list)list.append(videoFeedAd.element);}
 }else list.replaceChildren();
 updateBackButtons();
 let index=0;
 if(result)for(const item of result.items){
  const card=node('a');card.className='discover-card'+(isRepo?' discover-repo-card':'');card.href=item.url;card.target='_blank';card.rel='noopener noreferrer';
  const cover=node('div');cover.className='discover-media';
  const placeholder=()=>{const icon=node('span',isRepo?'code':'play_circle');icon.className='material-icons discover-cover';cover.replaceChildren(icon);};
  if(item.image){const img=node('img');img.src=item.image;img.loading='lazy';img.referrerPolicy='no-referrer';img.alt='';let backup=false;img.onerror=()=>{if(!backup&&item.fallbackImage&&img.src!==item.fallbackImage){backup=true;img.src=item.fallbackImage;}else placeholder();};cover.append(img);}else placeholder();
  const body=node('div');body.className='discover-card-body';const heading=node('h3',item.title),description=node('p',item.description),metric=(item.metric||'').replace(/ views$/,''),meta=node('small');
  if(isRepo)meta.textContent=[item.author,item.metric].filter(Boolean).join(' · ');
  else{meta.className='discover-video-meta';for(const [name,value,label]of [['person',item.author,t('作者','作者')],['visibility',metric,t('观看次数','觀看次數')]]){if(!value)continue;const part=node('span');part.className='discover-meta-item';part.title=label+'：'+value;part.setAttribute('aria-label',label+'：'+value);const icon=node('span',name);icon.className='material-icons';icon.setAttribute('aria-hidden','true');part.append(icon,node('span',value));meta.append(part);}}
  body.append(heading,description,meta);card.append(cover,body);if(!isRepo&&videoFeedAd&&index<3)list.insertBefore(card,videoFeedAd.element);else list.append(card);index++;
 }
 list.append(moreLink(source));list.scrollLeft=position;if(!isRepo)videoFeedAd?.request();
 const time=result?t('更新于 ','更新於 ')+new Date(result.updatedAt).toLocaleTimeString(sc()?'zh-CN':'zh-HK',{hour:'2-digit',minute:'2-digit'}):'';
 status.textContent=errors.has(source)?(source==='youtube'?t('YouTube 热门暂时不可用，请切换 Bilibili 或稍后重试','YouTube 熱門暫時不可用，請切換 Bilibili 或稍後重試'):t('暂时无法取得热门内容，请重试','暫時無法取得熱門內容，請重試'))+(result?' · '+time:''):pending.has(source)?t('正在加载…','正在載入…'):time;
}
function updateExternalLinks(){
 for(const button of region.querySelectorAll('[data-discover-open]')){
  const source=button.dataset.discoverOpen==='github'?'github':picker.value,provider=source==='github'?'GitHub':source==='youtube'?'YouTube':'Bilibili';
  button.href=source==='github'?'https://github.com/trending':source==='youtube'?'https://www.youtube.com/':'https://www.bilibili.com/v/popular/all';
  const label=t('在新窗口打开 ','在新視窗開啟 ')+provider;button.setAttribute('aria-label',label);button.title=label;
 }
}
function renderPlatform(){
 picker.dataset.value=picker.value;updateExternalLinks();
 for(const button of picker.querySelectorAll('[data-platform]')){const active=button.dataset.platform===picker.value;button.setAttribute('aria-checked',String(active));button.tabIndex=active?0:-1;}
}

async function load(source,force=false,next=false){
 if(!window.naviWidgets.enabled(source==='github'?'repos':'videos')||pending.has(source)||!force&&data.has(source))return;
 const previous=data.get(source),page=next?(previous?.hasMore?(pages.get(source)||1)+1:1):(pages.get(source)||1),list=document.getElementById(source==='github'?'discover-repos':'discover-videos'),status=document.getElementById(source==='github'?'discover-repo-status':'discover-video-status');
 let succeeded=false;
 pending.add(source);errors.delete(source);updateBatchButtons();
 if(source==='github'||source===picker.value){list.setAttribute('aria-busy','true');status.textContent=t('正在加载…','正在載入…');}
 try{const response=await fetch('/api/discover?'+new URLSearchParams({source,page:String(page),v:'batches-v3'}),{signal:AbortSignal.timeout(25000)});if(!response.ok)throw Error();const result=await response.json();if(!result.items?.length)throw Error();if(next&&previous){const stack=batchHistory.get(source)||[];stack.push({result:previous,page:pages.get(source)||1});if(stack.length>4)stack.shift();batchHistory.set(source,stack);}data.set(source,result);pages.set(source,page);if(next&&source!=='github'){videoBatchChanged=true;videoFeedAd?.enableClose();}succeeded=true;}
 catch{errors.set(source,true);}finally{
  pending.delete(source);updateBatchButtons();
  if(source==='github'||source===picker.value){
   list.setAttribute('aria-busy','false');
   if(succeeded){draw(source);if(next){list.scrollTo({left:0,behavior:'instant'});list.querySelector('a.discover-card')?.focus({preventScroll:true});}}
   else status.textContent=t('加载失败，已保留当前内容，请重试。','載入失敗，已保留目前內容，請重試。');
  }
 }
}
function updateBackButtons(){
 for(const kind of ['github','video']){
  const source=kind==='github'?'github':picker.value,refresh=region.querySelector('[data-discover-refresh="'+kind+'"]');
  let button=region.querySelector('[data-discover-back="'+kind+'"]');
  if(!button){button=node('mdui-button-icon');button.icon='arrow_back';button.dataset.discoverBack=kind;(refresh.parentElement.classList.contains('discover-refresh-control')?refresh.parentElement:refresh).before(button);button.onclick=()=>{const current=kind==='github'?'github':picker.value,stack=batchHistory.get(current)||[];if(!stack.length||pending.has(current))return;const entry=stack.pop();data.set(current,entry.result);pages.set(current,entry.page);draw(current);const list=document.getElementById(kind==='github'?'discover-repos':'discover-videos');list.scrollLeft=0;};}
  button.hidden=!(batchHistory.get(source)?.length);button.disabled=pending.has(source);button.setAttribute('aria-label',t('返回上一批','返回上一批'));button.title=t('返回上一批','返回上一批');
 }
}
function updateBatchButtons(){
 updateBackButtons();
 for(const button of region.querySelectorAll('[data-discover-next],[data-discover-refresh]')){
  const kind=button.dataset.discoverNext||button.dataset.discoverRefresh,source=kind==='github'?'github':picker.value,busy=pending.has(source);
  button.disabled=busy;button.setAttribute('aria-busy',String(busy));
  if(button.dataset.discoverRefresh){
   let control=button.parentElement;
   if(!control.classList.contains('discover-refresh-control')){control=node('span');control.className='discover-refresh-control';button.before(control);control.append(button);const spinner=node('mdui-circular-progress');spinner.className='discover-refresh-progress';spinner.setAttribute('role','status');control.append(spinner);}
   control.classList.toggle('is-loading',busy);const spinner=control.querySelector('.discover-refresh-progress');spinner.hidden=!busy;spinner.setAttribute('aria-label',t('正在加载热门内容','正在載入熱門內容'));button.setAttribute('aria-label',t('刷新热门内容','更新熱門內容'));
  }else if(button.tagName==='MDUI-BUTTON')button.loading=busy;
 }
}

function render(){document.getElementById('discover-repo-title').textContent=t('热门 GitHub 仓库','熱門 GitHub 儲存庫');document.getElementById('discover-repo-caption').textContent='See Github Trends in 30 days';document.getElementById('discover-video-title').textContent=t('热门影片','熱門影片');picker.setAttribute('aria-label',t('影片平台','影片平台'));renderPlatform();updateBatchButtons();for(const button of region.querySelectorAll('[data-discover-refresh]'))button.setAttribute('aria-label',t('刷新热门内容','更新熱門內容'));titleButton.textContent=t('抓取标题','擷取標題');draw('github');draw(picker.value);}
picker.onchange=()=>{renderPlatform();updateBatchButtons();try{localStorage.setItem('navi_discover_platform',picker.value);}catch{}draw(picker.value);void load(picker.value);};
for(const button of picker.querySelectorAll('[data-platform]'))button.onclick=()=>{if(picker.value===button.dataset.platform)return;picker.value=button.dataset.platform;picker.dispatchEvent(new Event('change'));};
picker.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;event.preventDefault();const buttons=[...picker.querySelectorAll('[data-platform]')],next=event.key==='Home'?buttons[0]:event.key==='End'?buttons[1]:buttons.find(b=>b.dataset.platform!==picker.value);next.focus();next.click();});
for(const b of region.querySelectorAll('[data-discover-next]'))b.onclick=()=>void load(b.dataset.discoverNext==='github'?'github':picker.value,true,true);
for(const b of region.querySelectorAll('[data-discover-refresh]'))b.onclick=()=>void load(b.dataset.discoverRefresh==='github'?'github':picker.value,true);
new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});render();
const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){started=true;void load(entry.target.id==='discover-repos'?'github':picker.value);}},{rootMargin:'150px'});observer.observe(document.getElementById('discover-repos'));observer.observe(document.getElementById('discover-videos'));
document.addEventListener('navi-widgets-change',()=>{if(window.naviWidgets.ready('repos'))void load('github');if(window.naviWidgets.ready('videos'))void load(picker.value);});
setInterval(()=>{if(started&&document.visibilityState==='visible'){if(window.naviWidgets.ready('repos'))void load('github',true);if(window.naviWidgets.ready('videos'))void load(picker.value,true);}},900000);
