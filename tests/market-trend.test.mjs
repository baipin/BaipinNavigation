import assert from 'node:assert/strict';
import handler,{chartSeries} from '../api/market-trend.js';
const t=Date.parse('2026-11-20T14:30:00Z')/1000;
const fixture={chart:{result:[{meta:{exchangeTimezoneName:'America/New_York'},timestamp:[t-86400,t,t+300,t+600,t+900],indicators:{quote:[{close:[90,100,null,102,101]}]}}]}};
const series=chartSeries(fixture);assert.equal(series.points.length,3);assert.equal(series.date,'2026-11-20');assert.equal(series.points[0].value,100);assert.equal(series.points.at(-1).value,101);
assert.throws(()=>chartSeries({chart:{result:[{timestamp:[t],indicators:{quote:[{close:[null]}]}}]}}));
const original=globalThis.fetch;let calls=0;globalThis.fetch=async url=>{calls++;assert.ok(String(url).startsWith('https://query1.finance.yahoo.com/v8/finance/chart/'));return new Response(JSON.stringify(fixture));};
const run=async(symbol,method='GET')=>{const res={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};await handler({method,query:{symbol}},res);return res;};
try{assert.equal((await run('^HSI')).code,200);assert.equal((await run('0700.HK')).code,200);assert.equal((await run('AAPL')).code,200);for(const symbol of ['https://evil.test','../secret','AAPL&x=1','']){const before=calls;assert.equal((await run(symbol)).code,400);assert.equal(calls,before);}assert.equal((await run('AAPL','POST')).code,405);}finally{globalThis.fetch=original;}
console.log('PASS: latest-session history, missing values, safe stock/index symbols and GET-only trend API.');
