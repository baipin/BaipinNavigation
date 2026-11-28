import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {XMLParser} from 'fast-xml-parser';
import handler,{parseMtrStatus,addMtrDetails,addMtrFullAlerts,MTR_STATUSES} from '../server/mtr-status.js';
const fixture=name=>readFileSync(new URL('./fixtures/mtr/'+name,import.meta.url),'utf8');
// These snapshots are unmodified responses retrieved from the official MTR URLs on 2026-11-26.
const xml=fixture('status-2026-11-26.xml'),details=JSON.parse(fixture('status-2026-11-26.json'));
const result=addMtrDetails(parseMtrStatus(xml),details);
assert.equal(result.lines.TML.status,'yellow');assert.ok(result.lines.TML.url.endsWith('#6723'));
assert.equal(result.lines.TML.messages[0].title,'屯馬綫列車服務逐步回復正常');
assert.equal(result.lines.TML.messages[0].cause,'天水圍站有工程車設備故障');
const legend=new XMLParser().parse(fixture('legend-2026-11-26.xml')).remarks.legend_remark;
assert.deepEqual([...MTR_STATUSES].sort(),legend.map(x=>x.color).sort());
assert.throws(()=>parseMtrStatus('<html>error</html>'));assert.throws(()=>parseMtrStatus('<ryg_status></ryg_status>'));
// Contract cases use only status values explicitly documented in the official legend, not invented upstream fields.
for(const {color} of legend){const sample=xml.replace('<status>yellow</status>',`<status>${color}</status>`);assert.equal(parseMtrStatus(sample).lines.TML.status,color);}
assert.equal(parseMtrStatus(xml.replace('<status>yellow</status>','<status>unrecognized-test-value</status>')).lines.TML.status,'unknown');
const mismatched=structuredClone(details);mismatched.ryg_status.line.find(x=>x.line_code==='TML').status='red';assert.equal(addMtrDetails(parseMtrStatus(xml),mismatched).lines.TML.messages,undefined);
const stale=structuredClone(details);stale.ryg_status.lastBuildDate='2026-11-25 06:35:23';assert.equal(addMtrDetails(parseMtrStatus(xml),stale).lines.TML.messages,undefined);
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');const fn=html.slice(html.indexOf('async function updateCityRails()'),html.indexOf('const cityBusCache',html.indexOf('async function updateCityRails()')));
const notes=[],name={append:node=>notes.push(node)},link={href:'',querySelector:()=>name},row={dataset:{cityLine:'TML'},closest:()=>link,setAttribute(){},prepend(node){this.statusIcon=node.textContent}};let live;
const context={cityRailLines:[['TML','HUH','屯馬線','#9a3b26']],document:{getElementById:()=>({}),querySelectorAll:()=>[row],createElement:()=>({setAttribute(){}})},fetch:async()=>({ok:true,json:async()=>result}),cityLive:(...args)=>live=args,Date};vm.createContext(context);vm.runInContext(fn,context);
await context.updateCityRails();assert.equal(row.textContent,'服務延誤／逐步恢復');assert.equal(row.statusIcon,'schedule');assert.ok(notes[0].textContent.includes('逐步回復正常'));assert.ok(link.href.endsWith('#6723'));
for(const [status,text,style,icon] of [['green','正常','good',null],['red','服務受阻','danger','report_problem'],['grey','非服務時間','offline','bedtime'],['pink','服務延誤或受阻','warn','warning_amber'],['typhoon','熱帶氣旋警告生效','warn','cyclone'],['unknown','暫無法確認','offline','help_outline']]){
row.statusIcon=null;context.fetch=async()=>({ok:true,json:async()=>({lines:{TML:{status}}})});await context.updateCityRails();assert.equal(row.textContent,text);assert.ok(row.className.endsWith(style));assert.equal(row.statusIcon,icon);}
context.fetch=async()=>({ok:true,json:async()=>({lines:{}})});await context.updateCityRails();assert.equal(row.textContent,'暫無法確認');
context.fetch=async()=>{throw Error('offline')};await context.updateCityRails();assert.equal(row.textContent,'暫無法確認');assert.equal(live[1],'offline');
// Losing optional detail feed must preserve line status; losing main feed must fail explicitly.
const originalFetch=globalThis.fetch;let responseStatus,responseBody;
const res={setHeader(){},status(value){responseStatus=value;return this},json(value){responseBody=value;return this}};
try{
 globalThis.fetch=async url=>url.includes('.json')?Promise.reject(Error('details down')):{ok:true,text:async()=>xml};
 await handler({method:'GET'},res);assert.equal(responseStatus,200);assert.equal(responseBody.lines.TML.status,'yellow');
 globalThis.fetch=async()=>{throw Error('upstream down')};await handler({method:'GET'},res);assert.equal(responseStatus,502);
 await handler({method:'POST'},res);assert.equal(responseStatus,405);
}finally{globalThis.fetch=originalFetch;}
console.log('PASS: official snapshots and six documented statuses; recovery details; missing/unknown/offline states; no inferred full suspension; optional detail failure and mismatched snapshots.');

const engineeringXml=fixture('status-2026-11-29.xml'),engineeringDetails=JSON.parse(fixture('status-2026-11-29.json')),full=JSON.parse(fixture('alert-2026-11-29.json').replace(/^\uFEFF/,''));
const planned=addMtrFullAlerts(addMtrDetails(parseMtrStatus(engineeringXml),engineeringDetails),full);
assert.equal(planned.lines.TCL.messages[0].cause,'');assert.ok(planned.lines.TCL.messages[0].description.startsWith('配合東涌綫延綫工程'));assert.equal(planned.lines.TCL.messages[0].arrangement,'early-closure');
for(const change of [a=>a.id='999999',a=>a.lineCodes=['TML'],a=>a.status='yellow',a=>a.alertTitleTc='Different announcement']){const wrong=structuredClone(full);change(wrong.data[0]);const r=addMtrFullAlerts(addMtrDetails(parseMtrStatus(engineeringXml),engineeringDetails),wrong);assert.equal(r.lines.TCL.messages[0].description,undefined);}
const noFull=addMtrFullAlerts(addMtrDetails(parseMtrStatus(engineeringXml),engineeringDetails),null);assert.equal(noFull.lines.TCL.status,'red');assert.ok(noFull.lines.TCL.messages[0].title.includes('提早完結'));
notes.length=0;context.fetch=async()=>({ok:true,json:async()=>({lines:{TML:planned.lines.TCL}})});await context.updateCityRails();assert.equal(row.textContent,'工程提早收車');assert.equal(row.statusIcon,'engineering');assert.ok(notes[0].textContent.includes('配合東涌綫延綫工程'));assert.ok(!notes[0].textContent.includes('發生事故'));
console.log('PASS: matched official full announcement replaces generic incident cause; mismatched alerts are rejected, planned closure uses engineering icon and real text.');
