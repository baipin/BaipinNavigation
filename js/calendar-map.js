const text=(sc,tc)=>document.documentElement.lang==='zh-CN'?sc:tc;
const el=(tag,value)=>{const n=document.createElement(tag);if(value)n.textContent=value;return n;};
let leaflet;
function loadLeaflet(){
 if(window.L)return Promise.resolve(window.L);
 if(!leaflet)leaflet=new Promise((resolve,reject)=>{
  const css=el('link');css.rel='stylesheet';css.href='/js/vendor/leaflet/leaflet.css';document.head.append(css);
  const script=el('script');script.src='/js/vendor/leaflet/leaflet.js';script.onload=()=>resolve(window.L);script.onerror=()=>{leaflet=null;reject(Error());};document.head.append(script);
 });return leaflet;
}
export function formatMapPlace(data,lat,lon){
 const address=typeof data?.display_name==='string'?data.display_name.trim():'';
 const name=typeof data?.name==='string'?data.name.trim():'';
 return address?(name&&!address.startsWith(name)?name+' · '+address:address):lat.toFixed(6)+', '+lon.toFixed(6);
}
export async function pickCalendarLocation(initial=''){
 const dialog=el('mdui-dialog');dialog.id='calendar-map-dialog';
 const title=el('span',text('地图选点','地圖選點'));title.slot='headline';
 const search=el('form');search.className='calendar-map-search';
 const query=el('input');query.type='search';query.placeholder=text('搜索地点或地址','搜尋地點或地址');query.setAttribute('aria-label',query.placeholder);query.value=initial;
 const find=el('mdui-button',text('搜索','搜尋'));find.type='submit';find.icon='search';
 const locate=el('mdui-button-icon');locate.icon='my_location';locate.type='button';locate.setAttribute('aria-label',text('定位到我的位置','定位到我的位置'));
 search.append(query,find,locate);
 const results=el('div');results.className='calendar-map-results';
 const canvas=el('div');canvas.className='calendar-location-map';canvas.setAttribute('aria-label',text('点击地图选择地点','點擊地圖選擇地點'));
 const status=el('p',text('正在载入地图…','正在載入地圖…'));status.className='calendar-hint';status.setAttribute('role','status');
 const spinner=el('mdui-circular-progress');spinner.style.width='24px';
 const cancel=el('mdui-button',text('取消','取消')),confirm=el('mdui-button',text('使用此地点','使用此地點'));cancel.slot=confirm.slot='action';confirm.variant='tonal';confirm.disabled=true;
 dialog.append(title,search,results,canvas,spinner,status,cancel,confirm);document.body.append(dialog);
 let map,marker,selection=null,version=0,controller,timer,closed=false,lastRequest=0;
 const language=()=>document.documentElement.lang==='zh-CN'?'zh-CN':'zh-HK';
 async function geocode(params){
  const wait=Math.max(0,lastRequest+1100-Date.now());if(wait)await new Promise(resolve=>setTimeout(resolve,wait));
  if(closed)throw Error();lastRequest=Date.now();
  const response=await fetch('https://nominatim.openstreetmap.org/'+params.path+'?'+new URLSearchParams({format:'jsonv2','accept-language':language(),...params.query}),{signal:controller.signal});if(!response.ok)throw Error();return response.json();
 }
 function setPoint(lat,lon,data){
  if(closed||!map)return;selection={lat,lon,value:formatMapPlace(data,lat,lon)};
  if(marker)marker.setLatLng([lat,lon]);else marker=window.L.circleMarker([lat,lon],{radius:9,color:'#6750a4',fillColor:'#bda4fa',fillOpacity:1,weight:3}).addTo(map);
  status.textContent=selection.value;confirm.disabled=false;
 }
 function reverse(lat,lon){
  clearTimeout(timer);controller?.abort();const revision=++version;
  setPoint(lat,lon,null);spinner.hidden=false;
  timer=setTimeout(async()=>{controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),10000);
   try{const data=await geocode({path:'reverse',query:{lat,lon,zoom:18,addressdetails:1}});if(revision===version)setPoint(lat,lon,data);}
   catch{if(revision===version&&!closed)status.textContent=selection.value+text('（未能识别地址，将使用经纬度）','（未能識別地址，將使用經緯度）');}
   finally{clearTimeout(timeout);if(revision===version)spinner.hidden=true;}
  },350);
 }
 const answer=new Promise(resolve=>{
  cancel.onclick=()=>dialog.open=false;confirm.onclick=()=>{resolve(selection?.value||null);dialog.open=false;};
  dialog.addEventListener('closed',()=>{closed=true;version++;clearTimeout(timer);controller?.abort();map?.remove();dialog.remove();resolve(null);},{once:true});
 });
 dialog.addEventListener('opened',async()=>{
  try{
   const L=await loadLeaflet();if(closed)return;
   map=L.map(canvas,{zoomControl:true}).setView([22.3193,114.1694],12);
   L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(map);
   map.on('click',event=>reverse(event.latlng.lat,event.latlng.lng));map.invalidateSize();
   status.textContent=text('点击地图选点，或搜索地点；确认后填入日程。','點擊地圖選點，或搜尋地點；確認後填入日程。');
  }catch{status.textContent=text('地图加载失败，请关闭后重试或手动输入地点。','地圖載入失敗，請關閉後重試或手動輸入地點。');}
  finally{spinner.hidden=true;}
 },{once:true});
 search.onsubmit=async event=>{
  event.preventDefault();if(!map||!query.value.trim())return;
  clearTimeout(timer);controller?.abort();const revision=++version;controller=new AbortController();find.disabled=true;spinner.hidden=false;results.replaceChildren();
  const timeout=setTimeout(()=>controller.abort(),10000);
  try{
   const rows=await geocode({path:'search',query:{q:query.value.trim(),limit:5,addressdetails:1}});if(closed||revision!==version)return;
   status.textContent=rows.length?text('请选择搜索结果，或点击地图调整。','請選擇搜尋結果，或點擊地圖調整。'):text('未找到地点，请直接点击地图。','未找到地點，請直接點擊地圖。');
   for(const row of rows){const item=el('button',row.display_name);item.type='button';item.onclick=()=>{const lat=Number(row.lat),lon=Number(row.lon);setPoint(lat,lon,row);map.setView([lat,lon],16);results.replaceChildren();};results.append(item);}
  }catch{if(!closed&&revision===version)status.textContent=text('搜索暂不可用，请点击地图选点。','搜尋暫時無法使用，請點擊地圖選點。');}
  finally{clearTimeout(timeout);find.disabled=false;if(revision===version)spinner.hidden=true;}
 };
 locate.onclick=()=>{
  if(!map)return;if(!navigator.geolocation){status.textContent=text('此浏览器不支持定位。','此瀏覽器不支援定位。');return;}
  locate.disabled=true;navigator.geolocation.getCurrentPosition(position=>{locate.disabled=false;if(closed)return;const {latitude,longitude}=position.coords;map.setView([latitude,longitude],16);reverse(latitude,longitude);},()=>{locate.disabled=false;if(!closed)status.textContent=text('无法获取位置，请搜索或点击地图。','無法取得位置，請搜尋或點擊地圖。');},{timeout:10000,maximumAge:60000});
 };
 dialog.open=true;return answer;
}
