import {createCipheriv,createDecipheriv,createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {sanitizePreset,MAX_PRESET_BYTES} from '../js/preset-schema.js';

const SESSION='__Host-navi_github', STATE='__Host-navi_github_oauth';
const API='https://api.github.com', FILE='baipin-navigation-presets-v1.json';
const DESCRIPTION='Baipin Navigation preset sync (v1)';
const settings=()=>({client:process.env.GITHUB_CLIENT_ID,secret:process.env.GITHUB_KEY,redirect:process.env.GITHUB_REDIRECT_URI || 'https://123.baipon.com/api/github?action=callback'});
class AuthError extends Error { constructor(status,message) {super(message);this.status=status;} }
function avatarUrl(value) {try {const url=new URL(value);return url.protocol==='https:' && url.hostname==='avatars.githubusercontent.com' && url.href.length<1024?url.href:null;}catch{return null;}}
function seal(value) {
    const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',createHash('sha256').update(settings().secret).digest(),iv);
    return Buffer.concat([iv,cipher.update(JSON.stringify(value)),cipher.final(),cipher.getAuthTag()]).toString('base64url');
}
function unseal(value) {
    try {
        const bytes=Buffer.from(value,'base64url'),decipher=createDecipheriv('aes-256-gcm',createHash('sha256').update(settings().secret).digest(),bytes.subarray(0,12));
        decipher.setAuthTag(bytes.subarray(-16));
        const data=JSON.parse(Buffer.concat([decipher.update(bytes.subarray(12,-16)),decipher.final()]).toString());
        return data.expires>Date.now()?data:null;
    } catch {return null;}
}
function readCookie(req,name) { return (req.headers.cookie || '').split(';').map(part=>part.trim()).find(part=>part.startsWith(name+'='))?.slice(name.length+1) || ''; }
function setCookie(res,name,value,age) {
    const previous=res.getHeader('Set-Cookie') || [];
    res.setHeader('Set-Cookie',[...(Array.isArray(previous)?previous:[previous]),`${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`]);
}
const redirect=(res,result)=>{res.statusCode=303;res.setHeader('Location','/?sync='+result+'&provider=github');return res.end();};
const fetchTimed=(url,options={})=>fetch(url,{...options,signal:AbortSignal.timeout(12000)});
async function exchange(values) {
    const config=settings();
    const response=await fetchTimed('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...values,client_id:config.client,client_secret:config.secret})});
    if(!response.ok) throw new AuthError(502,'GitHub 登录服务暂时不可用');
    const token=await response.json();
    if(!token.access_token || token.error) throw new AuthError(401,'GitHub 授权已失效，请重新登录');
    return token;
}
async function api(token,path,options={}) {
    const response=await fetchTimed(API+path,{...options,headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'BaipinNavigation',...options.headers}});
    if(response.status===401) throw new AuthError(401,'GitHub 授权已失效，请重新登录');
    if(response.status===403 || response.status===429) throw new AuthError(response.headers.get('x-ratelimit-remaining')==='0'?429:403,'GitHub 权限不足或请求过于频繁，请稍后重试或重新授权 gist');
    if(response.status===404) throw new AuthError(409,'GitHub 预设已被移除，请重新同步');
    if(response.status===412) throw new AuthError(409,'另一台设备刚刚更新了预设，请重新同步');
    if(!response.ok) throw new AuthError(502,'GitHub Gist 暂时不可用，请稍后重试');
    return response;
}
async function session(req,res) {
    const data=unseal(readCookie(req,SESSION));
    if(!data) throw new AuthError(401,'请先使用 GitHub 登录');
    if(data.accessExpires && data.accessExpires<Date.now()+60000) {
        if(!data.refreshToken) throw new AuthError(401,'GitHub 授权已失效，请重新登录');
        const token=await exchange({grant_type:'refresh_token',refresh_token:data.refreshToken});
        data.accessToken=token.access_token;data.refreshToken=token.refresh_token || data.refreshToken;
        data.accessExpires=token.expires_in?Date.now()+Number(token.expires_in)*1000:null;
        setCookie(res,SESSION,seal(data),Math.max(0,Math.floor((data.expires-Date.now())/1000)));
    }
    return data;
}
async function readCloud(data) {
    let found=null;
    for(let page=1;page<=10;page++) {
        const rows=await (await api(data.accessToken,`/gists?per_page=100&page=${page}`)).json();
        if(!Array.isArray(rows)) throw new AuthError(502,'GitHub Gist 返回格式不正确');
        found=rows.find(gist=>gist.public===false && String(gist.owner?.id)===data.user.id && gist.description===DESCRIPTION && gist.files?.[FILE]);
        if(found || rows.length<100) break;
        if(page===10) throw new AuthError(503,'Gist 数量过多，暂时无法定位本站预设');
    }
    if(!found) return {exists:false,revision:null};
    if(!/^[a-f0-9]+$/i.test(found.id)) throw new AuthError(502,'Gist 标识不正确');
    const response=await api(data.accessToken,'/gists/'+found.id),gist=await response.json();
    if(gist.public!==false || String(gist.owner?.id)!==data.user.id) throw new AuthError(409,'预设 Gist 的所有者或可见性已改变，请检查后重试');
    const file=gist.files?.[FILE];
    if(!file || file.truncated || typeof file.content!=='string' || Buffer.byteLength(file.content)>MAX_PRESET_BYTES+4096) throw new AuthError(400,'GitHub 预设文件不完整或过大');
    const payload=JSON.parse(file.content);
    if(typeof payload.revision!=='string' || !Number.isFinite(Date.parse(payload.updatedAt))) throw new AuthError(400,'GitHub 预设版本格式不正确');
    return {exists:true,id:gist.id,etag:response.headers.get('etag'),revision:payload.revision,updatedAt:payload.updatedAt,preset:sanitizePreset(payload.preset),storageUrl:'https://gist.github.com/'+gist.id};
}
async function writeCloud(data,body) {
    const preset=sanitizePreset(body.preset),current=await readCloud(data);
    if((body.revision ?? null)!==current.revision) throw new AuthError(409,'云端预设已改变，请先重新同步');
    const payload={revision:randomBytes(18).toString('base64url'),updatedAt:new Date().toISOString(),preset};
    const headers={'Content-Type':'application/json'};
    if(current.etag && !current.etag.startsWith('W/')) headers['If-Match']=current.etag;
    const response=await api(data.accessToken,current.exists?'/gists/'+current.id:'/gists',{method:current.exists?'PATCH':'POST',headers,body:JSON.stringify({...(current.exists?{}:{description:DESCRIPTION,public:false}),files:{[FILE]:{content:JSON.stringify(payload)}}})});
    const gist=await response.json();
    if(gist.public!==false || String(gist.owner?.id)!==data.user.id) throw new AuthError(502,'Gist 保存结果无法确认，请检查 GitHub');
    return {revision:payload.revision,updatedAt:payload.updatedAt};
}
export default async function handler(req,res) {
    res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('Referrer-Policy','no-referrer');
    const url=new URL(req.url,'https://localhost'),action=url.searchParams.get('action') || 'status';
    const config=settings(),origin=new URL(config.redirect).origin;
    try {
        const post=['push','logout'].includes(action);
        if(req.method!==(post?'POST':'GET')) {res.setHeader('Allow',post?'POST':'GET');throw new AuthError(405,'请求方法不支持');}
        if(post && req.headers.origin!==origin) throw new AuthError(403,'请求来源不正确');
        if(action==='logout') {setCookie(res,SESSION,'',0);return res.status(200).json({ok:true});}
        if(!config.client || !config.secret) {
            if(action==='status') return res.status(200).json({configured:false,authenticated:false,provider:'github',redirectUri:config.redirect});
            throw new AuthError(503,'服务器未配置 GITHUB_CLIENT_ID 和 GITHUB_KEY');
        }
        if(action==='login') {
            if(req.headers.host!==new URL(origin).host) throw new AuthError(400,'请在正式网站登录同步');
            const state=randomBytes(24).toString('base64url'),verifier=randomBytes(48).toString('base64url');
            setCookie(res,STATE,seal({state,verifier,expires:Date.now()+600000}),600);
            const query=new URLSearchParams({client_id:config.client,redirect_uri:config.redirect,scope:'gist',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256',prompt:'select_account'});
            res.statusCode=303;res.setHeader('Location','https://github.com/login/oauth/authorize?'+query);return res.end();
        }
        if(action==='callback') {
            const saved=unseal(readCookie(req,STATE)),state=url.searchParams.get('state') || '';setCookie(res,STATE,'',0);
            if(!saved || Buffer.byteLength(saved.state)!==Buffer.byteLength(state) || !timingSafeEqual(Buffer.from(saved.state),Buffer.from(state))) return redirect(res,'state-error');
            if(url.searchParams.has('error')) return redirect(res,'cancelled');
            if(!url.searchParams.get('code')) return redirect(res,'login-error');
            const token=await exchange({code:url.searchParams.get('code'),redirect_uri:config.redirect,code_verifier:saved.verifier});
            if(!String(token.scope || '').split(/[ ,]+/).includes('gist')) return redirect(res,'permission-error');
            const info=await (await api(token.access_token,'/user')).json();
            if(!Number.isSafeInteger(info.id) || !/^[a-z0-9-]{1,39}$/i.test(info.login)) return redirect(res,'login-error');
            const value=seal({user:{id:String(info.id),login:info.login,name:String(info.name || info.login).slice(0,120),avatar:avatarUrl(info.avatar_url)},accessToken:token.access_token,refreshToken:token.refresh_token || null,accessExpires:token.expires_in?Date.now()+Number(token.expires_in)*1000:null,expires:Date.now()+30*86400000});
            if(value.length>3800) return redirect(res,'login-error');
            setCookie(res,SESSION,value,30*86400);return redirect(res,'connected');
        }
        if(!['status','pull','push'].includes(action)) throw new AuthError(404,'接口不存在');
        let data;
        try {data=await session(req,res);} catch(error) {
            if(action==='status' && error.status===401) {setCookie(res,SESSION,'',0);return res.status(200).json({configured:true,authenticated:false,provider:'github',redirectUri:config.redirect});}
            throw error;
        }
        if(action==='status') {
            if(!Object.prototype.hasOwnProperty.call(data.user,'avatar')) {
                data.user.avatar=null;
                try {const info=await (await api(data.accessToken,'/user')).json();data.user.avatar=avatarUrl(info.avatar_url);}catch{}
                const value=seal(data);if(value.length<=3800)setCookie(res,SESSION,value,Math.max(0,Math.floor((data.expires-Date.now())/1000)));
            }
            return res.status(200).json({configured:true,authenticated:true,provider:'github',user:data.user,redirectUri:config.redirect});
        }
        if(action==='pull') {const cloud=await readCloud(data);delete cloud.id;delete cloud.etag;return res.status(200).json(cloud);}
        if(!String(req.headers['content-type'] || '').startsWith('application/json')) throw new AuthError(415,'请使用 JSON 请求');
        const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body || {});
        if(Buffer.byteLength(raw)>MAX_PRESET_BYTES+4096) throw new AuthError(413,'预设文件过大');
        let body;try {body=JSON.parse(raw);sanitizePreset(body.preset);} catch {throw new AuthError(400,'预设格式不正确或文件过大');}
        return res.status(200).json(await writeCloud(data,body));
    } catch(error) {
        if(action==='callback') return redirect(res,'login-error');
        return res.status(error.status || 502).json({error:error instanceof AuthError?error.message:'GitHub 同步暂时不可用，请稍后重试'});
    }
}
