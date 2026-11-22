import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../js/calendar.js',import.meta.url),'utf8');
const render=source.slice(source.indexOf('function renderCalendarSettings(){'),source.indexOf('async function limitedMap'));
function element(tag,text=''){return {tag,textContent:text,children:[],dataset:{},append(...items){this.children.push(...items);},replaceChildren(){this.children=[];},setAttribute(){},get childElementCount(){return this.children.length;}};}
for(const any of [false,true]){
 const host=element('div'),context={connections:any?{google:{authenticated:false},microsoft:{authenticated:true,calendarAuthorized:false,user:{name:'Test'}},icloud:{authenticated:true,calendarAuthorized:true,user:{email:'test@example.test'}},canvas:{unavailable:true},feishu:{authenticated:true,calendarAuthorized:true,user:{name:'飞书测试'}}}:{},endpoints:{google:'',microsoft:'',icloud:'',canvas:'',feishu:''},names:{microsoft:'Microsoft',icloud:'iCloud',feishu:'飞书'},node:element,providerIcon:()=>'/local-icon',t:s=>s,document:{getElementById:()=>host,createTextNode:text=>({textContent:text})}};
 vm.runInNewContext(render,context);context.renderCalendarSettings();
 assert.deepEqual(host.children.map(x=>x.dataset.calendarSummary),any?['microsoft','icloud','feishu']:[]);assert.equal(host.hidden,!any);
 if(any){const json=JSON.stringify(host);assert.ok(json.includes('同步账号已连接，日历未连接'));assert.ok(!json.includes('检查中'));}
}
console.log('PASS: settings show connected calendars and authenticated sync-only accounts, omit disconnected providers, hide empty summary, use synchronized-account wording.');
