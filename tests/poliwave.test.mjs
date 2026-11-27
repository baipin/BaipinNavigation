import assert from 'node:assert/strict';
import {normalizePoliwave,loadPoliwave} from '../server/poliwave.js';
// Synthetic licensed-API contract examples based on https://www.poliwave.com/about/api.
// No licensed key or authenticated response was available when preparing this adapter.
const sample={available:true,rehearsal:false,page:'https://www.poliwave.com/tw/live/local-2026',fetchedAt:'2026-11-28T09:00:00Z',sourceTime:'2026-11-28T08:59:00Z',attribution:'Poliwave · CEC',units:[{code:'TEST',name:'測試市',status:'leading',counted:12.5,candidates:[{name:'測試候選人甲',party:'TEST',votes:1234},{name:'測試候選人乙',party:'TEST',votes:null}]}]};
const result=normalizePoliwave(sample);assert.equal(result.races[0].candidates[0].votes,1234);assert.equal(result.races[0].candidates[1].votes,null);assert.equal(result.races[0].status,'leading');assert.equal(result.races[0].counted,12.5);assert.equal(result.attribution,'Poliwave · CEC');
const waiting=normalizePoliwave({...sample,available:false});assert.equal(waiting.resultsAvailable,false);assert.equal(waiting.races[0].candidates[0].votes,null);assert.equal(waiting.races[0].status,'awaiting');assert.equal(waiting.races[0].counted,null);
for(const patch of [{rehearsal:true},{page:'https://www.poliwave.com/tw/live/local-2022'},{fetchedAt:'invalid'},{units:[]},{units:[{name:'Bad',candidates:[{name:'Bad',votes:-1}]}]}])assert.throws(()=>normalizePoliwave({...sample,...patch}));
const oldKey=process.env.POLIWAVE_API_KEY,originalFetch=globalThis.fetch;let requests=0;
try{
 delete process.env.POLIWAVE_API_KEY;globalThis.fetch=async()=>{requests++;throw Error()};await assert.rejects(loadPoliwave(),error=>error.code==='not_configured');assert.equal(requests,0);
 process.env.POLIWAVE_API_KEY='test-only-not-a-real-key';globalThis.fetch=async(url,options)=>{requests++;assert.equal(url,'https://www.poliwave.com/api/v1/live/tw/local-2026');assert.equal(options.headers.Authorization,'Bearer test-only-not-a-real-key');assert.equal(options.redirect,'error');return {ok:true,text:async()=>JSON.stringify(sample)};};assert.equal((await loadPoliwave()).races.length,1);
 for(const [status,code]of [[401,'invalid_key'],[403,'scope_required'],[429,'rate_limited'],[500,'unavailable']]){globalThis.fetch=async()=>({ok:false,status});await assert.rejects(loadPoliwave(),error=>error.code===code);}
 globalThis.fetch=async()=>({ok:true,text:async()=>'<html>blocked</html>'});await assert.rejects(loadPoliwave(),error=>error.code==='invalid_response');
}finally{if(oldKey===undefined)delete process.env.POLIWAVE_API_KEY;else process.env.POLIWAVE_API_KEY=oldKey;globalThis.fetch=originalFetch;}
console.log('PASS: documented Results API contract, null vs zero, no rehearsal/old election, header-only server key, missing configuration and auth/rate/invalid response handling. Live licensed payload still requires a key for verification.');
