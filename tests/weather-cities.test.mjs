import assert from 'node:assert/strict';
import {normalizeCities} from '../js/weather-cities.js';
import {sanitizePreset} from '../js/preset-schema.js';
const city={name:'香港',country:'中国',latitude:22.3,longitude:114.2};
assert.deepEqual(normalizeCities([city]),[city]);assert.deepEqual(normalizeCities([]),[]);
for(const cities of [null,{},Array(21).fill(city),[{...city,latitude:91}],[{...city,longitude:NaN}],[{...city,name:''}],[{...city,country:4}]])assert.throws(()=>normalizeCities(cities));
const preset=sanitizePreset({localStorage:{navi_weather_cities:JSON.stringify([city])}});assert.deepEqual(JSON.parse(preset.localStorage.navi_weather_cities),[city]);assert.deepEqual(sanitizePreset(JSON.parse(JSON.stringify(preset))),preset);
for(const pinned of [true,false]){const value={...city,pinned};assert.deepEqual(normalizeCities([value]),[value]);const exported=sanitizePreset({localStorage:{navi_weather_cities:JSON.stringify([value])}});assert.deepEqual(JSON.parse(sanitizePreset(JSON.parse(JSON.stringify(exported))).localStorage.navi_weather_cities),[value]);}
for(const pinned of ['true',1,null,{}])assert.throws(()=>normalizeCities([{...city,pinned}]));
console.log('PASS: city validation, empty list, maximum length, coordinate bounds and import/export round trip.');
