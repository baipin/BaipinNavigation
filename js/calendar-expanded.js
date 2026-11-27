import {calendarDayKey} from './calendar-model.js';
import {calendarDate,shiftCalendarDay,monthDays,weekDays,dayEvents,timedEventLayout} from './calendar-expanded-model.js';
const sc=()=>document.documentElement.lang==='zh-CN',t=(a,b)=>sc()?a:b;
const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
const iconButton=(icon,label,click)=>{const button=el('mdui-button-icon');button.icon=icon;button.setAttribute('aria-label',label);button.title=label;button.onclick=click;return button;};
const weekdays=['日','一','二','三','四','五','六'];
const palette=['#1e78ce','#39834a','#ae5b1b','#9463be','#bc465c','#147f88'];
function eventColor(event){const id=event.provider+':'+event.calendar;let hash=0;for(const c of id)hash=(hash*31+c.charCodeAt(0))>>>0;return palette[hash%palette.length];}
const time=date=>new Date(date).toLocaleTimeString(sc()?'zh-CN':'zh-HK',{hour:'2-digit',minute:'2-digit',hour12:false});
const titleOf=event=>event.title||t('无标题','無標題');
function eventLabel(event){return (event.due?'Due · ':'')+(event.allDay?t('全天','全日'):time(event.start))+' · '+titleOf(event);}
export function createCalendarExpanded(api){
 let view='month',scrollKey='',scrollTop=0,scrollLeft=0;
 const dialog=el('mdui-dialog');dialog.id='calendar-expanded-dialog';dialog.setAttribute('close-on-overlay-click','');
 const heading=el('div',undefined,'ce-heading');heading.slot='headline';const headingText=el('span');const close=iconButton('close','',()=>dialog.open=false);heading.append(headingText,close);
 const toolbar=el('div',undefined,'ce-toolbar'),nav=el('div',undefined,'ce-navigation'),prev=iconButton('chevron_left','',()=>move(-1)),next=iconButton('chevron_right','',()=>move(1)),today=el('mdui-button');today.variant='text';today.onclick=()=>api.selectDate(calendarDayKey(new Date()));const label=el('strong');nav.append(prev,label,next,today);
 const views=el('div',undefined,'ce-views');views.setAttribute('role','group');const tabs=new Map();for(const mode of ['month','week','day']){const button=el('button');button.type='button';button.onclick=()=>{view=mode;scrollKey='';render();};views.append(button);tabs.set(mode,button);}
 const tools=el('div',undefined,'ce-tools'),refresh=iconButton('refresh','',()=>api.refresh()),accounts=iconButton('manage_accounts','',()=>api.accounts()),add=iconButton('add','',()=>api.addEvent());tools.append(refresh,accounts,add);toolbar.append(nav,views,tools);
 const legend=el('div',undefined,'ce-legend'),content=el('div',undefined,'ce-content'),status=el('p',undefined,'ce-status');status.setAttribute('role','status');
 dialog.append(heading,toolbar,legend,content,status);document.body.append(dialog);
 function select(key,mode='day'){view=mode;scrollKey='';api.selectDate(key);}
 function move(direction){scrollKey='';const state=api.getState();if(view==='month'){const date=calendarDate(state.selected);date.setDate(1);date.setMonth(date.getMonth()+direction);api.selectDate(calendarDayKey(date));}else api.selectDate(shiftCalendarDay(state.selected,direction*(view==='week'?7:1)));}
 function eventButton(event,className){const button=el('button',undefined,className);button.type='button';button.style.setProperty('--ce-event-color',eventColor(event));button.title=eventLabel(event)+(event.location?' · '+event.location:'');button.setAttribute('aria-label',button.title+(event.writable===false?t('，只读','，唯讀'):''));button.onclick=eventClick=>{eventClick.stopPropagation();api.openEvent(event);};return button;}
 function renderMonth(state){
  const grid=el('div',undefined,'ce-month-grid');grid.setAttribute('role','grid');grid.setAttribute('aria-label',label.textContent);
  for(const [index,name]of weekdays.entries())grid.append(el('div',name,'ce-weekday'+(index===0?' ce-holiday':'')));
  for(const key of monthDays(state.month)){
   const date=calendarDate(key),info=api.almanac(key),cell=el('div',undefined,'ce-month-cell');cell.setAttribute('role','gridcell');cell.classList.toggle('ce-outside',date.getMonth()!==state.month.getMonth());cell.classList.toggle('ce-selected',key===state.selected);cell.classList.toggle('ce-holiday',!!info.holiday||date.getDay()===0);
   const dateButton=el('button',undefined,'ce-date');dateButton.type='button';dateButton.dataset.date=key;dateButton.append(el('span',String(date.getDate())),el('small',info.subtitle||''));dateButton.setAttribute('aria-label',key+' · '+[...new Set([info.holiday,info.term,info.subtitle].filter(Boolean))].join(' · '));dateButton.setAttribute('aria-pressed',String(key===state.selected));if(key===calendarDayKey(new Date()))dateButton.setAttribute('aria-current','date');dateButton.onclick=()=>select(key);
   dateButton.onkeydown=event=>{const offset=({ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7})[event.key];if(offset){event.preventDefault();const target=shiftCalendarDay(key,offset);select(target,'month');content.querySelector('[data-date="'+target+'"]')?.focus();}};
   const daily=dayEvents(state.events,key),items=el('div',undefined,'ce-month-events');for(const event of daily.slice(0,3)){const chip=eventButton(event,'ce-event-chip');chip.textContent=(event.due?'Due · ':event.allDay?'':time(event.start)+' ')+titleOf(event);items.append(chip);}if(daily.length>3){const more=el('button',t('另有 ','另有 ')+(daily.length-3)+t(' 项',' 項'),'ce-more');more.type='button';more.onclick=()=>select(key);items.append(more);}cell.append(dateButton,items);cell.onclick=event=>{if(event.target===cell||event.target===items)select(key);};grid.append(cell);
  }content.append(grid);
 }
 function renderTimeline(state){
  const keys=view==='week'?weekDays(state.selected):[state.selected],scroll=el('div',undefined,'ce-time-scroll'),table=el('div',undefined,'ce-time-table'+(view==='week'?' ce-week-table':''));table.style.setProperty('--ce-days',keys.length);
  const header=el('div',undefined,'ce-time-header');header.append(el('div',t('本地时间','本機時間'),'ce-time-zone'));
  for(const key of keys){const date=calendarDate(key),b=el('button',undefined,'ce-time-date');b.type='button';b.append(el('small',t('星期','星期')+weekdays[date.getDay()]),el('strong',String(date.getDate())));b.classList.toggle('ce-holiday',date.getDay()===0||!!api.almanac(key).holiday);if(key===calendarDayKey(new Date()))b.setAttribute('aria-current','date');b.setAttribute('aria-label',key);b.onclick=()=>select(key);header.append(b);}
  const allDay=el('div',undefined,'ce-all-day');allDay.append(el('small',t('全天','全日'),'ce-time-zone'));for(const key of keys){const day=el('div',undefined,'ce-all-day-column');for(const event of dayEvents(state.events,key).filter(event=>event.allDay)){const chip=eventButton(event,'ce-event-chip');chip.textContent=titleOf(event);day.append(chip);}allDay.append(day);}
  const body=el('div',undefined,'ce-time-grid'),hours=el('div',undefined,'ce-hours');for(let hour=0;hour<24;hour++){const tick=el('span',String(hour).padStart(2,'0')+':00');tick.style.top=(hour*48)+'px';hours.append(tick);}body.append(hours);
  for(const key of keys){const column=el('div',undefined,'ce-time-column');column.setAttribute('aria-label',key);for(const item of timedEventLayout(state.events,key)){const button=eventButton(item.event,'ce-time-event');button.style.top=(item.start/60*48)+'px';button.style.height=(Math.max(30,item.layoutEnd-item.start)/60*48-2)+'px';button.style.left='calc('+item.lane+'/'+item.columns+' * 100% + 2px)';button.style.width='calc(100% / '+item.columns+' - 4px)';button.append(el('strong',titleOf(item.event)),el('small',(item.event.due?'Due · ':'')+time(item.event.start)+(item.event.due?'':'–'+time(item.event.end))));if(item.event.location)button.append(el('small',item.event.location));column.append(button);}
   if(key===calendarDayKey(new Date())){const current=el('div',undefined,'ce-now');current.style.top=((new Date().getHours()*60+new Date().getMinutes())/60*48)+'px';current.setAttribute('aria-label',t('当前时间','目前時間'));column.append(current);}body.append(column);
  }
  table.append(header,allDay,body);scroll.append(table);content.append(scroll);
  const key=view+':'+keys[0];const sameRange=scrollKey===key;scroll.scrollTop=sameRange?scrollTop:Math.max(0,8*48-24);scroll.scrollLeft=sameRange?scrollLeft:Math.max(0,(keys.indexOf(state.selected)-1)*(table.scrollWidth-52)/keys.length);scrollKey=key;scrollTop=scroll.scrollTop;scrollLeft=scroll.scrollLeft;scroll.onscroll=()=>{scrollTop=scroll.scrollTop;scrollLeft=scroll.scrollLeft;};
  if(!state.events.some(event=>keys.some(key=>dayEvents([event],key).length)))status.textContent+=' · '+t('这段时间暂无日程','這段時間暫無日程');
 }
 function render(){
  if(!dialog.open)return;const state=api.getState(),locale=sc()?'zh-CN':'zh-HK';headingText.textContent=t('日历','日曆');close.setAttribute('aria-label',t('关闭放大日历','關閉放大日曆'));close.title=close.getAttribute('aria-label');today.textContent=t('今天','今天');
  views.setAttribute('aria-label',t('日历视图','日曆檢視'));for(const [mode,button]of tabs){button.textContent=({month:t('月','月'),week:t('周','週'),day:t('日','日')})[mode];button.setAttribute('aria-pressed',String(view===mode));}
  prev.setAttribute('aria-label',view==='month'?t('上个月','上個月'):view==='week'?t('上一周','上一週'):t('前一天','前一天'));next.setAttribute('aria-label',view==='month'?t('下个月','下個月'):view==='week'?t('下一周','下一週'):t('后一天','後一天'));
  refresh.setAttribute('aria-label',t('刷新日历','重新整理日曆'));accounts.setAttribute('aria-label',t('日历账号与显示','日曆帳戶與顯示'));add.setAttribute('aria-label',t('新增日程','新增日程'));refresh.loading=state.loading;
  label.textContent=view==='month'?state.month.toLocaleDateString(locale,{year:'numeric',month:'long'}):view==='day'?calendarDate(state.selected).toLocaleDateString(locale,{year:'numeric',month:'long',day:'numeric',weekday:'long'}):weekDays(state.selected).map(calendarDate).filter((_,i)=>i===0||i===6).map(date=>date.toLocaleDateString(locale,{year:'numeric',month:'short',day:'numeric'})).join(' – ');
  legend.replaceChildren();const seen=new Set();for(const event of state.events){const id=event.provider+':'+event.calendar;if(seen.has(id))continue;seen.add(id);const item=el('span',event.calendarName||event.provider);item.style.setProperty('--ce-event-color',eventColor(event));legend.append(item);}if(!seen.size)legend.append(el('span',t('显示已选日历；可通过账号按钮连接或选择日历。','顯示已選日曆；可透過帳戶按鈕連接或選擇日曆。')));
  status.textContent=state.loading?t('正在更新日程…','正在更新日程…'):state.errors.length?state.errors.join('；'):state.lastUpdated?t('更新：','更新：')+state.lastUpdated.toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit'}):'';
  content.replaceChildren();if(view==='month')renderMonth(state);else renderTimeline(state);
 }
 dialog.addEventListener('opened',render);const timer=setInterval(()=>{if(dialog.open&&!document.hidden&&view!=='month')render();},60000);window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
 return {open(){view='month';scrollKey='';dialog.open=true;render();},render,dialog};
}
