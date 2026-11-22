import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const {default:handler}=await import('../api/github.js');
const {sanitizePreset}=await import('../js/preset-schema.js');
const oldFetch=globalThis.fetch,oldNow=Date.now;
const oldId=process.env.GITHUB_CLIENT_ID,oldKey=process.env.GITHUB_KEY;
process.env.GITHUB_CLIENT_ID='local-test-client';process.env.GITHUB_KEY='local-test-only-secret';
const origin='https://123.baipon.com';
let now=oldNow(),cloud=null,version=0,reject=false,scopes='gist',tokenCalls=0,refreshes=0,expectedChallenge='',extraFile=false,deletedGists=0,removedPresetFiles=0;
Date.now=()=>now;
const preset=sanitizePreset({localStorage:{navi_city_stocks:JSON.stringify({ids:['aapl'],symbols:['MSFT']}),navi_city_feed:JSON.stringify({rss:['a'],speed:72}),navi_camera_background:JSON.stringify({source:'traffic',id:'H429F',refresh:false})},cookies:{}});
const json=(data,headers={})=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json',...headers}});
const gist=()=>({id:'abc123',public:false,owner:{id:7},description:'Baipin Navigation preset sync (v1)',files:{...(extraFile?{'personal.txt':{content:'keep me'}}:{}),'baipin-navigation-presets-v1.json':{content:JSON.stringify(cloud),truncated:false}}});
globalThis.fetch=async(url,options={})=>{
    url=String(url);
    if(url==='https://github.com/login/oauth/access_token') {
        tokenCalls++;const body=new URLSearchParams(options.body);
        if(body.get('grant_type')==='refresh_token') refreshes++;
        else assert.equal(createHash('sha256').update(body.get('code_verifier')).digest('base64url'),expectedChallenge);
        return json({access_token:'fake-github-access',refresh_token:'fake-refresh',expires_in:3600,scope:scopes});
    }
    assert.ok(url.startsWith('https://api.github.com/'));
    assert.equal(options.headers.Authorization,'Bearer fake-github-access');
    if(url.endsWith('/user')) return json({id:7,login:'test-user',name:'测试用户',email:'not-stored@example.test',avatar_url:'https://avatars.githubusercontent.com/u/7?v=4'});
    if(url.includes('/gists?')) return json(cloud?[gist()]:[]);
    if(options.method==='DELETE'){assert.equal(extraFile,false,'must preserve unrelated Gist files');assert.equal(options.headers['If-Match'],'"gist-'+version+'"');if(reject)return new Response('',{status:412});deletedGists++;cloud=null;return new Response(null,{status:204});}
    if(options.method==='POST' || options.method==='PATCH') {
        if(reject) return new Response('',{status:412});
        const body=JSON.parse(options.body);
        if(options.method==='POST') assert.equal(body.public,false);
        else assert.equal(options.headers['If-Match'],'"gist-'+version+'"');
        if(body.files['baipin-navigation-presets-v1.json']===null){assert.equal(extraFile,true,'GitHub rejects deletion of the only Gist file');removedPresetFiles++;cloud=null;return json({id:'abc123',files:{'unrelated.txt':{content:'keep'}}});}
        cloud=JSON.parse(body.files['baipin-navigation-presets-v1.json'].content);version++;
        return json(gist());
    }
    if(url.endsWith('/gists/abc123')) return json(gist(),{etag:'"gist-'+version+'"'});
    throw new Error('Unexpected mock URL');
};
async function call(action,{method='GET',cookie='',body,requestOrigin=origin,host='123.baipon.com',params=''}={}) {
    const headers={};const res={statusCode:200,setHeader(k,v){headers[k]=v;},getHeader(k){return headers[k];},status(code){this.statusCode=code;return this;},json(value){this.body=value;return this;},end(){return this;}};
    await handler({url:'/api/github?action='+action+params,method,headers:{host,cookie,origin:requestOrigin,'content-type':'application/json'},body},res);
    return {...res,headers};
}
async function login() {
    const result=await call('login');assert.equal(result.statusCode,303);
    const url=new URL(result.headers.Location);assert.equal(url.origin,'https://github.com');
    assert.equal(url.searchParams.get('scope'),'gist');assert.equal(url.searchParams.get('code_challenge_method'),'S256');
    assert.equal(url.searchParams.get('redirect_uri'),origin+'/api/github?action=callback');
    expectedChallenge=url.searchParams.get('code_challenge');
    return {state:url.searchParams.get('state'),cookie:result.headers['Set-Cookie'][0].split(';')[0]};
}
try {
    let result=await call('status');assert.equal(result.body.authenticated,false);
    result=await call('login',{host:'evil.example'});assert.equal(result.statusCode,400);
    const auth=await login();
    result=await call('callback',{cookie:auth.cookie,params:'&code=one&state=wrong'});assert.equal(tokenCalls,0);assert.match(result.headers.Location,/state-error/);
    result=await call('callback',{cookie:auth.cookie,params:'&error=access_denied&state='+auth.state});assert.match(result.headers.Location,/cancelled/);
    scopes='';result=await call('callback',{cookie:auth.cookie,params:'&code=one&state='+auth.state});assert.match(result.headers.Location,/permission-error/);
    scopes='gist';result=await call('callback',{cookie:auth.cookie,params:'&code=two&state='+auth.state});assert.match(result.headers.Location,/connected&provider=github/);
    const header=result.headers['Set-Cookie'].find(item=>item.startsWith('__Host-navi_github='));assert.match(header,/HttpOnly; Secure; SameSite=Lax/);assert.ok(!header.includes('fake-github-access'));
    let cookie=header.split(';')[0];
    result=await call('status',{cookie});assert.equal(result.body.user.login,'test-user');assert.equal(result.body.user.avatar,'https://avatars.githubusercontent.com/u/7?v=4');assert.ok(!('email' in result.body.user));assert.ok(!JSON.stringify(result.body).includes('fake-github-access'));
    result=await call('push',{method:'POST',cookie,body:{preset,revision:null},requestOrigin:'https://evil.example'});assert.equal(result.statusCode,403);
    result=await call('push',{method:'POST',cookie,body:{preset,revision:null}});assert.equal(result.statusCode,200);const revision=result.body.revision;
    result=await call('pull',{cookie});assert.deepEqual(result.body.preset,preset);assert.equal(result.body.storageUrl,'https://gist.github.com/abc123');assert.ok(!('etag' in result.body));
    result=await call('push',{method:'POST',cookie,body:{preset,revision:'stale'}});assert.equal(result.statusCode,409);
    reject=true;result=await call('push',{method:'POST',cookie,body:{preset,revision}});assert.equal(result.statusCode,409);reject=false;
    result=await call('push',{method:'POST',cookie,body:{preset,revision}});assert.equal(result.statusCode,200);assert.notEqual(result.body.revision,revision);
    result=await call('push',{method:'POST',cookie,body:{preset:{localStorage:{navi_city_feed:'bad'}},revision}});assert.equal(result.statusCode,400);
    result=await call('pull',{cookie:cookie.slice(0,-4)+'xxxx'});assert.equal(result.statusCode,401);
    now+=3601000;result=await call('status',{cookie});assert.equal(result.body.authenticated,true);assert.equal(refreshes,1);cookie=result.headers['Set-Cookie'][0].split(';')[0];
    const toDelete=await call('pull',{cookie});
    assert.equal((await call('clear',{cookie})).statusCode,405);
    assert.equal((await call('clear',{method:'POST',cookie,body:{confirm:true,revision:toDelete.body.revision},requestOrigin:'https://evil.test'})).statusCode,403);
    assert.equal((await call('clear',{method:'POST',cookie,body:{confirm:false,revision:toDelete.body.revision}})).statusCode,400);
    assert.equal((await call('clear',{method:'POST',cookie,body:{confirm:true,revision:'stale'}})).statusCode,409);assert.ok(cloud);
    assert.equal((await call('clear',{method:'POST',cookie,body:{confirm:true,revision:toDelete.body.revision}})).statusCode,200);assert.equal(cloud,null);
    assert.equal((await call('clear',{method:'POST',cookie,body:{confirm:true,revision:null}})).statusCode,200);
    assert.equal(deletedGists,1);assert.equal(removedPresetFiles,0);
    extraFile=true;
    await call('push',{method:'POST',cookie,body:{preset,revision:null}});
    const mixed=await call('pull',{cookie});
    assert.equal((await call('clear',{method:'POST',cookie,body:{confirm:true,revision:mixed.body.revision}})).statusCode,200);
    assert.equal(deletedGists,1);assert.equal(removedPresetFiles,1);extraFile=false;

    result=await call('logout',{method:'POST',cookie,body:{}});assert.match(result.headers['Set-Cookie'][0],/Max-Age=0/);
    now+=31*86400000;result=await call('pull',{cookie});assert.equal(result.statusCode,401);
    delete process.env.GITHUB_KEY;result=await call('status');assert.equal(result.body.configured,false);
    console.log('PASS: GitHub OAuth scope/state/PKCE, minimal identity, encrypted isolated session, CSRF, secret Gist create/read/update, revision conflicts, invalid payload, refresh, expiry, logout and missing config.');
} finally {
    globalThis.fetch=oldFetch;Date.now=oldNow;
    for(const [key,value] of [['GITHUB_CLIENT_ID',oldId],['GITHUB_KEY',oldKey]]) {if(value===undefined) delete process.env[key];else process.env[key]=value;}
}
