import {lookup} from 'node:dns/promises';
import {request as httpsRequest} from 'node:https';
import {request as httpRequest} from 'node:http';
import {BlockList,isIP} from 'node:net';
const blocked=new BlockList();
for(const [ip,bits] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.88.99.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]])blocked.addSubnet(ip,bits,'ipv4');
export const publicAddress=ip=>isIP(ip)===4&&!blocked.check(ip,'ipv4');
export function pageURL(value,base){const url=new URL(value,base);if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.port||isIP(url.hostname)||!url.hostname.includes('.')||url.href.length>4096)throw Error('请输入公开网站的 HTTP／HTTPS 网址');url.hash='';return url;}
// Pin a verified public address on every hop, including icon and manifest redirects.
export async function publicPage(value,{limit=1200000,redirects=3,timeout=6000,deadline=Date.now()+25000,resolve=lookup}={}){
 if(Date.now()>=deadline)throw Error('网站读取超时');
 const url=pageURL(value),addresses=await resolve(url.hostname,{all:true,family:4});if(!addresses.length||addresses.some(x=>!publicAddress(x.address)))throw Error('网址必须指向公开网站');
 const address=addresses[0].address;
 const result=await new Promise((resolve,reject)=>{
  const request=url.protocol==='https:'?httpsRequest:httpRequest;
  const req=request(url,{agent:false,lookup:(_host,options,cb)=>cb(null,options?.all?[{address,family:4}]:address,4),headers:{Accept:'text/html,application/json,image/*;q=0.8','Accept-Encoding':'identity','User-Agent':'Mozilla/5.0 (compatible; BaipinNavigation/1.0; +https://123.baipon.com)'}},res=>{
   if([301,302,303,307,308].includes(res.statusCode)){res.resume();resolve({redirect:res.headers.location});return;}
   if(res.statusCode<200||res.statusCode>=300){res.resume();reject(Error('网站未允许读取'));return;}
   const chunks=[];let bytes=0;res.on('error',reject);res.on('data',chunk=>{bytes+=chunk.length;if(bytes>limit){req.destroy(Error('页面内容过大'));return;}chunks.push(chunk);});res.on('end',()=>resolve({url:url.href,type:res.headers['content-type']||'',body:Buffer.concat(chunks)}));
  });const timer=setTimeout(()=>req.destroy(Error('网站读取超时')),Math.max(1,Math.min(timeout,deadline-Date.now())));timer.unref?.();req.on('close',()=>clearTimeout(timer));req.on('error',reject);req.end();
 });
 if(result.redirect){if(!redirects)throw Error('网站跳转过多');return publicPage(pageURL(result.redirect,url).href,{limit,redirects:redirects-1,timeout,deadline,resolve});}return result;
}
export const text=value=>String(value||'').replace(/&#(x[\da-f]+|\d+);?/gi,(_m,n)=>{const num=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return num>0&&num<=0x10ffff?String.fromCodePoint(num):'';}).replace(/&(amp|quot|apos|lt|gt|nbsp);/g,(_m,n)=>({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '})[n]).replace(/\s+/g,' ').trim();
function attrs(tag){return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(m=>[m[1].toLowerCase(),text(m[2]??m[3]??m[4])]));}
export function pageMetadata(html,url){
 html=html.replace(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script>/gi,'');let base=url;const tag=html.match(/<base\b[^>]*>/i);try{if(tag)base=pageURL(attrs(tag[0]).href,url).href;}catch{}
 const icons=[],metadata=[];let manifest=null;
 for(const match of html.matchAll(/<(link|meta)\b[^>]*>/gi)){
  const a=attrs(match[0]),rel=(a.rel||'').toLowerCase().split(/\s+/);
  if(match[1].toLowerCase()==='meta')metadata.push(a);
  else try{if(!a.href)continue;if(rel.some(x=>['icon','apple-touch-icon','apple-touch-icon-precomposed'].includes(x)))icons.push({url:pageURL(a.href,base).href,rank:rel.includes('icon')?0:1});if(rel.includes('manifest'))manifest=pageURL(a.href,base).href;}catch{}
 }
 const title=text(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]||metadata.find(x=>x.property==='og:title')?.content||metadata.find(x=>x.name==='twitter:title')?.content).slice(0,300);
 return {title,icons:icons.sort((a,b)=>a.rank-b.rank).map(x=>x.url),manifest,base};
}
export async function identifySite(url,read=publicPage){
 const deadline=Date.now()+25000,readWithin=(url,options={})=>{if(Date.now()>=deadline)throw Error('网站读取超时');return read(url,{...options,deadline});};
 const page=await readWithin(pageURL(url).href);if(!/text\/html|application\/xhtml\+xml/i.test(page.type))throw Error('目标网址不是网页');
 const html=new TextDecoder(page.body.toString('ascii',0,1000).match(/charset\s*=\s*["']?([\w-]+)/i)?.[1]||'utf-8').decode(page.body),meta=pageMetadata(html,page.url);const candidates=[...meta.icons];
 if(!candidates.length&&meta.manifest)try{const manifest=await readWithin(meta.manifest,{limit:100000});for(const icon of JSON.parse(manifest.body.toString()).icons||[])try{candidates.push(pageURL(icon.src,manifest.url).href);}catch{}}catch{}
 candidates.push(new URL('/favicon.ico',page.url).href);let icon=null;
 for(const candidate of [...new Set(candidates)].slice(0,4))try{const result=await readWithin(candidate,{limit:500000,timeout:3500});if(/^image\//i.test(result.type)&&result.body.length){icon=result.url;break;}}catch{}
 return {title:meta.title,icon,url:page.url};
}
