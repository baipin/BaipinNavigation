import assert from 'node:assert/strict';
import handler,{cycloneIds} from '../api/tropical-cyclones.js';
const original=globalThis.fetch;let mode='empty',calls=[];
globalThis.fetch=async url=>{calls.push(String(url));if(String(url).endsWith('tc_gis_list.js'))return new Response(mode==='empty'?'NIL':'var tc=["2649,Test"];');return new Response(JSON.stringify({tc_fixarea_c_htm:{name_c:'測試氣旋',datetime:'2026 年 11 月 22 日 14 時',desc:'<p>位置</p>',fcstpos_htm:'<table></table>'}}));};
const run=async method=>{const res={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};await handler({method},res);return res;};
try{let r=await run('GET');assert.equal(r.code,200);assert.equal(r.body.storms.length,0);mode='storm';r=await run('GET');assert.equal(r.body.storms.length,1);assert.equal(r.body.storms[0].id,'2649');assert.ok(calls.every(x=>x.startsWith('https://www.hko.gov.hk/')));assert.ok(!calls.some(x=>x.includes('unsafe')));assert.equal((await run('POST')).code,405);}finally{globalThis.fetch=original;}
console.log('PASS: no-cyclone response, cyclone details, fixed official sources, ID allowlist and GET-only API.');

assert.deepEqual(cycloneIds('NIL\n'),[]);assert.deepEqual(cycloneIds('var tc=["2649,Name","2650,Other"];'),['2649','2650']);assert.throws(()=>cycloneIds('unexpected'));
