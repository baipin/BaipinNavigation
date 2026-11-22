import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import {createCanvasHandler,canvasEvent,canvasOrigin,publicCanvasAddress,canvasJSON} from '../server/canvas-calendar.js';
import {sanitizePreset} from '../js/preset-schema.js';
const previous=process.env.CANVAS_SESSION_KEY;process.env.CANVAS_SESSION_KEY='test-key-'.repeat(5);
const origin='https://school.instructure.com',token='test-canvas-token',calls=[];let nextMode='',address='8.8.8.8',coursePages=0;
function request(url,options,callback){
 const req=new EventEmitter();req.destroy=error=>{if(error)req.emit('error',error);req.emit('close');};req.end=()=>queueMicrotask(()=>{
  calls.push({url:String(url),options});assert.equal(options.method,'GET');assert.equal(options.headers.Authorization,'Bearer '+token);assert.equal(options.agent,false);
  options.lookup(url.hostname,{},(error,ip,family)=>{assert.equal(error,null);assert.equal(ip,'8.8.8.8');assert.equal(family,4);});
  let body={},headers={},statusCode=200;
  if(nextMode==='redirect'){statusCode=302;headers.location='https://evil.test/';}
  else if(nextMode==='expired')statusCode=401;
  else if(url.pathname.endsWith('/profile'))body={id:7,name:'Student',email:'private@example.test'};
  else if(url.pathname.endsWith('/courses')){body=[{id:42,name:'Algorithms',workflow_state:'available'},{id:43,name:'Database',workflow_state:'available'}];if(nextMode==='evil-page')headers.link='<https://evil.test/api/v1/courses?page=2>; rel="next"';else if(nextMode==='pages'&&!url.searchParams.has('page'))headers.link='<'+origin+'/api/v1/courses?page=2>; rel="next"';else if(url.searchParams.has('page')){coursePages++;body=[{id:44,name:'Math'}];}}
  else if(url.pathname.endsWith('/calendar_events')){
   assert.equal(url.searchParams.get('context_codes[]'),'course_42');assert.ok(url.searchParams.has('start_date'));assert.ok(!url.searchParams.has('all_events'));
   body=url.searchParams.get('type')==='assignment'?[{id:'assignment_7',context_code:'course_42',title:'Homework',start_at:'2026-11-22T23:59:00+08:00',end_at:'2026-11-22T23:59:00+08:00',description:'<b>Read chapter 1</b>',all_day:true,all_day_date:'2026-11-22',html_url:origin+'/courses/42/assignments/7'}, {id:'assignment_undated',context_code:'course_42',title:'Undated',start_at:null}, {id:'assignment_8',context_code:'course_43',title:'Wrong course',start_at:'2026-11-22T12:00:00Z'}]:[{id:5,context_code:'course_42',title:'Lecture',start_at:'2026-11-22T01:00:00Z',end_at:'2026-11-22T02:00:00Z'}];
  }
  const response=Readable.from([Buffer.from(JSON.stringify(body))]);response.statusCode=statusCode;response.headers=headers;response.once('end',()=>req.emit('close'));callback(response);
 });return req;
}
const handler=createCanvasHandler({lookup:async()=>[{address,family:4}],request});
async function call(action,{body,cookie='',params='',method=body?'POST':'GET',origin:source='https://123.baipon.com'}={}){const headers={},res={code:200,setHeader(k,v){headers[k]=v;},getHeader(k){return headers[k];},status(code){this.code=code;return this;},json(value){this.body=value;return this;}};await handler({url:'/api/canvas?action='+action+params,method,headers:{cookie,origin:source,'content-type':'application/json'},body},res);return {...res,headers};}
try{
 for(const value of ['http://school.test','https://127.0.0.1','https://school.test:444','https://user:pass@school.test','https://school.test/?token=x','https://localhost','https://school.test/#x'])assert.throws(()=>canvasOrigin(value));
 assert.equal(canvasOrigin(origin+'/courses'),origin);
 for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','172.16.1.1','192.168.0.1','100.64.0.1','0.0.0.0','224.0.0.1','::1','::ffff:127.0.0.1'])assert.equal(publicCanvasAddress(ip),false);assert.equal(publicCanvasAddress('8.8.8.8'),true);
 let result=await call('status');assert.equal(result.body.authenticated,false);
 result=await call('connect',{body:{origin,token},origin:'https://evil.test'});assert.equal(result.code,403);assert.equal(calls.length,0);
 address='127.0.0.1';result=await call('connect',{body:{origin,token}});assert.equal(result.code,400);assert.equal(calls.length,0);address='8.8.8.8';
 nextMode='redirect';result=await call('connect',{body:{origin,token}});assert.equal(result.code,502);assert.equal(calls.length,1);nextMode='';
 result=await call('connect',{body:{origin,token}});assert.equal(result.code,200);const cookie=result.headers['Set-Cookie'].map(x=>x.split(';')[0]).join('; ');assert.ok(!cookie.includes(token));assert.ok(result.headers['Set-Cookie'].every(x=>x.includes('HttpOnly; Secure; SameSite=Lax')));
 result=await call('status',{cookie});assert.equal(result.body.authenticated,true);assert.equal(result.body.calendarAuthorized,true);assert.equal(result.body.user.name,'Student');assert.equal(result.body.user.email,origin);assert.ok(!JSON.stringify(result.body).includes(token));
 const account=result.body.user.id;nextMode='pages';result=await call('calendar-list',{cookie});assert.equal(result.body.calendars.length,3);assert.equal(coursePages,1);assert.ok(result.body.calendars.every(x=>!x.writable));nextMode='evil-page';result=await call('calendar-list',{cookie});assert.equal(result.code,502);assert.ok(calls.every(x=>new URL(x.url).origin===origin));nextMode='';
 result=await call('calendar-events',{cookie,params:'&calendar=course_42&start=2026-11-01&end=2026-12-01'});assert.equal(result.code,200);assert.equal(result.body.events.length,2);const due=result.body.events.find(x=>x.due);assert.equal(due.start,'2026-11-22T15:59:00.000Z');assert.equal(Date.parse(due.end)-Date.parse(due.start),1);assert.equal(due.allDay,false);assert.equal(due.webLink,origin+'/courses/42/assignments/7');assert.equal(due.editable,false);assert.ok(!due.description.includes('<b>'));
 result=await call('calendar-events',{cookie,params:'&calendar=course_42&start=2026-11-01&end=2027-12-01'});assert.equal(result.code,400);
 result=await call('calendar-events',{cookie,params:'&calendar=user_7&start=2026-11-01&end=2026-12-01'});assert.equal(result.code,400);
 result=await call('calendar-save',{cookie,body:{}});assert.equal(result.code,404);
 const range={start:'2026-11-01T00:00:00Z',end:'2026-12-01T00:00:00Z'};
 assert.equal(canvasEvent({id:'assignment_1',start_at:'2026-12-01T00:00:00Z'},origin,range),null);
 assert.equal(canvasEvent({id:'assignment_1',start_at:'2026-11-01T00:00:00Z',workflow_state:'deleted'},origin,range),null);
 let event=canvasEvent({id:1,start_at:'2026-11-22T06:00:00Z',end_at:'2026-11-23T06:00:00Z',all_day:true,all_day_date:'2026-11-22',html_url:'https://evil.test/'},origin,range);assert.equal(event.end,'2026-11-23');assert.equal(event.webLink,null);
 const preset=sanitizePreset({localStorage:{navi_calendar_preferences:JSON.stringify({canvas:{account,calendars:['course_42']}})}});assert.deepEqual(JSON.parse(preset.localStorage.navi_calendar_preferences).canvas.calendars,['course_42']);assert.ok(!JSON.stringify(preset).includes(token));
 nextMode='expired';result=await call('calendar-list',{cookie});assert.equal(result.code,401);nextMode='';
 await assert.rejects(()=>canvasJSON({origin,token},'https://evil.test/api/v1/courses',{lookup:async()=>{throw Error('must not resolve');}}));
 result=await call('disconnect',{cookie,body:{}});assert.ok(result.headers['Set-Cookie'].every(x=>x.includes('Max-Age=0')));
 console.log('PASS: Canvas connection, encrypted session, read-only courses/events, Due precision, timezones, preset roundtrip, pagination, auth failures, pinned DNS and token leakage protection.');
}finally{if(previous===undefined)delete process.env.CANVAS_SESSION_KEY;else process.env.CANVAS_SESSION_KEY=previous;}
