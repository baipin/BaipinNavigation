export const VAULT_KEY='navi_calendar_vault',VAULT_ITERATIONS=600000;
const bytesTo64=bytes=>btoa(String.fromCharCode(...bytes));
const from64=value=>Uint8Array.from(atob(value),x=>x.charCodeAt(0));
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
export function validateVault(value){
 if(!object(value)||value.version!==1||value.algorithm!=='AES-256-GCM'||value.kdf!=='PBKDF2-SHA256'||value.iterations!==VAULT_ITERATIONS||Object.keys(value).some(k=>!['version','algorithm','kdf','iterations','salt','iv','ciphertext'].includes(k)))throw Error('加密日历备份格式不正确');
 for(const [name,min,max]of [['salt',24,24],['iv',16,16],['ciphertext',24,45000]]){const text=value[name];if(typeof text!=='string'||text.length<min||text.length>max||!/^[A-Za-z0-9+/]+={0,2}$/.test(text))throw Error('加密日历备份格式不正确');}
 if(from64(value.salt).length!==16||from64(value.iv).length!==12||from64(value.ciphertext).length<16)throw Error('加密日历备份格式不正确');
 return value;
}
export function validateVaultAccounts(value){
 if(!object(value)||Object.keys(value).some(k=>!['icloud','canvas'].includes(k)))throw Error('日历账号备份格式不正确');
 const result={};for(const [provider,record]of Object.entries(value)){
  if(!object(record)||typeof record.name!=='string'||record.name.length>254||typeof record.account!=='string'||record.account.length>500)throw Error('日历账号备份格式不正确');
  const item={name:record.name,account:record.account};
  if(provider==='icloud'&&record.credentials){const c=record.credentials;if(!object(c)||typeof c.email!=='string'||c.email.length>254||!/^[^\s:@]+@[^\s:@]+$/.test(c.email)||typeof c.password!=='string'||!/^[A-Za-z]{4}(?:-[A-Za-z]{4}){3}$/.test(c.password))throw Error('iCloud 备份格式不正确');item.credentials={email:c.email,password:c.password};}
  if(provider==='canvas'&&record.credentials){const c=record.credentials;let u;try{u=new URL(c.origin);}catch{throw Error('Canvas 备份格式不正确');}if(u.protocol!=='https:'||u.username||u.password||u.port||u.origin!==c.origin||typeof c.token!=='string'||c.token.length>2048||!/^[\x21-\x7e]+$/.test(c.token))throw Error('Canvas 备份格式不正确');item.credentials={origin:u.origin,token:c.token};}
  if(Object.keys(record).some(k=>!['name','account','credentials'].includes(k))||!item.credentials)throw Error('日历账号备份格式不正确');result[provider]=item;
 }
 if(new TextEncoder().encode(JSON.stringify(result)).length>30000)throw Error('日历账号备份过大');return result;
}
const aad=new TextEncoder().encode('BaipinNavigation/calendar-vault/v1');
export async function deriveVaultKey(password,salt){if(typeof password!=='string'||password.length<12||password.length>256)throw Error('请使用 12 至 256 个字符的独立加密密码');const source=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:VAULT_ITERATIONS},source,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
export async function encryptVault(accounts,key,salt){const iv=crypto.getRandomValues(new Uint8Array(12)),plain=new TextEncoder().encode(JSON.stringify(validateVaultAccounts(accounts)));try{const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad},key,plain));return {version:1,algorithm:'AES-256-GCM',kdf:'PBKDF2-SHA256',iterations:VAULT_ITERATIONS,salt:bytesTo64(salt),iv:bytesTo64(iv),ciphertext:bytesTo64(ciphertext)};}finally{plain.fill(0);}}
export async function createVault(password,accounts={}){const salt=crypto.getRandomValues(new Uint8Array(16)),key=await deriveVaultKey(password,salt);return {key,salt,accounts:validateVaultAccounts(accounts),envelope:await encryptVault(accounts,key,salt)};}
export async function unlockVault(envelope,password){validateVault(envelope);const salt=from64(envelope.salt),key=await deriveVaultKey(password,salt);let plaintext;try{plaintext=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:from64(envelope.iv),additionalData:aad},key,from64(envelope.ciphertext)));const accounts=validateVaultAccounts(JSON.parse(new TextDecoder().decode(plaintext)));return {key,salt,accounts};}catch{throw Error('加密密码不正确，或日历备份已损坏');}finally{plaintext?.fill(0);}}

// A saved backup must never replace an already connected local calendar.
export function calendarRestoreTargets(accounts,connections){return Object.entries(accounts).filter(([provider])=>!(connections[provider]?.authenticated&&connections[provider]?.calendarAuthorized));}
