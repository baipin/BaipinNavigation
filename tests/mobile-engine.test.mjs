import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');const source=html.slice(html.indexOf('window.naviSetSearchEngine ='),html.indexOf('engineMenu.onclick ='));
let focused=0,closed=0,saved,notified=0,mobile=true;
const context={window:{},engineMenu:{querySelectorAll:()=>[{value:'bing',querySelector:()=>({src:'bing-icon'})}]},engines:{bing:{}},engineImg:{},searchInput:{focus(){focused++}},setEngineMenuOpen(){closed++},suggestionsContainer:{style:{}},curEng:'google',localStorage:{setItem(key,value){saved=value}},document:{dispatchEvent(){notified++}},Event,matchMedia:()=>({matches:mobile})};vm.createContext(context);vm.runInContext(source,context);
assert.equal(context.window.naviSetSearchEngine('bing'),true);assert.equal(focused,0);assert.equal(saved,'bing');assert.equal(context.engineImg.src,'bing-icon');assert.equal(closed,1);
mobile=false;context.window.naviSetSearchEngine('bing');assert.equal(focused,1);context.window.naviSetSearchEngine('bing',false);assert.equal(focused,1);assert.equal(context.window.naviSetSearchEngine('invalid'),false);assert.equal(notified,3);
console.log('PASS: mobile engine change persists selection without focusing input; desktop focus and explicit no-focus remain intact.');
