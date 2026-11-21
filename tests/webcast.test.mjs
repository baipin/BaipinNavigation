import assert from 'node:assert/strict';
import handler,{rewriteWebcastPlaylist} from '../api/webcast.js';
import {parseCameraPreference,cameraImageUrl,cameraRefreshInterval} from '../js/camera-background-model.js';
import {sanitizePreset} from '../js/preset-schema.js';
const base='https://www.hkemobility.gov.hk/api/cctv/hk/';
const playlist='#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=100\nchunklist_w123.m3u8?deviceid=WEBSITE&token=temporary-token\n';
assert.ok(rewriteWebcastPlaylist(playlist,'HK',base).includes('/api/webcast?area=HK&file=chunklist_w123.m3u8&token=temporary-token'));
assert.ok(rewriteWebcastPlaylist('#EXTM3U\nmedia_w123_10.ts?token=temporary-token','HK',base).includes('file=media_w123_10.ts'));
for(const uri of ['https://evil.example/media_w1_1.ts','http://127.0.0.1/media_w1_1.ts','../kl/media_w1_1.ts','../../../secret','file:///etc/passwd'])assert.throws(()=>rewriteWebcastPlaylist('#EXTM3U\n'+uri,'HK',base));
for(const source of ['webcast','webcast-live'])for(const id of ['HK','KL','TW','TM','BBI']) {
    const value=parseCameraPreference({source,id,refresh:false});
    assert.equal(value.refresh,source==='webcast-live');assert.equal(cameraRefreshInterval(source),120000);assert.equal(cameraImageUrl(source,id),'/api/webcast?area='+id);
    const preset=sanitizePreset({localStorage:{navi_camera_background:JSON.stringify(value)}});assert.deepEqual(parseCameraPreference(preset.localStorage.navi_camera_background),value);
}
assert.throws(()=>parseCameraPreference({source:'webcast',id:'H429F'}));
const original=globalThis.fetch;let calls=0,mode='master';
globalThis.fetch=async(url,options)=>{calls++;assert.equal(new URL(url).origin,'https://www.hkemobility.gov.hk');assert.equal(options.headers.Referer,'https://www.hkemobility.gov.hk/');assert.equal(options.redirect,'error');if(mode==='error')return new Response('offline',{status:503});return new Response(mode==='segment'?new Uint8Array([0x47,1,2,3]):mode==='bad'?'not a playlist':playlist);};
const run=async(query,method='GET')=>{const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(c){this.code=c;return this;},json(v){this.body=v;return this;},send(v){this.body=v;return this;}};await handler({method,query},res);return res;};
try {
    let result=await run({area:'HK'});assert.equal(result.code,200);assert.equal(result.headers['Cache-Control'],'no-store');assert.ok(result.body.includes('file=chunklist_w123.m3u8'));
    for(const query of [{area:'INVALID'},{area:'HK',file:'../secret'},{area:'HK',token:'x&redirect=bad'},{area:'HK',file:'https://evil.example/a.ts'}]) {const before=calls;assert.equal((await run(query)).code,400);assert.equal(calls,before);}
    assert.equal((await run({area:'HK'},'POST')).code,405);
    mode='segment';result=await run({area:'HK',file:'media_w1_1.ts',token:'temporary-token'});assert.equal(result.code,200);assert.equal(result.body[0],0x47);assert.equal(result.headers['Content-Type'],'video/mp2t');
    mode='error';assert.equal((await run({area:'HK'})).code,502);mode='bad';assert.equal((await run({area:'HK'})).code,502);
    console.log('PASS: five webcast areas, static/live preset round trip, mandatory two-minute refresh, playlist rewriting, binary media and upstream/SSRF validation.');
}finally{globalThis.fetch=original;}
