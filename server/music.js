const cache=new Map();
const clean=x=>typeof x==='string'?x.replace(/<[^>]*>/g,'').slice(0,400):'';
function allowed(value,hosts){try{const u=new URL(value);return u.protocol==='https:'&&hosts.some(h=>u.hostname===h||u.hostname.endsWith('.'+h))?u.href:null;}catch{return null;}}
export function appleMusicCards(data){return (data.feed?.results||[]).slice(0,50).map((row,i)=>({title:clean(row.name),author:clean(row.artistName),album:(row.genres||[]).map(g=>clean(g.name)).filter(x=>x!=='Music').slice(0,2).join(' · '),url:allowed(row.url,['music.apple.com']),image:allowed(row.artworkUrl100,['mzstatic.com']),rank:i+1})).filter(row=>row.url&&row.title);}
export function qqMusicCards(data){return (data.songlist||[]).slice(0,50).map((row,i)=>{const song=row.data||{},id=song.songmid;return {title:clean(song.songname),author:(song.singer||[]).map(x=>clean(x.name)).join(' / '),album:clean(song.albumname),url:typeof id==='string'&&/^[A-Za-z0-9]+$/.test(id)?'https://y.qq.com/n/ryqq/songDetail/'+id:null,image:typeof song.albummid==='string'&&/^[A-Za-z0-9]+$/.test(song.albummid)?'https://y.gtimg.cn/music/photo_new/T002R300x300M000'+song.albummid+'.jpg':null,rank:i+1};}).filter(row=>row.url&&row.title);}
export const MUSIC_CHARTS={apple:{hk:'香港热门歌曲',tw:'台湾热门歌曲',us:'美国热门歌曲',jp:'日本热门歌曲'},qq:{hot:'巅峰热歌榜',rising:'巅峰流行指数榜',new:'巅峰新歌榜',mainland:'内地榜'}};
export default async function music(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
 const query=new URL(req.url,'https://localhost').searchParams;const source=query.get('source')||'apple';if(!['apple','qq'].includes(source))return res.status(400).json({error:'Unknown source'});
 const chart=query.get('chart')||(source==='apple'?'hk':'hot');if(!Object.hasOwn(MUSIC_CHARTS[source],chart))return res.status(400).json({error:'Unknown chart'});const key=source+':'+chart;
 try{
  let entry=cache.get(key);
  if(!entry||Date.now()-entry.at>900000){
   const url=source==='apple'?'https://rss.marketingtools.apple.com/api/v2/'+chart+'/music/most-played/50/songs.json':'https://c.y.qq.com/v8/fcg-bin/fcg_v8_toplist_cp.fcg?topid='+({hot:26,rising:4,new:27,mainland:5}[chart])+'&format=json&num=50';
   const response=await fetch(url,{headers:{'User-Agent':'BaipinNavigation/1.0',...(source==='qq'?{Referer:'https://y.qq.com/'}:{})},signal:AbortSignal.timeout(12000),redirect:'error'});if(!response.ok)throw Error();
   const data=await response.json(),items=source==='apple'?appleMusicCards(data):qqMusicCards(data);if(!items.length)throw Error();
   entry={items,updatedAt:new Date().toISOString(),at:Date.now(),chart:(source==='apple'?'Apple Music':'QQ 音乐')+' · '+MUSIC_CHARTS[source][chart]};cache.set(key,entry);
  }
  res.setHeader('Cache-Control','public, max-age=120, s-maxage=900');return res.status(200).json({items:entry.items,updatedAt:entry.updatedAt,chart:entry.chart});
 }catch{return res.status(502).json({error:'音乐榜单暂时无法获取，请稍后重试或切换来源。'});}
}
