import {normalizeCities} from './weather-cities.js';
(() => {
 const KEY='navi_weather_cities',sc=()=>document.documentElement.lang==='zh-CN',t=(s,c)=>sc()?s:c;
 const defaults=[{name:'香港',country:'香港',latitude:22.32,longitude:114.17},{name:'东京',country:'日本',latitude:35.68,longitude:139.69},{name:'伦敦',country:'英国',latitude:51.51,longitude:-.13}];
 let cities;try{cities=normalizeCities(JSON.parse(localStorage.getItem(KEY)) || defaults);}catch{cities=defaults;}
 const revisions={};const node=(tag,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x;};
 const get=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(16000)});if(!r.ok)throw Error('Weather');return r.json();};
 const icon=code=>code===0?50:code<=2?51:code===3?60:code<50?83:code<70?63:code<80?70:code<95?65:65;
 function addIcon(parent,code,alt){const img=node('img');img.src='https://www.hko.gov.hk/images/HKOWxIconOutline/pic'+code+'.png';img.width=56;img.height=56;img.alt=alt;parent.append(img);}
 async function world(panel,current){
  const heading=node('h3',t('世界天气','世界天氣'));panel.append(heading);
  const form=node('form');form.className='world-city-search';const input=node('input');input.type='search';input.required=true;input.maxLength=100;input.placeholder=t('搜索城市名称','搜尋城市名稱');input.setAttribute('aria-label',input.placeholder);const submit=node('mdui-button',t('搜索','搜尋'));submit.type='submit';submit.setAttribute('variant','tonal');form.append(input,submit);panel.append(form);
  const results=node('div');results.className='world-city-results';results.setAttribute('aria-live','polite');panel.append(results);let searchRevision=0;
  const cards=node('div');cards.className='world-weather-grid';panel.append(cards);
  form.onsubmit=async e=>{e.preventDefault();const query=input.value.trim();if(!query)return;const id=++searchRevision;results.textContent=t('正在搜索…','正在搜尋…');try{const data=await get('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(query)+'&count=8&language=zh&format=json');if(id!==searchRevision||current!==revisions.world)return;results.replaceChildren();for(const place of data.results || []){const candidate={name:place.name,country:place.country || '',latitude:place.latitude,longitude:place.longitude};const button=node('button',place.name+' · '+[place.admin1,place.country].filter(Boolean).join(' / ')+' ＋');button.type='button';button.onclick=()=>{if(current!==revisions.world)return;if(cities.some(c=>c.latitude===candidate.latitude&&c.longitude===candidate.longitude)){results.textContent=t('此城市已添加。','此城市已加入。');return;}try{cities=normalizeCities([...cities,candidate]);localStorage.setItem(KEY,JSON.stringify(cities));window.naviLoadWeatherExtra('world',panel);}catch(error){results.textContent=error.message;}};results.append(button);}if(!data.results?.length)results.textContent=t('没有找到城市，请尝试其他名称。','找不到城市，請嘗試其他名稱。');}catch{if(id===searchRevision)results.textContent=t('城市搜索失败，请重试。','城市搜尋失敗，請重試。');}};
  if(!cities.length){cards.textContent=t('搜索并添加你关注的城市。','搜尋並加入你關注的城市。');return;}
  await Promise.allSettled(cities.map(async city=>{const card=node('article');card.className='world-weather-card';const h=node('h3',city.name),remove=node('mdui-button-icon');remove.setAttribute('icon','close');remove.setAttribute('aria-label',t('移除 ','移除 ')+city.name);remove.onclick=()=>{cities=cities.filter(x=>x!==city);localStorage.setItem(KEY,JSON.stringify(cities));window.naviLoadWeatherExtra('world',panel);};const head=node('div');head.className='world-weather-heading';head.append(h,remove);card.append(head,node('p',city.country));const body=node('div',t('正在读取…','正在讀取…'));card.append(body);cards.append(card);
   try{const data=await get('https://api.open-meteo.com/v1/forecast?latitude='+city.latitude+'&longitude='+city.longitude+'&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=3&timezone=auto');if(current!==revisions.world)return;body.replaceChildren();const now=data.current;addIcon(body,icon(now.weather_code),t('天气图示','天氣圖示'));body.append(node('strong',now.temperature_2m+'°C'),node('p',t('湿度 ','濕度 ')+now.relative_humidity_2m+'% · '+t('风速 ','風速 ')+now.wind_speed_10m+' km/h'));
   for(let i=0;i<data.daily.time.length;i++)body.append(node('p',data.daily.time[i]+' · '+data.daily.temperature_2m_min[i]+'–'+data.daily.temperature_2m_max[i]+'°C · '+t('降雨概率 ','降雨概率 ')+data.daily.precipitation_probability_max[i]+'%'));
   const stamp=node('small',t('更新：','更新：')+now.time.replace('T',' ')+' · '+data.timezone+' · Open-Meteo');body.append(stamp);
   }catch{body.textContent=t('天气暂时无法取得，请刷新重试。','天氣暫時無法取得，請重新整理。');}
  }));
 }
 async function regional(panel,current){
  const data=await get('https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang='+(sc()?'sc':'tc'));if(current!==revisions.regional)return;
  panel.append(node('h3',t('各区实时气温','各區實時氣溫')),node('p',t('更新时间：','更新時間：')+data.updateTime+' · 香港天文台'));
  const grid=node('div');grid.className='regional-temperature-grid';for(const row of data.temperature?.data || []){const card=node('article');card.className='world-weather-card';card.append(node('h3',row.place),node('strong',row.value+'°C'));grid.append(card);}panel.append(grid);
 }
 function plain(html){const doc=new DOMParser().parseFromString(html,'text/html');doc.querySelectorAll('script,style,iframe,object').forEach(x=>x.remove());return doc;}
 async function cyclone(panel,current){
  const data=await get('/api/tropical-cyclones');if(current!==revisions.cyclone)return;panel.append(node('h3',t('热带气旋路径及详情','熱帶氣旋路徑及詳情')));
  if(!data.storms?.length)panel.append(node('p',t('现在暂无热带气旋信息，当有热带气旋进入北纬7至36度，东经100至140度的范围，或在此范围内形成，天文台会在两小时内发放首次的热带气旋路径图。','現在暫無熱帶氣旋資訊，當有熱帶氣旋進入北緯7至36度，東經100至140度的範圍，或在此範圍內形成，天文台會在兩小時內發放首次的熱帶氣旋路徑圖。')));
  for(const storm of data.storms || []){const card=node('section');card.className='cyclone-detail';card.append(node('h3',storm.name),node('p',storm.time));
   const m=storm.time.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日\s*(\d{1,2})\s*時/);if(m){const stamp=Date.parse(m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0')+'T'+m[4].padStart(2,'0')+':00:00+08:00');if(Date.now()-stamp>24*3600000)card.append(node('p',t('以下为天文台最近提供的资料，已超过 24 小时，不能视为当前气旋状态。','以下為天文台最近提供的資料，已超過 24 小時，不能視為目前氣旋狀態。')));}
   const description=plain(storm.description);for(const tr of description.querySelectorAll('tr'))card.append(node('p',tr.textContent.replace(/\s+/g,' ').trim()));
   if(/^\d{4}$/.test(storm.id)){const img=node('img');img.className='cyclone-track';img.src='https://www.hko.gov.hk/wxinfo/currwx/nwp_'+storm.id+'.png';img.alt=storm.name+t(' 路径图',' 路徑圖');img.onerror=()=>{img.replaceWith(node('p',t('路径图暂时无法载入，请查看天文台原始页面。','路徑圖暫時無法載入，請查看天文台原始頁面。')));};card.append(img);}
   const doc=plain(storm.forecast),original=doc.querySelector('table');if(original){const surface=node('div');surface.className='warning-table-surface';const table=node('table');table.className='warning-history-table';for(const tr of original.rows){const row=table.insertRow();for(const cell of tr.cells){const target=node(cell.tagName.toLowerCase(),cell.textContent.trim());target.colSpan=Math.min(cell.colSpan,5);row.append(target);}}surface.append(table);card.append(surface);}
   panel.append(card);
  }
  const link=node('a',t('香港天文台热带气旋路径资讯','香港天文台熱帶氣旋路徑資訊'));link.href='https://www.hko.gov.hk/'+(sc()?'sc':'tc')+'/wxinfo/currwx/tc_fixarea.htm';link.target='_blank';link.rel='noopener noreferrer';panel.append(link);
 }
 window.naviLoadWeatherExtra=async(type,panel)=>{const current=(revisions[type] || 0)+1;revisions[type]=current;panel.replaceChildren();if(type!=='world')panel.textContent=t('正在读取资料…','正在讀取資料…');try{if(type==='world')await world(panel,current);else {panel.replaceChildren();await (type==='regional'?regional:cyclone)(panel,current);}}catch{if(current===revisions[type])panel.textContent=t('资料暂时无法取得，请刷新重试。','資料暫時無法取得，請重新整理。');}};
})();
