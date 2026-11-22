import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url);
const data=JSON.parse(await readFile(new URL('data/version-history.json',root),'utf8'));
const history=await readFile(new URL('history.html',root),'utf8');
assert.ok(history.includes('覆检日期：2026 年 11 月 23 日'));assert.ok(history.includes('覆檢日期：2026 年 11 月 23 日'));assert.ok(!history.includes('data-legal-text="method"'));assert.ok(data.entries.length>=20);let previous='9999-12-31';
for(const entry of data.entries){
 const stamp=execFileSync('git',['show','-s','--format=%aI',entry.commit],{cwd:root,encoding:'utf8'}).trim();
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(stamp));
 assert.equal(entry.date,date,entry.sc.title);assert.ok(entry.date<=previous);previous=entry.date;
 assert.ok(!history.includes('https://github.com/'));
 for(const lang of ['sc','tc']){assert.ok(entry[lang].title);assert.ok(entry[lang].description);assert.ok(history.includes(entry[lang].title));}
}
for(const name of ['history.html','privacy.html','terms.html']){
 const text=await readFile(new URL(name,root),'utf8');const labels=JSON.parse(text.match(/<script type="application\/json" id="legal-translations">(.*?)<\/script>/s)[1]);
 for(const match of text.matchAll(/data-legal-text="([^"]+)"/g))for(const lang of ['sc','tc'])assert.equal(typeof labels[lang][match[1]],'string',name+': '+lang+' '+match[1]);
 assert.ok(text.includes('id="legal-language"'));assert.ok(text.includes('id="legal-theme"'));assert.ok(text.includes('/legal.css'));
 if(name!=='history.html'){
  assert.ok(labels.sc.p0_0.includes('飞书'));assert.ok(labels.tc.p0_0.includes('飛書'));
  assert.ok(labels.sc.feishu_0.includes('drive:drive'));assert.ok(labels.tc.feishu_1.includes('calendar:calendar'));
  assert.ok(labels.sc.vault_0.includes('飞书'));assert.ok(!labels.sc.vault_2.includes('可在管理界面取消'));
 }
}
const home=await readFile(new URL('index.html',root),'utf8'),app=await readFile(new URL('js/app-info.js',root),'utf8');
assert.ok(home.indexOf('data-app-policy="terms"')<home.indexOf('data-app-policy="history"'));assert.ok(home.indexOf('data-app-policy="history"')<home.indexOf('data-app-info="projects"'));
assert.ok(home.includes('飞书云空间'));assert.ok(app.includes("history:'版本历程'"));assert.ok(app.includes("history:'版本歷程'"));
console.log('PASS: feature dates verified against Git in UTC+8, bilingual history and policy labels complete, Feishu coverage and footer link order correct.');
