export async function initIconPicker(host,onSelect){
 const [markup]=await Promise.all([fetch('/icon_picker.html?v=full-v2').then(r=>{if(!r.ok)throw Error();return r.text();}),new Promise((resolve,reject)=>{if(window.materialIcons){resolve();return;}const script=document.createElement('script');script.src='/js/icons.js?v=full-v2';script.onload=resolve;script.onerror=reject;document.head.append(script);})]);
 const parsed=new DOMParser().parseFromString(markup,'text/html'),root=host.attachShadow({mode:'open'});
 const style=parsed.querySelector('style');style.textContent=style.textContent.replaceAll(':root',':host').replaceAll('html.dark',':host(.dark)').replaceAll('html{',':host{');
 const fonts=document.createElement('link');fonts.rel='stylesheet';fonts.href='/material-icons.css?v=full-v2';root.append(fonts,style,...parsed.body.childNodes);
 root.host.style.cssText='display:block;height:100%;overflow:auto;scrollbar-width:thin;';
 const $=id=>root.getElementById(id),grid=$('icon-grid'),search=$('search');let category='common',limit=60,filtered=[];
 const aliases={首页:'home',主頁:'home',搜索:'search',搜尋:'search',设置:'settings',設定:'settings',音乐:'music',音樂:'music',视频:'video',影片:'video',照片:'photo',图片:'image',圖片:'image',地图:'map',地圖:'map',学校:'school',學校:'school',邮件:'mail',郵件:'mail',购物:'shopping',購物:'shopping',天气:'cloud',天氣:'cloud',日历:'calendar',日曆:'calendar',时间:'time',時間:'time',书:'book',書:'book',工作:'work',游戏:'game',遊戲:'game',星:'star',心:'favorite',人:'person'};
 const groups=[['all','全部','全部',null],['common','常用','常用',/^(home|search|settings|favorite|star|person|mail|public|school|work|code|link|map|calendar_today|music_note|image|video_library|shopping_cart|apps|newspaper|menu|cloud|language|bookmark)$/],['media','影音','影音',/music|audio|video|photo|image|play|movie|camera|mic|volume/],['travel','地点与交通','地點與交通',/map|place|location|flight|train|directions|travel|car|bus|hotel/],['work','工作与学习','工作與學習',/work|school|book|business|code|computer|science|folder|edit|article/]];
 const sc=()=>document.documentElement.lang==='zh-CN',t=(s,c)=>sc()?s:c;
 function sync(){try{const root=parent.document.documentElement;host.classList.toggle('dark',root.classList.contains('mdui-theme-dark'));}catch{}render();}
 function appendIcons(start,end){
  grid.append(...filtered.slice(start,end).map(name=>{const b=document.createElement('button');b.type='button';b.className='item';b.title=name;b.setAttribute('aria-label',name);const icon=document.createElement('span');icon.className='material-icons';icon.textContent=name;icon.setAttribute('aria-hidden','true');const label=document.createElement('small');label.textContent=name;b.append(icon,label);b.onclick=()=>onSelect(name);return b;}));
 }
 function render(){
  search.placeholder=t('搜索图标名称或中文关键词','搜尋圖示名稱或中文關鍵字');search.setAttribute('aria-label',search.placeholder);$('clear').title=t('清除搜索','清除搜尋');$('clear').hidden=!search.value;
  $('categories').replaceChildren(...groups.map(([id,s,c])=>{const b=document.createElement('button');b.textContent=t(s,c);b.type='button';b.setAttribute('aria-pressed',String(category===id));b.onclick=()=>{category=id;limit=60;render();};return b;}));
  const term=search.value.trim().toLowerCase(),query=aliases[term]||term,re=groups.find(x=>x[0]===category)[3];filtered=materialIcons.filter(name=>(!query||name.includes(query.replaceAll(' ','_')))&&(!re||re.test(name)));
  grid.replaceChildren();appendIcons(0,limit);
  $('count').textContent=t('找到 ','找到 ')+filtered.length+t(' 个图标 · 全部图标均可离线显示',' 個圖示 · 所有圖示均可離線顯示');$('more').hidden=limit>=filtered.length;$('more').textContent=t('显示更多','顯示更多');
  if(!filtered.length){const empty=document.createElement('p');empty.className='empty';empty.textContent=t('没有匹配的图标，试试其他关键词','沒有符合的圖示，試試其他關鍵字');grid.append(empty);}
 }
 search.oninput=()=>{category='all';limit=60;render();};$('clear').onclick=()=>{search.value='';limit=60;render();search.focus();};$('more').onclick=()=>{const start=limit;limit+=60;appendIcons(start,limit);$('more').hidden=limit>=filtered.length;};
 const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)&&limit<filtered.length)$('more').click();},{root:host,rootMargin:'100px'});observer.observe($('more'));
 try{new MutationObserver(sync).observe(parent.document.documentElement,{attributes:true,attributeFilter:['class','lang']});}catch{}sync();
}
