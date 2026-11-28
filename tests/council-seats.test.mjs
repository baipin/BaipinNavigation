import assert from 'node:assert/strict';
import {confirmedSeats,seatPositions} from '../features/election/js/election-seats.js';
const races=[{name:'A',candidates:[{name:'Leader',party:'A',votes:1000},{name:'Winner',party:'B',votes:20,elected:true},{name:'Unconfirmed',party:'C',elected:false}]},{name:'B',candidates:[{name:'Winner2',party:'B',elected:true},{name:'Winner3',party:'A',elected:true}]}];
const result=confirmedSeats(races);assert.equal(result.seats.length,3);assert.deepEqual(result.parties,[{party:'B',count:2},{party:'A',count:1}]);assert.ok(!result.seats.some(c=>c.name==='Leader'));assert.equal(confirmedSeats([]).seats.length,0);assert.equal(confirmedSeats([{candidates:[{elected:'true'}]}]).seats.length,0);
for(let n=1;n<=300;n++){const points=seatPositions(n);assert.equal(points.length,n);assert.equal(new Set(points.map(p=>p.x+':'+p.y)).size,n);assert.ok(points.every(p=>Number.isFinite(p.x)&&p.x>0&&p.x<320&&p.y>0&&p.y<151));}assert.deepEqual(seatPositions(-1),[]);assert.deepEqual(seatPositions(0),[]);
console.log('PASS: only explicit winners become seats, cross-district aggregation is accurate, and seat diagrams have exactly one bounded point per confirmed seat.');
