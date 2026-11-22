import {createHash} from 'node:crypto';
import {lookup as dnsLookup} from 'node:dns/promises';
import {request as httpsRequest} from 'node:https';
import {BlockList,isIP} from 'node:net';
import {CalendarError,calendarBody,calendarRange} from './calendar-service.js';
import {readSession,storeSession} from './calendar-session.js';

const COOKIE='__Host-navi_canvas',key=()=>process.env.CANVAS_SESSION_KEY||process.env.ICLOUD_SESSION_KEY||process.env.GOOGLE_KEY;
const denied=new BlockList();
for(const [address,prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.88.99.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]])denied.addSubnet(address,prefix,'ipv4');
export const publicCanvasAddress=address=>isIP(address)===4&&!denied.check(address,'ipv4');
export function canvasOrigin(value){
 let url;try{url=new URL(value);}catch{throw new CalendarError(400,'请输入完整的学校 Canvas HTTPS 网址');}
 if(url.protocol!=='https:'||url.port||url.username||url.password||url.search||url.hash||url.hostname.length>253||isIP(url.hostname)||!url.hostname.includes('.')||!/^\/[a-zA-Z0-9/_-]*$/.test(url.pathname))throw new CalendarError(400,'请使用学校 Canvas 的 HTTPS 网址，不含端口、账号或查询参数');
 return url.origin;
}
// Resolve and pin a public IPv4 address for every request. Redirects are never followed with the token.
export async function canvasJSON(data,path,{lookup=dnsLookup,request=httpsRequest}={}){
 const url=new URL(path,data.origin);if(url.origin!==data.origin||!['/api/v1/users/self/profile','/api/v1/courses','/api/v1/calendar_events'].includes(url.pathname)||url.username||url.password||url.hash)throw new CalendarError(502,'Canvas 分页地址不正确');
 const addresses=await lookup(url.hostname,{all:true,family:4});
 if(!addresses.length||addresses.some(x=>!publicCanvasAddress(x.address)))throw new CalendarError(400,'Canvas 网址必须指向公开的学校服务器');
 const address=addresses[0].address;
 return new Promise((resolve,reject)=>{
  const req=request(url,{method:'GET',agent:false,family:4,lookup:(_host,options,callback)=>callback(null,options?.all?[{address,family:4}]:address,4),headers:{Authorization:'Bearer '+data.token,Accept:'application/json','User-Agent':'BaipinNavigation/1.0 (+https://123.baipon.com; Canvas calendar)'}},response=>{
   response.on('error',reject);
   const fail=(code,message)=>{response.resume();reject(new CalendarError(code,message));};
   if(response.statusCode===401)return fail(401,'Canvas 令牌无效或已过期，请重新连接');
   if(response.statusCode===403)return fail(403,'学校 Canvas 未允许此访问，请检查令牌权限或联系学校管理员');
   if(response.statusCode===429)return fail(429,'Canvas 请求过于频繁，请稍后刷新');
   if(response.statusCode<200||response.statusCode>=300)return fail(502,'Canvas 接口不可用；请确认填写的是 Canvas 网址，而非学校登录／SSO 网址');
   let bytes=0;const chunks=[];response.on('data',chunk=>{bytes+=chunk.length;if(bytes>4000000){reject(new CalendarError(502,'Canvas 数据过大，请减少选择的课程'));req.destroy();return;}chunks.push(chunk);});
   response.on('end',()=>{try{resolve({json:JSON.parse(Buffer.concat(chunks).toString('utf8')),link:response.headers.link||''});}catch{reject(new CalendarError(502,'学校未返回 Canvas API 数据，请检查网址和 API 访问权限'));}});
  });
  const timer=setTimeout(()=>req.destroy(new CalendarError(504,'Canvas 连接超时，请稍后重试')),15000);timer.unref?.();req.on('close',()=>clearTimeout(timer));req.on('error',reject);req.end();
 });
}
async function pages(data,path,call){
 const rows=[];let next=path,count=0;
 do{const result=await call(data,next);if(!Array.isArray(result.json))throw new CalendarError(502,'Canvas 列表格式不正确');rows.push(...result.json);const match=result.link.match(/<([^>]+)>\s*;\s*rel="next"/);next=match?.[1]||'';if(next){const current=new URL(path,data.origin),candidate=new URL(next,data.origin);if(candidate.origin!==data.origin||candidate.pathname!==current.pathname||candidate.username||candidate.password||candidate.hash)throw new CalendarError(502,'Canvas 分页地址不正确');}}while(next&&++count<5);
 return {rows,truncated:!!next};
}
const clean=(value,max=4000)=>String(value??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
export function canvasEvent(row,origin,range){
 if(!row||['deleted','cancelled'].includes(row.workflow_state))return null;
 const due=row.type==='assignment'||String(row.id).startsWith('assignment_');
 const start=Date.parse(row.start_at),rawEnd=Date.parse(row.end_at);if(!Number.isFinite(start))return null;
 let allDay=!due&&row.all_day===true&&/^\d{4}-\d{2}-\d{2}$/.test(row.all_day_date||''),from=new Date(start).toISOString(),end=new Date(due?start+1:Math.max(start+1,Number.isFinite(rawEnd)?rawEnd:start+1)).toISOString();
 if(allDay){from=row.all_day_date;const days=Math.max(1,Math.round((rawEnd-start)/86400000)||1);end=new Date(Date.parse(from+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);}
 if(Date.parse(end)<=Date.parse(range.start)||Date.parse(from)>=Date.parse(range.end))return null;
 let webLink=null;try{const link=new URL(row.html_url,origin);if(link.origin===origin&&!link.username&&!link.password&&/^\/courses\/\d+\/(?:assignments|calendar_events)\/\d+$/.test(link.pathname))webLink=link.origin+link.pathname;}catch{}
 return {id:String(row.id),title:clean(row.title,200)||'Canvas',description:clean(row.description),location:clean(row.location_name,1000),start:from,end,allDay,editable:false,due,webLink};
}
export function createCanvasHandler(dependencies={}){
 const call=(data,path)=>canvasJSON(data,path,dependencies);
 return async function canvasHandler(req,res){
  let phase='request';
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
  const url=new URL(req.url,'https://localhost'),action=url.searchParams.get('action')||req.query?.action||'status',secret=key();
  try{
   if(!['status','connect','disconnect','calendar-list','calendar-events'].includes(action))throw new CalendarError(404,'Canvas 在本站仅支持读取日历与作业截止日期');
   const post=['connect','disconnect'].includes(action);if(req.method!==(post?'POST':'GET'))throw new CalendarError(405,'请求方法不支持');if(post&&req.headers.origin!=='https://123.baipon.com')throw new CalendarError(403,'请求来源不正确');
   if(action==='disconnect'){storeSession(res,COOKIE,null,secret);return res.status(200).json({ok:true});}
   const configured=typeof secret==='string'&&secret.length>=32;if(!configured){if(action==='status')return res.status(200).json({configured:false,authenticated:false});throw new CalendarError(503,'请先配置 CANVAS_SESSION_KEY（至少 32 个随机字符）');}
   if(action==='connect'){
    const body=calendarBody(req);if(typeof body.origin!=='string'||body.origin.length>500||typeof body.token!=='string'||!body.token.trim()||body.token.length>2048||!/^[\x21-\x7e]+$/.test(body.token))throw new CalendarError(400,'请填写学校 Canvas 网址，并粘贴个人访问令牌原文（仅英文字符／数字／符号，不含中文、空格或 Bearer 前缀）');
    if(/^Bearer(?:\s|:)/i.test(body.token))throw new CalendarError(400,'请只粘贴 Canvas 令牌，不要添加 Bearer 前缀');
    phase='profile';
    const data={origin:canvasOrigin(body.origin.trim()),token:body.token,expires:Date.now()+30*86400000};const profile=(await call(data,'/api/v1/users/self/profile')).json;
    if(!profile?.id)throw new CalendarError(502,'无法确认 Canvas 用户');data.user={id:'canvas:'+createHash('sha256').update(data.origin+'#'+String(profile.id)).digest('hex'),name:clean(profile.name||profile.short_name,100)||'Canvas',email:data.origin};
    phase='session';storeSession(res,COOKIE,data,secret);return res.status(200).json({authenticated:true,calendarAuthorized:true,user:data.user});
   }
   const data=readSession(req,COOKIE,secret);if(action==='status')return res.status(200).json({configured:true,authenticated:!!data,calendarAuthorized:!!data,user:data?.user||null});if(!data)throw new CalendarError(401,'请先连接学校 Canvas');
   if(action==='calendar-list'){
    const listing=await pages(data,'/api/v1/courses?enrollment_state=active&per_page=100',call);
    return res.status(200).json({calendars:listing.rows.filter(x=>/^\d+$/.test(String(x.id))&&x.name&&x.workflow_state!=='deleted').slice(0,100).map(x=>({id:'course_'+x.id,name:clean(x.name,200),writable:false})),truncated:listing.truncated||listing.rows.length>100});
   }
   const id=url.searchParams.get('calendar');if(!/^course_\d{1,20}$/.test(id||''))throw new CalendarError(400,'请选择 Canvas 课程');const range=calendarRange(url);
   const results=await Promise.all(['assignment','event'].map(async type=>{const query=new URLSearchParams({type,start_date:range.start,end_date:range.end,per_page:'100','context_codes[]':id});const result=await pages(data,'/api/v1/calendar_events?'+query,call);return {events:result.rows.filter(x=>x.context_code===id).map(x=>canvasEvent(x,data.origin,range)).filter(Boolean),truncated:result.truncated};}));
   const events=[...new Map(results.flatMap(x=>x.events).map(x=>[x.id,x])).values()];return res.status(200).json({events:events.slice(0,1000),truncated:results.some(x=>x.truncated)||events.length>1000});
  }catch(error){if(!(error instanceof CalendarError))console.error('[canvas] request failed',{phase,code:/^[A-Z_]{2,60}$/.test(error?.code||'')?error.code:'UNEXPECTED'});return res.status(error instanceof CalendarError?error.status:502).json({error:error instanceof CalendarError?error.message:'Canvas 请求失败（阶段：'+phase+'），请稍后重试'});}
 };
}
export default createCanvasHandler();
