import assert from 'node:assert/strict';
import handler from '../server/site-content.js';
const original=globalThis.fetch,key=process.env.YOUTUBE_API_KEY;let youtubeRequests=0;
const call=async(source,page)=>{let result;await handler({method:'GET',url:'/api/discover?source='+source+'&page='+page},{setHeader(){},status(n){this.code=n;return this;},json(body){result={code:this.code,body};}});return result;};
try{
 process.env.YOUTUBE_API_KEY='test';globalThis.fetch=async input=>{const u=new URL(input);if(u.hostname==='www.googleapis.com'){youtubeRequests++;assert.equal(u.searchParams.get('maxResults'),'50');return Response.json({items:Array.from({length:48},(_,i)=>({id:'video'+String(i).padStart(6,'0'),snippet:{title:'Video '+i}}))});}if(u.hostname==='api.bilibili.com'){const page=Number(u.searchParams.get('pn'));return Response.json({data:{list:Array.from({length:12},(_,i)=>({bvid:'BV'+page+'video'+i,title:'Batch '+page})),no_more:false}});}throw Error('unexpected source');};
 const a=await call('youtube',1),b=await call('youtube',2),last=await call('youtube',4);assert.equal(a.code,200);assert.equal(b.body.items.length,12);assert.notEqual(a.body.items[0].url,b.body.items[0].url);assert.equal(a.body.hasMore,true);assert.equal(last.body.hasMore,false);assert.equal(youtubeRequests,1,'reuse official 50-video pool');
 const c=await call('bilibili',1),d=await call('bilibili',2);assert.notEqual(c.body.items[0].url,d.body.items[0].url);assert.equal(d.body.hasMore,true);assert.equal((await call('youtube',5)).code,400);assert.equal((await call('github',-1)).code,400);
 console.log('PASS: distinct Bilibili/YouTube batches, current-page caching, bounded page input, end-of-list flag and one official YouTube request for multiple batches.');
}finally{globalThis.fetch=original;if(key===undefined)delete process.env.YOUTUBE_API_KEY;else process.env.YOUTUBE_API_KEY=key;}
