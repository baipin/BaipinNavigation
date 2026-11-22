import {randomUUID} from 'node:crypto';
export const GOOGLE_CALENDAR_SCOPE='https://www.googleapis.com/auth/calendar.events';
export const GOOGLE_CALENDAR_LIST_SCOPE='https://www.googleapis.com/auth/calendar.calendarlist.readonly';
export const MICROSOFT_CALENDAR_SCOPE='Calendars.ReadWrite';
export class CalendarError extends Error {constructor(status,message){super(message);this.status=status;}}
export function calendarGranted(provider,scopes=[]){const list=scopes.map(x=>x.toLowerCase().replace('https://graph.microsoft.com/',''));return provider==='google'?list.includes(GOOGLE_CALENDAR_SCOPE)&&list.includes(GOOGLE_CALENDAR_LIST_SCOPE):list.includes('calendars.readwrite');}
export function calendarRange(url){const start=new Date(url.searchParams.get('start')),end=new Date(url.searchParams.get('end'));if(!Number.isFinite(+start)||!Number.isFinite(+end)||end<=start||end-start>94*86400000)throw new CalendarError(400,'日历查询范围应为 1 至 94 天');return {start:start.toISOString(),end:end.toISOString()};}
export function calendarBody(req){if(!String(req.headers['content-type']||'').startsWith('application/json'))throw new CalendarError(415,'请使用 JSON 请求');const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body||{});if(Buffer.byteLength(raw)>20000)throw new CalendarError(413,'日程内容过大');try{return JSON.parse(raw);}catch{throw new CalendarError(400,'日程格式不正确');}}
export function validateEvent(value){
 if(!value||typeof value.title!=='string'||!value.title.trim()||value.title.length>200||typeof value.allDay!=='boolean')throw new CalendarError(400,'请填写日程标题和时间');
 for(const key of ['description','location'])if(value[key]!==undefined&&(typeof value[key]!=='string'||value[key].length>4000))throw new CalendarError(400,'日程文字过长');
 const pattern=value.allDay?/^\d{4}-\d{2}-\d{2}$/:/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
 if(!pattern.test(value.start)||!pattern.test(value.end)||!Number.isFinite(Date.parse(value.start))||!Number.isFinite(Date.parse(value.end))||Date.parse(value.end)<=Date.parse(value.start))throw new CalendarError(400,'结束时间必须晚于开始时间');
 return {title:value.title.trim(),description:value.description||'',location:value.location||'',start:value.start,end:value.end,allDay:value.allDay};
}
function boundedId(value){if(typeof value!=='string'||!value||value.length>2048||/[\x00-\x1f]/.test(value))throw new CalendarError(400,'日历标识不正确');return encodeURIComponent(value);}
export async function calendarApi(provider,data,action,req,res,url){
 if(data.calendarDisconnected||!calendarGranted(provider,data.scopes))throw new CalendarError(403,'请先授权日历读写权限');
 const base=provider==='google'?'https://www.googleapis.com/calendar/v3':'https://graph.microsoft.com/v1.0';
 const call=async(path,options={})=>{const response=await fetch(base+path,{...options,redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+data.accessToken,...(provider==='microsoft'?{Prefer:'outlook.timezone="UTC", outlook.body-content-type="text"'}:{}),...options.headers}});if(response.status===401)throw new CalendarError(401,'日历授权已失效，请重新登录');if(response.status===409||response.status===412)throw new CalendarError(409,'日程已被其他设备修改，请刷新后重试');if(response.status===403)throw new CalendarError(403,'日历权限不足或日历不可编辑');if(response.status===404)throw new CalendarError(404,'日历或日程已不存在，请刷新');if(!response.ok)throw new CalendarError(502,'日历服务暂时不可用，请稍后重试');return response;};
 const calendarPath=id=>provider==='google'?'/calendars/'+boundedId(id):'/me/calendars/'+boundedId(id);
 if(action==='calendar-list'){
  let rows=[],next='',pages=0;do{const path=provider==='google'?'/users/me/calendarList?maxResults=250'+(next?'&pageToken='+encodeURIComponent(next):''):next||'/me/calendars?$top=100&$select=id,name,canEdit,color';const json=await(await call(path)).json();rows.push(...(json.items||json.value||[]));if(provider==='google')next=json.nextPageToken||'';else{next=json['@odata.nextLink']||'';if(next){if(!next.startsWith(base+'/me/calendars?'))throw new CalendarError(502,'日历分页地址不正确');next=next.slice(base.length);}}}while(next&&++pages<5);
  return res.status(200).json({calendars:rows.map(x=>({id:x.id,name:x.summary||x.name||'Calendar',writable:provider==='google'?['owner','writer'].includes(x.accessRole):x.canEdit===true,primary:x.primary===true,color:provider==='google'?x.backgroundColor:null})),truncated:!!next});
 }
 if(action==='calendar-events'){
  const {start,end}=calendarRange(url),id=url.searchParams.get('calendar'),path=calendarPath(id);let rows=[],next='',pages=0;
  do{const route=provider==='google'?path+'/events?'+new URLSearchParams({timeMin:start,timeMax:end,singleEvents:'true',orderBy:'startTime',maxResults:'250',...(next?{pageToken:next}:{})}):next||path+'/calendarView?'+new URLSearchParams({startDateTime:start,endDateTime:end,'$top':'250','$select':'id,subject,start,end,isAllDay,location,body,changeKey,isOrganizer,webLink','$orderby':'start/dateTime'});const json=await(await call(route)).json();rows.push(...(json.items||json.value||[]));if(provider==='google')next=json.nextPageToken||'';else{next=json['@odata.nextLink']||'';if(next){if(!next.startsWith(base+path+'/calendarView?'))throw new CalendarError(502,'日历分页地址不正确');next=next.slice(base.length);}}}while(next&&++pages<5);
  const utc=x=>x?.dateTime?(x.dateTime.match(/(?:Z|[+-]\d{2}:\d{2})$/)?x.dateTime:x.dateTime+'Z'):null;
  return res.status(200).json({events:rows.filter(x=>x.status!=='cancelled').map(x=>provider==='google'?{id:x.id,etag:x.etag,title:x.summary||'（无标题）',start:x.start?.date||x.start?.dateTime,end:x.end?.date||x.end?.dateTime,allDay:!!x.start?.date,description:x.description||'',location:x.location||'',editable:!x.organizer?.self&&x.guestsCanModify===false?false:true}:{id:x.id,etag:x['@odata.etag']||null,title:x.subject||'（无标题）',start:x.isAllDay?x.start.dateTime.slice(0,10):utc(x.start),end:x.isAllDay?x.end.dateTime.slice(0,10):utc(x.end),allDay:x.isAllDay===true,description:x.body?.content||'',location:x.location?.displayName||'',editable:x.isOrganizer!==false}),truncated:!!next});
 }
 const body=calendarBody(req),path=calendarPath(body.calendar),id=body.id?boundedId(body.id):null;
 if(id&&(typeof body.etag!=='string'||body.etag.length>1024))throw new CalendarError(400,'缺少日程版本，请刷新后重试');
 if(action==='calendar-delete'){if(!id)throw new CalendarError(400,'请选择日程');await call(path+'/events/'+id,{method:'DELETE',headers:{'If-Match':body.etag}});return res.status(200).json({ok:true});}
 const event=validateEvent(body.event);let payload;
 if(provider==='google')payload={summary:event.title,description:event.description,location:event.location,start:{[event.allDay?'date':'dateTime']:event.start},end:{[event.allDay?'date':'dateTime']:event.end}};
 else payload={subject:event.title,body:{contentType:'text',content:event.description},location:{displayName:event.location},isAllDay:event.allDay,start:{dateTime:event.allDay?event.start+'T00:00:00':event.start.replace(/Z$/,''),timeZone:'UTC'},end:{dateTime:event.allDay?event.end+'T00:00:00':event.end.replace(/Z$/,''),timeZone:'UTC'},...(!id?{transactionId:randomUUID()}:{})};
 const result=await(await call(path+'/events'+(id?'/'+id:''),{method:id?'PATCH':'POST',headers:{'Content-Type':'application/json',...(id?{'If-Match':body.etag}:{})},body:JSON.stringify(payload)})).json();return res.status(200).json({ok:true,id:result.id});
}
