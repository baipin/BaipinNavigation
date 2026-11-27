import {calendarDayKey,occursOn} from './calendar-model.js';
export function calendarDate(key){return new Date(key+'T12:00:00');}
export function shiftCalendarDay(key,days){const date=calendarDate(key);date.setDate(date.getDate()+days);return calendarDayKey(date);}
export function monthDays(month){const first=new Date(month.getFullYear(),month.getMonth(),1,12);first.setDate(1-first.getDay());return Array.from({length:42},(_,i)=>shiftCalendarDay(calendarDayKey(first),i));}
export function weekDays(key){const date=calendarDate(key);return Array.from({length:7},(_,i)=>shiftCalendarDay(key,i-date.getDay()));}
export function calendarDisplayRange(month){const days=monthDays(month),start=calendarDate(days[0]),end=calendarDate(shiftCalendarDay(days.at(-1),1));start.setHours(0,0,0,0);end.setHours(0,0,0,0);return {start:start.toISOString(),end:end.toISOString()};}
export function dayEvents(events,key){return events.filter(event=>occursOn(event,key)).sort((a,b)=>Number(!!b.allDay)-Number(!!a.allDay)||String(a.start).localeCompare(String(b.start))||String(a.title).localeCompare(String(b.title)));}
export function timedEventLayout(events,key){
 const day=calendarDate(key);day.setHours(0,0,0,0);const next=new Date(day);next.setDate(next.getDate()+1);
 const minute=date=>date.getHours()*60+date.getMinutes()+date.getSeconds()/60;
 const segments=events.filter(event=>!event.allDay&&occursOn(event,key)).flatMap(event=>{
  const start=new Date(event.start),end=new Date(event.end);if(!Number.isFinite(+start)||!Number.isFinite(+end)||+end<+start)return [];
  const top=+start<+day?0:minute(start),bottom=+end>=+next?1440:minute(end);if(top>=1440||bottom<0)return [];
  return [{event,start:top,end:Math.max(top,bottom),layoutEnd:Math.min(1440,Math.max(bottom,top+30)),lane:0,columns:1}];
 }).sort((a,b)=>a.start-b.start||b.end-a.end);
 let group=[],active=[],until=-1,columns=0;
 const finish=()=>{for(const item of group)item.columns=columns;group=[];active=[];columns=0;};
 for(const item of segments){if(item.start>=until){finish();until=-1;}active=active.filter(other=>other.layoutEnd>item.start);let lane=0;while(active.some(other=>other.lane===lane))lane++;item.lane=lane;columns=Math.max(columns,lane+1);group.push(item);active.push(item);until=Math.max(until,item.layoutEnd);}finish();return segments;
}
