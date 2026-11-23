import {createVideoFeedAd} from './discover-ad.js?v=infeed-v1';
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
const region=document.getElementById('discover'),picker=document.getElementById('discover-platform'),data=new Map(),errors=new Map(),pending=new Set();let started=false,videoFeedAd=null;
try{picker.value=localStorage.getItem('navi_discover_platform')==='youtube'?'youtube':'bilibili';}catch{}
function moreLink(source){
 const provider=source==='github'?'GitHub':source==='youtube'?'YouTube':'Bilibili';
 const more=node('a');more.className='discover-more';more.href=source==='github'?'https://github.com/trending':source==='youtube'?'https://www.youtube.com/':'https://www.bilibili.com/v/popular/all';more.target='_blank';more.rel='noopener noreferrer';more.setAttribute('aria-label',t('前往 '+provider+' 查看更多','前往 '+provider+' 查看更多'));
 const circle=node('span');circle.className='discover-more-circle';const icon=node('span','arrow_forward');icon.className='material-icons';icon.setAttribute('aria-hidden','true');circle.append(icon);more.append(circle,node('span',t('更多','更多')));return more;
}
function draw(source){
 const isRepo=source==='github',list=document.getElementById(isRepo?'discover-repos':'discover-videos'),status=document.getElementById(isRepo?'discover-repo-status':'discover-video-status'),position=list.dataset.source===source?list.scrollLeft:0;
 list.dataset.source=source;const result=data.get(source);
 if(!isRepo){
  if(result?.items.length>=4&&!videoFeedAd)videoFeedAd=createVideoFeedAd();
  // Leave the ad and its iframe attached while rebuilding the surrounding cards.
  for(const child of [...list.children])if(child!==videoFeedAd?.element)child.remove();
  if(videoFeedAd){videoFeedAd.updateLabel();videoFeedAd.element.hidden=!result?.items.length||videoFeedAd.failed||videoFeedAd.unfilled;if(videoFeedAd.element.parentElement!==list)list.append(videoFeedAd.element);}
 }else list.replaceChildren();
 let index=0;
 if(result)for(const item of result.items){
  const card=node('a');card.className='discover-card'+(isRepo?' discover-repo-card':'');card.href=item.url;card.target='_blank';card.rel='noopener noreferrer';
  const cover=node('div');cover.className='discover-media';
  const placeholder=()=>{const icon=node('span',isRepo?'code':'play_circle');icon.className='material-icons discover-cover';cover.replaceChildren(icon);};
  if(item.image){const img=node('img');img.src=item.image;img.loading='lazy';img.referrerPolicy='no-referrer';img.alt='';let backup=false;img.onerror=()=>{if(!backup&&item.fallbackImage&&img.src!==item.fallbackImage){backup=true;img.src=item.fallbackImage;}else placeholder();};cover.append(img);}else placeholder();
  const body=node('div');body.className='discover-card-body';const heading=node('h3',item.title),description=node('p',item.description),metric=(item.metric||'').replace(/ views$/,t(' 次观看',' 次觀看')),meta=node('small',[item.author,metric].filter(Boolean).join(' · '));body.append(heading,description,meta);card.append(cover,body);if(!isRepo&&videoFeedAd&&index<3)list.insertBefore(card,videoFeedAd.element);else list.append(card);index++;
 }
 list.append(moreLink(source));list.scrollLeft=position;if(!isRepo)videoFeedAd?.request();
 const time=result?t('更新于 ','更新於 ')+new Date(result.updatedAt).toLocaleTimeString(sc()?'zh-CN':'zh-HK',{hour:'2-digit',minute:'2-digit'}):'';
 status.textContent=errors.has(source)?(source==='youtube'?t('YouTube 热门暂时不可用，请切换 Bilibili 或稍后重试','YouTube 熱門暫時不可用，請切換 Bilibili 或稍後重試'):t('暂时无法取得热门内容，请重试','暫時無法取得熱門內容，請重試'))+(result?' · '+time:''):pending.has(source)?t('正在加载…','正在載入…'):time;
}
function renderPlatform(){
 picker.dataset.value=picker.value;
 for(const button of picker.querySelectorAll('[data-platform]')){const active=button.dataset.platform===picker.value;button.setAttribute('aria-checked',String(active));button.tabIndex=active?0:-1;}
}

async function load(source,force=false){if(pending.has(source)||!force&&data.has(source))return;pending.add(source);errors.delete(source);draw(source);try{const response=await fetch('/api/discover?source='+source+'&v=previews-v2',{signal:AbortSignal.timeout(25000)});if(!response.ok)throw Error();const result=await response.json();data.set(source,result);}catch{errors.set(source,true);}finally{pending.delete(source);if(source==='github'||source===picker.value)draw(source);}}
function render(){document.getElementById('discover-repo-title').textContent=t('近期热门 GitHub 仓库','近期熱門 GitHub 儲存庫');document.getElementById('discover-repo-caption').textContent=t('近 30 天创建 · 按 Star 数排序','近 30 天建立 · 按 Star 數排序');document.getElementById('discover-video-title').textContent=t('热门影片','熱門影片');picker.setAttribute('aria-label',t('影片平台','影片平台'));renderPlatform();for(const button of region.querySelectorAll('[data-discover-refresh]'))button.setAttribute('aria-label',t('刷新热门内容','更新熱門內容'));titleButton.textContent=t('抓取页面标题','擷取網頁標題');draw('github');draw(picker.value);}
picker.onchange=()=>{renderPlatform();try{localStorage.setItem('navi_discover_platform',picker.value);}catch{}draw(picker.value);void load(picker.value);};
for(const button of picker.querySelectorAll('[data-platform]'))button.onclick=()=>{if(picker.value===button.dataset.platform)return;picker.value=button.dataset.platform;picker.dispatchEvent(new Event('change'));};
picker.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;event.preventDefault();const buttons=[...picker.querySelectorAll('[data-platform]')],next=event.key==='Home'?buttons[0]:event.key==='End'?buttons[1]:buttons.find(b=>b.dataset.platform!==picker.value);next.focus();next.click();});
for(const b of region.querySelectorAll('[data-discover-refresh]'))b.onclick=()=>void load(b.dataset.discoverRefresh==='github'?'github':picker.value,true);
new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});render();
const observer=new IntersectionObserver(entries=>{if(entries.some(x=>x.isIntersecting)){started=true;void load('github');void load(picker.value);observer.disconnect();}},{rootMargin:'200px'});observer.observe(region);
setInterval(()=>{if(started&&document.visibilityState==='visible'){void load('github',true);void load(picker.value,true);}},900000);
