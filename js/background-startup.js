// Run before styles and third-party scripts so the first paint uses the saved background.
(() => {
 const root=document.documentElement;
 const paint=url=>{const value=url?'url('+JSON.stringify(url)+')':'none';root.style.setProperty('--navi-wallpaper',value);root.style.setProperty('--legal-wallpaper',value);};
 let photo=null,choice=null,cached=null;
 try {const raw=document.cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith('homepage_bg='))?.slice(12);if(raw){const value=decodeURIComponent(raw);let data;try{data=JSON.parse(value);}catch{data={url:value};}const url=new URL(data.url);if(['http:','https:'].includes(url.protocol))photo=url.href;}}catch{}
 try {const raw=localStorage.getItem('navi_camera_background'),value=JSON.parse(raw);if(value&&['hko','traffic','bing','webcast','webcast-live'].includes(value.source)&&/^[A-Z0-9]{2,12}$/.test(value.id)){choice=value.source+':'+value.id;const previous=JSON.parse(sessionStorage.getItem('navi_background_preview'));if(previous?.version===2&&previous?.choice===choice&&new URL(previous.url).protocol==='https:')cached=previous.url;}}catch{}
 if(choice)paint(cached);else if(photo)paint(photo);
 window.naviBackgroundStartup={pending:!!choice,ready(url){this.pending=false;paint(url);try{const value=JSON.parse(localStorage.getItem('navi_camera_background'));if(value&&url?.startsWith('https:'))sessionStorage.setItem('navi_background_preview',JSON.stringify({version:2,choice:value.source+':'+value.id,url}));}catch{}},fallback(){if(!this.pending)return;this.pending=false;if(cached)paint(cached);else if(choice)paint(null);else if(photo)paint(photo);else{root.style.removeProperty('--navi-wallpaper');root.style.removeProperty('--legal-wallpaper');}}};
})();
