import {startWebcastVideo,getWebcastFrame,webcastFrameBlob} from './traffic-webcast.js?v=priority-preview-v7';
import {CAMERA_BACKGROUND_KEY,parseCameraPreference,cameraImageUrl,cameraRefreshInterval} from './camera-background-model.js';

const sourcePicker=document.getElementById('background-camera-source');
const gallery=document.getElementById('background-camera-gallery');
const search=document.getElementById('background-camera-search');
const loadMore=document.getElementById('background-camera-more');
const status=document.getElementById('background-camera-status');
const refreshCheck=document.getElementById('background-camera-refresh');
const staticActions=document.querySelector('.settings-background-actions');
let bingInfo=null,bingFetched=0,pendingChoice=null,activePlayer=null,pendingController=null,backgroundBlobUrl=null,thumbnailController=null;
let catalog=null,loading=null,choice=null,shown=12,timer=null,revision=0,lastUpdate=null,failed=false,pending=false,thumbnailObserver=null;
const simple=()=>document.documentElement.lang==='zh-CN';
const t=(sc,tc)=>simple()?sc:tc;
try {choice=parseCameraPreference(localStorage.getItem(CAMERA_BACKGROUND_KEY));}catch{}
sourcePicker.value=choice?.source || 'photo';
const name=item=>item[simple()?'sc':'tc'] || item.tc || item.id;
function sourceName(source) {return source==='hko'?t('香港天文台','香港天文台'):t('运输署','運輸署');}
const cameraRows=source=>source==='bing'?[{id:'DAILY',sc:bingInfo?.title || 'Bing 每日图片',tc:bingInfo?.title || 'Bing 每日圖片'}]:catalog?.[source==='webcast-live'?'webcast':source] || [];
async function loadBing(signal){
    if(bingInfo && Date.now()-bingFetched<300000)return bingInfo;
    const response=await fetch('/api/bing?lang='+(simple()?'sc':'tc'),{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(12000)]):AbortSignal.timeout(12000)});
    if(!response.ok)throw new Error('Bing unavailable');const data=await response.json();
    if(new URL(data.url).origin!=='https://www.bing.com' || new URL(data.thumbnail).origin!=='https://www.bing.com')throw new Error('Invalid image');
    bingInfo=data;bingFetched=Date.now();return data;
}
function currentCamera() {return choice && cameraRows(choice.source).find(item=>item.id===choice.id);}
function updateAttribution() {
    const item=currentCamera(),footer=document.getElementById('photo-attribution');
    if(!item || !footer)return;
    if(choice.source==='bing' && bingInfo){const link=document.createElement('a');link.href=bingInfo.link;link.target='_blank';link.rel='noopener noreferrer';link.style.color='inherit';link.textContent='Bing · '+bingInfo.copyright;footer.replaceChildren(link);return;}
    const link=document.createElement('a');link.href=choice.source==='hko'?'https://www.hko.gov.hk/'+(simple()?'sc':'tc')+'/wxinfo/ts/index_webcam.htm':choice.source.startsWith('webcast')?'https://www.hkemobility.gov.hk/'+(simple()?'sc':'tc')+'/traffic-information/live/webcast':'https://www.hkemobility.gov.hk/';link.target='_blank';link.rel='noopener noreferrer';link.className='mdui-link';link.style.color='inherit';link.textContent=sourceName(choice.source)+' · '+name(item);
    footer.replaceChildren(link);
    if(lastUpdate){const time=document.createElement('small');time.textContent=' · '+t('获取于 ','取得於 ')+lastUpdate.toLocaleTimeString(simple()?'zh-CN':'zh-HK',{hour:'2-digit',minute:'2-digit'});footer.append(time);}
}
function showStatus(message) {status.textContent=message;}
function schedule() {
    clearTimeout(timer);timer=null;
    if(choice?.refresh)timer=setTimeout(()=>{if(document.visibilityState==='visible')updateBackground();else schedule();},failed && choice.source.startsWith('webcast')?10000:cameraRefreshInterval(choice.source));
}
function preloadImage(url) {
    return new Promise((resolve,reject)=>{
        const image=new Image();image.referrerPolicy='no-referrer';
        const timeout=setTimeout(()=>{image.onload=image.onerror=null;reject(new Error('timeout'));},15000);
        image.onload=()=>{clearTimeout(timeout);resolve(image);};image.onerror=()=>{clearTimeout(timeout);reject(new Error('image'));};image.src=url;
    });
}
function stopLivePlayer() {activePlayer?.destroy();activePlayer=null;}
function setBackdrop(url,owned) {
    window.applyBackground(url);
    if(backgroundBlobUrl)URL.revokeObjectURL(backgroundBlobUrl);
    backgroundBlobUrl=owned?url:null;
}
async function updateBackground(candidate=choice,persist=false) {
    if(!candidate || !cameraRows(candidate.source).some(item=>item.id===candidate.id))return;
    clearTimeout(timer);timer=null;pendingController?.abort();pendingController=new AbortController();
    const signal=pendingController.signal,current=++revision;
    pending=true;pendingChoice=candidate;renderSelection();showStatus(t('正在获取摄影机图像…','正在取得攝影機圖像…'));
    let url=null,owned=false,transferred=false,newPlayer=null,liveSession=null;
    try {
        const item=cameraRows(candidate.source).find(item=>item.id===candidate.id);
        if(candidate.source==='bing'){const image=await loadBing(signal);url=image.url;await preloadImage(url);}
        else if(candidate.source==='webcast-live') {
            candidate={...candidate,refresh:true};
            liveSession=await startWebcastVideo(candidate.id,{signal,onError:()=>{
                if(activePlayer===liveSession){stopLivePlayer();failed=true;schedule();showStatus(t('直播连接中断，已保留最后画面，稍后自动重试。','直播連線中斷，已保留最後畫面，稍後自動重試。'));}
            }});
            newPlayer=liveSession;url=URL.createObjectURL(await webcastFrameBlob(newPlayer.video));owned=true;
        } else if(candidate.source==='webcast') {
            const frame=await getWebcastFrame(candidate.id,{signal,force:!persist,priority:persist});
            url=URL.createObjectURL(frame.blob);owned=true;
        } else {
            url=cameraImageUrl(candidate.source,item.imageId || candidate.id)+'?v='+Math.floor(Date.now()/cameraRefreshInterval(candidate.source));
            await preloadImage(url);
        }
        if(current!==revision || signal.aborted)return;
        if(persist)localStorage.setItem(CAMERA_BACKGROUND_KEY,JSON.stringify(candidate));
        choice=candidate;failed=false;lastUpdate=new Date();
        setBackdrop(url,owned);transferred=true;stopLivePlayer();
        if(newPlayer){newPlayer.video.className='webcast-live-background';activePlayer=newPlayer;newPlayer=null;}
        updateAttribution();renderSelection();showStatus(t('已设为背景：','已設為背景：')+name(currentCamera()));
    } catch(error) {
        if(current===revision && error.name!=='AbortError'){window.naviBackgroundStartup?.fallback();failed=true;showStatus(t('图像暂时无法取得，已保留原背景。请稍后重试。','圖像暫時無法取得，已保留原背景。請稍後重試。'));}
    } finally {
        newPlayer?.destroy();if(owned && !transferred && url)URL.revokeObjectURL(url);
        if(current===revision){pending=false;pendingChoice=null;pendingController=null;renderSelection();schedule();}
    }
}
function stopCamera() {
    window.naviBackgroundStartup?.fallback();
    revision++;pendingController?.abort();pendingController=null;stopLivePlayer();
    if(backgroundBlobUrl){URL.revokeObjectURL(backgroundBlobUrl);backgroundBlobUrl=null;}
    clearTimeout(timer);timer=null;choice=null;lastUpdate=null;failed=false;pending=false;pendingChoice=null;
    localStorage.removeItem(CAMERA_BACKGROUND_KEY);sourcePicker.value='photo';render();
}
window.naviStopCameraBackground=stopCamera;
function renderSelection() {
    gallery.querySelectorAll('button[data-camera]').forEach(button=>{
        const selected=pendingChoice || choice;
        const active=selected?.source===sourcePicker.value && selected.id===button.dataset.camera;
        const busy=active && pending && pendingChoice!==null;
        button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-busy',String(busy));
        const badge=button.querySelector('.camera-selection-badge');if(!badge)return;
        badge.hidden=!active;badge.replaceChildren();
        if(!active)return;
        badge.setAttribute('aria-label',busy?t('正在加载','正在載入'):t('已选中','已選取'));
        if(busy){const spinner=document.createElement('mdui-circular-progress');spinner.setAttribute('aria-hidden','true');badge.append(spinner);}
        else {const check=document.createElement('mdui-icon');check.setAttribute('name','check');check.setAttribute('aria-hidden','true');badge.append(check);}
    });
    refreshCheck.checked=choice?.refresh!==false;
}
function renderGallery() {
    thumbnailController?.abort();thumbnailController=new AbortController();
    const signal=thumbnailController.signal;
    thumbnailObserver?.disconnect();gallery.replaceChildren();
    const rows=cameraRows(sourcePicker.value),query=search.value.trim().toLowerCase();
    const filtered=rows.filter(item=>[item.sc,item.tc,item.id,item.areaSc,item.areaTc].join(' ').toLowerCase().includes(query));
    loadMore.hidden=filtered.length<=shown;
    if(!filtered.length){const p=document.createElement('p');p.textContent=t('没有找到对应镜头。','找不到相應鏡頭。');gallery.append(p);return;}
    thumbnailObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){const image=entry.target;thumbnailObserver.unobserve(image);image.src=image.dataset.src;}},{rootMargin:'80px'});
    for(const item of filtered.slice(0,shown)) {
        const button=document.createElement('button');button.type='button';button.className='camera-thumbnail';button.dataset.camera=item.id;
        button.setAttribute('aria-label',t('设为背景：','設為背景：')+name(item));
        const image=document.createElement('img');image.width=240;image.height=135;image.alt='';image.decoding='async';image.referrerPolicy='no-referrer';if(sourcePicker.value.startsWith('webcast')){const previews={HK:'H429F',KL:'K202F',TW:'TW120F',TM:'TR116F',BBI:'TR114F'};image.dataset.src=cameraImageUrl('traffic',previews[item.id],true);}else if(sourcePicker.value==='bing')image.dataset.src=bingInfo?.thumbnail || '';else image.dataset.src=cameraImageUrl(sourcePicker.value,item.imageId || item.id,true);
        image.onerror=()=>{image.hidden=true;button.classList.add('camera-image-unavailable');};
        const caption=document.createElement('span');caption.textContent=name(item)+(sourcePicker.value.startsWith('webcast')?t(' · 区域快拍预览',' · 區域快拍預覽'):'');
        const badge=document.createElement('div');badge.className='camera-selection-badge';badge.hidden=true;
        button.append(image,caption,badge);button.onclick=()=>{thumbnailController?.abort();thumbnailObserver?.disconnect();updateBackground({source:sourcePicker.value,id:item.id,refresh:sourcePicker.value==='webcast-live' || refreshCheck.checked},true);};
        gallery.append(button);thumbnailObserver.observe(image);
    }
    renderSelection();
}
function render() {
    const isCamera=sourcePicker.value!=='photo';
    if(!isCamera){thumbnailController?.abort();thumbnailObserver?.disconnect();gallery.replaceChildren();}
    document.querySelector('[data-camera-controls]').hidden=!isCamera;staticActions.hidden=isCamera;
    document.querySelector('[data-camera-source-label]').textContent=t('背景来源','背景來源');
    const sourceLabels={bing:t('Bing 每日图片','Bing 每日圖片'),photo:t('照片／默认背景','照片／預設背景'),hko:t('天文台天气摄影机','天文台天氣攝影機'),traffic:t('交通快拍图像','交通快拍圖像'),webcast:t('交通直播首帧','交通直播首幀'),'webcast-live':t('交通直播视频','交通直播影片')};
    for(const option of sourcePicker.options)option.textContent=sourceLabels[option.value];
    refreshCheck.hidden=sourcePicker.value==='webcast-live';
    search.hidden=sourcePicker.value==='bing';
    search.placeholder=t('搜索地点、地区或镜头编号','搜尋地點、地區或鏡頭編號');search.setAttribute('aria-label',search.placeholder);
    loadMore.textContent=t('载入更多镜头','載入更多鏡頭');
    document.getElementById('background-camera-retry').textContent=sourcePicker.value==='webcast-live'?t('重新连接直播','重新連接直播'):t('立即更新背景','立即更新背景');
    refreshCheck.textContent=sourcePicker.value==='bing'?t('自动获取每日图片','自動取得每日圖片'):t('自动更新摄影机背景','自動更新攝影機背景');
    document.querySelector('[data-camera-hint]').textContent=sourcePicker.value==='hko'?t('点击缩略图设为背景；每 3 分钟获取新照片。','點擊縮圖設為背景；每 3 分鐘取得新照片。'):t('点击缩略图设为背景；每 2 分钟获取快拍。交通图像分辨率较低，放大后可能不清晰，并非视频。','點擊縮圖設為背景；每 2 分鐘取得快拍。交通圖像解像度較低，放大後可能不清晰，並非影片。');
    if(sourcePicker.value.startsWith('webcast'))document.querySelector('[data-camera-hint]').textContent=sourcePicker.value==='webcast-live'?t('静音播放所选区域的轮播直播，每 2 分钟重新请求；切到后台时暂停。缩略图为同区域交通快拍预览，直播镜头随官方序列轮播。','靜音播放所選區域的輪播直播，每 2 分鐘重新請求；切至背景時暫停。縮圖為同區域交通快拍預覽，直播鏡頭隨官方序列輪播。'):t('获取五路区域直播的首帧作为静态背景，截取后立即停止加载视频；可每 2 分钟自动更新。缩略图为同区域交通快拍预览。','取得五路區域直播的首幀作為靜態背景，擷取後立即停止載入影片；可每 2 分鐘自動更新。縮圖為同區域交通快拍預覽。');
    if(sourcePicker.value==='bing')document.querySelector('[data-camera-hint]').textContent=t('Bing 官方每日图片，自动检查当天更新；页脚保留图片版权署名。','Bing 官方每日圖片，自動檢查當天更新；頁尾保留圖片版權署名。');
    if(catalog && isCamera)renderGallery();
    updateAttribution();
    if(pending)showStatus(t('正在获取摄影机图像…','正在取得攝影機圖像…'));
    else if(failed)showStatus(t('图像暂时无法取得，已保留原背景。请稍后重试。','圖像暫時無法取得，已保留原背景。請稍後重試。'));
    else if(choice && lastUpdate && currentCamera())showStatus(t('已设为背景：','已設為背景：')+name(currentCamera()));
}
async function loadCatalog() {
    if(catalog)return catalog;
    if(!loading)loading=fetch('/data/background-cameras.json').then(response=>{if(!response.ok)throw new Error('catalog');return response.json();}).then(data=>{catalog=data;return data;}).finally(()=>{loading=null;});
    return loading;
}
sourcePicker.onchange=async()=> {
    shown=12;search.value='';render();
    if(sourcePicker.value==='photo') {
        stopCamera();document.getElementById('custom-bg-style')?.remove();window.loadSavedBackground();showStatus('');return;
    }
    if(sourcePicker.value==='bing'){showStatus(t('正在获取 Bing 每日图片…','正在取得 Bing 每日圖片…'));try{await loadBing();if(sourcePicker.value!=='bing')return;renderGallery();await updateBackground({source:'bing',id:'DAILY',refresh:true},true);}catch{showStatus(t('Bing 图片暂时无法取得，请稍后重试。','Bing 圖片暫時無法取得，請稍後重試。'));}return;}
    showStatus(t('选择一个镜头预览并设为背景。','選擇一個鏡頭預覽並設為背景。'));
    try {await loadCatalog();renderGallery();}catch{showStatus(t('镜头目录载入失败，请重新选择来源重试。','鏡頭目錄載入失敗，請重新選擇來源再試。'));}
};
search.oninput=()=>{shown=12;renderGallery();};
loadMore.onclick=()=>{shown+=12;renderGallery();};
refreshCheck.addEventListener('change',()=>{if(choice){choice={...choice,refresh:refreshCheck.checked};localStorage.setItem(CAMERA_BACKGROUND_KEY,JSON.stringify(choice));schedule();}});
document.getElementById('background-camera-retry').onclick=async()=>{try{await loadCatalog();if(sourcePicker.value==='bing'){bingFetched=0;await updateBackground({source:'bing',id:'DAILY',refresh:refreshCheck.checked},true);renderGallery();}else if(choice)updateBackground();else {renderGallery();showStatus(t('请先点击缩略图选择镜头。','請先點擊縮圖選擇鏡頭。'));}}catch{showStatus(t('镜头目录暂时无法取得。','鏡頭目錄暫時無法取得。'));}};
new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState!=='visible'){pendingController?.abort();pendingController=null;revision++;pending=false;pendingChoice=null;renderSelection();stopLivePlayer();schedule();return;}
    if(!pending && choice?.refresh && (choice.source==='webcast-live' || !lastUpdate || Date.now()-lastUpdate.getTime()>=cameraRefreshInterval(choice.source)))updateBackground();
});
document.getElementById('data-manage-dialog').addEventListener('closed',()=>{thumbnailController?.abort();thumbnailObserver?.disconnect();});
document.getElementById('data-manage-dialog').addEventListener('opened',()=>{if(catalog && sourcePicker.value!=='photo')renderGallery();});
document.getElementById('settings-tabs').addEventListener('change',event=>{if(event.target.id!=='settings-tabs')return;if(event.target.value!=='background'){thumbnailController?.abort();thumbnailObserver?.disconnect();}else if(catalog && sourcePicker.value!=='photo')renderGallery();});
render();
const initialize=async()=>{
    if(!choice)return;
    try {await loadCatalog();if(choice.source==='bing')await loadBing();render();updateBackground();}
    catch {window.naviBackgroundStartup?.fallback();showStatus(t('摄影机背景暂时无法载入，已保留照片背景。','攝影機背景暫時無法載入，已保留照片背景。'));}
};
// Module scripts run after parsing; do not wait for ads and other unrelated assets.
initialize();
