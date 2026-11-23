import assert from 'node:assert/strict';
import {readmeImage,addGithubPreviews} from '../server/github-preview.js';
assert.equal(readmeImage('![build](https://img.shields.io/test.svg)\n![Screenshot](docs/screen.png)','owner/repo','main'),'https://raw.githubusercontent.com/owner/repo/main/docs/screen.png');
assert.equal(readmeImage('<img src="https://github.com/owner/repo/blob/main/screen.png?raw=true" width="800">','owner/repo'),'https://raw.githubusercontent.com/owner/repo/main/screen.png');
assert.equal(readmeImage('![Screenshot][screen]\n[screen]: ./images/test.webp','owner/repo'),'https://raw.githubusercontent.com/owner/repo/HEAD/images/test.webp');
assert.equal(readmeImage('```\n![fake](wrong.png)\n```\n<!-- ![wrong](bad.png) -->\n<img src="https://github.com/user-attachments/assets/1234" />','owner/repo'),'https://github.com/user-attachments/assets/1234');
for(const md of ['![x](javascript:alert(1))','![x](http://127.0.0.1/image.png)','![x](https://evil.test/image.png)','<img src="/tracker.png" width="1">','![build](https://github.com/owner/repo/actions/workflows/test/badge.svg)'])assert.equal(readmeImage(md,'owner/repo'),null);
let concurrent=0,maximum=0;const cards=Array.from({length:6},(_,i)=>({title:'owner/repo'+i}));
await addGithubPreviews(cards,[],async url=>{concurrent++;maximum=Math.max(maximum,concurrent);await new Promise(r=>setImmediate(r));concurrent--;if(url.includes('repo0/'))throw Error('offline');return new Response('![Screenshot](assets/demo.png)');});
assert.ok(maximum<=4);assert.equal(cards[0].image,'https://opengraph.githubassets.com/1/owner/repo0');assert.ok(cards[1].image.endsWith('/HEAD/assets/demo.png'));assert.ok(cards.every(x=>x.fallbackImage.startsWith('https://opengraph.githubassets.com/')));
console.log('PASS: README Markdown/HTML/reference images, relative/blob URL resolution, badge/tracker/code filtering, bounded parallel requests and official preview fallback.');

