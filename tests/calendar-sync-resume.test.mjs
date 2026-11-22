import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const vault=await readFile(new URL('../js/calendar-vault.js',import.meta.url),'utf8');
const migration=vault.slice(vault.indexOf("if(localStorage.getItem('navi_cloud_clear_hold')"),vault.indexOf('export function'));
for(const hold of [false,true]){
 const storage=new Map([['navi_calendar_cloud_disabled','1']]);if(hold)storage.set('navi_cloud_clear_hold','1');
 vm.runInNewContext(migration,{localStorage:{getItem:k=>storage.get(k)??null,removeItem:k=>storage.delete(k)}});
 assert.equal(storage.has('navi_calendar_cloud_disabled'),hold,'retired opt-out migrates unless cloud clear is intentionally paused');
}
const source=await readFile(new URL('../js/sync.js',import.meta.url),'utf8');
const sync=source.slice(source.indexOf('async function sync(automatic=false)'),source.indexOf('window.naviSyncCalendarLogins='));
function context(){
 const storage=new Map([['navi_calendar_cloud_disabled','1'],['navi_cloud_clear_hold','1']]),order=[],calls=[];
 const ctx={busy:false,account:{id:'7'},pending:null,editing:()=>false,localStorage:{getItem:k=>storage.get(k)??null,removeItem:k=>storage.delete(k)},window:{naviPrepareCalendarSync:async()=>{assert.equal(storage.has('navi_calendar_cloud_disabled'),false);assert.equal(storage.has('navi_cloud_clear_hold'),false);await Promise.resolve();storage.set('navi_calendar_vault','encrypted-logins');order.push('calendar');}},updateControls(){},show(){},snapshot:()=>{order.push('snapshot');return {localStorage:{navi_calendar_vault:storage.get('navi_calendar_vault')}};},hash:async()=> 'hash',request:async(action,body)=>{calls.push({action,body});return action==='pull'?{exists:false}:{updatedAt:'now'};},remember(){}};
 vm.runInNewContext(sync,ctx);return {ctx,order,calls,storage};
}
{const {ctx,order,calls}=context();await ctx.sync(false);assert.deepEqual(order,['calendar','snapshot']);assert.equal(calls.find(x=>x.action==='push').body.preset.localStorage.navi_calendar_vault,'encrypted-logins');assert.equal(ctx.busy,false);}
{const {ctx,order,calls}=context();await ctx.sync(true);assert.deepEqual(order,[]);assert.deepEqual(calls,[]);}
assert.ok(!vault.includes('已取消日历登录状态的云端及导出储存；已连接的日历继续使用。'));
console.log('PASS: retired opt-out migrates, explicit cloud-clear pause survives, manual sync resumes and awaits encrypted calendar login collection before snapshot, automatic sync respects deletion pause.');
