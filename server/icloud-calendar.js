import {XMLParser} from 'fast-xml-parser';
import ICAL from 'ical.js';
import {randomUUID} from 'node:crypto';
import {CalendarError,calendarBody,calendarRange,validateEvent} from './calendar-service.js';
import {storeSession,readSession} from './calendar-session.js';
const COOKIE='__Host-navi_icloud',key=()=>process.env.ICLOUD_SESSION_KEY||process.env.APPLE_CALENDAR_KEY||process.env.APPLE_SESSION_KEY;
const parser=new XMLParser({ignoreAttributes:false,removeNSPrefix:true,processEntities:true,isArray:(name)=>['response','propstat'].includes(name)});
export function cloudUrl(value,base='https://caldav.icloud.com/'){let url;try{url=new URL(value,base);}catch{throw new CalendarError(400,'iCloud 日历地址不正确');}if(url.protocol!=='https:'||url.port||url.username||url.password||!(url.hostname==='caldav.icloud.com'||/^p\d{1,3}-caldav\.icloud\.com$/.test(url.hostname)))throw new CalendarError(400,'只允许 Apple iCloud CalDAV 地址');return url;}
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function parseDav(xml){if(typeof xml!=='string'||xml.length>4000000||/<!DOCTYPE|<!ENTITY/i.test(xml))throw new CalendarError(502,'iCloud 返回格式不正确');return parser.parse(xml).multistatus?.response||[];}
const properties=row=>Object.assign({},...(row.propstat||[]).filter(x=>/\s200\s/.test(x.status||'')).map(x=>x.prop||{}));
const propfind=props=>'<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop>'+props+'</d:prop></d:propfind>';
async function dav(data,url,options={}){
 let target=cloudUrl(url);for(let attempt=0;attempt<3;attempt++){
  const response=await fetch(target,{...options,redirect:'manual',signal:AbortSignal.timeout(18000),headers:{Authorization:'Basic '+Buffer.from(data.email+':'+data.password).toString('base64'),...options.headers}});
  if([301,302,307,308].includes(response.status)){target=cloudUrl(response.headers.get('location'),target);continue;}
  if(response.status===401)throw new CalendarError(401,'iCloud 账号或 App 专用密码无效，请重新连接');if(response.status===403)throw new CalendarError(403,'此 iCloud 日历不可编辑或权限不足');if(response.status===409||response.status===412)throw new CalendarError(409,'日程已被其他设备修改，请刷新后重试');if(response.status===404)throw new CalendarError(404,'日历或日程已不存在');if(!response.ok)throw new CalendarError(502,'iCloud 日历暂时不可用，请稍后重试');
  const raw=await response.text();if(Buffer.byteLength(raw)>4000000)throw new CalendarError(502,'iCloud 日历资料过大，请缩小日期范围');return {response,raw,url:target};
 }throw new CalendarError(502,'iCloud 日历重定向过多');
}
async function discover(data){
 const first=await dav(data,'https://caldav.icloud.com/',{method:'PROPFIND',headers:{Depth:'0','Content-Type':'application/xml'},body:propfind('<d:current-user-principal/>')});const principal=properties(parseDav(first.raw)[0]||{})['current-user-principal']?.href;if(!principal)throw new CalendarError(502,'无法找到 iCloud 日历账号');
 const second=await dav(data,cloudUrl(principal,first.url),{method:'PROPFIND',headers:{Depth:'0','Content-Type':'application/xml'},body:propfind('<c:calendar-home-set/>')});const home=properties(parseDav(second.raw)[0]||{})['calendar-home-set']?.href;if(!home)throw new CalendarError(502,'无法找到 iCloud 日历目录');return cloudUrl(home,second.url).href;
}
async function list(data){const value=await dav(data,data.home,{method:'PROPFIND',headers:{Depth:'1','Content-Type':'application/xml'},body:propfind('<d:displayname/><d:resourcetype/><d:current-user-privilege-set/><c:supported-calendar-component-set/>')});return parseDav(value.raw).flatMap(row=>{const p=properties(row);if(!Object.hasOwn(p.resourcetype||{},'calendar'))return[];const components=JSON.stringify(p['supported-calendar-component-set']||{});if(components&&!components.includes('VEVENT'))return[];const privileges=JSON.stringify(p['current-user-privilege-set']||{}),url=cloudUrl(row.href,value.url);if(!url.href.startsWith(data.home))return[];return[{id:Buffer.from(url.href).toString('base64url'),name:typeof p.displayname==='string'?p.displayname:'iCloud Calendar',writable:/"(?:write|write-content|all)"/.test(privileges),primary:false}];});}
function resource(id,home){if(typeof id!=='string'||id.length>3000||!/^[A-Za-z0-9_-]+$/.test(id))throw new CalendarError(400,'日历标识不正确');const url=cloudUrl(Buffer.from(id,'base64url').toString());if(!url.href.startsWith(home)||url.href===home||url.search||url.hash)throw new CalendarError(400,'日历标识不正确');return url;}
function component(raw){if(raw.length>4000000)throw new CalendarError(400,'日程文件过大');const root=new ICAL.Component(ICAL.parse(raw));if(root.name!=='vcalendar')throw new CalendarError(502,'日程格式不正确');return root;}
function prepareEvent(comp){const tz=comp.getAllSubcomponents('vtimezone');for(const zone of tz){const id=zone.getFirstPropertyValue('tzid');if(id)ICAL.TimezoneService.register(id,new ICAL.Timezone(zone));}const rows=comp.getAllSubcomponents('vevent'),master=rows.find(x=>!x.hasProperty('recurrence-id'));if(!master)throw new CalendarError(502,'日程缺少主体');const event=new ICAL.Event(master);for(const row of rows)if(row!==master&&row.hasProperty('recurrence-id'))event.relateException(new ICAL.Event(row));return event;}
const timeValue=time=>time.isDate?time.toString():time.toJSDate().toISOString();
export function parseIcloudEvents(raw,id,etag,range){
 const root=component(raw),event=prepareEvent(root),events=[];let truncated=false;
 const add=(start,end,record,rid)=>{if(record.component.getFirstPropertyValue('status')==='CANCELLED')return;if(+end.toJSDate()<=Date.parse(range.start)||+start.toJSDate()>=Date.parse(range.end))return;events.push({id,etag,recurrenceId:rid||null,title:record.summary||'（无标题）',start:timeValue(start),end:timeValue(end),allDay:start.isDate,description:record.description||'',location:record.location||'',editable:record.attendees.length===0});};
 if(event.isRecurring()){
  const iterator=event.iterator();let next,count=0;while((next=iterator.next())&&count++<30000){if(+next.toJSDate()>Date.parse(range.end))break;const item=event.getOccurrenceDetails(next);add(item.startDate,item.endDate,item.item,next.toString());if(events.length>=500){truncated=true;break;}}if(count>=30000)truncated=true;
 }else add(event.startDate,event.endDate,event,null);return {events,truncated};
}
export function updateIcloudEvent(raw,value,recurrenceId,remove=false){
 const root=component(raw),master=prepareEvent(root);let target=master;
 if(recurrenceId){if(typeof recurrenceId!=='string'||recurrenceId.length>40)throw new CalendarError(400,'重复日程标识不正确');const time=ICAL.Time.fromString(recurrenceId);time.zone=master.startDate.zone;
  const existing=root.getAllSubcomponents('vevent').find(x=>x.getFirstPropertyValue('recurrence-id')?.toString()===recurrenceId);
  const child=existing||new ICAL.Component(structuredClone(master.component.toJSON()));for(const prop of ['rrule','rdate','exdate','exrule'])child.removeAllProperties(prop);child.updatePropertyWithValue('recurrence-id',time);if(!existing)root.addSubcomponent(child);target=new ICAL.Event(child);
 }
 if(target.attendees.length)throw new CalendarError(403,'此 iCloud 日程含有邀请，请到原日历处理，避免误发邀请');
 if(remove){if(!recurrenceId)throw new CalendarError(400,'删除标识不正确');target.component.updatePropertyWithValue('status','CANCELLED');}
 else{const event=validateEvent(value);target.summary=event.title;target.description=event.description;target.location=event.location;target.startDate=event.allDay?ICAL.Time.fromDateString(event.start):ICAL.Time.fromJSDate(new Date(event.start),true);target.endDate=event.allDay?ICAL.Time.fromDateString(event.end):ICAL.Time.fromJSDate(new Date(event.end),true);}
 target.component.updatePropertyWithValue('dtstamp',ICAL.Time.now().convertToZone(ICAL.Timezone.utcTimezone));target.component.updatePropertyWithValue('sequence',Number(target.component.getFirstPropertyValue('sequence')||0)+1);return root.toString();
}
function newEvent(value){const root=new ICAL.Component(['vcalendar',[],[]]);root.updatePropertyWithValue('version','2.0');root.updatePropertyWithValue('prodid','-//Baipin Navigation//Calendar//ZH');const entry=new ICAL.Component('vevent');root.addSubcomponent(entry);entry.updatePropertyWithValue('uid',randomUUID()+'@123.baipon.com');entry.updatePropertyWithValue('dtstart',ICAL.Time.now());return updateIcloudEvent(root.toString(),value,null);}
export default async function icloudHandler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');const url=new URL(req.url,'https://localhost'),action=url.searchParams.get('action')||req.query?.action||'status',secret=key(),origin='https://123.baipon.com';
 try{
  const post=['connect','disconnect','calendar-save','calendar-delete','calendar-vault-export'].includes(action);if(req.method!==(post?'POST':'GET'))throw new CalendarError(405,'请求方法不支持');if(post&&req.headers.origin!==origin)throw new CalendarError(403,'请求来源不正确');
  if(action==='disconnect'){storeSession(res,COOKIE,null,secret);return res.status(200).json({ok:true});}
  const configured=typeof secret==='string'&&secret.length>=32;if(!configured){if(action==='status')return res.status(200).json({configured:false,authenticated:false});throw new CalendarError(503,'请先配置 ICLOUD_SESSION_KEY');}
  if(action==='connect'){
   const body=calendarBody(req);if(typeof body.email!=='string'||body.email.length>254||!/^[^\s:@]+@[^\s:@]+$/.test(body.email)||typeof body.password!=='string'||!/^[a-zA-Z]{4}(?:-[a-zA-Z]{4}){3}$/.test(body.password))throw new CalendarError(400,'请输入 iCloud 账号及 xxxx-xxxx-xxxx-xxxx 格式的 App 专用密码');
   const data={email:body.email,password:body.password,expires:Date.now()+30*86400000};data.home=await discover(data);await list(data);storeSession(res,COOKIE,data,secret);return res.status(200).json({authenticated:true,user:{email:data.email,name:data.email},calendarAuthorized:true});
  }
  const data=readSession(req,COOKIE,secret);if(action==='status')return res.status(200).json({configured:true,authenticated:!!data,user:data?{email:data.email,name:data.email}:null,calendarAuthorized:!!data});if(!data)throw new CalendarError(401,'请先连接 iCloud 日历');
  if(action==='calendar-vault-export')return res.status(200).json({credentials:{email:data.email,password:data.password}});
  if(action==='calendar-list')return res.status(200).json({calendars:await list(data)});
  if(action==='calendar-events'){
   const range=calendarRange(url),calendar=resource(url.searchParams.get('calendar'),data.home);const compact=iso=>iso.replace(/[-:]/g,'').replace(/\.\d{3}/,'');const result=await dav(data,calendar,{method:'REPORT',headers:{Depth:'1','Content-Type':'application/xml'},body:'<?xml version="1.0"?><c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><d:getetag/><c:calendar-data/></d:prop><c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT"><c:time-range start="'+compact(range.start)+'" end="'+compact(range.end)+'"/></c:comp-filter></c:comp-filter></c:filter></c:calendar-query>'});
   const events=[];let truncated=false;const rows=parseDav(result.raw);for(const row of rows.slice(0,500)){const p=properties(row),ics=p['calendar-data'];if(typeof ics!=='string')continue;const item=cloudUrl(row.href,result.url);if(!item.href.startsWith(calendar.href))continue;try{const parsed=parseIcloudEvents(ics,Buffer.from(item.href).toString('base64url'),p.getetag,range);events.push(...parsed.events);truncated ||= parsed.truncated;}catch{truncated=true;}}return res.status(200).json({events:events.slice(0,1000),truncated:truncated||rows.length>500||events.length>1000});
  }
  if(!['calendar-save','calendar-delete'].includes(action))throw new CalendarError(404,'接口不存在');const body=calendarBody(req),calendar=resource(body.calendar,data.home),calendars=await list(data);if(!calendars.some(x=>x.id===body.calendar&&x.writable))throw new CalendarError(403,'此日历不可编辑');let target,raw;
  if(body.id){target=resource(body.id,data.home);if(!target.href.startsWith(calendar.href)||typeof body.etag!=='string'||body.etag.length>512)throw new CalendarError(400,'日程标识或版本不正确');const original=await dav(data,target);if(original.response.headers.get('etag')!==body.etag)throw new CalendarError(409,'日程已改变，请刷新后重试');if(action==='calendar-delete'&&!body.recurrenceId){if(prepareEvent(component(original.raw)).attendees.length)throw new CalendarError(403,'此 iCloud 日程含有邀请，请到原日历处理');await dav(data,target,{method:'DELETE',headers:{'If-Match':body.etag}});return res.status(200).json({ok:true});}raw=updateIcloudEvent(original.raw,body.event,body.recurrenceId,action==='calendar-delete');}
  else{if(action==='calendar-delete')throw new CalendarError(400,'请选择日程');target=cloudUrl(randomUUID()+'.ics',calendar);raw=newEvent(body.event);}
  await dav(data,target,{method:'PUT',headers:{'Content-Type':'text/calendar; charset=utf-8',...(body.id?{'If-Match':body.etag}:{'If-None-Match':'*'})},body:raw});return res.status(200).json({ok:true});
 }catch(error){return res.status(error instanceof CalendarError?error.status:502).json({error:error instanceof CalendarError?error.message:'iCloud 日历暂时不可用，请稍后重试'});}
}
