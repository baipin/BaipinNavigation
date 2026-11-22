const VAULT_ITERATIONS=600000;
const from64=value=>Uint8Array.from(atob(value),x=>x.charCodeAt(0));
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
export function validateVault(value){
 if(object(value)&&value.version===2){
  if(value.algorithm!=='AES-256-GCM-SERVER'||!object(value.accounts)||Object.keys(value).some(k=>!['version','algorithm','accounts'].includes(k))||Object.keys(value.accounts).some(k=>!['icloud','canvas'].includes(k))||Object.values(value.accounts).some(v=>typeof v!=='string'||v.length>12000||!/^[A-Za-z0-9_-]{40,}$/.test(v)))throw Error('加密日历备份格式不正确');
  return value;
 }
 if(!object(value)||value.version!==1||value.algorithm!=='AES-256-GCM'||value.kdf!=='PBKDF2-SHA256'||value.iterations!==VAULT_ITERATIONS||Object.keys(value).some(k=>!['version','algorithm','kdf','iterations','salt','iv','ciphertext'].includes(k)))throw Error('加密日历备份格式不正确');
 for(const [name,min,max]of [['salt',24,24],['iv',16,16],['ciphertext',24,45000]]){const text=value[name];if(typeof text!=='string'||text.length<min||text.length>max||!/^[A-Za-z0-9+/]+={0,2}$/.test(text))throw Error('加密日历备份格式不正确');}
 if(from64(value.salt).length!==16||from64(value.iv).length!==12||from64(value.ciphertext).length<16)throw Error('加密日历备份格式不正确');
 return value;
}
