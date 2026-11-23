import assert from 'node:assert/strict';
import {identifySite,pageMetadata,pageURL,publicAddress,publicPage} from '../server/public-page.js';
import {githubCards,bilibiliCards,youtubeCards} from '../server/site-content.js';
import handler from '../api/sync.js';
import {sanitizePreset} from '../js/preset-schema.js';
const html=`<html><head><base href="/assets/"><title>Example &amp; Test &#x1f30d;</title><link href="/wrong.png" rel="stylesheet"><link rel="shortcut icon" href="brand.svg"><link rel="apple-touch-icon" href="touch.png"></head></html>`;
const meta=pageMetadata(html,'https://example.test/path');assert.equal(meta.title,'Example & Test 🌍');assert.deepEqual(meta.icons,['https://example.test/assets/brand.svg','https://example.test/assets/touch.png']);
assert.equal(pageMetadata('<script>"<title>Wrong</title>"</script><meta property="og:title" content="Real">','https://example.test').title,'Real');
for(const url of ['file:///etc/passwd','https://user:password@example.test','http://127.0.0.1','https://example.test:8443'])assert.throws(()=>pageURL(url));
for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','192.168.1.1','100.64.0.1','::1','::ffff:127.0.0.1'])assert.equal(publicAddress(ip),false);assert.equal(publicAddress('8.8.8.8'),true);
await assert.rejects(()=>publicPage('https://example.test',{resolve:async()=>[{address:'127.0.0.1'}]}),/公开/);
let calls=[];const read=async url=>{calls.push(url);if(url==='https://example.test/')return {type:'text/html',url,body:Buffer.from(html)};if(url.endsWith('brand.svg'))return {type:'text/html',url,body:Buffer.from('not image')};if(url.endsWith('touch.png'))return {type:'image/png',url,body:Buffer.from('image')};throw Error('not found');};

// Real-world favicon declarations may point at a full-resolution logo (dcw.hk: ~863 KiB).
const largeLogo=Buffer.alloc(883548);let logoLimit=0;
const largeRead=async(url,options={})=>{if(url==='https://www.dcw.hk/reading')return {url,type:'text/html',body:Buffer.from('<title>Reading</title><link rel="icon" href="/img/logo.png">')};assert.equal(url,'https://www.dcw.hk/img/logo.png');logoLimit=options.limit;if(largeLogo.length>options.limit)throw Error('too large');return {url,type:'image/png',body:largeLogo};};
assert.equal((await identifySite('https://www.dcw.hk/reading',largeRead)).icon,'https://www.dcw.hk/img/logo.png');assert.ok(logoLimit>=largeLogo.length&&logoLimit<=2000000,'allow larger logos with a bounded download');

assert.equal((await identifySite('https://example.test/',read)).icon,'https://example.test/assets/touch.png');assert.ok(!calls.some(x=>x.endsWith('favicon.ico')),'declared valid icon wins over root fallback');
const manifestRead=async url=>url==='https://example.test/'?{url,type:'text/html',body:Buffer.from('<title>Manifest</title><link rel="manifest" href="/app.json">')}:url.endsWith('app.json')?{url,type:'application/json',body:Buffer.from('{"icons":[{"src":"logo.png"}]}')}:{url,type:'image/png',body:Buffer.from('image')};assert.equal((await identifySite('https://example.test/',manifestRead)).icon,'https://example.test/logo.png');
assert.equal(githubCards({items:[{full_name:'owner/repo',stargazers_count:50}]}).length,1);assert.equal(githubCards({items:[{full_name:'javascript:bad'}]}).length,0);
assert.equal(bilibiliCards({data:{list:[{bvid:'BV1abc',pic:'https://i0.hdslb.com/image.jpg'}]}})[0].image,'https://i0.hdslb.com/image.jpg');
assert.equal(youtubeCards({contents:[{videoRenderer:{videoId:'abcdefghijk',title:{runs:[{text:'Popular'}]},thumbnail:{thumbnails:[{url:'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg'}]}}}]}).length,1);
const preset=sanitizePreset({localStorage:{navi_discover_platform:'youtube'}});assert.equal(sanitizePreset(JSON.parse(JSON.stringify(preset))).localStorage.navi_discover_platform,'youtube');assert.throws(()=>sanitizePreset({localStorage:{navi_discover_platform:'unknown'}}));
let response;await handler({url:'/api/discover?source=invalid',method:'GET'},{setHeader(){},status(code){this.code=code;return this;},json(body){response={code:this.code,body};}});assert.equal(response.code,400,'public route works without auth configuration');
console.log('PASS: actual declared icons/base paths, title entities, invalid icon fallback, manifest discovery, private-address rejection, safe public content mapping, preset roundtrip and unauthenticated routing.');

const originalFetch=globalThis.fetch,oldKey=process.env.YOUTUBE_API_KEY;
try{
 process.env.YOUTUBE_API_KEY='test-only-key';
 globalThis.fetch=async input=>{const url=new URL(input);assert.equal(url.hostname,'www.googleapis.com');assert.equal(url.searchParams.get('chart'),'mostPopular');assert.equal(url.searchParams.get('regionCode'),'HK');assert.equal(url.searchParams.get('key'),'test-only-key');return Response.json({items:[{id:'abcdefghijk',snippet:{title:'Official popular video',channelTitle:'Channel',thumbnails:{high:{url:'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg'}}},statistics:{viewCount:'1234'}}]});};
 await handler({url:'/api/discover?source=youtube',method:'GET'},{setHeader(){},status(code){this.code=code;return this;},json(body){response={code:this.code,body};}});
 assert.equal(response.code,200);assert.equal(response.body.items[0].title,'Official popular video');assert.ok(!JSON.stringify(response).includes('test-only-key'));
 console.log('PASS: YouTube official mostPopular API uses server-side key, Hong Kong region and safe response mapping.');
}finally{globalThis.fetch=originalFetch;if(oldKey===undefined)delete process.env.YOUTUBE_API_KEY;else process.env.YOUTUBE_API_KEY=oldKey;}
