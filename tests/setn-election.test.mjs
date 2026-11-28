import {ELECTION_ARCHIVE} from '../features/election/js/election-time.js';
import assert from 'node:assert/strict';import fs from 'node:fs';
import {parseSetnResults,loadSetnResults,SETN_FEEDS} from '../features/election/server/setn-election.js';
import handler from '../features/election/server/election.js';
import {electionPhase,electionVisible} from '../features/election/js/election-time.js';
const read=name=>fs.readFileSync(new URL('./fixtures/election/setn-'+name+'.html',import.meta.url),'utf8');
// Unmodified public responses captured 2026-11-28 before the count began.
const fixtures=Object.fromEntries(SETN_FEEDS.map(feed=>[feed.id,read(feed.id)]));
const races=Object.values(fixtures).flatMap(html=>parseSetnResults(html));assert.equal(races.length,22);assert.equal(races.reduce((sum,race)=>sum+race.candidates.length,0),81);assert.equal(new Set(races.map(race=>race.id)).size,22);assert.ok(races.every(race=>race.candidates.every(candidate=>candidate.votes===null)));
assert.ok(races.find(race=>race.id==='taipei-city').candidates.some(candidate=>candidate.name==='沈伯洋'));
assert.ok(parseSetnResults(fixtures.mayor,{counting:true}).every(race=>race.status==='awaiting'));
// Mutate only the verified votes-number text to test future count changes, not fictional upstream fields.
const first=fixtures.mayor.replace(/(class="votes-number">)0/, '$1123');
assert.equal(parseSetnResults(first)[0].candidates[0].votes,null);
const counted=parseSetnResults(first,{counting:true})[0];assert.equal(counted.status,'leading');assert.equal(counted.candidates[0].votes,123);assert.equal(counted.candidates[1].votes,0);assert.equal(counted.counted,null);
const second=first.replace(/(class="votes-number">)123/,'$1100');assert.equal(parseSetnResults(second,{counting:true})[0].candidates[0].votes,100,'corrections are accepted, not forced monotonically upward');
assert.throws(()=>parseSetnResults('<html>blocked</html>'));assert.throws(()=>parseSetnResults(fixtures.mayor.replace('class="votes-number">0','class="votes-number">not published')));
assert.equal(electionPhase(Date.parse('2026-11-28T07:59:59+08:00')),'upcoming');assert.equal(electionPhase(Date.parse('2026-11-28T08:00:00+08:00')),'voting');assert.equal(electionPhase(Date.parse('2026-11-28T16:00:00+08:00')),'counting');assert.equal(electionPhase(Date.parse('2026-11-29T01:00:00+08:00')),'counting');assert.equal(electionVisible(Date.parse('2026-11-29T23:59:00+08:00')),true);assert.equal(electionVisible(Date.parse('2026-11-30T00:00:00+08:00')),false);
const original=globalThis.fetch;try{globalThis.fetch=async url=>({ok:true,text:async()=>fixtures[SETN_FEEDS.find(feed=>feed.url===url).id]});const data=await loadSetnResults();assert.equal(data.races.length,22);assert.equal(data.providerState,'connected');assert.equal(data.resultsAvailable,false);
globalThis.fetch=async url=>{const id=SETN_FEEDS.find(feed=>feed.url===url).id;if(id==='north')throw Error('network');return {ok:true,text:async()=>fixtures[id]};};const partial=await loadSetnResults();assert.equal(partial.providerState,'partial');assert.equal(partial.races.length,19);assert.deepEqual(partial.missingRegions,['north']);
globalThis.fetch=async()=>({ok:false});await assert.rejects(loadSetnResults());}finally{globalThis.fetch=original;}
if(!ELECTION_ARCHIVE){const realNow=Date.now;let code,body;const res={setHeader(){},status(n){code=n;return this},json(value){body=value;return this}};
try{Date.now=()=>Date.parse('2026-11-28T15:59:59+08:00');globalThis.fetch=async url=>{if(url.includes('elect.setn.com')){const id=SETN_FEEDS.find(feed=>feed.url===url)?.id;return {ok:true,text:async()=>id==='mayor'?first:fixtures[id]};}throw Error('CEC temporarily down');};
await handler({method:'GET'},res);assert.equal(code,200);assert.equal(body.races.length,22);assert.equal(body.phase,'voting');assert.equal(body.races[0].candidates[0].votes,null);
Date.now=()=>Date.parse('2026-11-28T16:00:00+08:00');await handler({method:'GET'},res);assert.equal(code,200);assert.equal(body.phase,'counting');assert.equal(body.resultsAvailable,true);assert.equal(body.races[0].candidates[0].votes,123,'phase boundary invalidates pre-vote cache immediately');
}finally{Date.now=realNow;globalThis.fetch=original;}
}
console.log('PASS: actual public HTML fixtures cover 22 districts/81 candidates; pre-count placeholders, count updates/corrections, missing feeds, malformed markup, Taipei boundaries and next-day visibility.');
