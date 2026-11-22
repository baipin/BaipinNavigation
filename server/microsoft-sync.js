import {calendarApi,calendarGranted,CalendarError,MICROSOFT_CALENDAR_SCOPE} from './calendar-service.js';
import {createCipheriv,createDecipheriv,createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {sanitizePreset,MAX_PRESET_BYTES} from '../js/preset-schema.js';
const SESSION='__Host-navi_microsoft',STATE='__Host-navi_microsoft_oauth';
const FILE='baipin-navigation-presets-v1.json',API='https://graph.microsoft.com/v1.0';
const SCOPE='openid profile email offline_access User.Read Files.ReadWrite.AppFolder';
const settings=()=>({client:process.env.MICROSOFT_CLIENT_ID,secret:process.env.MICROSOFT_KEY,redirect:process.env.MICROSOFT_REDIRECT_URI || 'https://123.baipon.com/api/microsoft/callback'});
class AuthError extends Error {constructor(status,message){super(message);this.status=status;}}
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
const redirect=(res,result)=>{res.statusCode=303;res.setHeader('Location','/?sync='+result+'&provider=microsoft');return res.end();};

// Microsoft tokens can exceed a single cookie. Authenticate the entire encrypted payload,
// then split it into fixed, bounded chunks; clear unused chunks on refresh/logout.
function storeSession(res,data){
 const value=data?seal(data):'',age=data?Math.max(0,Math.floor((data.expires-Date.now())/1000)):0;
 if(value.length>10500)throw new AuthError(502,'Microsoft 登录资料过大，请重新登录');
 for(let i=0;i<3;i++){const part=value.slice(i*3500,(i+1)*3500);setCookie(res,SESSION+i,part,part?age:0);}
}
const fetchTimed=(url,options={})=>fetch(url,{...options,signal:AbortSignal.timeout(12000)});
async function exchange(values){
 const config=settings();const response=await fetchTimed('https://login.microsoftonline.com/common/oauth2/v2.0/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...values,client_id:config.client,client_secret:config.secret,scope:values.scope || SCOPE})});
 if(!response.ok)throw new AuthError(401,'Microsoft 授权已失效，请重新登录');
 const token=await response.json();if(!token.access_token || token.error)throw new AuthError(401,'Microsoft 授权已失效，请重新登录');return token;
}
async function graph(data,path,options={}){
 const response=await fetchTimed(API+path,{...options,headers:{Authorization:'Bearer '+data.accessToken,...options.headers}});
 if(response.status===401)throw new AuthError(401,'Microsoft 授权已失效，请重新登录');
 if(response.status===403)throw new AuthError(403,'无法访问 OneDrive 应用文件夹，请确认权限及账号支持');
 if(response.status===409 || response.status===412)throw new AuthError(409,'另一台设备刚刚更新了预设，请重新同步');
 if(response.status===429)throw new AuthError(429,'OneDrive 请求过于频繁，请稍后重试');
 if(response.status===404)return response;
 if(!response.ok)throw new AuthError(502,'OneDrive 暂时不可用，请稍后重试');return response;
}
async function session(req,res){
 const data=unseal([0,1,2].map(i=>readCookie(req,SESSION+i)).join(''));
 if(!data)throw new AuthError(401,'请先使用 Microsoft 登录');
 if(data.accessExpires<Date.now()+60000){
  const token=await exchange({grant_type:'refresh_token',refresh_token:data.refreshToken,scope:SCOPE+(calendarGranted('microsoft',data.scopes)?' '+MICROSOFT_CALENDAR_SCOPE:'')});
  data.accessToken=token.access_token;data.refreshToken=token.refresh_token || data.refreshToken;data.accessExpires=Date.now()+Number(token.expires_in || 3600)*1000;storeSession(res,data);
 }return data;
}
async function readCloud(data){
 const metadata=await graph(data,'/me/drive/special/approot:/'+FILE);
 if(metadata.status===404)return {exists:false,revision:null};
 const info=await metadata.json();if(!info.id || !info.eTag || !Number.isFinite(info.size) || info.size>MAX_PRESET_BYTES+4096)throw new AuthError(400,'OneDrive 预设文件不完整或过大');
 const response=await graph(data,'/me/drive/items/'+encodeURIComponent(info.id)+'/content');
 if(response.status===404)throw new AuthError(409,'云端预设已改变，请先重新同步');
 const raw=await response.text();if(Buffer.byteLength(raw)>MAX_PRESET_BYTES+4096)throw new AuthError(400,'预设文件过大');
 const payload=JSON.parse(raw);if(typeof payload.revision!=='string' || !Number.isFinite(Date.parse(payload.updatedAt)))throw new AuthError(400,'OneDrive 预设版本格式不正确');
 return {exists:true,id:info.id,etag:info.eTag,revision:payload.revision,updatedAt:payload.updatedAt,preset:sanitizePreset(payload.preset)};
}
async function writeCloud(data,body){
 const preset=sanitizePreset(body.preset),current=await readCloud(data);
 if((body.revision ?? null)!==current.revision)throw new AuthError(409,'云端预设已改变，请先重新同步');
 const payload={revision:randomBytes(18).toString('base64url'),updatedAt:new Date().toISOString(),preset};
 // Existing files use Graph's eTag precondition; initial creation refuses a name conflict.
 const path=current.exists?'/me/drive/items/'+encodeURIComponent(current.id)+'/content':'/me/drive/special/approot:/'+FILE+':/content?@microsoft.graph.conflictBehavior=fail';
 const response=await graph(data,path,{method:'PUT',headers:{'Content-Type':'application/json',...(current.exists?{'If-Match':current.etag}:{'If-None-Match':'*'})},body:JSON.stringify(payload)});
 if(response.status===404)throw new AuthError(409,'云端预设已改变，请先重新同步');
 return {revision:payload.revision,updatedAt:payload.updatedAt};
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('Referrer-Policy','no-referrer');
 const url=new URL(req.url,'https://localhost'),action=url.pathname==='/api/microsoft/callback'?'callback':url.searchParams.get('action') || req.query?.action || 'status',config=settings(),origin=new URL(config.redirect).origin;
 try{
  const post=['push','logout','calendar-save','calendar-delete'].includes(action);if(req.method!==(post?'POST':'GET')){res.setHeader('Allow',post?'POST':'GET');throw new AuthError(405,'请求方法不支持');}
  if(post && req.headers.origin!==origin)throw new AuthError(403,'请求来源不正确');
  if(action==='logout'){storeSession(res,null);setCookie(res,STATE,'',0);return res.status(200).json({ok:true});}
  if(!config.client || !config.secret){if(action==='status')return res.status(200).json({configured:false,authenticated:false,provider:'microsoft',redirectUri:config.redirect});throw new AuthError(503,'服务器未配置 MICROSOFT_CLIENT_ID 和 MICROSOFT_KEY');}
  if(['login','calendar-login'].includes(action)){
   if(req.headers.host!==new URL(origin).host)throw new AuthError(400,'请在正式网站登录同步');
   const existing=unseal([0,1,2].map(i=>readCookie(req,SESSION+i)).join('')),calendar=action==='calendar-login';
   const state=randomBytes(24).toString('base64url'),verifier=randomBytes(48).toString('base64url');setCookie(res,STATE,seal({state,verifier,calendar,calendarAccess:calendar||calendarGranted('microsoft',existing?.scopes),accountId:calendar?existing?.user.id:null,expires:Date.now()+600000}),600);
   const query=new URLSearchParams({client_id:config.client,redirect_uri:config.redirect,response_type:'code',response_mode:'query',scope:SCOPE+((calendar || calendarGranted('microsoft',existing?.scopes))?' '+MICROSOFT_CALENDAR_SCOPE:''),...(calendar&&existing?.user.email?{login_hint:existing.user.email}:{}),prompt:calendar?'consent':'select_account',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'});
   res.statusCode=303;res.setHeader('Location','https://login.microsoftonline.com/common/oauth2/v2.0/authorize?'+query);return res.end();
  }
  if(action==='callback'){
   const saved=unseal(readCookie(req,STATE)),state=url.searchParams.get('state') || '';setCookie(res,STATE,'',0);
   if(!saved || Buffer.byteLength(saved.state)!==Buffer.byteLength(state) || !timingSafeEqual(Buffer.from(saved.state),Buffer.from(state)))return redirect(res,'state-error');
   const finish=result=>{if(!saved.calendar)return redirect(res,result);res.statusCode=303;res.setHeader('Location','/?calendar='+result+'&provider=microsoft');return res.end();};
   if(url.searchParams.has('error'))return finish('cancelled');if(!url.searchParams.get('code'))return finish('login-error');
   const token=await exchange({grant_type:'authorization_code',code:url.searchParams.get('code'),redirect_uri:config.redirect,code_verifier:saved.verifier,scope:SCOPE+(saved.calendarAccess?' '+MICROSOFT_CALENDAR_SCOPE:'')});
   const scopes=String(token.scope || '').toLowerCase().split(' ');if(!token.refresh_token || !scopes.some(s=>s==='files.readwrite.appfolder' || s==='https://graph.microsoft.com/files.readwrite.appfolder') || !scopes.some(s=>s==='user.read' || s==='https://graph.microsoft.com/user.read'))return finish('permission-error');
   const response=await graph({accessToken:token.access_token},'/me?$select=id,displayName,mail,userPrincipalName');if(response.status===404)return finish('login-error');
   const info=await response.json();if(typeof info.id!=='string' || !info.id || info.id.length>128)return finish('login-error');
   if(saved.accountId && info.id!==saved.accountId)return finish('account-mismatch');if(saved.calendar&&!calendarGranted('microsoft',scopes))return finish('permission-error');
   storeSession(res,{scopes,user:{id:info.id,name:String(info.displayName || info.userPrincipalName || 'Microsoft').slice(0,120),email:String(info.mail || info.userPrincipalName || '').slice(0,254),avatar:null},accessToken:token.access_token,refreshToken:token.refresh_token,accessExpires:Date.now()+Number(token.expires_in || 3600)*1000,expires:Date.now()+30*86400000});return finish('connected');
  }
  if(!['status','pull','push','calendar-list','calendar-events','calendar-save','calendar-delete'].includes(action))throw new AuthError(404,'接口不存在');
  let data;try{data=await session(req,res);}catch(error){if(action==='status' && error.status===401){storeSession(res,null);return res.status(200).json({configured:true,authenticated:false,provider:'microsoft',redirectUri:config.redirect});}throw error;}
  if(action==='status')return res.status(200).json({configured:true,authenticated:true,provider:'microsoft',user:data.user,calendarAuthorized:calendarGranted('microsoft',data.scopes),redirectUri:config.redirect});
  if(action.startsWith('calendar-'))return await calendarApi('microsoft',data,action,req,res,url);
  if(action==='pull'){const cloud=await readCloud(data);delete cloud.id;delete cloud.etag;return res.status(200).json(cloud);}
  if(!String(req.headers['content-type'] || '').startsWith('application/json'))throw new AuthError(415,'请使用 JSON 请求');
  const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body || {});if(Buffer.byteLength(raw)>MAX_PRESET_BYTES+4096)throw new AuthError(413,'预设文件过大');
  let body;try{body=JSON.parse(raw);sanitizePreset(body.preset);}catch{throw new AuthError(400,'预设格式不正确或文件过大');}return res.status(200).json(await writeCloud(data,body));
 }catch(error){if(action==='callback')return redirect(res,'login-error');return res.status(error.status || 502).json({error:error instanceof AuthError || error instanceof CalendarError?error.message:'Microsoft 同步暂时不可用，请稍后重试'});}
}
