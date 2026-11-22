import assert from 'node:assert/strict';
import handler from '../api/sync.js';
import {feishuEvent} from '../server/feishu-calendar.js';
import {sanitizePreset} from '../js/preset-schema.js';
const savedEnv=Object.fromEntries(['FEISHU_APP_ID','FEISHU_APP_SECRET','FEISHU_SESSION_KEY'].map(k=>[k,process.env[k]])),originalFetch=globalThis.fetch,originalNow=Date.now;
process.env.FEISHU_APP_ID='cli_test';process.env.FEISHU_APP_SECRET='dummy-feishu-secret-'.repeat(3);
let now=Date.now(),tokenCalls=0,refreshes=0,writes=0,secondPage=false,readonly=false,grantError=false,challenge='';Date.now=()=>now;
const primary={calendar_id:'cal-primary',summary:'飞书主日历',role:'owner',type:'primary'},range='&calendar=cal-primary&start=2026-11-01&end=2026-12-01';
let event={event_id:'event-one',summary:'飞书测试',description:'细节',start_time:{timestamp:'1795338000'},end_time:{timestamp:'1795341600'},organizer_calendar_id:'cal-primary',location:{name:'线上'},status:'confirmed'};
const json=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
globalThis.fetch=async(url,options={})=>{
 const target=new URL(url);assert.equal(target.origin,'https://open.feishu.cn');assert.equal(options.redirect,'error');
 if(target.pathname==='/open-apis/authen/v2/oauth/token'){
  tokenCalls++;const body=JSON.parse(options.body);assert.equal(body.client_id,'cli_test');assert.equal(body.client_secret,process.env.FEISHU_APP_SECRET);
  if(body.grant_type==='authorization_code'){assert.equal(body.redirect_uri,'https://123.baipon.com/api/feishu/callback');const {createHash}=await import('node:crypto');assert.equal(createHash('sha256').update(body.code_verifier).digest('base64url'),challenge);}
  else{assert.equal(body.grant_type,'refresh_token');assert.equal(body.refresh_token,'refresh-one');refreshes++;}
  return json({code:0,access_token:'access-one',refresh_token:refreshes?'refresh-two':'refresh-one',expires_in:7200});
 }
 assert.equal(options.headers.Authorization,'Bearer access-one');
 if(target.pathname==='/open-apis/drive/v1/files')return json({code:0,data:{files:[],has_more:false}});
 if(target.pathname.endsWith('/authen/v1/user_info'))return json({code:0,data:{open_id:'ou_user',name:'测试用户'}});
 if(grantError)return json({code:99991672,msg:'must not expose raw details'});
 if(target.pathname==='/open-apis/calendar/v4/calendars')return json({code:0,data:{calendar_list:target.searchParams.has('page_token')?[{calendar_id:'cal-read',summary:'只读',type:'shared',role:'reader'}]:[{...primary,role:readonly?'reader':'owner'}],has_more:secondPage&&!target.searchParams.has('page_token'),page_token:'safe-token'}});
 if(target.pathname.endsWith('/instance_view')){assert.equal(target.searchParams.get('start_time'),String(Date.parse('2026-11-01')/1000));return json({code:0,data:{items:[event,{...event,event_id:'recur',recurring_event_id:'master'},{...event,event_id:'cancel',status:'cancelled'}]}});}
 if(options.method==='POST'||options.method==='PATCH'){
  writes++;const body=JSON.parse(options.body);assert.equal(body.need_notification,false);assert.equal(body.start_time.timezone,'UTC');
  if(options.method==='POST')assert.ok(target.searchParams.get('idempotency_key'));
  event={...event,...body};return json({code:0,data:{event}});
 }
 if(options.method==='DELETE'){writes++;return json({code:0,data:{}});}
 if(target.pathname.endsWith('/events/event-one'))return json({code:0,data:{event}});
 throw Error('Unexpected mock route '+target.pathname);
};
async function call(action,{cookie='',method='GET',body,origin='https://123.baipon.com',params='',host='123.baipon.com'}={}){
 const headers={},res={statusCode:200,setHeader(k,v){headers[k]=v;},getHeader(k){return headers[k];},status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;},end(){return this;}};
 await handler({url:'/api/sync?provider=feishu&action='+action+params,method,headers:{cookie,origin,host,'content-type':'application/json'},body},res);return {...res,headers};
}
const cookies=result=>(result.headers['Set-Cookie']||[]).map(x=>x.split(';')[0]).join('; ');
try{
 assert.equal((await call('status')).body.authenticated,false);
 assert.equal((await call('calendar-login',{host:'evil.test'})).statusCode,400);
 let login=await call('calendar-login'),url=new URL(login.headers.Location);assert.equal(url.origin,'https://accounts.feishu.cn');assert.ok(url.searchParams.get('scope').includes('calendar:calendar'));assert.ok(url.searchParams.get('scope').includes('offline_access'));challenge=url.searchParams.get('code_challenge');
 assert.ok(login.headers['Set-Cookie'].every(c=>c.includes('HttpOnly; Secure; SameSite=Lax')));
 assert.ok(!cookies(login).includes('verifier'));
 assert.ok((await call('callback',{cookie:cookies(login),params:'&code=dummy&state=wrong'})).headers.Location.includes('state-error'));assert.equal(tokenCalls,0);
 let connected=await call('callback',{cookie:cookies(login),params:'&code=dummy&state='+url.searchParams.get('state')});assert.equal(connected.headers.Location,'/?calendar=connected&provider=feishu');let cookie=cookies(connected);assert.ok(!cookie.includes('access-one'));
 let result=await call('status',{cookie});assert.equal(result.body.user.id,'ou_user');assert.equal(result.body.calendarAuthorized,true);assert.ok(!JSON.stringify(result.body).includes('access-one'));
 secondPage=true;result=await call('calendar-list',{cookie});assert.equal(result.body.calendars.length,2);assert.equal(result.body.calendars[0].writable,true);assert.equal(result.body.calendars[1].writable,false);secondPage=false;
 result=await call('calendar-events',{cookie,params:range});assert.equal(result.body.events.length,2);assert.equal(result.body.events[0].editable,true);assert.equal(result.body.events[1].editable,false);const loaded=result.body.events[0];
 const value={title:'修改后',description:'细节',location:'线上',start:'2026-11-22T01:00:00Z',end:'2026-11-22T02:00:00Z',allDay:false};
 assert.equal((await call('calendar-save',{cookie,method:'POST',body:{calendar:'cal-primary',event:value},origin:'https://evil.test'})).statusCode,403);
 assert.equal((await call('calendar-save',{cookie,method:'POST',body:{calendar:'cal-primary',id:'event-one',etag:'stale',event:value}})).statusCode,409);assert.equal(writes,0);
 result=await call('calendar-save',{cookie,method:'POST',body:{calendar:'cal-primary',id:'event-one',etag:loaded.etag,event:value}});assert.equal(result.statusCode,200);assert.equal(writes,1);
 assert.equal((await call('calendar-save',{cookie,method:'POST',body:{calendar:'cal-primary',event:value}})).statusCode,200);
 readonly=true;assert.equal((await call('calendar-save',{cookie,method:'POST',body:{calendar:'cal-primary',event:value}})).statusCode,403);readonly=false;
 event.recurrence='FREQ=DAILY';assert.equal((await call('calendar-delete',{cookie,method:'POST',body:{calendar:'cal-primary',id:'event-one',etag:'x'}})).statusCode,403);delete event.recurrence;
 result=await call('calendar-events',{cookie,params:range});assert.equal((await call('calendar-delete',{cookie,method:'POST',body:{calendar:'cal-primary',id:'event-one',etag:result.body.events[0].etag}})).statusCode,200);
 assert.equal((await call('calendar-events',{cookie,params:range.replace('cal-primary','other')})).statusCode,403);
 grantError=true;result=await call('calendar-list',{cookie});assert.equal(result.statusCode,502);assert.ok(!JSON.stringify(result.body).includes('raw details'));grantError=false;
 assert.equal((await call('calendar-vault-capture',{cookie,method:'POST',body:{}})).statusCode,404);
 now+=7201000;result=await call('status',{cookie});assert.equal(result.statusCode,200);assert.equal(refreshes,1);cookie=cookies(result);
 result=await call('calendar-disconnect',{cookie,method:'POST',body:{}});cookie=cookies(result);assert.equal((await call('status',{cookie})).body.authenticated,true);assert.equal((await call('status',{cookie})).body.calendarAuthorized,false);result=await call('logout',{cookie,method:'POST',body:{}});assert.ok(result.headers['Set-Cookie'].every(x=>x.includes('Max-Age=0')));
 assert.equal((await call('calendar-disconnect',{cookie,method:'GET'})).statusCode,405);
 login=await call('login');url=new URL(login.headers.Location);challenge=url.searchParams.get('code_challenge');assert.ok(url.searchParams.get('scope').includes('drive:drive'));assert.ok(!url.searchParams.get('scope').includes('calendar:calendar'));
 connected=await call('callback',{cookie:cookies(login),params:'&code=sync&state='+url.searchParams.get('state')});assert.equal(connected.headers.Location,'/?sync=connected&provider=feishu');cookie=cookies(connected);
 result=await call('status',{cookie});assert.equal(result.body.authenticated,true);assert.equal(result.body.calendarAuthorized,false);
 result=await call('pull',{cookie});assert.equal(result.body.exists,false);assert.equal(result.statusCode,200);
 assert.equal((await call('calendar-list',{cookie})).statusCode,403);
 assert.equal((await call('clear',{cookie,method:'POST',body:{confirm:false,revision:null}})).statusCode,400);
 assert.equal((await call('clear',{cookie,method:'POST',body:{confirm:true,revision:null}})).statusCode,200);
 delete process.env.FEISHU_APP_ID;assert.equal((await call('status')).body.configured,false);process.env.FEISHU_APP_ID='cli_test';
 assert.equal(feishuEvent({...event,status:'cancelled'},primary),null);assert.equal(feishuEvent({...event,start_time:{timestamp:'bad'}},primary),null);
 assert.equal(feishuEvent({...event,attendees:[{is_organizer:false}]},primary).editable,false);
 const pref=sanitizePreset({localStorage:{navi_calendar_preferences:JSON.stringify({feishu:{account:'ou_user',calendars:['cal-primary']}})}});assert.ok(pref.localStorage.navi_calendar_preferences.includes('feishu'));assert.ok(!JSON.stringify(pref).includes('access-one'));
 console.log('PASS: Feishu OAuth state/PKCE, encrypted session, renewal, same-origin writes, paginated calendars, recurring instance view, CRUD/stale writes/read-only safeguards, disconnect and preset preferences without OAuth tokens.');
}finally{globalThis.fetch=originalFetch;Date.now=originalNow;for(const [key,value]of Object.entries(savedEnv))if(value===undefined)delete process.env[key];else process.env[key]=value;}
