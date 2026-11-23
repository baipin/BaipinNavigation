import assert from 'node:assert/strict';
import {createVideoFeedAd} from '../js/discover-ad.js';
let visibility,resize,mutation,disconnects=0;
class Element{constructor(tag){this.tagName=tag;this.attrs=new Map();this.children=[];this.style={};this.isConnected=false;this.hidden=false;this.width=272;}setAttribute(k,v){this.attrs.set(k,v);}getAttribute(k){return this.attrs.get(k)??null;}append(...items){this.children.push(...items);}getBoundingClientRect(){return {width:this.width};}}
class Intersection{constructor(callback){visibility=callback;}observe(){}disconnect(){disconnects++;}}
class Resize{constructor(callback){resize=callback;}observe(){}disconnect(){disconnects++;}}
class Mutation{constructor(callback){mutation=callback;}observe(){}disconnect(){disconnects++;}}
const doc={documentElement:{lang:'zh-CN'},createElement:tag=>new Element(tag)},win={};
const ad=createVideoFeedAd({document:doc,window:win,Intersection,Resize,Mutation});
assert.equal(ad.element.children[0],ad.unit);assert.equal(ad.element.children.length,2);assert.equal(ad.element.children[1].children[0].children[1].textContent,'特别推介');const close=ad.element.children[1].children[1];assert.equal(close.hidden,true);ad.enableClose();assert.equal(close.hidden,false);assert.equal(ad.unit.getAttribute('data-ad-slot'),'3546508009');assert.equal(ad.unit.getAttribute('data-ad-layout-key'),'-6t+ed+2i-1n-4w');assert.equal(ad.unit.getAttribute('data-ad-format'),'fluid');
visibility([{isIntersecting:true}]);assert.equal(win.adsbygoogle,undefined,'do not request a detached ad');ad.element.isConnected=true;ad.unit.width=0;resize();assert.equal(win.adsbygoogle,undefined,'wait for usable layout');ad.unit.width=249;resize();assert.equal(win.adsbygoogle,undefined,'fluid infeed needs minimum width');ad.unit.width=272;visibility([{isIntersecting:false}]);resize();assert.equal(win.adsbygoogle,undefined,'offscreen ads wait until viewed');
visibility([{isIntersecting:true}]);assert.equal(win.adsbygoogle.length,1);resize();ad.request();visibility([{isIntersecting:true}]);assert.equal(win.adsbygoogle.length,1,'same unit never requests another impression');
doc.documentElement.lang='zh-HK';ad.updateLabel();assert.equal(ad.element.getAttribute('aria-label'),'廣告');assert.equal(ad.element.children[1].children[0].children[1].textContent,'特別推介');assert.equal(win.adsbygoogle.length,1,'translation never reloads ad');
ad.unit.setAttribute('data-ad-status','unfilled');mutation();assert.equal(ad.element.hidden,true);assert.equal(ad.unfilled,true);ad.destroy();assert.equal(disconnects,3);close.onclick();assert.equal(ad.closed,true);assert.equal(ad.element.hidden,true);ad.enableClose();ad.request();assert.equal(win.adsbygoogle.length,1);
const broken=createVideoFeedAd({document:doc,window:{adsbygoogle:{push(){throw Error('blocked');}}},Intersection,Resize,Mutation});broken.element.isConnected=true;visibility([{isIntersecting:true}]);assert.equal(broken.failed,true);assert.equal(broken.element.hidden,true);
console.log('PASS: supplied infeed configuration, visible/connected/minimum-width gating, single impression across redraws, bilingual ad labels and unfilled/blocked fallback.');
