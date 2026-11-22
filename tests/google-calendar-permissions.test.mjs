import assert from 'node:assert/strict';
import {calendarApi,calendarGranted,googleCalendarFailure,GOOGLE_CALENDAR_SCOPE,GOOGLE_CALENDAR_LIST_SCOPE} from '../server/calendar-service.js';
const grant=[GOOGLE_CALENDAR_SCOPE,GOOGLE_CALENDAR_LIST_SCOPE],full='https://www.googleapis.com/auth/calendar';
assert.equal(calendarGranted('google',[full]),true);
assert.equal(calendarGranted('google',[GOOGLE_CALENDAR_SCOPE,'https://www.googleapis.com/auth/calendar.calendarlist']),true);
assert.equal(calendarGranted('google',[GOOGLE_CALENDAR_SCOPE]),false);
assert.equal(calendarGranted('google',['https://www.googleapis.com/auth/calendar.readonly']),false);
const denied=(reason,status=403,modern=false)=>Response.json({error:{message:'PRIVATE RAW MESSAGE',...(modern?{details:[{reason}]}:{errors:[{reason}]})}},{status});
for(const reason of ['accessNotConfigured','SERVICE_DISABLED']){const result=await googleCalendarFailure(denied(reason,403,reason==='SERVICE_DISABLED'));assert.equal(result.status,503);assert.match(result.message,/Google Calendar API/);assert.equal(result.refresh,undefined);assert.ok(!result.message.includes('PRIVATE'));}
assert.equal((await googleCalendarFailure(denied('rateLimitExceeded'))).status,429);
assert.equal((await googleCalendarFailure(denied('ACCESS_TOKEN_SCOPE_INSUFFICIENT',403,true))).refresh,true);
assert.match((await googleCalendarFailure(denied('forbidden'),false)).message,/读取/);
assert.match((await googleCalendarFailure(denied('forbidden'),true)).message,/修改/);
assert.match((await googleCalendarFailure(new Response('<html>not JSON</html>',{status:403}))).message,/读取/);
const original=globalThis.fetch,response=()=>({status(){return this;},json(body){this.body=body;return this;}}),url=new URL('https://test/');
try{
 let attempts=0,refreshes=0;const data={accessToken:'old',scopes:grant};
 globalThis.fetch=async(_url,options)=>{attempts++;if(attempts===1)return denied('insufficientPermissions');assert.equal(options.headers.Authorization,'Bearer renewed');return Response.json({items:[{id:'readonly',summary:'Shared',accessRole:'reader'},{id:'mine',accessRole:'owner'}]});};
 const res=response();await calendarApi('google',data,'calendar-list',{headers:{}},res,url,{refreshAccess:async()=>{refreshes++;data.accessToken='renewed';}});assert.equal(attempts,2);assert.equal(refreshes,1);assert.equal(res.body.calendars[0].writable,false);assert.equal(res.body.calendars[1].writable,true);
 attempts=0;refreshes=0;globalThis.fetch=async()=>{attempts++;return denied('insufficientPermissions');};
 await assert.rejects(()=>calendarApi('google',data,'calendar-list',{headers:{}},response(),url,{refreshAccess:async()=>{refreshes++;}}),e=>e.status===403&&/重新点击/.test(e.message));assert.equal(attempts,2);assert.equal(refreshes,1);
 attempts=0;refreshes=0;globalThis.fetch=async()=>{attempts++;return denied('accessNotConfigured');};
 await assert.rejects(()=>calendarApi('google',data,'calendar-list',{headers:{}},response(),url,{refreshAccess:async()=>{refreshes++;}}),e=>e.status===503);assert.equal(attempts,1);assert.equal(refreshes,0);
 attempts=0;globalThis.fetch=async()=>{attempts++;return denied('insufficientPermissions');};
 await assert.rejects(()=>calendarApi('google',data,'calendar-delete',{headers:{'content-type':'application/json'},body:{calendar:'mine',id:'event',etag:'"1"'}},response(),url,{refreshAccess:async()=>{refreshes++;}}),e=>e.status===403);assert.equal(attempts,1);assert.equal(refreshes,0);
}finally{globalThis.fetch=original;}
console.log('PASS: Google equivalent grants, disabled API vs missing scope vs quota vs read/write access errors, one bounded read refresh, no retry of writes and safe error messages.');
