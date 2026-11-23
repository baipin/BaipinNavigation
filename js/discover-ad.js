// One persistent AdSense slot for the video carousel. Reusing the DOM prevents
// language changes, refreshes and platform switches from requesting new impressions.
export function createVideoFeedAd({document:doc=document,window:win=window,Intersection=IntersectionObserver,Resize=ResizeObserver,Mutation=MutationObserver}={}){
 const element=doc.createElement('article');element.className='discover-card discover-video-ad';
 const unit=doc.createElement('ins');unit.className='adsbygoogle';unit.style.display='block';
 unit.setAttribute('data-ad-format','fluid');unit.setAttribute('data-ad-layout-key','-6t+ed+2i-1n-4w');unit.setAttribute('data-ad-client','ca-pub-3664886958722859');unit.setAttribute('data-ad-slot','3546508009');element.append(unit);
 let visible=false,requested=false,failed=false;
 const updateLabel=()=>{const name=doc.documentElement.lang==='zh-CN'?'广告':'廣告';element.setAttribute('aria-label',name);};
 const request=()=>{
  if(requested||failed||!visible||!element.isConnected||element.hidden||unit.getBoundingClientRect().width<250)return;
  // Queue exactly once; the existing page-level AdSense loader processes the queue.
  requested=true;
  try{(win.adsbygoogle=win.adsbygoogle||[]).push({});}catch{failed=true;element.hidden=true;}
 };
 const intersection=new Intersection(entries=>{visible=entries.some(entry=>entry.isIntersecting);request();},{threshold:.01});intersection.observe(element);
 const resize=new Resize(request);resize.observe(unit);
 const status=new Mutation(()=>{if(unit.getAttribute('data-ad-status')==='unfilled')element.hidden=true;});status.observe(unit,{attributes:true,attributeFilter:['data-ad-status']});
 updateLabel();return {element,unit,updateLabel,request,get failed(){return failed;},get unfilled(){return unit.getAttribute('data-ad-status')==='unfilled';},destroy(){intersection.disconnect();resize.disconnect();status.disconnect();}};
}
