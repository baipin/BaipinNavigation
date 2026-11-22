import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../js/sync.js',import.meta.url),'utf8');
const actions=source.slice(source.indexOf('async function performClear()'),source.indexOf("panel.querySelector('[data-sync-clear]').onclick="));
function setup({exists=true,fail=false}={}){
 const calls=[],storage=new Map([['sync-state','old'],['navi_calendar_vault','encrypted']]),errors=[],error={textContent:''};let paused=false,reloaded=false;
 const body={append(){},replaceChildren(){},querySelector:()=>error};
 const context={Event,clearRun:async action=>action(),clearProvider:'google',clearRevision:null,clearStage:'confirm',clearText:s=>s,renderClear(){},show(){},pauseAutoSync(){paused=true;},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},sessionStorage:{setItem:(k,v)=>storage.set(k,v)},stateKey:()=> 'sync-state',pending:{old:true},choices:{hidden:false},panel:{dataset:{needsAttention:true}},document:{dispatchEvent(){},getElementById:()=>null,createElement:()=>({dataset:{}})},request:async(action,body,provider)=>{calls.push({action,body,provider});if(fail)throw Error('offline');if(action==='pull')return {exists,revision:exists?'revision-one':null};return {updatedAt:'now'};},snapshot:()=>({localStorage:{theme_mode:'dark'}}),remember(){},hash:async()=> 'hash',clearDialog:{open:true},resetBackupKey:'undo',applyPreset:p=>calls.push({reset:p}),location:{reload(){reloaded=true;}},providers:{google:{},github:{},microsoft:{}},syncRequest:async(endpoint,action)=>{calls.push({endpoint,action});return {};},account:{id:'7'},auto:{checked:true},detailsRequested:true,clearBody:body,clearLinks(){}};
 vm.runInNewContext(actions,context);return {context,calls,storage,paused:()=>paused,reloaded:()=>reloaded};
}
{
 const {context,calls,storage,paused}=setup();await context.performClear();assert.equal(paused(),true);assert.equal(context.clearStage,'done');assert.equal(context.pending,null);assert.equal(storage.get('navi_cloud_clear_hold'),'1');assert.equal(storage.get('navi_calendar_cloud_disabled'),'1');assert.equal(storage.get('navi_calendar_vault'),'encrypted');assert.deepEqual(calls.map(x=>x.action),['pull','clear']);assert.equal(calls[1].body.confirm,true);assert.equal(calls[1].body.revision,'revision-one');assert.equal(calls[1].provider,'google');
}
{const {context,storage}=setup({fail:true});await assert.rejects(()=>context.performClear(),/offline/);assert.equal(context.clearStage,'confirm');assert.equal(storage.get('navi_calendar_vault'),'encrypted');}
{const {context,calls,storage}=setup({exists:false});storage.set('navi_cloud_clear_hold','1');await context.afterClear('upload');assert.deepEqual(calls.map(x=>x.action),['pull','push']);assert.equal(calls[1].body.revision,null);assert.equal(storage.has('navi_cloud_clear_hold'),false);}
{const {context,calls}=setup();await assert.rejects(()=>context.afterClear('upload'),/其他设备/);assert.equal(calls.length,1);}
{const {context,calls,reloaded}=setup();await context.afterClear('reset');assert.ok(calls[0].reset);assert.equal(reloaded(),true);assert.ok(!calls.some(x=>x.action==='push'));}
{const {context,calls,storage}=setup();await context.afterClear('logout');assert.deepEqual(calls.map(x=>x.action),['logout','logout','logout','disconnect','disconnect']);assert.equal(context.account,null);assert.equal(storage.has('navi_calendar_vault'),false);}
const controls=source.slice(source.indexOf('function updateControls()'),source.indexOf('function show('));
for(const authenticated of [false,true]){
 const clear={};const element=()=>({});const context={account:authenticated?{id:'7'}:null,busy:false,authenticating:false,configured:true,detailsRequested:false,updateProviderText(){},panel:{querySelector:s=>s==='[data-sync-clear]'?clear:element()},login:element(),logout:element(),syncButton:element(),auto:element(),document:{getElementById:element},renderFooterAccount(){},choices:{querySelectorAll:()=>[]}};
 vm.runInNewContext(controls,context);context.updateControls();assert.equal(clear.hidden,!authenticated);assert.equal(clear.disabled,!authenticated);
}
assert.ok(!/accountsBody\.append\(calendarVault\.section\(\)\)/.test(await readFile(new URL('../js/calendar.js',import.meta.url),'utf8')));
console.log('PASS: cloud clearing pauses all automatic uploads, keeps local presets until chosen, checks revision, safe re-upload/reset/logout branches, login-only visibility, removed stale calendar status section.');
