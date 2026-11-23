import assert from 'node:assert/strict';
import {installLegalBackground} from '../js/legal-background.js';
import {readFile} from 'node:fs/promises';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
class Target{listeners=new Map();addEventListener(name,fn){let list=this.listeners.get(name)||[];list.push(fn);this.listeners.set(name,list);}removeEventListener(name,fn){this.listeners.set(name,(this.listeners.get(name)||[]).filter(x=>x!==fn));}emit(name,event={}){for(const fn of this.listeners.get(name)||[])fn(event);}}
function element(){return {children:[],textContent:'',append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;this.textContent='';}};}
function setup(source,{cookie='',fail=false,refresh=true,startup=null}={}){
 const win=new Target(),doc=new Target(),footer=element(),styles=new Map(),stored=new Map(),requests=[],images=[],timers=[];let destroyed=0,playing=0;
 if(source)stored.set('navi_camera_background',JSON.stringify({source,id:source==='bing'?'DAILY':source.startsWith('webcast')?'HK':source==='hko'?'HKO':'H429F',refresh}));
 Object.assign(doc,{cookie,visibilityState:'visible',documentElement:{lang:'zh-CN',style:{setProperty:(k,v)=>styles.set(k,v),removeProperty:k=>styles.delete(k)}},getElementById:()=>footer,createElement:element});
 if(startup)win.naviBackgroundStartup=startup;
 const catalog={hko:[{id:'HKO',sc:'天文台',tc:'天文台'}],traffic:[{id:'H429F',sc:'交通镜头',tc:'交通鏡頭'}],webcast:[{id:'HK',sc:'香港',tc:'香港'}]};
 const api=installLegalBackground({document:doc,window:win,storage:{getItem:k=>stored.get(k)??null},request:async url=>{requests.push(url);if(fail)throw Error('offline');return {ok:true,json:async()=>url.startsWith('/api/bing')?{url:'https://www.bing.com/image.jpg',link:'https://www.bing.com/search?q=picture',copyright:'copyright'}:catalog};},loadImage:async url=>{images.push(url);if(fail)throw Error('unavailable');},loadWebcast:async()=>({startWebcastVideo:async()=>{playing++;return {video:element(),destroy(){destroyed++;}};},webcastFrameBlob:async()=>new Blob(['live']),getWebcastFrame:async()=>({blob:new Blob(['frame'])})}),setTimer:(fn,ms)=>{timers.push({fn,ms});return timers.length;},clearTimer(){}});
 return {api,doc,win,footer,styles,stored,requests,images,timers,playing:()=>playing,destroyed:()=>destroyed};
}
for(const source of ['hko','traffic','bing','webcast','webcast-live']){
 const s=setup(source);for(let i=0;i<8;i++)await tick();
 assert.ok(s.styles.get('--legal-wallpaper'),source);assert.ok(s.footer.children.length,source+' attribution');
 if(source==='hko')assert.ok(s.images[0].includes('/hko/latest_HD_HKO.jpg'));
 if(source==='traffic')assert.ok(s.images[0].includes('tdcctv.data.one.gov.hk/H429F.JPG'));
 if(source==='bing')assert.ok(s.images[0].includes('www.bing.com'));
 const expected=source==='hko'?180000:source==='bing'?3600000:120000;assert.ok(s.timers.some(x=>x.ms===expected));
 if(source==='webcast-live'){assert.equal(s.playing(),1);s.doc.visibilityState='hidden';s.doc.emit('visibilitychange');assert.equal(s.destroyed(),1);s.doc.visibilityState='visible';s.doc.emit('visibilitychange');for(let i=0;i<8;i++)await tick();assert.equal(s.playing(),2);}
 s.api.destroy();
}
{
 const cookie='homepage_bg='+encodeURIComponent(JSON.stringify({url:'https://images.unsplash.com/test.jpg',info:{user:'Author',userLink:'https://unsplash.com/@author'}}));const s=setup(null,{cookie});assert.ok(s.styles.get('--legal-wallpaper').includes('images.unsplash.com'));assert.equal(s.footer.children[1].textContent,'Author');s.api.destroy();
}
{
 const cookie='homepage_bg='+encodeURIComponent('https://example.test/photo.jpg'),s=setup('bing',{cookie,fail:true});for(let i=0;i<4;i++)await tick();assert.equal(s.styles.has('--legal-wallpaper'),false,'failed camera source must not load the unrelated photo cookie');s.api.destroy();
}
{
 const s=setup('traffic',{refresh:false});for(let i=0;i<6;i++)await tick();assert.equal(s.timers.length,0);s.stored.delete('navi_camera_background');s.win.emit('storage',{key:'navi_camera_background'});assert.equal(s.styles.has('--legal-wallpaper'),false);s.api.destroy();
}
{
 const startup={pending:true,ready(){this.pending=false;},fallback(){this.pending=false;}};const s=setup('hko',{startup,cookie:'homepage_bg='+encodeURIComponent('https://example.test/photo.jpg')});assert.equal(s.styles.size,0,'no default/photo swap while camera initializes');for(let i=0;i<8;i++)await tick();const before=s.styles.get('--legal-wallpaper');s.win.emit('pageshow');assert.equal(s.styles.get('--legal-wallpaper'),before,'pageshow preserves camera while refreshing');s.api.destroy();
}
for(const name of ['privacy.html','terms.html','history.html']){
 const text=await readFile(new URL('../'+name,import.meta.url),'utf8');assert.ok(text.includes('legal.js?v=source-priority-v5'));assert.ok(text.includes('legal.css?v=all-backgrounds-v4'));
 if(name==='history.html')continue;const labels=JSON.parse(text.match(/<script type="application\/json" id="legal-translations">(.*?)<\/script>/s)[1]);
 assert.ok(!/独立密码|獨立密碼|独立备份密码|獨立備份密碼|三个服务|三個服務/.test(text));
 for(const lang of ['sc','tc']){assert.ok(labels[lang].calendar_3.includes('OAuth'));assert.ok(labels[lang].calendar_3.includes('Canvas'));assert.ok(labels[lang].vault_0.includes(lang==='sc'?'默认':'預設'));assert.ok(labels[lang].updated.includes('11 月 23 日'));}
}
console.log('PASS: all five background sources, photo author credit, refresh intervals, live pause/resume, failure fallback, preference changes, legal-page wiring and consistent default-encrypted calendar policies.');
