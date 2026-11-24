import {randomUUID} from 'node:crypto';
export const TRANSFER_MAX_FILE=512*1024,TRANSFER_MAX_TEXT=20000,TRANSFER_TTL=24*3600000,TRANSFER_MAX_RAW=750000;
export class TransferError extends Error{constructor(status,message){super(message);this.status=status;}}
const PREFIX='baipin-transfer-v1-',PATTERN=/^baipin-transfer-v1-(\d{13})-([a-f0-9-]{36})-(text|file)-([A-Za-z0-9_-]{0,160})\.json$/;
export function transferMeta(name,id,size=0){const m=PATTERN.exec(name||'');if(!m||!Number.isSafeInteger(Number(m[1])))return null;return {id,uuid:m[2],name,kind:m[3],label:Buffer.from(m[4],'base64url').toString('utf8').slice(0,100),createdAt:Number(m[1]),expiresAt:Number(m[1])+TRANSFER_TTL,size};}
export function transferBody(req){
 if(!String(req.headers['content-type']||'').startsWith('application/json'))throw new TransferError(415,'请使用 JSON 请求');
 const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body||{});if(Buffer.byteLength(raw)>TRANSFER_MAX_RAW)throw new TransferError(413,'传输内容过大，文件上限为 512 KB');
 try{const body=JSON.parse(raw);if(!body||typeof body!=='object'||Array.isArray(body))throw Error();return body;}catch{throw new TransferError(400,'传输请求格式不正确');}
}
export function makeTransfer(body,now=Date.now()){
 const base={version:1,id:randomUUID(),createdAt:now,expiresAt:now+TRANSFER_TTL};let record,label;
 if(body.kind==='text'){
  if(typeof body.text!=='string'||!body.text.trim()||body.text.length>TRANSFER_MAX_TEXT)throw new TransferError(400,'文字不能为空，最多 20,000 字');
  record={...base,kind:'text',text:body.text};label=body.text.replace(/\s+/g,' ').slice(0,32);
 }else if(body.kind==='file'){
  if(typeof body.name!=='string'||!body.name.trim()||body.name.length>200||/[\x00-\x1f/\\]/.test(body.name))throw new TransferError(400,'文件名称不正确');
  if(typeof body.base64!=='string'||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(body.base64))throw new TransferError(400,'文件内容不正确');
  const file=Buffer.from(body.base64,'base64');if(!file.length||file.length>TRANSFER_MAX_FILE)throw new TransferError(413,'文件大小须为 1 字节至 512 KB');
  record={...base,kind:'file',name:body.name,base64:body.base64,size:file.length};label=body.name.slice(0,32);
 }else throw new TransferError(400,'传输类型不正确');
 return {record,name:PREFIX+now+'-'+base.id+'-'+record.kind+'-'+Buffer.from(label).toString('base64url')+'.json'};
}
export async function transferAction(req,res,action,store){
 const body=['transfer-send','transfer-delete','transfer-clear'].includes(action)?transferBody(req):null;
 if(action==='transfer-clear'&&body.confirm!==true)throw new TransferError(400,'请确认清空传输暂存区');
 const prepared=action==='transfer-send'?makeTransfer(body):null;
 const rows=await store.list(),now=Date.now(),valid=rows.map(row=>transferMeta(row.name,row.id,row.size)).filter(Boolean);
 if(action==='transfer-clear'){
  let deleted=0,failed=0;const selected=valid.slice(0,40);
  for(let i=0;i<selected.length;i+=4)await Promise.all(selected.slice(i,i+4).map(async row=>{try{await store.remove(row);deleted++;}catch{failed++;}}));
  return res.status(200).json({ok:failed===0,deleted,remaining:failed+Math.max(0,valid.length-selected.length)});
 }
 // Expiry is enforced even when no device is online. Physical cleanup occurs on the next open/request.
 const expired=valid.filter(row=>row.expiresAt<=now);let cleanupPending=false;
 await Promise.all(expired.slice(0,4).map(async row=>{try{await store.remove(row);}catch{cleanupPending=true;}}));
 const active=valid.filter(row=>row.createdAt<=now+60000&&row.expiresAt>now).sort((a,b)=>b.createdAt-a.createdAt);
 if(action==='transfer-list')return res.status(200).json({items:active.slice(0,20).map(({id,kind,label,createdAt,expiresAt,size})=>({id,kind,label,createdAt,expiresAt,size})),cleanupPending:cleanupPending||expired.length>4});
 if(action==='transfer-send'){
  if(active.length>=20)throw new TransferError(409,'暂存区最多保留 20 项，请先删除旧内容');
  const {record,name}=prepared;await store.create(name,JSON.stringify(record));return res.status(200).json({ok:true});
 }
 const supplied=action==='transfer-delete'?body.id:new URL(req.url,'https://localhost').searchParams.get('id');
 if(typeof supplied!=='string'||!supplied||supplied.length>250)throw new TransferError(400,'传输项目标识不正确');
 const entry=active.find(row=>row.id===supplied);if(!entry)throw new TransferError(404,'传输内容已过期或被移除');
 if(action==='transfer-delete'){await store.remove(entry);return res.status(200).json({ok:true});}
 const raw=await store.read(entry);if(typeof raw!=='string'||Buffer.byteLength(raw)>TRANSFER_MAX_RAW)throw new TransferError(400,'传输内容过大或不完整');
 let record;try{record=JSON.parse(raw);}catch{throw new TransferError(400,'传输文件格式不正确');}
 if(record.id!==entry.uuid||record.createdAt!==entry.createdAt||record.expiresAt!==entry.expiresAt||record.kind!==entry.kind)throw new TransferError(400,'传输文件标识不一致');
 makeTransfer(record,record.createdAt); // Validate content and size before returning cloud data.
 return res.status(200).json(record);
}
export function googleTransferStore(data,drive){
 const root='https://www.googleapis.com/drive/v3/files';
 return {
 async list(){const items=[];let next='';for(let page=0;page<5;page++){const query=new URLSearchParams({spaces:'appDataFolder',q:"trashed = false and name contains '"+PREFIX+"'",fields:'nextPageToken,files(id,name,size)',pageSize:'100',...(next?{pageToken:next}:{})});const result=await(await drive(data,root+'?'+query)).json();items.push(...(result.files||[]).map(x=>({id:x.id,name:x.name,size:Number(x.size)||0})));if(!result.nextPageToken)return items;next=result.nextPageToken;}throw new TransferError(503,'暂存项目过多，请到云端清理后重试');},
 async create(name,raw){const boundary='transfer_'+randomUUID();await drive(data,'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body:`--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({name,parents:['appDataFolder']})}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${raw}\r\n--${boundary}--`});},
 async read(row){return boundedText(await drive(data,root+'/'+encodeURIComponent(row.id)+'?alt=media'));},
 async remove(row){await drive(data,root+'/'+encodeURIComponent(row.id),{method:'DELETE'});}
 };
}
export async function boundedText(response){if(!response.ok)throw new TransferError(502,'云端传输内容暂不可用');if(Number(response.headers.get('content-length'))>TRANSFER_MAX_RAW)throw new TransferError(413,'传输文件过大');const reader=response.body.getReader(),chunks=[];let total=0;try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>TRANSFER_MAX_RAW)throw new TransferError(413,'传输文件过大');chunks.push(Buffer.from(value));}}finally{await reader.cancel();}return Buffer.concat(chunks).toString('utf8');}
export function githubTransferStore(data,api){
 const description='Baipin Navigation temporary transfer (v1)';
 async function gist(row){const response=await api(data.accessToken,'/gists/'+encodeURIComponent(row.id)),value=await response.json();if(value.public!==false||String(value.owner?.id)!==String(data.user.id)||value.description!==description||Object.keys(value.files||{}).length!==1||!value.files[row.name])throw new TransferError(403,'此 Gist 不属于本站传输助手');return value;}
 return {
 async list(){const items=[];for(let page=1;page<=10;page++){const rows=await(await api(data.accessToken,'/gists?per_page=100&page='+page)).json();if(!Array.isArray(rows))throw new TransferError(502,'GitHub 返回格式不正确');for(const row of rows)if(row.public===false&&String(row.owner?.id)===String(data.user.id)&&row.description===description&&Object.keys(row.files||{}).length===1){const name=Object.keys(row.files)[0];if(transferMeta(name,row.id))items.push({id:row.id,name,size:row.files[name].size||0});}if(rows.length<100)return items;}throw new TransferError(503,'Gist 数量过多，暂时无法定位传输内容');},
 async create(name,raw){await api(data.accessToken,'/gists',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({description,public:false,files:{[name]:{content:raw}}})});},
 async read(row){const file=(await gist(row)).files[row.name];if(file.truncated||typeof file.content!=='string')throw new TransferError(413,'Gist 内容不完整');return file.content;},
 async remove(row){await gist(row);await api(data.accessToken,'/gists/'+encodeURIComponent(row.id),{method:'DELETE'});}
 };
}
export function microsoftTransferStore(data,graph){
 const base='/me/drive/special/approot:/';
 return {
 async list(){const result=await graph(data,'/me/drive/special/approot/children?$top=200&$select=id,name,size');if(result.status===404)return [];const value=await result.json();if(value['@odata.nextLink'])throw new TransferError(503,'应用空间文件过多，请整理后重试');return (value.value||[]).map(row=>({id:row.id,name:row.name,size:row.size}));},
 async create(name,raw){await graph(data,base+encodeURIComponent(name)+':/content',{method:'PUT',headers:{'Content-Type':'application/json'},body:raw});},
 async read(row){return boundedText(await graph(data,'/me/drive/items/'+encodeURIComponent(row.id)+'/content'));},
 async remove(row){await graph(data,'/me/drive/items/'+encodeURIComponent(row.id),{method:'DELETE'});}
 };
}
export function feishuTransferStore(data,call,download){
 const folderName='BaipinNavigation-Transfers';let folderId;
 const id=value=>{if(typeof value!=='string'||!/^[A-Za-z0-9_-]{1,200}$/.test(value))throw new TransferError(502,'飞书文件标识不正确');return value;};
 async function list(folder=''){const items=[];let next='';for(let page=0;page<10;page++){const result=await call(data,'/drive/v1/files?'+new URLSearchParams({page_size:'200',folder_token:folder,...(next?{page_token:next}:{})}));items.push(...(result.files||[]));if(!result.has_more)return items;next=result.next_page_token;if(typeof next!=='string'||!next)throw new TransferError(502,'飞书分页异常');}throw new TransferError(503,'飞书文件过多，请整理后重试');}
 async function folder(create=false){if(folderId)return folderId;const rows=(await list()).filter(x=>x.type==='folder'&&x.name===folderName);if(rows.length>1)throw new TransferError(409,'存在多个传输文件夹，请先整理');if(rows.length)return folderId=id(rows[0].token);if(!create)return null;return folderId=id((await call(data,'/drive/v1/files/create_folder',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:folderName,folder_token:''})})).token);}
 return {
 async list(){const parent=await folder();if(!parent)return [];return (await list(parent)).filter(x=>x.type==='file').map(x=>({id:id(x.token),name:x.name,size:Number(x.size)||0}));},
 async create(name,raw){const form=new FormData();form.set('file_name',name);form.set('parent_type','explorer');form.set('parent_node',await folder(true));form.set('size',String(Buffer.byteLength(raw)));form.set('file',new Blob([raw],{type:'application/json'}),name);await call(data,'/drive/v1/files/upload_all',{method:'POST',body:form});},
 async read(row){return download(data,'/drive/v1/files/'+id(row.id)+'/download',TRANSFER_MAX_RAW);},
 async remove(row){await call(data,'/drive/v1/files/'+id(row.id)+'?type=file',{method:'DELETE'});}
 };
}
