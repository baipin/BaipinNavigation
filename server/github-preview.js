import {text} from './public-page.js';
const repoPattern=/^[\w.-]+\/[\w.-]+$/;
const fallback=repo=>'https://opengraph.githubassets.com/1/'+repo;
export function readmeImage(markdown,repo,branch='HEAD'){
 if(!repoPattern.test(repo))return null;
 const root='https://raw.githubusercontent.com/'+repo+'/'+encodeURIComponent(branch)+'/',references=new Map();
 markdown=markdown.replace(/<!--[\s\S]*?-->|```[\s\S]*?```|~~~[\s\S]*?~~~/g,'');
 for(const m of markdown.matchAll(/^\s*\[([^\]]+)\]:\s*<?([^\s>]+)>?/gm))references.set(m[1].toLowerCase(),m[2]);
 const candidates=[];
 for(const m of markdown.matchAll(/!\[([^\]]*)\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+[^)]*)?\)|!\[([^\]]*)\]\[([^\]]*)\]|<img\b[^>]*>/gi)){
  if(m[0].startsWith('<')){const tag=m[0];if(/\b(?:width|height)\s*=\s*["']?(?:[0-9]|[1-3][0-9])(?:["'\s>])/i.test(tag))continue;const source=tag.match(/\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);if(source)candidates.push({url:source[1]||source[2]||source[3],label:tag});}
  else candidates.push({url:m[2]||m[3]||references.get((m[5]||m[4]||'').toLowerCase()),label:m[1]||m[4]||''});
 }
 for(const candidate of candidates)try{
  if(!candidate.url||/badge|shields\.io|badgen\.net|actions\/workflows|stargazers|visitor|tracking/i.test(candidate.url+' '+candidate.label))continue;
  let url=new URL(text(candidate.url),root);
  if(url.hostname==='github.com'&&/^\/[^/]+\/[^/]+\/blob\//.test(url.pathname)){url=new URL('https://raw.githubusercontent.com'+url.pathname.replace('/blob/','/'));}
  const allowed=['github.com','githubusercontent.com','githubassets.com'];
  if(url.protocol!=='https:'||url.username||url.password||url.port||!allowed.some(h=>url.hostname===h||url.hostname.endsWith('.'+h))||/\.(?:mp4|webm|mov)(?:$|\?)/i.test(url.href)||url.href.length>3000)continue;
  return url.href;
 }catch{}
 return null;
}
async function boundedReadme(response){
 if(!response.ok)throw Error('README unavailable');const reader=response.body.getReader(),parts=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>400000)throw Error('README too large');parts.push(value);}}finally{await reader.cancel();}
 return Buffer.concat(parts).toString('utf8');
}
export async function addGithubPreviews(cards,repositories,request=fetch){
 const rows=new Map((repositories||[]).map(x=>[x.full_name,x]));let next=0;
 async function worker(){while(next<cards.length){const card=cards[next++],repo=rows.get(card.title),backup=fallback(card.title);card.image=backup;card.fallbackImage=backup;
  try{const response=await request('https://raw.githubusercontent.com/'+card.title+'/'+encodeURIComponent(repo?.default_branch||'HEAD')+'/README.md',{signal:AbortSignal.timeout(2200),redirect:'error'});const markdown=await boundedReadme(response);card.image=readmeImage(markdown,card.title,repo?.default_branch||'HEAD')||backup;}catch{}
 }}
 await Promise.all(Array.from({length:Math.min(4,cards.length)},worker));return cards;
}
