// One persistent AdSense slot for the video carousel. Reusing the DOM prevents
// language changes, refreshes and platform switches from requesting new impressions.
export function createVideoFeedAd({document:doc=document,window:win=window,Intersection=IntersectionObserver,Resize=ResizeObserver,Mutation=MutationObserver,onClose=()=>{}}={}){
 const element=doc.createElement('article');element.className='discover-card discover-video-ad';
 const unit=doc.createElement('ins');unit.className='adsbygoogle';unit.style.display='block';
 unit.setAttribute('data-ad-format','fluid');unit.setAttribute('data-ad-layout-key','-6t+ed+2i-1n-4w');unit.setAttribute('data-ad-client','ca-pub-3664886958722859');unit.setAttribute('data-ad-slot','3546508009');element.append(unit);
 const footer=doc.createElement('small');footer.className='discover-video-meta discover-ad-meta';
 const author=doc.createElement('span');author.className='discover-meta-item';const person=doc.createElement('span');person.className='material-icons';person.textContent='person';person.setAttribute('aria-hidden','true');const authorName=doc.createElement('span');author.append(person,authorName);footer.append(author);element.append(footer);
 const close=doc.createElement('mdui-button-icon');close.className='discover-ad-close';close.icon='close';close.hidden=true;close.type='button';footer.append(close);
 let visible=false,requested=false,failed=false,closed=false;
 close.onclick=()=>{if(closed)return;closed=true;element.hidden=true;intersection.disconnect();resize.disconnect();status.disconnect();onClose();};
 const updateLabel=()=>{const name=doc.documentElement.lang==='zh-CN'?'广告':'廣告';element.setAttribute('aria-label',name);const closeLabel=doc.documentElement.lang==='zh-CN'?'关闭本页视频广告':'關閉本頁影片廣告';close.setAttribute('aria-label',closeLabel);close.title=closeLabel;authorName.textContent=doc.documentElement.lang==='zh-CN'?'特别推介':'特別推介';author.setAttribute('aria-label',authorName.textContent);author.title=authorName.textContent;};
 const request=()=>{
  if(closed||requested||failed||!visible||!element.isConnected||element.hidden||unit.getBoundingClientRect().width<250)return;
  // Queue exactly once; the existing page-level AdSense loader processes the queue.
  requested=true;
  try{(win.adsbygoogle=win.adsbygoogle||[]).push({});}catch{failed=true;element.hidden=true;}
 };
 const intersection=new Intersection(entries=>{visible=entries.some(entry=>entry.isIntersecting);request();},{threshold:.01});intersection.observe(element);
 const resize=new Resize(request);resize.observe(unit);
 const status=new Mutation(()=>{if(unit.getAttribute('data-ad-status')==='unfilled')element.hidden=true;});status.observe(unit,{attributes:true,attributeFilter:['data-ad-status']});
 updateLabel();return {element,unit,updateLabel,request,enableClose(){if(!closed)close.hidden=false;},get closed(){return closed;},get failed(){return failed;},get unfilled(){return unit.getAttribute('data-ad-status')==='unfilled';},destroy(){intersection.disconnect();resize.disconnect();status.disconnect();}};
}
