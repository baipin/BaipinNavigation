import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../js/transfer.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf('let viewportFrame=0;'),source.indexOf("text.addEventListener('focus'"));
const viewport=new EventTarget();viewport.height=844;viewport.offsetTop=0;
const window=new EventTarget();window.visualViewport=viewport;window.innerHeight=844;
const styles=new Map(),frames=new Map();let serial=0;
const dialog={open:true,style:{setProperty:(key,value)=>styles.set(key,value)},classList:{remove(){}}};
const context={window,dialog,requestAnimationFrame(fn){frames.set(++serial,fn);return serial;},cancelAnimationFrame(id){frames.delete(id);}};
vm.createContext(context);vm.runInContext(code,context);
function flush(){for(const [id,fn] of frames){frames.delete(id);fn();}}
context.watchViewport();flush();assert.equal(styles.get('--transfer-viewport-height'),'844px');
viewport.height=390;viewport.offsetTop=52;viewport.dispatchEvent(new Event('resize'));flush();
assert.equal(styles.get('--transfer-viewport-height'),'390px');assert.equal(styles.get('--transfer-viewport-top'),'52px');
viewport.height=844;viewport.offsetTop=0;viewport.dispatchEvent(new Event('resize'));flush();assert.equal(styles.get('--transfer-viewport-height'),'844px');
context.unwatchViewport();viewport.height=300;viewport.dispatchEvent(new Event('resize'));assert.equal(frames.size,0);
window.visualViewport=undefined;context.watchViewport();flush();assert.equal(styles.get('--transfer-viewport-height'),'844px');
dialog.open=false;window.innerHeight=400;context.fitViewport();flush();assert.equal(styles.get('--transfer-viewport-height'),'844px');context.unwatchViewport();
console.log('PASS: keyboard resize/pan, keyboard dismissal, close cleanup and visualViewport fallback.');
