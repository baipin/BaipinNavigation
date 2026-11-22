import {randomBytes} from 'node:crypto';
import {sanitizePreset,MAX_PRESET_BYTES} from '../js/preset-schema.js';
import {CalendarError} from './calendar-service.js';
const FOLDER='BaipinNavigation-Presets',PREFIX='baipin-navigation-presets-v1-';
const token=value=>{if(typeof value!=='string'||!/^[A-Za-z0-9_-]{1,200}$/.test(value))throw new CalendarError(502,'飞书预设文件标识不正确');return value;};
export function feishuPresetStorage(call,download){
 async function list(data,folder=''){
  const rows=[];let next='';for(let page=0;page<10;page++){
   const result=await call(data,'/drive/v1/files?'+new URLSearchParams({page_size:'200',folder_token:folder,order_by:'EditedTime',direction:'DESC',...(next?{page_token:next}:{})}));rows.push(...(result.files||[]));if(!result.has_more)return rows;next=result.next_page_token;if(typeof next!=='string'||!next)throw new CalendarError(502,'飞书云空间分页格式不正确');
  }throw new CalendarError(503,'飞书文件数量过多，请整理后重试');
 }
 async function folder(data,create=false){
  const roots=(await list(data)).filter(x=>x.type==='folder'&&x.name===FOLDER);if(roots.length>1)throw new CalendarError(409,'飞书存在多个本站预设文件夹，请先整理重复文件夹');if(roots.length)return token(roots[0].token);if(!create)return null;
  const made=await call(data,'/drive/v1/files/create_folder',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:FOLDER,folder_token:''})});return token(made.token);
 }
 async function files(data,parent){return (await list(data,parent)).filter(x=>x.type==='file'&&new RegExp('^'+PREFIX+'[a-f0-9]{36}\\.json$').test(x.name)).sort((a,b)=>Number(b.modified_time||b.created_time)-Number(a.modified_time||a.created_time)||b.name.localeCompare(a.name));}
 async function read(data){
  const parent=await folder(data);if(!parent)return {exists:false,revision:null};const versions=await files(data,parent),file=versions[0];if(!file)return {exists:false,revision:null,folder:parent};
  const raw=await download(data,'/drive/v1/files/'+token(file.token)+'/download');if(Buffer.byteLength(raw)>MAX_PRESET_BYTES+4096)throw new CalendarError(400,'飞书预设文件过大');let value;try{value=JSON.parse(raw);}catch{throw new CalendarError(400,'飞书预设文件格式不正确');}
  if(typeof value.revision!=='string'||file.name!==PREFIX+value.revision+'.json'||!Number.isFinite(Date.parse(value.updatedAt)))throw new CalendarError(400,'飞书预设版本格式不正确');return {exists:true,revision:value.revision,updatedAt:value.updatedAt,preset:sanitizePreset(value.preset),folder:parent,id:token(file.token)};
 }
 async function write(data,body){
  const preset=sanitizePreset(body.preset),current=await read(data);if((body.revision??null)!==current.revision)throw new CalendarError(409,'云端预设已改变，请先重新同步');
  const parent=current.folder||await folder(data,true),value={revision:Date.now().toString(16).padStart(12,'0')+randomBytes(12).toString('hex'),updatedAt:new Date().toISOString(),preset},raw=JSON.stringify(value),form=new FormData();form.set('file_name',PREFIX+value.revision+'.json');form.set('parent_type','explorer');form.set('parent_node',parent);form.set('size',String(Buffer.byteLength(raw)));form.set('file',new Blob([raw],{type:'application/json'}),PREFIX+value.revision+'.json');
  const uploaded=await call(data,'/drive/v1/files/upload_all',{method:'POST',body:form});token(uploaded.file_token);
  // Verify the new version before removing its predecessor. Concurrent versions are never overwritten.
  const latest=await read(data);if(latest.revision!==value.revision)throw new CalendarError(409,'另一台设备刚刚更新了飞书预设，请重新同步');
  if(current.id&&current.id!==uploaded.file_token)try{await call(data,'/drive/v1/files/'+token(current.id)+'?type=file',{method:'DELETE'});}catch{}
  return {revision:value.revision,updatedAt:value.updatedAt};
 }
 async function clear(data,body){
  const current=await read(data);if(!current.exists)return {ok:true};if(body.revision!==current.revision)throw new CalendarError(409,'云端预设已改变，请重新确认清除');
  // Delete only recognized preset files, including retained concurrent versions; leave other folder contents alone.
  for(const file of await files(data,current.folder))await call(data,'/drive/v1/files/'+token(file.token)+'?type=file',{method:'DELETE'});
  if((await read(data)).exists)throw new CalendarError(409,'云端出现新预设，请重新确认清除');return {ok:true};
 }
 return {read,write,clear};
}
