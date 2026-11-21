import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {CAMERA_BACKGROUND_KEY,parseCameraPreference,cameraImageUrl,cameraRefreshInterval} from '../js/camera-background-model.js';
import {PRESET_KEYS,sanitizePreset} from '../js/preset-schema.js';
assert.ok(PRESET_KEYS.includes(CAMERA_BACKGROUND_KEY));
for(const source of ['hko','traffic']) {
    const value={source,id:source==='hko'?'HKO':'H429F',refresh:false};
    const preset=sanitizePreset({localStorage:{[CAMERA_BACKGROUND_KEY]:JSON.stringify(value)},cookies:{homepage_bg:'https://example.com/fallback.jpg'}});
    assert.deepEqual(parseCameraPreference(preset.localStorage[CAMERA_BACKGROUND_KEY]),value);
    assert.deepEqual(sanitizePreset(JSON.parse(JSON.stringify(preset))),preset);
    assert.equal(preset.cookies.homepage_bg,'https://example.com/fallback.jpg');
}
assert.equal(parseCameraPreference(null),null);
assert.equal(parseCameraPreference({source:'hko',id:'HKO'}).refresh,true);
for(const value of [{source:'external',id:'HKO'},{source:'hko',id:'../HKO'},{source:'traffic',id:'https://private.example'},{source:'traffic',id:'H429F',refresh:'false'},null,[]]) {
    if(value!==null)assert.throws(()=>parseCameraPreference(value));
}
assert.throws(()=>sanitizePreset({localStorage:{[CAMERA_BACKGROUND_KEY]:'{"source":"hko","id":"../bad"}'}}));
assert.equal(cameraImageUrl('hko','HKO'),'https://www.hko.gov.hk/wxinfo/aws/hko_mica/hko/latest_HD_HKO.jpg');
assert.equal(cameraImageUrl('hko','HKO',true),'https://www.hko.gov.hk/wxinfo/aws/hko_mica/hko/latest_HKO_thumb.jpg');
assert.equal(cameraImageUrl('traffic','H429F'),'https://tdcctv.data.one.gov.hk/H429F.JPG');
assert.equal(cameraRefreshInterval('hko'),180000);assert.equal(cameraRefreshInterval('traffic'),120000);
const catalog=JSON.parse(await fs.readFile(new URL('../data/background-cameras.json',import.meta.url),'utf8'));
for(const source of ['hko','traffic']) {
    assert.equal(new Set(catalog[source].map(x=>x.id)).size,catalog[source].length);
    for(const item of catalog[source]){assert.ok(item.sc && item.tc);assert.ok(cameraImageUrl(source,item.imageId || item.id).startsWith('https://'));}
}
assert.equal(catalog.hko.length,34);assert.equal(catalog.traffic.length,973);
console.log('PASS: camera configuration validation, safe official URLs, thumbnails, refresh intervals, full catalog and preset round trip.');
