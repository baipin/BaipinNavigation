import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import handler from '../api/sync.js';
import {sanitizePreset} from '../js/preset-schema.js';
const originalFetch=globalThis.fetch,originalNow=Date.now;
const previous={MICROSOFT_CLIENT_ID:process.env.MICROSOFT_CLIENT_ID,MICROSOFT_KEY:process.env.MICROSOFT_KEY};
process.env.MICROSOFT_CLIENT_ID='test-client';process.env.MICROSOFT_KEY='test-secret';
const origin='https://123.baipon.com',file='baipin-navigation-presets-v1.json';
let now=originalNow(),cloud=null,version=0,reject=false,fail=false,scopes='User.Read Files.ReadWrite.AppFolder',tokenCalls=0,refreshes=0,challenge='',rotate=false,missingEtag=false;
Date.now=()=>now;
const preset=sanitizePreset({localStorage:{navi_weather_cities:JSON.stringify([{name:'东京',country:'日本',latitude:35.68,longitude:139.69,pinned:true}])},cookies:{}});
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
// Long tokens exercise encrypted multi-cookie sessions as returned by Microsoft.
const access='access-'+ 'a'.repeat(2600),refresh='refresh-'+ 'b'.repeat(900);
globalThis.fetch=async(url,options={})=>{
 url=String(url);
 if(url==='https://login.microsoftonline.com/common/oauth2/v2.0/token'){
  tokenCalls++;const body=new URLSearchParams(options.body);assert.equal(body.get('client_secret'),'test-secret');
  if(body.get('grant_type')==='refresh_token'){refreshes++;assert.equal(body.get('refresh_token'),rotate?refresh+'-rotated':refresh);rotate=true;}
  else assert.equal(createHash('sha256').update(body.get('code_verifier')).digest('base64url'),challenge);
  return json({access_token:access,refresh_token:rotate?refresh+'-rotated':refresh,expires_in:3600,scope:scopes});
 }
 assert.ok(url.startsWith('https://graph.microsoft.com/v1.0/me/') || url.startsWith('https://graph.microsoft.com/v1.0/me?')); 
 assert.equal(options.headers.Authorization,'Bearer '+access);
 if(fail)return json({error:{message:'must not expose token '+access}},500);
 if(url.includes('/me?$select='))return json({id:'user-7',displayName:'Test User',mail:'test@example.test',userPrincipalName:'test@example.test'});
 if(options.method==='PUT'){
  assert.ok(url.includes('/special/approot:/'+file+':/content') || url.includes('/items/item-7/content'));
  if(reject)return json({},412);
  if(cloud)assert.equal(options.headers['If-Match'],'"version-'+version+'"');
  else {assert.equal(options.headers['If-None-Match'],'*');assert.ok(url.endsWith('conflictBehavior=fail'));}
  cloud=JSON.parse(options.body);version++;return json({id:'item-7'});
 }
 if(url.endsWith('/special/approot:/'+file))return cloud?json({id:'item-7',eTag:missingEtag?null:'"version-'+version+'"',size:JSON.stringify(cloud).length}):json({},404);
 if(url.endsWith('/items/item-7/content'))return json(cloud);
 throw Error('Unexpected request '+url);
};
async function call(action,{method='GET',cookie='',body,requestOrigin=origin,host='123.baipon.com',params='',contentType='application/json'}={}){
 const headers={},res={statusCode:200,setHeader(k,v){headers[k]=v;},getHeader(k){return headers[k];},status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;},end(){return this;}};
 await handler({url:action==='callback'?'/api/microsoft/callback?'+params.replace(/^&/,''):'/api/sync?provider=microsoft&action='+action+params,method,headers:{host,cookie,origin:requestOrigin,'content-type':contentType},body},res);return {...res,headers};
}
const sessionCookies=result=>result.headers['Set-Cookie'].filter(x=>/^__Host-navi_microsoft\d=/.test(x)).map(x=>x.split(';')[0]).join('; ');
async function login(){
 const result=await call('login');assert.equal(result.statusCode,303);const url=new URL(result.headers.Location);
 assert.equal(url.origin,'https://login.microsoftonline.com');assert.equal(url.pathname,'/common/oauth2/v2.0/authorize');
 assert.equal(url.searchParams.get('redirect_uri'),origin+'/api/microsoft/callback');assert.equal(url.searchParams.get('code_challenge_method'),'S256');
 const requested=url.searchParams.get('scope').split(' ');assert.ok(requested.includes('offline_access'));assert.ok(requested.includes('Files.ReadWrite.AppFolder'));assert.ok(!requested.includes('Files.ReadWrite.All'));
 challenge=url.searchParams.get('code_challenge');return {state:url.searchParams.get('state'),cookie:result.headers['Set-Cookie'][0].split(';')[0]};
}
try{
 assert.equal((await call('status')).body.authenticated,false);
 assert.equal((await call('login',{host:'evil.example'})).statusCode,400);
 assert.equal((await call('pull',{method:'POST'})).statusCode,405);
 const auth=await login();
 let result=await call('callback',{cookie:auth.cookie,params:'&code=test&state=wrong'});assert.match(result.headers.Location,/state-error/);assert.equal(tokenCalls,0);
 result=await call('callback',{cookie:auth.cookie,params:'&error=access_denied&state='+auth.state});assert.match(result.headers.Location,/cancelled/);
 scopes='User.Read';result=await call('callback',{cookie:auth.cookie,params:'&code=test&state='+auth.state});assert.match(result.headers.Location,/permission-error/);
 scopes='User.Read Files.ReadWrite.AppFolder';result=await call('callback',{cookie:auth.cookie,params:'&code=test&state='+auth.state});assert.match(result.headers.Location,/connected&provider=microsoft/);
 let cookie=sessionCookies(result);assert.ok(cookie.length>4000);assert.ok(!cookie.includes(access));
 for(const header of result.headers['Set-Cookie']){assert.match(header,/HttpOnly; Secure; SameSite=Lax/);assert.ok(header.length<3700);}
 result=await call('status',{cookie});assert.equal(result.body.user.id,'user-7');assert.equal(result.body.user.email,'test@example.test');assert.ok(!JSON.stringify(result.body).includes(access));
 result=await call('status',{cookie:cookie.replace(/microsoft0=./,'microsoft0=x')});assert.equal(result.body.authenticated,false);
 result=await call('push',{method:'POST',cookie,requestOrigin:'https://evil.example',body:{preset,revision:null}});assert.equal(result.statusCode,403);
 result=await call('push',{method:'POST',cookie,body:{preset,revision:null},contentType:'text/plain'});assert.equal(result.statusCode,415);
 result=await call('push',{method:'POST',cookie,body:{preset,revision:null}});assert.equal(result.statusCode,200);let revision=result.body.revision;
 result=await call('pull',{cookie});assert.deepEqual(result.body.preset,preset);assert.ok(!('id' in result.body));assert.ok(!('etag' in result.body));
 result=await call('push',{method:'POST',cookie,body:{preset,revision:'stale'}});assert.equal(result.statusCode,409);
 reject=true;result=await call('push',{method:'POST',cookie,body:{preset,revision}});assert.equal(result.statusCode,409);reject=false;
 result=await call('push',{method:'POST',cookie,body:{preset,revision}});assert.equal(result.statusCode,200);revision=result.body.revision;
 result=await call('push',{method:'POST',cookie,body:{preset:{localStorage:{navi_weather_cities:'invalid'}},revision}});assert.equal(result.statusCode,400);
 missingEtag=true;assert.equal((await call('pull',{cookie})).statusCode,400);missingEtag=false;
 fail=true;result=await call('pull',{cookie});assert.equal(result.statusCode,502);assert.ok(!JSON.stringify(result).includes(access));fail=false;
 now+=3601000;result=await call('status',{cookie});assert.equal(result.body.authenticated,true);assert.equal(refreshes,1);cookie=sessionCookies(result);
 for(const header of result.headers['Set-Cookie'].filter(x=>!x.includes('Max-Age=0')))assert.ok(Number(header.match(/Max-Age=(\d+)/)[1])<30*86400);
 now+=3601000;result=await call('status',{cookie});assert.equal(refreshes,2);cookie=sessionCookies(result);
 result=await call('logout',{method:'POST',cookie,body:{}});assert.equal(result.headers['Set-Cookie'].filter(x=>x.includes('Max-Age=0')).length,4);
 now+=31*86400000;assert.equal((await call('pull',{cookie})).statusCode,401);
 delete process.env.MICROSOFT_KEY;assert.equal((await call('status')).body.configured,false);
 console.log('PASS: Microsoft PKCE/state, least-privilege scopes, chunked encrypted sessions, CSRF, app-folder read/write, pin roundtrip, eTag conflicts, rotated refresh tokens, expiry, logout and missing configuration.');
}finally{
 globalThis.fetch=originalFetch;Date.now=originalNow;
 for(const [key,value]of Object.entries(previous)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
}

