import {createHash,createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {CalendarError} from './calendar-service.js';
const key=()=>{const value=process.env.CALENDAR_SYNC_KEY;if(typeof value!=='string'||value.length<32)throw new CalendarError(503,'请先配置 CALENDAR_SYNC_KEY（至少 32 个随机字符）');return createHash('sha256').update(value).digest();};
export function sealCalendarLogin(provider,credentials){
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);cipher.setAAD(Buffer.from('BaipinNavigation/calendar-login/v2/'+provider));
 return Buffer.concat([iv,cipher.update(JSON.stringify(credentials)),cipher.final(),cipher.getAuthTag()]).toString('base64url');
}
export function openCalendarLogin(provider,value){
 const secret=key();
 try{
  if(typeof value!=='string'||value.length>12000||!/^[A-Za-z0-9_-]{40,}$/.test(value))throw Error();
  const bytes=Buffer.from(value,'base64url'),cipher=createDecipheriv('aes-256-gcm',secret,bytes.subarray(0,12));cipher.setAAD(Buffer.from('BaipinNavigation/calendar-login/v2/'+provider));cipher.setAuthTag(bytes.subarray(-16));
  return JSON.parse(Buffer.concat([cipher.update(bytes.subarray(12,-16)),cipher.final()]).toString());
 }catch{throw new CalendarError(400,'已保存的日历登录状态无法解密，请重新连接日历');}
}
