import assert from 'node:assert/strict';
import {feishuPresetStorage} from '../server/feishu-preset-storage.js';
import {sanitizePreset} from '../js/preset-schema.js';
let folder=null,files=[],next=0;const raw=new Map(),calls=[];
const preset=sanitizePreset({localStorage:{theme_mode:'dark',bp_v7:'[{"name":"test","url":"https://example.test","icon":"star"}]'}});
async function call(data,path,options={}){
 calls.push({path,method:options.method||'GET'});assert.equal(data.accessToken,'opaque');const url=new URL(path,'https://open.feishu.cn');
 if(url.pathname==='/drive/v1/files/create_folder'){assert.equal(JSON.parse(options.body).folder_token,'');folder='folder_token';return {token:folder};}
 if(url.pathname==='/drive/v1/files/upload_all'){
  assert.equal(options.body.get('parent_type'),'explorer');assert.equal(options.body.get('parent_node'),folder);
  const file=options.body.get('file'),value=await file.text(),token='file_'+(++next);assert.equal(options.body.get('size'),String(Buffer.byteLength(value)));raw.set(token,value);files.unshift({type:'file',token,name:options.body.get('file_name'),modified_time:String(next)});return {file_token:token};
 }
 if(url.pathname==='/drive/v1/files')return {files:url.searchParams.get('folder_token')?files:folder?[{name:'BaipinNavigation-Presets',type:'folder',token:folder}]:[],has_more:false};
 if(options.method==='DELETE'){const token=url.pathname.split('/').at(-1);assert.ok(raw.has(token),'only recognized preset files may be removed');files=files.filter(x=>x.token!==token);raw.delete(token);return {};}
 throw Error('Unexpected test route');
}
const storage=feishuPresetStorage(call,async(data,path)=>raw.get(path.split('/').at(-2))),data={accessToken:'opaque'};
assert.equal((await storage.read(data)).exists,false);
const first=await storage.write(data,{preset,revision:null});assert.ok(first.revision);assert.equal((await storage.read(data)).revision,first.revision);assert.deepEqual((await storage.read(data)).preset,preset);
await assert.rejects(()=>storage.write(data,{preset,revision:'stale'}),/云端预设已改变/);
files.push({type:'file',token:'personal',name:'personal.json',modified_time:'0'});
const second=await storage.write(data,{preset:sanitizePreset({localStorage:{theme_mode:'light'}}),revision:first.revision});assert.notEqual(second.revision,first.revision);assert.equal(raw.size,1,'old preset removed only after new file verifies');assert.ok(files.some(x=>x.token==='personal'));
await assert.rejects(()=>storage.clear(data,{revision:'stale'}),/重新确认/);assert.equal(raw.size,1);
assert.equal((await storage.clear(data,{revision:second.revision})).ok,true);assert.equal(raw.size,0);assert.equal(files.length,1);assert.equal(files[0].token,'personal');assert.equal((await storage.read(data)).exists,false);
assert.equal((await storage.clear(data,{revision:null})).ok,true);assert.ok(calls.some(x=>x.path.includes('upload_all')));
console.log('PASS: Feishu root folder discovery, multipart JSON preset upload, version checking, verify-before-cleanup, stale conflicts, clear only owned preset filenames, retain unrelated files.');
