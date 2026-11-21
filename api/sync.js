import {createCipheriv,createDecipheriv,createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {sanitizePreset,MAX_PRESET_BYTES} from '../js/preset-schema.js';

const CLIENT_ID = '45895190034-b8fmc06uivoc2m8e9paf6ts04mlcm5tj.apps.googleusercontent.com';
const REDIRECT = 'https://123.baipon.com/api/sync?action=callback';
const SESSION = '__Host-navi_sync', STATE = '__Host-navi_oauth';
const DRIVE = 'https://www.googleapis.com/drive/v3/files';
const FILE_NAME = 'baipin-navigation-presets-v1.json';
const SCOPE = 'openid email profile https://www.googleapis.com/auth/drive.appdata';
class SyncError extends Error {
    constructor(status,message) { super(message); this.status = status; }
}
const config = () => ({client:process.env.GOOGLE_CLIENT_ID || CLIENT_ID,redirect:process.env.GOOGLE_REDIRECT_URI || REDIRECT});
function seal(data) {
    const iv = randomBytes(12), key = createHash('sha256').update(process.env.GOOGLE_KEY).digest();
    const cipher = createCipheriv('aes-256-gcm',key,iv);
    return Buffer.concat([iv,cipher.update(JSON.stringify(data)),cipher.final(),cipher.getAuthTag()]).toString('base64url');
}
function unseal(value) {
    try {
        const bytes = Buffer.from(value,'base64url');
        const decipher = createDecipheriv('aes-256-gcm',createHash('sha256').update(process.env.GOOGLE_KEY).digest(),bytes.subarray(0,12));
        decipher.setAuthTag(bytes.subarray(-16));
        const data = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(12,-16)),decipher.final()]).toString());
        return data.expires > Date.now() ? data : null;
    } catch { return null; }
}
function cookies(req) {
    return Object.fromEntries((req.headers.cookie || '').split(';').map(part=>part.trim().split(/=(.*)/s)).filter(parts=>parts[0]));
}
function cookie(res,name,value,age) {
    const previous = res.getHeader('Set-Cookie') || [];
    res.setHeader('Set-Cookie',[...(Array.isArray(previous)?previous:[previous]),`${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`]);
}
const redirect = (res,url) => { res.statusCode = 303; res.setHeader('Location',url); return res.end(); };
async function google(url,options={}) {
    return fetch(url,{...options,signal:AbortSignal.timeout(12000)});
}
async function token(values) {
    const settings = config();
    const response = await google('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...values,client_id:settings.client,client_secret:process.env.GOOGLE_KEY})});
    if (!response.ok) throw new SyncError(401,'Google 授权已失效，请重新登录');
    return response.json();
}
async function session(req,res) {
    const data = unseal(cookies(req)[SESSION] || '');
    if (!data) throw new SyncError(401,'请先使用 Google 登录');
    if (data.accessExpires < Date.now()+60000) {
        const renewed = await token({grant_type:'refresh_token',refresh_token:data.refreshToken});
        data.accessToken = renewed.access_token;
        data.accessExpires = Date.now()+Number(renewed.expires_in || 3600)*1000;
        cookie(res,SESSION,seal(data),Math.max(0,Math.floor((data.expires-Date.now())/1000)));
    }
    return data;
}
async function drive(data,url,options={}) {
    const response = await google(url,{...options,headers:{Authorization:`Bearer ${data.accessToken}`,...options.headers}});
    if (response.status === 401) throw new SyncError(401,'Google 授权已失效，请重新登录');
    if (response.status === 403) throw new SyncError(403,'无法访问应用预设空间，请启用 Google Drive API 并重新授权');
    if (response.status === 412) throw new SyncError(409,'另一台设备刚刚更新了预设，请重新同步');
    if (!response.ok) throw new SyncError(502,'Google Drive 暂时不可用，请稍后重试');
    return response;
}
async function readCloud(data) {
    const query = new URLSearchParams({spaces:'appDataFolder',q:`name = '${FILE_NAME}' and trashed = false`,fields:'files(id,modifiedTime)',orderBy:'modifiedTime desc',pageSize:'100'});
    const listing = await (await drive(data,`${DRIVE}?${query}`)).json();
    const file = listing.files?.[0];
    if (!file) return {exists:false,revision:null};
    const metadata = await drive(data,`${DRIVE}/${encodeURIComponent(file.id)}?fields=id,version,modifiedTime`);
    const etag = metadata.headers.get('etag');
    const payload = await (await drive(data,`${DRIVE}/${encodeURIComponent(file.id)}?alt=media`)).json();
    return {exists:true,id:file.id,etag,revision:payload.revision,updatedAt:payload.updatedAt,preset:sanitizePreset(payload.preset)};
}
async function writeCloud(data,body) {
    const preset = sanitizePreset(body.preset);
    const current = await readCloud(data);
    if ((body.revision ?? null) !== current.revision) throw new SyncError(409,'云端预设已改变，请先重新同步');
    const payload = {revision:randomBytes(18).toString('base64url'),updatedAt:new Date().toISOString(),preset};
    if (current.exists) {
        // A conditional update also catches writes racing the revision check above.
        if (!current.etag) throw new SyncError(502,'云端未返回版本校验信息，请稍后重试');
        await drive(data,`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(current.id)}?uploadType=media`,{method:'PATCH',headers:{'Content-Type':'application/json','If-Match':current.etag},body:JSON.stringify(payload)});
    } else {
        const boundary = 'navi_'+randomBytes(12).toString('hex');
        const content = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({name:FILE_NAME,parents:['appDataFolder']})}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(payload)}\r\n--${boundary}--`;
        await drive(data,'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',{method:'POST',headers:{'Content-Type':`multipart/related; boundary=${boundary}`},body:content});
    }
    return {revision:payload.revision,updatedAt:payload.updatedAt};
}
export default async function handler(req,res) {
    res.setHeader('Cache-Control','no-store, max-age=0');
    res.setHeader('Referrer-Policy','no-referrer');
    const url = new URL(req.url,'https://localhost');
    const action = url.searchParams.get('action') || 'status';
    const settings = config(), origin = new URL(settings.redirect).origin;
    try {
        if (!process.env.GOOGLE_KEY) {
            if (action === 'status') return res.status(200).json({configured:false,authenticated:false,redirectUri:settings.redirect});
            throw new SyncError(503,'服务器未配置 GOOGLE_KEY');
        }
        const post = ['push','logout'].includes(action);
        if (req.method !== (post?'POST':'GET')) { res.setHeader('Allow',post?'POST':'GET'); throw new SyncError(405,'请求方法不支持'); }
        if (post && req.headers.origin !== origin) throw new SyncError(403,'请求来源不正确');
        if (action === 'login') {
            if (req.headers.host !== new URL(origin).host) throw new SyncError(400,'请在正式网站登录同步');
            const state = randomBytes(24).toString('base64url'), verifier = randomBytes(48).toString('base64url');
            cookie(res,STATE,seal({state,verifier,expires:Date.now()+600000}),600);
            const params = new URLSearchParams({client_id:settings.client,redirect_uri:settings.redirect,response_type:'code',scope:SCOPE,access_type:'offline',prompt:'consent select_account',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'});
            return redirect(res,'https://accounts.google.com/o/oauth2/v2/auth?'+params);
        }
        if (action === 'callback') {
            const saved = unseal(cookies(req)[STATE] || '');
            cookie(res,STATE,'',0);
            const supplied = url.searchParams.get('state') || '';
            if (!saved || Buffer.byteLength(saved.state) !== Buffer.byteLength(supplied) || !timingSafeEqual(Buffer.from(saved.state),Buffer.from(supplied))) return redirect(res,'/?sync=state-error');
            if (url.searchParams.has('error')) return redirect(res,'/?sync=cancelled');
            if (!url.searchParams.get('code')) return redirect(res,'/?sync=login-error');
            const result = await token({grant_type:'authorization_code',code:url.searchParams.get('code'),redirect_uri:settings.redirect,code_verifier:saved.verifier});
            if (!result.refresh_token || !String(result.scope || '').split(' ').includes('https://www.googleapis.com/auth/drive.appdata')) return redirect(res,'/?sync=permission-error');
            const response = await google('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:`Bearer ${result.access_token}`}});
            if (!response.ok) return redirect(res,'/?sync=login-error');
            const info = await response.json();
            const value = seal({user:{id:info.sub,name:info.name || info.email,email:info.email},accessToken:result.access_token,refreshToken:result.refresh_token,accessExpires:Date.now()+Number(result.expires_in || 3600)*1000,expires:Date.now()+30*86400000});
            if (value.length > 3800) return redirect(res,'/?sync=login-error');
            cookie(res,SESSION,value,30*86400);
            return redirect(res,'/?sync=connected');
        }
        if (action === 'logout') { cookie(res,SESSION,'',0); return res.status(200).json({ok:true}); }
        if (!['status','pull','push'].includes(action)) throw new SyncError(404,'接口不存在');
        let data;
        try { data = await session(req,res); }
        catch (error) {
            if (action === 'status' && error.status === 401) { cookie(res,SESSION,'',0); return res.status(200).json({configured:true,authenticated:false,redirectUri:settings.redirect}); }
            throw error;
        }
        if (action === 'status') return res.status(200).json({configured:true,authenticated:true,user:data.user,redirectUri:settings.redirect});
        if (action === 'pull') {
            const cloud = await readCloud(data);
            delete cloud.id; delete cloud.etag;
            return res.status(200).json(cloud);
        }
        if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw new SyncError(415,'请使用 JSON 请求');
        const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
        if (Buffer.byteLength(raw) > MAX_PRESET_BYTES+4096) throw new SyncError(413,'预设文件过大');
        let body;
        try { body = JSON.parse(raw); sanitizePreset(body.preset); } catch { throw new SyncError(400,'预设格式不正确或文件过大'); }
        return res.status(200).json(await writeCloud(data,body));
    } catch (error) {
        // Never include OAuth tokens, the client secret or Google's raw errors in responses/logs.
        if (action === 'callback') return redirect(res,'/?sync=login-error');
        return res.status(error.status || 502).json({error:error instanceof SyncError ? error.message : '同步服务暂时不可用，请稍后重试'});
    }
}
