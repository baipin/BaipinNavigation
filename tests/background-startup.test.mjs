import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const code=await readFile(new URL('../js/background-startup.js',import.meta.url),'utf8');
function start({photo,camera,preview,blocked=false}={}){
 const styles=new Map(),local=new Map(),session=new Map();
 if(camera)local.set('navi_camera_background',JSON.stringify(camera));if(preview)session.set('navi_background_preview',JSON.stringify(preview));
 const storage=map=>({getItem:k=>{if(blocked)throw Error('blocked');return map.get(k)??null;},setItem:(k,v)=>map.set(k,v)});
 const context={URL,document:{cookie:photo?'homepage_bg='+encodeURIComponent(photo):'',documentElement:{style:{setProperty:(k,v)=>styles.set(k,v),removeProperty:k=>styles.delete(k)}}},window:{},localStorage:storage(local),sessionStorage:storage(session)};
 vm.runInNewContext(code,context);return {styles,api:context.window.naviBackgroundStartup};
}
for(const photo of ['https://example.test/custom.jpg',JSON.stringify({url:'https://images.unsplash.com/photo',info:{user:'Author'}})]){
 const s=start({photo});assert.ok(s.styles.get('--legal-wallpaper').includes('https:'));assert.equal(s.api.pending,false);
}
{
 const s=start({camera:{source:'webcast-live',id:'HK'}});assert.equal(s.styles.get('--legal-wallpaper'),'none');assert.equal(s.api.pending,true);s.api.ready('blob:frame');assert.equal(s.api.pending,false);assert.ok(s.styles.get('--navi-wallpaper').includes('blob:frame'));
}
{
 const s=start({camera:{source:'bing',id:'DAILY'},preview:{version:2,choice:'bing:DAILY',url:'https://www.bing.com/cached.jpg'}});assert.ok(s.styles.get('--legal-wallpaper').includes('cached.jpg'));s.api.fallback();assert.ok(s.styles.get('--legal-wallpaper').includes('cached.jpg'));
}
{
 const s=start({photo:'https://example.test/saved.jpg',camera:{source:'traffic',id:'H429F'},preview:{version:2,choice:'bing:DAILY',url:'https://www.bing.com/wrong.jpg'}});assert.equal(s.styles.get('--legal-wallpaper'),'none');s.api.fallback();assert.equal(s.styles.get('--legal-wallpaper'),'none','camera failure must not restore unrelated saved photo');
}
assert.equal(start({photo:'javascript:alert(1)'}).styles.size,0);
assert.equal(start({blocked:true}).styles.size,0);
for(const name of ['index.html','privacy.html','terms.html','history.html']){
 const html=await readFile(new URL('../'+name,import.meta.url),'utf8');assert.ok(html.indexOf('background-startup.js')<html.indexOf('unpkg.com'),'background bootstrap precedes blocking third party assets');
}
console.log('PASS: first-paint saved photos, camera loading state, matching preview cache, failure fallback, invalid URLs, blocked storage and early wiring on all four pages.');
