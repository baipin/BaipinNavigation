import siteContent from '../server/site-content.js';
import feishuHandler from '../server/feishu-calendar.js';
import canvasHandler from '../server/canvas-calendar.js';
import icloudHandler from '../server/icloud-calendar.js';
import {calendarApi,calendarGranted,CalendarError,GOOGLE_CALENDAR_SCOPE,GOOGLE_CALENDAR_LIST_SCOPE} from '../server/calendar-service.js';
import microsoftHandler from '../server/microsoft-sync.js';
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
function avatarUrl(value) {
    try {const url=new URL(value);return url.protocol==='https:' && url.hostname.endsWith('.googleusercontent.com') && url.href.length<1024?url.href:null;}catch{return null;}
}
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
function sessionValue(req){const values=cookies(req);return (values[SESSION]||'')+(values[SESSION+'_1']||'')+(values[SESSION+'_2']||'');}
function saveSession(res,data){const value=data?seal(data):'',age=data?Math.max(0,Math.floor((data.expires-Date.now())/1000)):0;if(value.length>10500)throw new SyncError(502,'登录资料过大，请重新登录');for(let i=0;i<3;i++){const part=value.slice(i*3500,(i+1)*3500);cookie(res,SESSION+(i?'_'+i:''),part,part?age:0);}}
const redirect = (res,url) => { res.statusCode = 303; res.setHeader('Location',url); return res.end(); };
async function google(url,options={}) {
    try { return await fetch(url,{...options,signal:AbortSignal.timeout(12000)}); }
    catch { throw new SyncError(504,'Google 请求超时或连接失败，请稍后重试'); }
}
async function token(values) {
    const settings = config();
    const response = await google('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...values,client_id:settings.client,client_secret:process.env.GOOGLE_KEY})});
    if (!response.ok) throw new SyncError(401,'Google 授权已失效，请重新登录');
    return response.json();
}
async function session(req,res) {
    const data = unseal(sessionValue(req));
    if (!data) throw new SyncError(401,'请先使用 Google 登录');
    if (data.accessExpires < Date.now()+60000) await refreshGoogleSession(data,res);
    return data;
}
async function refreshGoogleSession(data,res){
    const renewed=await token({grant_type:'refresh_token',refresh_token:data.refreshToken});
    data.accessToken=renewed.access_token;
    data.refreshToken=renewed.refresh_token||data.refreshToken;
    data.accessExpires=Date.now()+Number(renewed.expires_in||3600)*1000;
    if(typeof renewed.scope==='string')data.scopes=renewed.scope.split(/\s+/).filter(Boolean);
    saveSession(res,data);
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
    // Drive v3 metadata does not reliably include an ETag header. The v2
    // resource exposes the opaque ETag explicitly; use it with If-Match.
    // Read metadata before content so a concurrent update can only fail closed.
    const metadata = await drive(data,`https://www.googleapis.com/drive/v2/files/${encodeURIComponent(file.id)}?fields=id,etag`);
    const info = await metadata.json();
    const content = await drive(data,`${DRIVE}/${encodeURIComponent(file.id)}?alt=media`);
    const candidate = content.headers.get('etag') || info.etag || metadata.headers.get('etag');
    const etag = typeof candidate==='string' && /^(?:W\/)?"[^"\r\n]+"$/.test(candidate) ? candidate : null;
    const payload = await content.json();
    return {exists:true,id:file.id,etag,revision:payload.revision,updatedAt:payload.updatedAt,preset:sanitizePreset(payload.preset)};
}
async function writeCloud(data,body) {
    const preset = sanitizePreset(body.preset);
    const current = await readCloud(data);
    if ((body.revision ?? null) !== current.revision) throw new SyncError(409,'云端预设已改变，请先重新同步');
    const payload = {revision:randomBytes(18).toString('base64url'),updatedAt:new Date().toISOString(),preset};
    if (current.exists) {
        // A conditional update also catches writes racing the revision check above.
        if (!current.etag) throw new SyncError(503,'Google Drive 未返回文件版本标识，已停止写入以保留云端预设，请稍后重试');
        await drive(data,`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(current.id)}?uploadType=media`,{method:'PATCH',headers:{'Content-Type':'application/json','If-Match':current.etag},body:JSON.stringify(payload)});
    } else {
        const boundary = 'navi_'+randomBytes(12).toString('hex');
        const content = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({name:FILE_NAME,parents:['appDataFolder']})}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(payload)}\r\n--${boundary}--`;
        await drive(data,'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',{method:'POST',headers:{'Content-Type':`multipart/related; boundary=${boundary}`},body:content});
    }
    return {revision:payload.revision,updatedAt:payload.updatedAt};
}
function clearBody(req){
 if(!String(req.headers['content-type']||'').startsWith('application/json'))throw new SyncError(415,'请使用 JSON 请求');
 const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body||{});if(Buffer.byteLength(raw)>1024)throw new SyncError(400,'清除请求格式不正确');
 let body;try{body=JSON.parse(raw);}catch{throw new SyncError(400,'清除请求格式不正确');}
 if(body.confirm!==true||!(body.revision===null||typeof body.revision==='string'&&body.revision.length<=200))throw new SyncError(400,'请确认清除云端预设');return body;
}
export default async function handler(req,res) {
    const route=new URL(req.url,'https://localhost');
    if(['/api/site-metadata','/api/discover'].includes(route.pathname)||['metadata','discover'].includes(route.searchParams.get('content')))return siteContent(req,res);
    if(route.pathname==='/api/feishu'||route.pathname==='/api/feishu/callback'||route.searchParams.get('provider')==='feishu'||req.query?.provider==='feishu')return feishuHandler(req,res);
    if(route.pathname==='/api/canvas'||route.searchParams.get('provider')==='canvas'||req.query?.provider==='canvas')return canvasHandler(req,res);
    if(route.pathname==='/api/icloud'||route.searchParams.get('provider')==='icloud'||req.query?.provider==='icloud')return icloudHandler(req,res);
    if(route.pathname==='/api/microsoft' || route.pathname==='/api/microsoft/callback' || route.searchParams.get('provider')==='microsoft' || req.query?.provider==='microsoft')return microsoftHandler(req,res);
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
        const post = ['push','clear','logout','calendar-save','calendar-delete','calendar-disconnect'].includes(action);
        if (req.method !== (post?'POST':'GET')) { res.setHeader('Allow',post?'POST':'GET'); throw new SyncError(405,'请求方法不支持'); }
        if (post && req.headers.origin !== origin) throw new SyncError(403,'请求来源不正确');
        if (['login','calendar-login'].includes(action)) {
            if (req.headers.host !== new URL(origin).host) throw new SyncError(400,'请在正式网站登录同步');
            const state = randomBytes(24).toString('base64url'), verifier = randomBytes(48).toString('base64url');
            const existing=unseal(sessionValue(req));const calendar=action==='calendar-login';
            cookie(res,STATE,seal({state,verifier,calendar,accountId:calendar?existing?.user.id:null,expires:Date.now()+600000}),600);
            const params = new URLSearchParams({client_id:settings.client,redirect_uri:settings.redirect,response_type:'code',scope:SCOPE+((calendar || calendarGranted('google',existing?.scopes))?' '+GOOGLE_CALENDAR_SCOPE+' '+GOOGLE_CALENDAR_LIST_SCOPE:''),include_granted_scopes:'true',...(calendar && existing?.user.email?{login_hint:existing.user.email}:{}),access_type:'offline',prompt:'consent select_account',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'});
            return redirect(res,'https://accounts.google.com/o/oauth2/v2/auth?'+params);
        }
        if (action === 'callback') {
            const saved = unseal(cookies(req)[STATE] || '');
            cookie(res,STATE,'',0);
            const supplied = url.searchParams.get('state') || '';
            if (!saved || Buffer.byteLength(saved.state) !== Buffer.byteLength(supplied) || !timingSafeEqual(Buffer.from(saved.state),Buffer.from(supplied))) return redirect(res,'/?sync=state-error');
            const finish=result=>redirect(res,saved.calendar?'/?calendar='+result+'&provider=google':'/?sync='+result);
            if (url.searchParams.has('error')) return finish('cancelled');
            if (!url.searchParams.get('code')) return finish('login-error');
            const result = await token({grant_type:'authorization_code',code:url.searchParams.get('code'),redirect_uri:settings.redirect,code_verifier:saved.verifier});
            if (!String(result.scope || '').split(' ').includes('https://www.googleapis.com/auth/drive.appdata')) return finish('permission-error');
            const response = await google('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:`Bearer ${result.access_token}`}});
            if (!response.ok) return finish('login-error');
            const info = await response.json();
            if(saved.accountId && info.sub!==saved.accountId)return finish('account-mismatch');
            const scopes=String(result.scope || '').split(' ');if(saved.calendar&&!calendarGranted('google',scopes))return finish('permission-error');
            const previous=unseal(sessionValue(req)),refreshToken=result.refresh_token || (previous?.user.id===info.sub?previous.refreshToken:null);if(!refreshToken)return finish('permission-error');
            const sessionData = {scopes,calendarDisconnected:saved.calendar?false:previous?.user.id===info.sub&&previous.calendarDisconnected===true,user:{id:info.sub,name:info.name || info.email,email:info.email,avatar:avatarUrl(info.picture)},accessToken:result.access_token,refreshToken,accessExpires:Date.now()+Number(result.expires_in || 3600)*1000,expires:Date.now()+30*86400000};
            saveSession(res,sessionData);
            return finish('connected');
        }
        if (action === 'logout') { saveSession(res,null); return res.status(200).json({ok:true}); }
        if (!['status','pull','push','clear','calendar-list','calendar-events','calendar-save','calendar-delete','calendar-disconnect'].includes(action)) throw new SyncError(404,'接口不存在');
        let data;
        try { data = await session(req,res); }
        catch (error) {
            if (action === 'status' && error.status === 401) { saveSession(res,null); return res.status(200).json({configured:true,authenticated:false,redirectUri:settings.redirect}); }
            throw error;
        }
        if (action === 'status') {
            if(!Object.prototype.hasOwnProperty.call(data.user,'avatar')) {
                data.user.avatar=null;
                try {const response=await google('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:`Bearer ${data.accessToken}`}});if(response.ok)data.user.avatar=avatarUrl((await response.json()).picture);}catch{}
                saveSession(res,data);
            }
            return res.status(200).json({configured:true,authenticated:true,user:data.user,calendarAuthorized:!data.calendarDisconnected&&calendarGranted('google',data.scopes),redirectUri:settings.redirect});
        }
        if(action==='calendar-disconnect'){data.calendarDisconnected=true;saveSession(res,data);return res.status(200).json({ok:true});}
        if(action.startsWith('calendar-'))return await calendarApi('google',data,action,req,res,url,{refreshAccess:()=>refreshGoogleSession(data,res)});
        if (action === 'pull') {
            const cloud = await readCloud(data);
            delete cloud.id; delete cloud.etag;
            return res.status(200).json(cloud);
        }
        if(action==='clear'){
            const body=clearBody(req),current=await readCloud(data);
            if(!current.exists)return res.status(200).json({ok:true});
            if(body.revision!==current.revision)throw new SyncError(409,'云端预设已改变，请重新确认清除');
            if(!current.etag)throw new SyncError(503,'Google Drive 未返回文件版本标识，已停止删除');
            await drive(data,`${DRIVE}/${encodeURIComponent(current.id)}`,{method:'DELETE',headers:{'If-Match':current.etag}});
            if((await readCloud(data)).exists)throw new SyncError(409,'仍有其他版本的云端预设，请重新确认清除');
            return res.status(200).json({ok:true});
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
        return res.status(error.status || 502).json({error:error instanceof SyncError || error instanceof CalendarError ? error.message : '同步服务暂时不可用，请稍后重试'});
    }
}
