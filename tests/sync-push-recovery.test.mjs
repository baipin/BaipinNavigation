import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {sanitizePreset} from '../js/preset-schema.js';
const source=await readFile(new URL('../js/sync.js',import.meta.url),'utf8');
const requestSource=source.slice(source.indexOf('async function request(action,body,'),source.indexOf('function renderLoginButton'));
const preset=sanitizePreset({localStorage:{theme_mode:'dark'}});
function setup({remote=preset,pullFails=false,status=502,uncertain=false}={}){
 const calls=[],failure=Object.assign(new Error('push failed'),{status,uncertain});
 const context={provider:'google',providers:{google:{endpoint:'/api/sync',name:'Google'}},simplified:()=>true,account:{id:'7'},updateControls(){},sanitizePreset,hash:async p=>JSON.stringify(p),syncRequest:async(endpoint,action)=>{
  calls.push(action);if(action==='push')throw failure;if(pullFails)throw Error('offline');return {exists:true,preset:remote,revision:'saved',updatedAt:'2026-11-22T14:00:00Z'};
 }};
 vm.runInNewContext(requestSource,context);return {context,calls,failure};
}
for(const options of [{},{status:undefined,uncertain:true}]){
 const {context,calls}=setup(options);const result=await context.request('push',{preset});assert.equal(result.revision,'saved');assert.deepEqual(calls,['push','pull']);
}
for(const options of [{remote:sanitizePreset({localStorage:{theme_mode:'light'}})},{pullFails:true}]){
 const {context,calls,failure}=setup(options);await assert.rejects(()=>context.request('push',{preset}),e=>e===failure);assert.deepEqual(calls,['push','pull']);
}
for(const status of [400,401,403,409]){
 const {context,calls,failure}=setup({status});await assert.rejects(()=>context.request('push',{preset}),e=>e===failure);assert.deepEqual(calls,['push']);if(status===401)assert.equal(context.account,null);
}
console.log('PASS: uncertain write recovers only when the full cloud preset matches; different/unreadable cloud retains original error; no duplicate writes or auth/conflict retry.');
