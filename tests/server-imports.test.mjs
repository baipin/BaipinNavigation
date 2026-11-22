import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
const seen=new Set();
async function check(url){
 if(seen.has(url.href))return;seen.add(url.href);
 const text=await readFile(url,'utf8');
 for(const match of text.matchAll(/(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"](\.[^'"]+)['"]/g)){
  assert.ok(!/[?#]/.test(match[1]),`Server dependency must use a traceable file path: ${url.pathname} -> ${match[1]}`);
  await check(new URL(match[1],url));
 }
}
for(const file of await readdir(new URL('../api/',import.meta.url)))if(file.endsWith('.js'))await check(new URL('../api/'+file,import.meta.url));
await Promise.all(['sync','github'].map(name=>import('../api/'+name+'.js')));
console.log(`PASS: ${seen.size} server dependency files resolve without browser URL parameters; sync handlers import successfully.`);