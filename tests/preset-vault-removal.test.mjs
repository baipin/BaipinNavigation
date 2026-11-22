import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {removeCloudCalendarVault} from '../js/preset-vault-removal.js';
import {sanitizePreset} from '../js/preset-schema.js';
import {createVault} from '../js/calendar-vault-crypto.js';

const encrypted=JSON.stringify((await createVault('dummy-test-password-2026')).envelope);
const makePreset=(theme='dark')=>sanitizePreset({localStorage:{theme_mode:theme,navi_calendar_vault:encrypted,bp_v7:'[{"name":"Cloud bookmark","url":"https://example.test","icon":"star"}]'}});
for(const provider of ['google','github','microsoft']){
 let cloud={exists:true,revision:'v1',preset:makePreset()},pushes=0;
 const result=await removeCloudCalendarVault(async(action,body)=>{
  if(action==='pull')return structuredClone(cloud);
  pushes++;assert.equal(body.revision,cloud.revision);
  cloud={exists:true,revision:'v2',updatedAt:'2026-11-22T12:00:00Z',preset:body.preset};return cloud;
 });
 assert.equal(pushes,1,provider);assert.equal(cloud.preset.localStorage.navi_calendar_vault,null);
 assert.equal(cloud.preset.localStorage.bp_v7,makePreset().localStorage.bp_v7);
 assert.equal(cloud.preset.localStorage.theme_mode,'dark');assert.equal(result.before.localStorage.navi_calendar_vault,encrypted);
}
let revision='a',pushes=0;
const retry=await removeCloudCalendarVault(async(action,body)=>{
 if(action==='pull')return {exists:true,revision,preset:makePreset(revision==='a'?'dark':'light')};
 if(++pushes===1){revision='b';throw Object.assign(new Error('conflict'),{status:409});}
 assert.equal(body.revision,'b');return {revision:'c',preset:body.preset};
});
assert.equal(pushes,2);assert.equal(retry.preset.localStorage.theme_mode,'light');
let attempts=0;
await assert.rejects(()=>removeCloudCalendarVault(async action=>{
 if(action==='pull')return {exists:true,revision:'a',preset:makePreset()};
 attempts++;throw Object.assign(new Error('conflict'),{status:409});
}),/conflict/);assert.equal(attempts,3);
for(const cloud of [{exists:false},{exists:true,preset:sanitizePreset({localStorage:{theme_mode:'light'}})}]){
 await removeCloudCalendarVault(async action=>{assert.equal(action,'pull');return cloud;});
}
await assert.rejects(()=>removeCloudCalendarVault(async()=>{throw new Error('offline');}),/offline/);

// Exercise the actual sync coordinator: failure retains the vault; success doesn't apply cloud settings.
const source=await readFile(new URL('../js/sync.js',import.meta.url),'utf8');
const coordinator=source.slice(source.indexOf('window.naviCancelCalendarVaultStorage='),source.indexOf('async function resolveConflict(useCloud)'));
function environment({authenticated=true,fail=false,busy=false,common='cloud',pending=false}={}){
 const local=makePreset('light'),cloud=makePreset('dark'),storage=new Map(Object.entries(local.localStorage).filter(([,v])=>v!==null));
 const previous={baseHash:JSON.stringify(common==='cloud'?cloud:local),syncedAt:'old'};storage.set('sync-state',JSON.stringify(previous));
 let remote={exists:true,preset:cloud,revision:'r1'};
 const context={window:{},simplified:()=>true,busy,authenticating:false,account:authenticated?{id:'test'}:null,provider:'google',pending:pending?remote:null,
  choices:{hidden:!pending},panel:{dataset:{}},document:{getElementById:()=>null},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  updateControls(){},checkLogin:async()=>{},show(){},snapshot:()=>sanitizePreset({localStorage:Object.fromEntries(storage)}),savedState:()=>JSON.parse(storage.get('sync-state')),stateKey:()=> 'sync-state',hash:async p=>JSON.stringify(p),sanitizePreset,removeCloudCalendarVault,
  request:async(action,body,provider)=>{assert.equal(provider,'google');if(fail)throw new Error('offline');if(action==='pull')return structuredClone(remote);remote={...remote,preset:body.preset,revision:'r2'};return {revision:'r2'};}
 };
 vm.runInNewContext(coordinator,context);return {context,storage,cloud:()=>remote};
}
for(const options of [{},{common:'local'},{pending:true}]){
 const {context,storage,cloud}=environment(options);
 await context.window.naviCancelCalendarVaultStorage(encrypted);
 assert.equal(storage.has('navi_calendar_vault'),false);
 assert.equal(cloud().preset.localStorage.navi_calendar_vault,null);
 assert.equal(storage.get('theme_mode'),'light');assert.equal(cloud().preset.localStorage.theme_mode,'dark');
 assert.equal(context.pending,null);assert.equal(context.busy,false);
 const expected=options.common==='local'?context.snapshot():cloud().preset;
 assert.equal(JSON.parse(storage.get('sync-state')).baseHash,JSON.stringify(expected));
}
for(const [options,error] of [[{fail:true},/offline/],[{authenticated:false},/请先登录/],[{busy:true},/正在进行/]]){
 const {context,storage,cloud}=environment(options);
 await assert.rejects(()=>context.window.naviCancelCalendarVaultStorage(encrypted),error);
 assert.equal(storage.get('navi_calendar_vault'),encrypted);assert.equal(cloud().preset.localStorage.navi_calendar_vault,encrypted);
}
{
 const {context,storage}=environment();
 await assert.rejects(()=>context.window.naviCancelCalendarVaultStorage('stale'),/刚刚有更新/);
 assert.equal(storage.get('navi_calendar_vault'),encrypted);
}
console.log('PASS: cloud vault removal preserves other cloud/local settings, retries latest revisions, skips missing backups, preserves backup on failure/login mismatch, rebases sync history, clears stale conflicts.');
