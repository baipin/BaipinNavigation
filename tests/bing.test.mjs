import assert from 'node:assert/strict';
import handler,{bingImage} from '../api/bing.js';
import {parseCameraPreference,cameraRefreshInterval} from '../js/camera-background-model.js';
import {sanitizePreset} from '../js/preset-schema.js';
const fixture={images:[{urlbase:'/th?id=OHR.Example_ZH-CN123',startdate:'20261122',title:'每日图片',copyright:'Example © Photographer',copyrightlink:'https://www.bing.com/search?q=example'}]};
const image=bingImage(fixture);assert.equal(image.url,'https://www.bing.com/th?id=OHR.Example_ZH-CN123_1920x1080.jpg');assert.equal(image.copyright,'Example © Photographer');
for(const urlbase of ['https://evil.test/image','/th?id=OHR.a&redirect=evil','/../private'])assert.throws(()=>bingImage({images:[{...fixture.images[0],urlbase}]}));
const value={source:'bing',id:'DAILY',refresh:true};assert.deepEqual(parseCameraPreference(value),value);assert.equal(cameraRefreshInterval('bing'),3600000);assert.throws(()=>parseCameraPreference({...value,id:'OTHER'}));
const preset=sanitizePreset({localStorage:{navi_camera_background:JSON.stringify(value)}});assert.deepEqual(parseCameraPreference(preset.localStorage.navi_camera_background),value);
const original=globalThis.fetch;let fetched='';globalThis.fetch=async url=>{fetched=String(url);return new Response(JSON.stringify(fixture));};
const run=async(method,query)=>{const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};await handler({method,query},res);return res;};
try{assert.equal((await run('GET',{lang:'tc'})).code,200);assert.ok(fetched.endsWith('mkt=zh-HK'));assert.equal((await run('POST',{})).code,405);}finally{globalThis.fetch=original;}
console.log('PASS: Bing official image validation, copyright, language, preference round trip, refresh interval and GET-only handler.');
