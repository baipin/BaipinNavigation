import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseRadar,parseSatellite,rainfallCandidates} from '../api/weather-imagery.js';
const context={window:{}};vm.runInNewContext(fs.readFileSync(new URL('../js/aed-wait.js',import.meta.url),'utf8'),context);
const level=context.window.naviWaitLevel;
for(const [text,want] of [['18 分鐘','short'],['0.5 小時','short'],['1 小時','medium'],['2 小時 59 分鐘','medium'],['3 小時','long'],['超過 7.5 小時','long'],['--','unknown'],['服務暫停','unknown']])assert.equal(level(text),want,text);
const radar=parseRadar({radar:{range0:{image:['picture[0][0]="rad_256_png/2d256nradar_202611220048.jpg";','picture[0][1]="rad_256_png/2d256nradar_202611220054.jpg";','picture[0][2]="https://evil.test/image.jpg";']}}});
assert.equal(radar.length,2);assert.equal(radar.at(-1).time,'202611220054');
assert.throws(()=>parseRadar({radar:{range0:{image:['alert(1)']}}}));
const satellite=parseSatellite('var infrared_h8_img=[["h8_ir_x4M_20261121164000.jpg","H8/9 2026-11-22 00:40 HKT",1,new Date(1795250400000)],["h8_ir_x4M_20261121163000.jpg","H8/9",1,new Date(1795249800000)]];');
assert.equal(satellite.at(-1).time,'202611211640');assert.equal(satellite.at(-1).utc,true);assert.equal(satellite.length,2);
assert.throws(()=>parseSatellite('alert(1)'));
console.log('PASS: AED time parsing, wait thresholds, safe radar/satellite extraction, chronological ordering and UTC timestamps.');

const rain=rainfallCandidates(Date.parse("2026-11-22T00:05:00+08:00"));
assert.equal(rain[0].time,"202611212345");assert.equal(rain[3].time,"202611212300");assert.ok(rain.every(x=>/^https:\/\/www\.hko\.gov\.hk\/wxinfo\/rainfall\/cokrig_barnes\/rfmap\d{12}c\.png$/.test(x.url)));
