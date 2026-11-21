import assert from 'node:assert/strict';
import handler from '../api/weather-warnings.js';
const original=globalThis.fetch;
const fixture={UPDATE_TIME:'202611210600',WARNING_DATABASE:[{WarningCode:'WFIRER',WarningName:'火災危險警告',Type:'紅色',ActionCode:'ISSUE',IssueTime:'2026-11-21 06:00:00',ExpireTime:'2099-01-01 00:00:00'},{WarningCode:'WCOLD',ActionCode:'CANCEL',IssueTime:'2026-11-20 11:15:00',ExpireTime:'2026-11-21 06:00:00'}]};
let failDetails=false,failHistory=false,urls=[];
globalThis.fetch=async url=>{urls.push(url);const history=url.includes('wxwarntoday');if(history?failHistory:failDetails)throw new Error('offline');return new Response(JSON.stringify(history?fixture:{details:[{warningStatementCode:'WFIRE',subtype:'WFIRER',contents:['Test bulletin'],updateTime:'2026-11-21T06:00:00+08:00'}]}));};
async function run(method='GET',lang='tc') {const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(v){this.code=v;return this;},json(v){this.body=v;return this;}};await handler({method,query:{lang}},res);return res;}
try {
    let result=await run();assert.equal(result.code,200);assert.equal(result.headers['Cache-Control'],'no-store');assert.equal(result.body.details[0].subtype,'WFIRER');assert.equal(result.body.history.length,2);assert.equal(result.body.history[1].issueTime,'2026-11-20 11:15:00');assert.equal(result.body.history[1].expireTime,'2026-11-21 06:00:00');
    urls=[];await run('GET','sc');assert.ok(urls.includes('https://www.hko.gov.hk/dps/sc/wxinfo/dailywx/wxwarntoday_uc.json'));
    failHistory=true;result=await run();assert.equal(result.code,200);assert.equal(result.body.history,null);assert.equal(result.body.details.length,1);
    failHistory=false;failDetails=true;result=await run();assert.equal(result.body.details,null);assert.equal(result.body.history.length,2);
    failHistory=true;assert.equal((await run()).code,502);assert.equal((await run('POST')).code,405);
    globalThis.fetch=async()=>new Response('{}');assert.equal((await run()).code,502);
    console.log('PASS: HKO warning details, cross-day cancellations, language, partial failure, malformed upstream, no-store and method guard.');
} finally {globalThis.fetch=original;}
