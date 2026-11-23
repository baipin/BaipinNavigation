const $=id=>document.getElementById(id),panel=$('discover-music'),picker=$('music-platform'),track=$('discover-music-track'),status=$('discover-music-status'),refresh=$('music-refresh'),external=$('music-open');
const sc=()=>document.documentElement.lang==='zh-CN',t=(s,c)=>sc()?s:c;
const cache=new Map(),pending=new Set(),errors=new Set(),pages=new Map();let visible=false;
try{picker.value=localStorage.getItem('navi_music_platform')==='qq'?'qq':'apple';}catch{}
const source=()=>picker.value==='qq'?'qq':'apple';
const node=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
function labels(){
 $('discover-music-title').textContent=t('热门音乐','熱門音樂');picker.setAttribute('aria-label',t('音乐来源','音樂來源'));
 picker.querySelector('[value=qq]').textContent=t('QQ 音乐','QQ 音樂');
 $('discover-music-caption').textContent=source()==='apple'?t('Apple Music · 香港热门歌曲','Apple Music · 香港熱門歌曲'):t('QQ 音乐 · 巅峰热歌榜','QQ 音樂 · 巔峰熱歌榜');
 external.href=source()==='apple'?'https://music.apple.com/hk/new':'https://y.qq.com/n/ryqq/toplist/26';external.setAttribute('aria-label',t('打开音乐平台','開啟音樂平台'));refresh.setAttribute('aria-label',t('刷新热门音乐','更新熱門音樂'));
}
function draw(){
 labels();const active=source(),entry=cache.get(active),page=pages.get(active)||0;track.replaceChildren();refresh.loading=pending.has(active);refresh.disabled=pending.has(active);
 if(entry)for(const song of entry.items.slice(page*10,page*10+10)){
  const card=node('a');card.className='discover-card music-card';card.href=song.url;card.target='_blank';card.rel='noopener noreferrer';
  const media=node('div');media.className='discover-media music-cover';
  if(song.image){const img=node('img');img.loading='lazy';img.decoding='async';img.src=song.image;img.alt='';img.referrerPolicy='no-referrer';img.onerror=()=>{img.remove();const icon=node('span','music_note');icon.className='material-icons discover-cover';media.append(icon);};media.append(img);}
  const rank=node('span','#'+song.rank);rank.className='music-rank';media.append(rank);
  const body=node('div');body.className='discover-card-body';body.append(node('h3',song.title),node('p',song.author),node('small',song.album));card.append(media,body);track.append(card);
 }
 if(entry){const more=node('button');more.type='button';more.className='discover-more';const circle=node('span');circle.className='discover-more-circle';const icon=node('span','shuffle');icon.className='material-icons';circle.append(icon);more.append(circle,node('span',t('换一批','換一批')));more.onclick=()=>{pages.set(active,((pages.get(active)||0)+1)%Math.ceil(entry.items.length/10));draw();track.scrollLeft=0;};track.append(more);}
 const updated=entry?t('更新于 ','更新於 ')+new Date(entry.updatedAt).toLocaleTimeString(sc()?'zh-CN':'zh-HK',{hour:'2-digit',minute:'2-digit'}):'';
 status.textContent=pending.has(active)?t('正在载入音乐榜单…','正在載入音樂榜單…'):errors.has(active)?t('音乐榜单暂不可用，请稍后重试或切换来源','音樂榜單暫時無法使用，請稍後重試或切換來源')+(updated?' · '+updated:''):updated;
}
async function load(force=false){
 const active=source();if(pending.has(active)||!force&&cache.has(active)&&Date.now()-cache.get(active).fetchedAt<900000)return;
 pending.add(active);errors.delete(active);draw();track.setAttribute('aria-busy','true');
 try{const response=await fetch('/api/music?'+new URLSearchParams({source:active}),{signal:AbortSignal.timeout(18000)});if(!response.ok)throw Error();const data=await response.json();if(!data.items?.length)throw Error();cache.set(active,{...data,fetchedAt:Date.now()});}
 catch{errors.add(active);}finally{pending.delete(active);if(source()===active){draw();track.setAttribute('aria-busy','false');}}
}
picker.addEventListener('change',()=>{try{localStorage.setItem('navi_music_platform',source());}catch{}draw();track.scrollLeft=0;if(visible)void load();});refresh.onclick=()=>void load(true);
new MutationObserver(draw).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});draw();
new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);if(visible)void load();},{rootMargin:'100px'}).observe(panel);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&visible)void load();});
