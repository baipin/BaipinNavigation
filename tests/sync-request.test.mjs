import assert from 'node:assert/strict';
import {syncRequest} from '../js/sync-request.js';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status});
for(const action of ['status','pull']){
 let calls=0;
 const result=await syncRequest('/api/sync',action,undefined,{request:async(url,options)=>{
  assert.equal(url,'/api/sync?action='+action);assert.equal(options.credentials,'same-origin');assert.equal(options.cache,'no-store');
  return ++calls===1?new Response('FUNCTION_INVOCATION_FAILED',{status:500}):json({authenticated:true});
 }});
 assert.equal(result.authenticated,true);assert.equal(calls,2);
}
let calls=0;
await assert.rejects(()=>syncRequest('/api/sync','push',{preset:{}},{name:'Google',request:async()=>{calls++;return new Response('<html>private error body</html>',{status:500,headers:{'x-vercel-error':'FUNCTION_INVOCATION_FAILED','x-vercel-id':'hkg1::test-1234'}});}}),error=>{
 assert.ok(error.message.includes('HTTP 500'));assert.ok(error.message.includes('FUNCTION_INVOCATION_FAILED'));assert.ok(error.message.includes('hkg1::test-1234'));assert.ok(error.message.includes('push'));assert.ok(!error.message.includes('private'));return error.status===500;
});assert.equal(calls,1,'writes must never be retried blindly');
calls=0;const value=await syncRequest('/api/microsoft','status',undefined,{request:async()=>{if(++calls===1)throw Error('offline');return json({authenticated:false});}});assert.equal(value.authenticated,false);assert.equal(calls,2);
calls=0;await assert.rejects(()=>syncRequest('/api/github','status',undefined,{request:async()=>{calls++;return json({error:'重新登录'},401);}}),e=>e.message==='重新登录'&&e.status===401);assert.equal(calls,1);
await assert.rejects(()=>syncRequest('/api/sync','status',undefined,{request:async()=>json(null)}),/格式不正确/);
await assert.rejects(()=>syncRequest('/api/sync','status',undefined,{request:async()=>new Response('private',{status:500,headers:{'x-vercel-error':'unsafe details','x-vercel-id':'unsafe <html>'}})}),e=>!e.message.includes('unsafe')&&!e.message.includes('private'));
console.log('PASS: transient login/status reads retry once, writes never repeat, safe HTTP/action diagnostics, network retry, 401 preservation, response shape validation.');
