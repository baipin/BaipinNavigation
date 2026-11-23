import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=html.slice(html.indexOf("        document.getElementById('act-save').onclick = async"),html.indexOf("        document.getElementById('act-del').onclick"));
async function run({name='',icon='',ok=true,pendingEdit,cancel=false}={}) {
 const fields={'f-name':{value:name},'f-icon':{value:icon},'f-url':{value:'example.com'},'act-save':{}};
 const bookmarks=[];let requests=0,saved=false;const progress={hidden:true,setAttribute(){}};
 const dialog={open:true,addEventListener(){},removeEventListener(){}};
 const status={textContent:''};
 const context={document:{getElementById:id=>fields[id],documentElement:{lang:'zh-CN'}},bookmarkSaveStatus:status,bookmarkSaveProgress:progress,dialog,curIdx:null,bookmarks,URL,URLSearchParams,AbortController,setTimeout,clearTimeout,localStorage:{setItem(){saved=true;}},render(){},fetch:async()=>{requests++;assert.equal(progress.hidden,false);if(pendingEdit)fields['f-name'].value=pendingEdit;if(cancel)dialog.open=false;return {ok,json:async()=>({title:'Site title',icon:'https://example.com/icon.png'})};}};
 vm.runInNewContext(source,context);
 await fields['act-save'].onclick();
 assert.equal(fields['act-save'].disabled,false);assert.equal(progress.hidden,true);
 return {requests,bookmarks,saved,status,dialog};
}
let r=await run();assert.equal(r.bookmarks[0].name,'Site title');assert.equal(r.bookmarks[0].icon,'https://example.com/icon.png');assert.equal(r.requests,1);
r=await run({name:'Custom'});assert.equal(r.bookmarks[0].name,'Custom');assert.equal(r.bookmarks[0].icon,'https://example.com/icon.png');
r=await run({icon:'star'});assert.equal(r.bookmarks[0].icon,'star');assert.equal(r.bookmarks[0].name,'Site title');
r=await run({name:'Custom',icon:'star'});assert.equal(r.requests,0);assert.equal(r.saved,true);
r=await run({pendingEdit:'Changed while loading'});assert.equal(r.bookmarks[0].name,'Changed while loading');
r=await run({ok:false});assert.equal(r.saved,false);assert.equal(r.dialog.open,true);assert.ok(r.status.textContent.includes('重试'));
r=await run({cancel:true});assert.equal(r.saved,false);
console.log('PASS: missing title/icon autofill in one request, custom values and pending edits preserved, failures retryable, closed dialogs cannot save.');
