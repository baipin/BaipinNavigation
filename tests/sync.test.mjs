import assert from 'node:assert/strict';
const {default:handler} = await import('../api/sync.js');
const {sanitizePreset,PRESET_KEYS} = await import('../js/preset-schema.js');
const originalFetch = globalThis.fetch, originalTime = Date.now;
const savedSecret = process.env.GOOGLE_KEY;
process.env.GOOGLE_KEY = 'local-test-only-not-a-production-secret';
const origin='https://123.baipon.com';
let now=originalTime(), cloud=null, generation=0, rejectWrite=false, refreshes=0, tokenCalls=0;
Date.now=()=>now;
const preset=sanitizePreset({localStorage:{bp_v7:JSON.stringify([{name:'测试',url:'https://example.com',icon:'link'}]),navi_city_stocks:JSON.stringify({ids:['aapl'],symbols:['MSFT']}),navi_city_feed:JSON.stringify({speed:72,rss:['source']}),navi_language:'tc',hko_rain_area:'沙田',navi_aqhi_station:'Sha Tin'},cookies:{homepage_bg:'https://example.com/photo.jpg',unrelated:'private'}});
const json=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
globalThis.fetch=async (url,options={})=> {
    url=String(url);
    if (url==='https://oauth2.googleapis.com/token') {
        tokenCalls++;
        if (new URLSearchParams(options.body).get('grant_type')==='refresh_token') refreshes++;
        return json({access_token:'test-access',refresh_token:'test-refresh',expires_in:3600,scope:'openid email profile https://www.googleapis.com/auth/drive.appdata'});
    }
    if (url.includes('userinfo')) return json({sub:'account-test',name:'测试账号',email:'test@example.test'});
    if (url.includes('/upload/drive/v3/files')) {
        if (rejectWrite) return new Response('',{status:412});
        if (options.method==='PATCH') {
            assert.equal(options.headers['If-Match'],'"etag-'+generation+'"');
            cloud=JSON.parse(options.body);
        } else {
            const match=options.body.match(/Content-Type: application\/json\r\n\r\n([\s\S]+)\r\n--navi_/);
            assert.ok(match); cloud=JSON.parse(match[1]);
        }
        generation++; return json({id:'test-file'});
    }
    if (url.includes('alt=media')) return json(cloud);
    if (url.includes('/files/test-file?')) return new Response(JSON.stringify({id:'test-file',version:String(generation)}),{headers:{etag:'"etag-'+generation+'"'}});
    if (url.includes('/drive/v3/files?')) return json({files:cloud?[{id:'test-file',modifiedTime:cloud.updatedAt}]:[]});
    throw new Error('Unexpected test URL');
};
async function call(action,{method='GET',cookie='',body,requestOrigin=origin,host='123.baipon.com',params=''}={}) {
    const headers={};
    const res={statusCode:200,setHeader(k,v){headers[k]=v;},getHeader(k){return headers[k];},status(code){this.statusCode=code;return this;},json(value){this.body=value;return this;},end(){return this;}};
    await handler({url:'/api/sync?action='+action+params,method,headers:{host,cookie,origin:requestOrigin,'content-type':'application/json'},body},res);
    return {...res,headers};
}
try {
    assert.equal(Object.keys(preset.localStorage).length,PRESET_KEYS.length);
    assert.ok(!('unrelated' in preset.cookies));
    assert.throws(()=>sanitizePreset({localStorage:{bp_v7:'[{}]'}}));
    let result=await call('status'); assert.equal(result.body.authenticated,false);
    result=await call('login');
    assert.equal(result.statusCode,303);
    const loginUrl=new URL(result.headers.Location);
    assert.equal(loginUrl.searchParams.get('redirect_uri'),origin+'/api/sync?action=callback');
    assert.equal(loginUrl.searchParams.get('code_challenge_method'),'S256');
    const state=loginUrl.searchParams.get('state');
    const stateCookie=result.headers['Set-Cookie'][0].split(';')[0];
    result=await call('callback',{cookie:stateCookie,params:'&code=test-code&state=wrong'});
    assert.equal(tokenCalls,0); assert.equal(result.headers.Location,'/?sync=state-error');
    result=await call('callback',{cookie:stateCookie,params:'&code=test-code&state='+state});
    assert.equal(result.headers.Location,'/?sync=connected');
    const sessionHeader=result.headers['Set-Cookie'].find(value=>value.startsWith('__Host-navi_sync='));
    assert.match(sessionHeader,/HttpOnly; Secure; SameSite=Lax/);
    assert.ok(!sessionHeader.includes('test-refresh')); assert.ok(!sessionHeader.includes('test-access'));
    let cookie=sessionHeader.split(';')[0];
    result=await call('status',{cookie}); assert.equal(result.body.user.id,'account-test');
    assert.ok(!JSON.stringify(result.body).includes('test-access'));
    result=await call('push',{cookie,method:'POST',body:{preset,revision:null},requestOrigin:'https://evil.example'}); assert.equal(result.statusCode,403);
    result=await call('push',{cookie,method:'POST',body:{preset,revision:null}}); assert.equal(result.statusCode,200);
    const firstRevision=result.body.revision;
    result=await call('pull',{cookie}); assert.deepEqual(result.body.preset,preset); assert.equal(result.body.revision,firstRevision);
    const changed=structuredClone(preset); changed.localStorage.theme_mode='dark';
    result=await call('push',{cookie,method:'POST',body:{preset:changed,revision:'stale'}}); assert.equal(result.statusCode,409); assert.equal(cloud.preset.localStorage.theme_mode,null);
    rejectWrite=true;
    result=await call('push',{cookie,method:'POST',body:{preset:changed,revision:firstRevision}}); assert.equal(result.statusCode,409);
    rejectWrite=false;
    result=await call('push',{cookie,method:'POST',body:{preset:changed,revision:firstRevision}}); assert.equal(result.statusCode,200); assert.equal(cloud.preset.localStorage.theme_mode,'dark');
    result=await call('push',{cookie,method:'POST',body:{preset:{localStorage:{bp_v7:'invalid'}}}}); assert.equal(result.statusCode,400);
    result=await call('pull',{cookie:cookie.slice(0,-4)+'xxxx'}); assert.equal(result.statusCode,401);
    now+=3601000;
    result=await call('status',{cookie}); assert.equal(result.body.authenticated,true); assert.equal(refreshes,1);
    cookie=result.headers['Set-Cookie'][0].split(';')[0];
    result=await call('logout',{cookie,method:'POST',body:{}}); assert.match(result.headers['Set-Cookie'][0],/Max-Age=0/);
    now+=31*86400000;
    result=await call('pull',{cookie}); assert.equal(result.statusCode,401);
    delete process.env.GOOGLE_KEY;
    result=await call('status'); assert.equal(result.body.configured,false);
    console.log('PASS: preset allowlist and full configuration round trip; OAuth state/PKCE; encrypted HttpOnly session; CSRF; create/read/update; stale/racing revisions; validation; refresh, expiry and logout; missing configuration.');
} finally {
    globalThis.fetch=originalFetch; Date.now=originalTime;
    if (savedSecret===undefined) delete process.env.GOOGLE_KEY; else process.env.GOOGLE_KEY=savedSecret;
}
