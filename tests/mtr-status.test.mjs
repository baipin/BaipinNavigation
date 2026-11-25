import assert from 'node:assert/strict';
import {parseMtrStatus} from '../server/mtr-status.js';
const result=parseMtrStatus('<ryg_status><lastBuildDate>Thu, 26 Nov 2026 06:35:23 GMT</lastBuildDate><line><line_code>TML</line_code><status>yellow</status><url_tc>https://tnews.mtr.com.hk/alert/alert_title_tc_m.html#6723</url_tc></line><line><line_code>TWL</line_code><status>green</status></line><line><line_code>EAL</line_code><status>red</status></line><line><line_code>KTL</line_code><status>unexpected</status><url_tc>https://evil.test/</url_tc></line></ryg_status>');
assert.equal(result.lines.TML.status,'yellow');assert.ok(result.lines.TML.url.endsWith('#6723'));assert.equal(result.lines.TWL.status,'green');assert.equal(result.lines.EAL.status,'red');assert.equal(result.lines.KTL.status,'unknown');assert.ok(result.lines.KTL.url.startsWith('https://www.mtr.com.hk/'));assert.equal(result.updatedAt,'2026-11-26T06:35:23.000Z');
assert.throws(()=>parseMtrStatus('<html>error</html>'));assert.throws(()=>parseMtrStatus('<ryg_status></ryg_status>'));
console.log('PASS: official line alerts override timetable success, red/green/unknown states, timestamp and safe detail links.');

const {readFileSync}=await import('node:fs');const {default:vm}=await import('node:vm');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');const fn=html.slice(html.indexOf('async function updateCityRails()'),html.indexOf('const cityBusCache',html.indexOf('async function updateCityRails()')));
const link={href:''},row={dataset:{cityLine:'TML'},closest:()=>link};let live;
const context={cityRailLines:[['TML','HUH','屯馬線','#9a3b26']],document:{getElementById:()=>({}),querySelectorAll:()=>[row]},fetch:async()=>({ok:true,json:async()=>result}),cityLive:(...args)=>live=args,Date};vm.createContext(context);vm.runInContext(fn,context);
await context.updateCityRails();assert.equal(row.textContent,'服務受影響');assert.ok(row.className.endsWith('warn'));assert.ok(link.href.endsWith('#6723'));
context.fetch=async()=>{throw Error('offline')};await context.updateCityRails();assert.equal(row.textContent,'暫無法確認');assert.equal(live[1],'offline');
console.log('PASS: displayed TML warning and offline failure never reported as normal.');
