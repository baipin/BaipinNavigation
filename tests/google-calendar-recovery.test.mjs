import assert from 'node:assert/strict';
import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';
import handler from '../api/sync.js';
const previous=process.env.GOOGLE_KEY,original=globalThis.fetch;process.env.GOOGLE_KEY='test-calendar-recovery';
const key=createHash('sha256').update(process.env.GOOGLE_KEY).digest();
const scopes=['https://www.googleapis.com/auth/drive.appdata','https://www.googleapis.com/auth/calendar.events','https://www.googleapis.com/auth/calendar.calendarlist.readonly'];
const data={scopes,user:{id:'test',email:'test@example.test'},accessToken:'stale',refreshToken:'existing-refresh',accessExpires:Date.now()+3600000,expires:Date.now()+86400000};
const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv),cookie=Buffer.concat([iv,cipher.update(JSON.stringify(data)),cipher.final(),cipher.getAuthTag()]).toString('base64url');
let refreshes=0,reads=0;const headers={},res={setHeader(k,v){headers[k]=v;},getHeader:k=>headers[k],status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;}};
try{
 globalThis.fetch=async(url,options={})=>{
  if(String(url).includes('/token')){refreshes++;const body=new URLSearchParams(options.body);assert.equal(body.get('grant_type'),'refresh_token');assert.equal(body.get('refresh_token'),'existing-refresh');assert.equal(body.has('scope'),false);return Response.json({access_token:'fresh',expires_in:3600,scope:scopes.join(' ')});}
  assert.ok(String(url).includes('/calendar/v3/users/me/calendarList'));reads++;
  if(reads===1)return Response.json({error:{errors:[{reason:'insufficientPermissions'}]}},{status:403});assert.equal(options.headers.Authorization,'Bearer fresh');return Response.json({items:[{id:'primary',accessRole:'owner'}]});
 };
 await handler({url:'/api/sync?action=calendar-list',method:'GET',headers:{cookie:'__Host-navi_sync='+cookie,host:'123.baipon.com'}},res);
 assert.equal(res.statusCode,200);assert.equal(res.body.calendars[0].writable,true);assert.equal(reads,2);assert.equal(refreshes,1);
 const parts=Object.fromEntries(headers['Set-Cookie'].map(x=>x.split(';')[0].split(/=(.*)/s)));const bytes=Buffer.from(['','_1','_2'].map(x=>parts['__Host-navi_sync'+x]||'').join(''),'base64url'),decipher=createDecipheriv('aes-256-gcm',key,bytes.subarray(0,12));decipher.setAuthTag(bytes.subarray(-16));const saved=JSON.parse(Buffer.concat([decipher.update(bytes.subarray(12,-16)),decipher.final()]).toString());assert.equal(saved.accessToken,'fresh');assert.deepEqual(saved.scopes,scopes);assert.equal(saved.refreshToken,'existing-refresh');
 console.log('PASS: authenticated Google calendar load recovers stale token once and saves renewed encrypted session without widening scopes.');
}finally{globalThis.fetch=original;if(previous===undefined)delete process.env.GOOGLE_KEY;else process.env.GOOGLE_KEY=previous;}
