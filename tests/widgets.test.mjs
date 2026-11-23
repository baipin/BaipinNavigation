import assert from 'node:assert/strict';
import {sanitizePreset} from '../js/preset-schema.js';
import {readFileSync} from 'node:fs';
assert.equal(sanitizePreset({localStorage:{navi_widgets:'{"bus":false,"music":true}',navi_music_charts:'{"apple":"jp","qq":"new"}'}}).localStorage.navi_widgets,'{"bus":false,"music":true}');
for(const value of ['{"bad":false}','{"bus":"false"}','[]'])assert.throws(()=>sanitizePreset({localStorage:{navi_widgets:value}}));
for(const value of ['{"apple":"bad"}','[]'])assert.throws(()=>sanitizePreset({localStorage:{navi_music_charts:value}}));
const feed=readFileSync(new URL('../js/city-feed.js',import.meta.url),'utf8');assert.ok(feed.includes("document.createElement('mdui-dialog')"));assert.ok(!feed.includes('stockDialog.showModal'));
console.log('PASS: widget and chart preset validation and native Material dialog migration.');
