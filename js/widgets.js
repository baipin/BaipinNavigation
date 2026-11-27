// Homepage visibility preferences and viewport-gated background work.
(() => {
 const catalog=[
 ['election','选举看板','選舉看板','#election-board'],['quick','快捷访问','快速訪問','#main-container'],['poem','拾遗','拾遺','#jinrishici-sentence','.card-glass'],['weather','香港天气','香港天氣','#weather-info','.card-glass'],['calendar','日历','日曆','#home-calendar'],['news','香港新闻 / RSS','香港新聞 / RSS','#news-marquee','.card-glass'],['feed','CITY FEED','CITY FEED','#city-ticker'],['journeys','行车时间','行車時間','#city-journey-grid','article'],['rails','港铁','港鐵','#city-rails','article'],['flights','机场航班','機場航班','#city-flights'],['traffic','交通消息','交通消息','#city-news','article'],['bus','巴士到站','巴士到站','#city-bus-results','article'],['aed','急症室等候','急症室輪候','#city-aed','article'],['holidays','公众假期','公眾假期','#city-holidays','article'],['boundary','陆路口岸','陸路口岸','#city-boundary','article'],['repos','热门 GitHub 仓库','熱門 GitHub 儲存庫','#discover-repos','.discover-panel'],['videos','热门影片','熱門影片','#discover-videos','.discover-panel'],['music','热门音乐','熱門音樂','#discover-music'],['finance','汇率摘要','匯率摘要','#city-finance']
 ];
 const key='navi_widgets';let preferences={};try{preferences=JSON.parse(localStorage.getItem(key))||{};}catch{}
 const rules=document.createElement('style');document.head.append(rules);
 function enabled(id){return preferences[id]!==false;}
 function target(id){const row=catalog.find(x=>x[0]===id),node=row&&document.querySelector(row[3]);return row?.[4]?node?.closest(row[4]):node;}
 function apply(){
  rules.textContent=catalog.filter(row=>!enabled(row[0])).map(row=>`${row[4]?row[4]+':has('+row[3]+')':row[3]}{display:none!important}`).join('\n');
  // Quick Access's calendar is independent of the bookmark section switch.
  if(!enabled('quick')&&!enabled('calendar'))rules.textContent+='\n#main-container{display:none!important}';
  else if(!enabled('quick'))rules.textContent+='\n#main-container{display:flex!important;background:transparent!important;border:0!important;padding:0!important;backdrop-filter:none!important}#main-container>:not(#home-calendar){display:none!important}';
  for(const row of catalog){const node=target(row[0]);if(node)node.dataset.widget=row[0];}
  for(const stack of document.querySelectorAll('.side-stack,.city-dashboard,.city-dashboard-grid'))stack.classList.toggle('widgets-empty',![...stack.children].some(node=>getComputedStyle(node).display!=='none'));
 }
 const jobs=new Map();
 function ready(id){const node=target(id);if(!node||!enabled(id)||document.hidden||getComputedStyle(node).display==='none')return false;const rect=node.getBoundingClientRect();return rect.bottom>=-150&&rect.top<=innerHeight+200;}
 function run(id,fn){
  let job=jobs.get(id);if(!job){job={fn,pending:false,loaded:false};jobs.set(id,job);}else job.fn=fn;
  if(!enabled(id)||document.hidden||job.pending)return;
  job.pending=true;job.loaded=true;return Promise.resolve().then(fn).catch(()=>{}).finally(()=>{job.pending=false;});
 }
 let frame=0;function flush(){frame=0;for(const [id,job]of jobs)if(!job.loaded)run(id,job.fn);}
 function schedule(){if(!frame)frame=requestAnimationFrame(flush);}
 function set(id,value){preferences[id]=value;try{localStorage.setItem(key,JSON.stringify(preferences));}catch{}apply();if(value){const job=jobs.get(id);if(job)job.loaded=false;schedule();}document.dispatchEvent(new CustomEvent('navi-widgets-change',{detail:{id,enabled:value}}));}
 window.naviWidgets={catalog,enabled,target,apply,set,run,ready};
 window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule,{passive:true});document.addEventListener('visibilitychange',schedule);
 window.addEventListener('storage',event=>{if(event.key===key||event.key===null){try{preferences=JSON.parse(localStorage.getItem(key))||{};}catch{preferences={};}apply();for(const job of jobs.values())job.loaded=false;schedule();}});
 document.addEventListener('DOMContentLoaded',()=>{apply();schedule();});apply();
})();
