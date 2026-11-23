import assert from 'node:assert/strict';
import handler,{appleMusicCards,qqMusicCards} from '../server/music.js';
import {sanitizePreset} from '../js/preset-schema.js';
const apple={feed:{results:[{name:'Song',artistName:'Artist',url:'https://music.apple.com/hk/song/123',artworkUrl100:'https://is1-ssl.mzstatic.com/image.jpg',genres:[{name:'Pop'}]},{name:'Bad',url:'javascript:alert(1)'}]}};
const qq={songlist:[{data:{songname:'中文歌',songmid:'Ab123',albummid:'Cd456',singer:[{name:'歌手'}],albumname:'专辑'}},{data:{songname:'Bad',songmid:'../bad'}}]};
assert.equal(appleMusicCards(apple).length,1);assert.equal(qqMusicCards(qq).length,1);assert.equal(qqMusicCards(qq)[0].author,'歌手');assert.equal(qqMusicCards(qq)[0].rank,1);
const original=globalThis.fetch;let calls=0;
globalThis.fetch=async url=>{calls++;return {ok:true,json:async()=>String(url).includes('apple')?apple:qq};};
async function call(source,method='GET'){const res={setHeader(){},status(n){this.code=n;return this;},json(value){this.body=value;return this;}};await handler({url:'/api/music?source='+source,method},res);return res;}
try{assert.equal((await call('apple')).code,200);assert.equal((await call('apple')).code,200);assert.equal(calls,1);assert.equal((await call('qq')).body.items[0].title,'中文歌');assert.equal((await call('other')).code,400);assert.equal((await call('apple','POST')).code,405);}finally{globalThis.fetch=original;}
assert.equal(sanitizePreset({localStorage:{navi_music_platform:'qq'}}).localStorage.navi_music_platform,'qq');assert.throws(()=>sanitizePreset({localStorage:{navi_music_platform:'other'}}));
console.log('PASS: music source mapping, safe links, bounded feeds, upstream cache, validation and preset round trip.');
