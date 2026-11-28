import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
import election,{officialLink,discoverResults,readResultTables,electionPhase} from '../server/election.js';
import {electionVisible} from '../js/election-time.js';
import {sanitizePreset} from '../js/preset-schema.js';
assert.equal(electionPhase(Date.parse('2026-11-28T07:59:00+08:00')),'upcoming');assert.equal(electionPhase(Date.parse('2026-11-28T08:00:00+08:00')),'voting');assert.equal(electionPhase(Date.parse('2026-11-28T16:00:00+08:00')),'counting');assert.equal(electionPhase(Date.parse('2026-11-29T00:00:00+08:00')),'counting');
assert.equal(officialLink(''),null);assert.equal(officialLink('https://cec.gov.tw.evil.test/'),null);assert.equal(officialLink('javascript:alert(1)'),null);
assert.deepEqual(discoverResults([{name:'投開票所設置地點公告',mode:'LNK',target:'https://web.cec.gov.tw/central/article/64375'}],''),[]);
assert.deepEqual(discoverResults([{name:'即時開票',mode:'LNK',target:'https://example.cec.gov.tw/2026/'}],''),['https://example.cec.gov.tw/2026/']);
// Synthetic HTML exercises the semantic table contract; these are NOT election facts or claimed upstream samples.
const page='<title>2026 選舉開票測試</title><table><tr><th>縣市</th><th>候選人姓名</th><th>政黨</th><th>得票數</th></tr><tr><td>測試縣</td><td>測試甲</td><td>測試黨</td><td>1,234</td></tr><tr><td>測試縣</td><td>測試乙</td><td></td><td>尚未公布</td></tr></table>';
assert.deepEqual(readResultTables(page),[{name:'測試縣',candidates:[{name:'測試甲',party:'測試黨',votes:1234}]}]);assert.deepEqual(readResultTables(page.replace('2026','2022')),[]);assert.deepEqual(readResultTables('<html>No published results</html>'),[]);
assert.equal(sanitizePreset({localStorage:{navi_widgets:'{"election":false}'}}).localStorage.navi_widgets,'{"election":false}');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.ok(html.indexOf('<section id="election-board"')>html.indexOf('<div class="page-flow">'));assert.ok(html.indexOf('<section id="election-board"')<html.indexOf('<main class="card-glass" id="main-container">'));assert.ok(html.includes('/js/election.js?v=integrated-v9'));
let code;await election({method:'POST'},{setHeader(){},status(value){code=value;return this},json(){}});assert.equal(code,405);
const js=readFileSync(new URL('../js/election.js',import.meta.url),'utf8');const life=js.slice(js.indexOf('function stop(){'),js.indexOf('function show(){'));let enabled=true,visible=true,hidden=false,requests=0;const timers=new Map();let serial=0;
const context={standalone:false,sourceConfirm:{},loadRevision:0,chosenSource:'setn',URLSearchParams,councilTicker:{setActive(){}},stopRotation(){},timer:null,controller:null,loading:false,error:'',data:null,enabled:()=>enabled,visible,dialog:{open:false},document:{get hidden(){return hidden}},refresh:{},setTimeout(fn,ms){timers.set(++serial,{fn,ms});return serial},clearTimeout(id){timers.delete(id)},fetch:async()=>{requests++;return {ok:true,json:async()=>({event:{date:'2026-11-28'},races:[]})}},AbortController,t:x=>x,render(){}};vm.createContext(context);vm.runInContext(life,context);
await context.load();assert.equal(requests,1);assert.equal([...timers.values()][0].ms,30000);context.stop();hidden=true;await context.load();assert.equal(requests,1);hidden=false;context.visible=false;await context.load();assert.equal(requests,1);context.dialog.open=true;await context.load();assert.equal(requests,2);context.stop();enabled=false;await context.load();assert.equal(requests,2);
console.log('PASS: election-day phases/expiry, official links, honest no-results handling, table parsing safeguards, preset roundtrip, widget positioning and visible-only polling.');

// The running page changes wording at the exact boundaries without a fetch or reload.
let clock=Date.parse('2026-11-28T07:59:59+08:00'),tick,loads=0,renders=0;
const phaseContext={standalone:false,now:()=>clock,electionPhase,t:(sc)=>sc,today:()=>electionVisible(clock),phaseLabel:{},dialogPhase:{},render(){renders++},load(){loads++},stop(){},board:{},dialog:{},observer:{disconnect(){}},setInterval(fn){tick=fn;return 1},clearInterval(){}};
vm.createContext(phaseContext);const phaseCode=js.slice(js.indexOf('function phase(){'),js.indexOf('function candidateList('));const tickerCode=js.slice(js.indexOf('render();let currentPhase='));vm.runInContext(phaseCode+'\n'+tickerCode,phaseContext);
assert.ok(phaseContext.phase().includes('投票尚未开始'));
clock=Date.parse('2026-11-28T08:00:00+08:00');tick();assert.ok(phaseContext.phaseLabel.textContent.includes('投票进行中'));assert.equal(phaseContext.dialogPhase.textContent,phaseContext.phaseLabel.textContent);assert.equal(loads,1);
clock=Date.parse('2026-11-28T16:00:00+08:00');tick();assert.equal(phaseContext.phaseLabel.textContent,'开票进行中');assert.equal(loads,2);
clock=Date.parse('2026-11-29T01:00:00+08:00');tick();assert.equal(phaseContext.board.hidden,undefined);
clock=Date.parse('2026-11-30T00:00:00+08:00');tick();assert.equal(phaseContext.board.hidden,true);
console.log('PASS: active homepage/dialog wording changes at 08:00/16:00 without reloading and remains visible after midnight.');
