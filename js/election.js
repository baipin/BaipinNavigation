const DAY='2026-11-28',END=Date.parse('2026-11-29T00:00:00+08:00');
const t=(sc,tc)=>document.documentElement.lang==='zh-CN'?sc:tc;
const node=(tag,text,className)=>{const el=document.createElement(tag);if(text)el.textContent=text;if(className)el.className=className;return el;};
const board=document.getElementById('election-board');
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())===DAY;
const enabled=()=>today()&&window.naviWidgets?.enabled('election')!==false;
const icon=name=>{const el=node('span',name,'material-icons');el.setAttribute('aria-hidden','true');return el;};
const card=node('div',null,'card-glass election-card'),head=node('div',null,'election-head'),title=node('strong'),subtitle=node('p'),heading=node('div');heading.append(title,subtitle);
const details=node('mdui-button');details.variant='tonal';details.icon='how_to_vote';const refresh=node('mdui-button-icon');refresh.icon='refresh';head.append(icon('how_to_vote'),heading,refresh,details);
const summary=node('div',null,'election-summary'),meta=node('small',null,'election-meta');card.append(head,summary,meta);board.append(card);
const dialog=node('mdui-dialog');dialog.id='election-dialog';dialog.setAttribute('close-on-overlay-click','');const dialogHead=node('div',null,'election-dialog-head');dialogHead.slot='headline';const dialogTitle=node('span'),close=node('mdui-button-icon');close.icon='close';close.onclick=()=>dialog.open=false;dialogHead.append(dialogTitle,close);
const intro=node('p'),select=node('select'),results=node('div'),sources=node('div',null,'election-sources'),news=node('div',null,'election-announcements');select.className='election-select';dialog.append(dialogHead,intro,select,results,news,sources);document.body.append(dialog);
let data=null,error='',timer=null,controller=null,loading=false,visible=false,selected='';
const dates=value=>value?new Date(value).toLocaleTimeString(document.documentElement.lang==='zh-CN'?'zh-CN':'zh-HK',{hour:'2-digit',minute:'2-digit'}):'';
function phase(){if(Date.now()<Date.parse('2026-11-28T08:00:00+08:00'))return t('投票尚未开始','投票尚未開始');if(Date.now()<Date.parse('2026-11-28T16:00:00+08:00'))return t('投票进行中','投票進行中');return t('等待开票资料','等待開票資料');}
function candidateList(race,compact=false){const block=node('article',null,'election-race');block.append(node('strong',race.name));const candidates=compact?race.candidates.slice(0,2):race.candidates;for(const candidate of candidates){const row=node('div',null,'election-candidate'),name=node('span',candidate.name),votes=node('strong',Number(candidate.votes).toLocaleString());if(candidate.party)name.append(node('small',candidate.party));row.append(name,votes);block.append(row);}return block;}
function source(label,url){try{if(!/^https:$/.test(new URL(url).protocol))return;}catch{return;}const a=node('a',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.append(icon('open_in_new'));sources.append(a);}
function render(){
 board.hidden=!enabled();title.textContent=t('台湾九合一 · 县市长选举','台灣九合一 · 縣市長選舉');dialogTitle.textContent=t('2026 台湾地方选举看板','2026 台灣地方選舉看板');details.textContent=t('查看详情','查看詳情');close.setAttribute('aria-label',t('关闭','關閉'));refresh.setAttribute('aria-label',t('刷新选举资料','更新選舉資料'));select.setAttribute('aria-label',t('选择县市','選擇縣市'));subtitle.textContent='2026.11.28 · UTC+8';
 summary.replaceChildren();sources.replaceChildren();news.replaceChildren();results.replaceChildren();select.replaceChildren();
 const available=!!data?.resultsAvailable&&data.races?.length;
 if(available){for(const race of data.races.slice(0,6))summary.append(candidateList(race,true));}
 else{const message=node('div',null,'election-wait');message.append(icon(error?'cloud_off':'schedule'),node('strong',error?t('暂时无法读取','暫時無法讀取'):phase()),node('span',error||t('官方票数尚未公布，公布前不显示估算或模拟票数。','官方票數尚未公布，公布前不顯示估算或模擬票數。')));summary.append(message);}
 meta.textContent=(data?.checkedAt?t('检查时间 ','檢查時間 ')+dates(data.checkedAt)+' · ':'')+t('中央选举委员会 · 每分钟检查 · 点按查看详情','中央選舉委員會 · 每分鐘檢查 · 點按查看詳情');
 intro.textContent=available?t('仅展示来源已发布的票数；领先不等于当选，正式结果以中选会公告为准。','僅展示來源已發布的票數；領先不等於當選，正式結果以中選會公告為準。'):t('投票时间为 08:00–16:00（台湾时间）。目前尚无本站可读取的官方开票票数；以下入口可查看选务与开票发布情况。','投票時間為 08:00–16:00（台灣時間）。目前尚無本站可讀取的官方開票票數；以下入口可查看選務與開票發布情況。');
 select.hidden=!available;
 if(available){for(const race of data.races){const option=node('option',race.name);option.value=race.name;select.append(option);}if(!data.races.some(race=>race.name===selected))selected=data.races[0].name;select.value=selected;const race=data.races.find(race=>race.name===selected);if(race)results.append(candidateList(race));}
 else{results.append(node('p',error||phase(),'election-empty'));}
 if(data?.announcements?.length){news.append(node('h3',t('中选会公告','中選會公告')));for(const item of data.announcements){const a=node('a',item.title);a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';a.append(icon('open_in_new'));news.append(a);}}
 if(data?.resultsPage)source(t('官方开票页面','官方開票頁面'),data.resultsPage);
 source(t('中选会选举专区','中選會選舉專區'),'https://info.cec.gov.tw/vote2026/');source(t('中央社即时开票','中央社即時開票'),'https://www.cna.com.tw/topic/newstopic/5144.aspx');
}
function stop(){clearTimeout(timer);timer=null;controller?.abort();controller=null;}
function active(){return enabled()&&!document.hidden&&(visible||dialog.open);}
function schedule(){clearTimeout(timer);if(active())timer=setTimeout(()=>void load(),60000);}
async function load(){if(!active()||loading)return;loading=true;error='';refresh.loading=true;controller=new AbortController();try{const response=await fetch('/api/sync?content=election',{cache:'no-store',signal:controller.signal});if(!response.ok)throw Error();const result=await response.json();if(!result.event||result.event.date!==DAY)throw Error();if(!active())return;data=result;}catch(err){if(err.name!=='AbortError'){error=t('选举资料暂时无法读取，请查看官方页面。','選舉資料暫時無法讀取，請查看官方頁面。');data=null;}}finally{loading=false;controller=null;refresh.loading=false;render();schedule();}}
function show(){if(!enabled())return;dialog.open=true;render();void load();}
card.addEventListener('click',event=>{if(!event.composedPath().includes(refresh))show();});details.onclick=event=>{event.stopPropagation();show();};refresh.onclick=event=>{event.stopPropagation();void load();};select.onchange=()=>{selected=select.value;render();};
dialog.addEventListener('closed',()=>{if(!visible)stop();else schedule();});
const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(active())void load();else stop();},{rootMargin:'150px'});observer.observe(board);
document.addEventListener('visibilitychange',()=>{if(active())void load();else stop();});document.addEventListener('navi-widgets-change',()=>{render();if(active())void load();else stop();});new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
render();const untilEnd=END-Date.now();if(untilEnd>0&&untilEnd<2147483647)setTimeout(()=>{stop();board.hidden=true;dialog.open=false;observer.disconnect();},untilEnd);
