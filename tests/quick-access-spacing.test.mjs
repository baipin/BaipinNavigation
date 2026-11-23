import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {sanitizePreset} from '../js/preset-schema.js';
const source=readFileSync(new URL('../js/quick-access-spacing.js',import.meta.url),'utf8');
function boot(saved,height=800,legacy=null){
 let applied;const events={};const values={navi_quick_access_offset_vh:saved,navi_quick_access_offset:legacy};
 const context={window:{innerHeight:height,CSS:{supports:()=>true},addEventListener:(name,fn)=>events[name]=fn},localStorage:{getItem:key=>values[key]??null},document:{documentElement:{style:{setProperty:(name,value)=>applied=value}}}};
 vm.runInNewContext(source,context);
 return {get applied(){return applied;},events,values};
}
for(const [saved,expected] of [[null,0],['50',50],['-8',-8],['999',100],['bad',0],['',0]]) {
 const page=boot(saved);assert.equal(page.applied,expected+'svh');
 page.values.navi_quick_access_offset_vh='80';page.events.storage({key:'navi_quick_access_offset_vh'});assert.equal(page.applied,'80svh');
 page.values.navi_quick_access_offset_vh=null;page.events.storage({key:null});assert.equal(page.applied,'0svh');
}
assert.equal(boot(null,800,'240').applied,'30svh');
assert.equal(boot(null,800,'4096').applied,'100svh');
for(const height of [667,844,1080,2160])assert.equal(boot('75',height).applied,'75svh');
for(const value of ['-8','0','30','100'])assert.equal(sanitizePreset({localStorage:{navi_quick_access_offset_vh:value}}).localStorage.navi_quick_access_offset_vh,value);
for(const value of ['-9','101','4.5','NaN',''])assert.throws(()=>sanitizePreset({localStorage:{navi_quick_access_offset_vh:value}}));
assert.equal(sanitizePreset({localStorage:{navi_quick_access_offset:'4096'}}).localStorage.navi_quick_access_offset,'4096');
console.log('PASS: viewport-relative spacing, stable mobile units, legacy migration, cross-tab updates and preset validation.');
