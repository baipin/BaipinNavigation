import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {sanitizePreset} from '../js/preset-schema.js';
const source=readFileSync(new URL('../js/quick-access-spacing.js',import.meta.url),'utf8');
for(const [saved,expected] of [[null,0],['120',120],['-60',-60],['999',1000],['99999',4096],['bad',0],['',0]]) {
    let applied;
    const events={};
    const context={window:{addEventListener:(name,fn)=>events[name]=fn},localStorage:{getItem:()=>saved},document:{documentElement:{style:{setProperty:(name,value)=>applied=value}}}};
    vm.runInNewContext(source,context);
    assert.equal(applied,expected+'px');
    events.storage({key:'navi_quick_access_offset',newValue:'80'});
    assert.equal(applied,'80px');
    events.storage({key:null,newValue:null});
    assert.equal(applied,'0px');
}
for(const value of ['-60','0','120','240','2160','4096'])assert.equal(sanitizePreset({localStorage:{navi_quick_access_offset:value}}).localStorage.navi_quick_access_offset,value);
for(const value of ['-64','4100','4.5','NaN','','3'])assert.throws(()=>sanitizePreset({localStorage:{navi_quick_access_offset:value}}));
console.log('PASS: spacing loads before paint, clamps invalid local values, follows cross-tab changes and round-trips validated presets.');
