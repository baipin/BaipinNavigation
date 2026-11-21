const IDS=new Set(['HK','KL','TW','TM','BBI']);
let hlsLoader=null,queue=Promise.resolve();
const frames=new Map();

function loadHls() {
    if(window.Hls)return Promise.resolve(window.Hls);
    if(!hlsLoader)hlsLoader=new Promise((resolve,reject)=>{
        const script=document.createElement('script');script.src='/js/vendor/hls.light.min.js';
        script.onload=()=>window.Hls?resolve(window.Hls):reject(new Error('HLS unavailable'));
        script.onerror=()=>{script.remove();hlsLoader=null;reject(new Error('HLS unavailable'));};document.head.append(script);
    });
    return hlsLoader;
}
const aborted=()=>new DOMException('Aborted','AbortError');

// Resolve after the first decoded frame. The owner must destroy the player when done.
export async function startWebcastVideo(id,{signal,onError}={}) {
    if(!IDS.has(id))throw new Error('Unknown webcast');
    if(signal?.aborted)throw aborted();
    const video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='auto';video.autoplay=true;
    video.setAttribute('aria-hidden','true');video.className='webcast-capture-video';
    let hls=null,finished=false,dead=false,timeout,fail,loaded=()=>{};
    const destroy=()=>{
        if(dead)return;dead=true;clearTimeout(timeout);signal?.removeEventListener('abort',abort);
        video.removeEventListener('loadeddata',loaded);video.removeEventListener('error',error);
        video.pause();hls?.destroy();video.removeAttribute('src');video.load();video.remove();
    };
    const abort=()=>{if(!finished)fail?.(aborted());else destroy();};
    const error=reason=>{const failure=reason instanceof Error?reason:new Error('Webcast unavailable');if(!finished)fail?.(failure);else {destroy();onError?.();}};
    try {
        let Hls=null;
        if(!video.canPlayType('application/vnd.apple.mpegurl')) {
            Hls=await loadHls();if(!Hls.isSupported())throw new Error('HLS not supported');
        }
        if(signal?.aborted)throw aborted();
        return await new Promise((resolve,reject)=>{
            fail=reason=>{if(finished)return;finished=true;destroy();reject(reason);};
            loaded=()=>{
                if(finished || !video.videoWidth || video.readyState<2)return;
                finished=true;clearTimeout(timeout);video.removeEventListener('loadeddata',loaded);
                resolve({video,destroy});
            };
            timeout=setTimeout(()=>fail(new Error('Webcast timeout')),45000);
            signal?.addEventListener('abort',abort,{once:true});video.addEventListener('error',error);
            video.addEventListener('loadeddata',loaded);document.body.append(video);
            const url='/api/webcast?area='+id;
            if(Hls) {
                hls=new Hls({backBufferLength:0,maxBufferLength:2,maxMaxBufferLength:4,liveSyncDurationCount:3,lowLatencyMode:false,manifestLoadingTimeOut:15000,levelLoadingTimeOut:15000,fragLoadingTimeOut:25000,manifestLoadingMaxRetry:2,levelLoadingMaxRetry:2,fragLoadingMaxRetry:3});
                hls.on(Hls.Events.ERROR,(_,data)=>{if(data.fatal){console.warn('Traffic webcast failed',{type:data.type,details:data.details,status:data.response?.code || 0});error(new Error('Webcast '+data.details));}});
                hls.on(Hls.Events.MANIFEST_PARSED,()=>video.play().catch(error));
                hls.loadSource(url);hls.attachMedia(video);
            } else {video.src=url;video.play().catch(error);}
        });
    } catch(error) {destroy();throw error;}
}

export function webcastFrameBlob(video) {
    const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;
    if(!canvas.width || !canvas.height)return Promise.reject(new Error('No frame'));
    canvas.getContext('2d').drawImage(video,0,0);
    return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('No frame')),'image/jpeg',.9));
}

// The five thumbnail captures run sequentially; streams stop as soon as a frame is available.
export function getWebcastFrame(id,{signal,force=false}={}) {
    if(!IDS.has(id))return Promise.reject(new Error('Unknown webcast'));
    const run=async()=>{
        if(signal?.aborted)throw aborted();
        const cached=frames.get(id);if(!force && cached && Date.now()-cached.time<120000)return cached;
        const player=await startWebcastVideo(id,{signal});
        try {
            const blob=await webcastFrameBlob(player.video);if(signal?.aborted)throw aborted();
            const value={blob,url:URL.createObjectURL(blob),time:Date.now()};frames.set(id,value);
            if(cached)setTimeout(()=>URL.revokeObjectURL(cached.url),10000);
            return value;
        } finally {player.destroy();}
    };
    const result=queue.then(run);queue=result.catch(()=>{});return result;
}
