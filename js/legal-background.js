import {CAMERA_BACKGROUND_KEY,parseCameraPreference,cameraImageUrl,cameraRefreshInterval} from './camera-background-model.js';

export function installLegalBackground({document:doc=document,window:win=window,storage=localStorage,request=fetch,loadImage=preloadImage,loadWebcast=()=>import('./traffic-webcast.js?v=priority-preview-v7'),setTimer=setTimeout,clearTimer=clearTimeout}={}){
 let catalog=null,player=null,owned=null,controller=null,timer=null,revision=0,current=null,credit=null,stopped=false;
 const simple=()=>doc.documentElement.lang==='zh-CN',t=(s,c)=>simple()?s:c;
 const footer=doc.getElementById('legal-photo-credit');
 function image(url){win.naviBackgroundStartup?.ready(url);doc.documentElement.style.setProperty('--legal-wallpaper','url('+JSON.stringify(url)+')');}
 function stopPlayer(){player?.destroy();player=null;}
 function release(){if(owned){URL.revokeObjectURL(owned);owned=null;}}
 function link(label,url){const a=doc.createElement('a');a.textContent=label;a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
 function renderCredit(){
  if(!footer)return;footer.replaceChildren();
  if(!credit){footer.textContent=t('浙江丽水云和梯田 / 站长拍摄','浙江麗水雲和梯田 / 站長拍攝');return;}
  if(credit.type==='photo'){
   if(credit.info?.user&&credit.info?.userLink){try{const author=new URL(credit.info.userLink);if(['http:','https:'].includes(author.protocol))footer.append('Photo by ',link(credit.info.user,author.href),' / ',link('Unsplash','https://unsplash.com'));}catch{}}
   return;
  }
  if(credit.type==='bing'){footer.append(link('Bing · '+credit.data.copyright,credit.data.link));return;}
  const {item,source}=credit,name=item[simple()?'sc':'tc']||item.tc||item.id;
  footer.append(link((source==='hko'?t('香港天文台','香港天文台'):t('运输署','運輸署'))+' · '+name,source==='hko'?'https://www.hko.gov.hk/'+(simple()?'sc':'tc')+'/wxinfo/ts/index_webcam.htm':source.startsWith('webcast')?'https://www.hkemobility.gov.hk/'+(simple()?'sc':'tc')+'/traffic-information/live/webcast':'https://www.hkemobility.gov.hk/'));
 }
 function photo(){
  if(win.naviBackgroundStartup?.pending)return;
  let saved=null;try{const raw=doc.cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith('homepage_bg='))?.slice(12);if(raw){const decoded=decodeURIComponent(raw);try{saved=JSON.parse(decoded);}catch{saved={url:decoded};}const url=new URL(saved.url);if(['https:','http:'].includes(url.protocol)){image(url.href);credit=saved.info?.isDefault?null:{type:'photo',info:saved.info};renderCredit();return;}}}catch{}
  doc.documentElement.style.removeProperty('--legal-wallpaper');credit=null;renderCredit();
 }
 async function json(url,signal){const response=await request(url,{signal,cache:'no-store'});if(!response.ok)throw Error('Background unavailable');return response.json();}
 function schedule(failed=false){clearTimer(timer);if(stopped||!current?.refresh||doc.visibilityState==='hidden')return;timer=setTimer(()=>void update(),failed?Math.min(cameraRefreshInterval(current.source),10000):cameraRefreshInterval(current.source));}
 async function update(){
  if(stopped||doc.visibilityState==='hidden')return;
  const choice=current;if(!choice)return;controller?.abort();const abort=new AbortController();controller=abort;const signal=AbortSignal.any([abort.signal,AbortSignal.timeout(45000)]),generation=++revision;let nextPlayer=null,nextOwned=null,nextCredit;
  try{
   let url;
   if(choice.source==='bing'){
    const data=await json('/api/bing?lang='+(simple()?'sc':'tc'),signal);if(new URL(data.url).origin!=='https://www.bing.com'||new URL(data.link).protocol!=='https:')throw Error('Invalid Bing image');url=data.url;await loadImage(url,signal);nextCredit={type:'bing',data};
   }else{
    if(!catalog)catalog=await json('/data/background-cameras.json',signal);
    const rows=catalog[choice.source.startsWith('webcast')?'webcast':choice.source]||[],item=rows.find(x=>x.id===choice.id);if(!item)throw Error('Unknown camera');
    if(choice.source.startsWith('webcast')){
     const api=await loadWebcast();
     if(choice.source==='webcast-live'){nextPlayer=await api.startWebcastVideo(choice.id,{signal,onError:()=>{if(generation===revision){stopPlayer();schedule(true);}}});nextOwned=URL.createObjectURL(await api.webcastFrameBlob(nextPlayer.video));}
     else nextOwned=URL.createObjectURL((await api.getWebcastFrame(choice.id,{signal,force:true,priority:true})).blob);
     url=nextOwned;
    }else{url=cameraImageUrl(choice.source,item.imageId||item.id)+'?v='+Math.floor(Date.now()/cameraRefreshInterval(choice.source));await loadImage(url,signal);}
    nextCredit={type:'camera',item,source:choice.source};
   }
   if(generation!==revision||signal.aborted||stopped)return;
   image(url);stopPlayer();release();owned=nextOwned;nextOwned=null;player=nextPlayer;nextPlayer=null;if(player)player.video.className='webcast-live-background';credit=nextCredit;renderCredit();schedule();
  }catch{if(generation===revision&&!stopped&&!abort.signal.aborted){if(win.naviBackgroundStartup?.pending){win.naviBackgroundStartup.fallback();renderCredit();}else if(!credit)photo();schedule(true);}}
  finally{nextPlayer?.destroy();if(nextOwned)URL.revokeObjectURL(nextOwned);if(controller===abort)controller=null;}
 }
 function select(){revision++;controller?.abort();clearTimer(timer);stopPlayer();release();try{current=parseCameraPreference(storage.getItem(CAMERA_BACKGROUND_KEY));}catch{current=null;}if(current){if(!win.naviBackgroundStartup)photo();void update();}else{if(win.naviBackgroundStartup)win.naviBackgroundStartup.pending=false;photo();}}
 const visibility=()=>{if(doc.visibilityState==='hidden'){revision++;controller?.abort();clearTimer(timer);stopPlayer();}else if(current?.refresh)void update();};
 const changed=event=>{if(event.key===CAMERA_BACKGROUND_KEY||event.key===null)select();};
 const language=()=>{renderCredit();if(current?.source==='bing')void update();};
 doc.addEventListener('visibilitychange',visibility);win.addEventListener('storage',changed);doc.addEventListener('navi-legal-language',language);win.addEventListener('pageshow',select);select();
 const destroy=()=>{stopped=true;revision++;controller?.abort();clearTimer(timer);stopPlayer();release();doc.removeEventListener('visibilitychange',visibility);win.removeEventListener('storage',changed);doc.removeEventListener('navi-legal-language',language);win.removeEventListener('pageshow',select);};win.addEventListener('pagehide',()=>{revision++;controller?.abort();clearTimer(timer);stopPlayer();});
 return {refresh:update,destroy};
}
function preloadImage(url,signal){return new Promise((resolve,reject)=>{const img=new Image();img.referrerPolicy='no-referrer';const done=error=>{img.onload=img.onerror=null;signal?.removeEventListener('abort',abort);error?reject(error):resolve();};const abort=()=>done(new DOMException('Aborted','AbortError'));if(signal?.aborted)return abort();signal?.addEventListener('abort',abort,{once:true});img.onload=()=>done();img.onerror=()=>done(Error('Image unavailable'));img.src=url;});}
