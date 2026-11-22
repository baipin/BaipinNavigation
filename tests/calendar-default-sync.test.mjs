import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {sealCalendarLogin,openCalendarLogin} from '../server/calendar-vault.js';
import {sanitizePreset} from '../js/preset-schema.js';
import {validateVault} from '../js/calendar-vault-crypto.js';
process.env.CALENDAR_SYNC_KEY='unit-test-key-'.repeat(4);
const credentials={origin:'https://school.instructure.com',token:'dummy-private-token'};
const a=sealCalendarLogin('canvas',credentials),b=sealCalendarLogin('canvas',credentials);
assert.notEqual(a,b);assert.ok(!a.includes(credentials.token));assert.deepEqual(openCalendarLogin('canvas',a),credentials);
assert.throws(()=>openCalendarLogin('icloud',a));
const bytes=Buffer.from(a,'base64url');bytes[15]^=1;assert.throws(()=>openCalendarLogin('canvas',bytes.toString('base64url')));
const envelope={version:2,algorithm:'AES-256-GCM-SERVER',accounts:{canvas:a}};
assert.deepEqual(validateVault(envelope),envelope);assert.throws(()=>validateVault({...envelope,accounts:{google:a}}));assert.throws(()=>validateVault({...envelope,accounts:{canvas:credentials.token}}));
const roundtrip=sanitizePreset({localStorage:{navi_calendar_vault:JSON.stringify(envelope)}});assert.deepEqual(JSON.parse(roundtrip.localStorage.navi_calendar_vault),envelope);
assert.ok(!JSON.stringify(roundtrip).includes(credentials.token));
process.env.CALENDAR_SYNC_KEY='different-key-'.repeat(4);assert.throws(()=>openCalendarLogin('canvas',a));delete process.env.CALENDAR_SYNC_KEY;assert.throws(()=>sealCalendarLogin('canvas',credentials),/CALENDAR_SYNC_KEY/);

const source=await readFile(new URL('../js/sync.js',import.meta.url),'utf8');
const coordinator=source.slice(source.indexOf('window.naviSyncCalendarLogins='),source.indexOf('// Exposed to the optional calendar UI;'));
function environment({signedIn=true,busy=false,fail=false,conflict=false,remote=envelope}={}){
 const local=sanitizePreset({localStorage:{theme_mode:'light',navi_calendar_vault:null}});
 let cloud={exists:true,preset:sanitizePreset({localStorage:{theme_mode:'dark',bp_v7:'[{"name":"Cloud","url":"https://example.test","icon":"star"}]',navi_calendar_vault:JSON.stringify(remote)}}),revision:'one'},pushes=0;
 const storage=new Map();
 const context={window:{},busy,authenticating:false,account:signedIn?{id:'7'}:null,updateControls(){},sanitizePreset,hash:async p=>JSON.stringify(p),stateKey:()=> 'sync-state',savedState:()=>({baseHash:JSON.stringify(cloud.preset)}),snapshot:()=>local,
 localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},request:async(action,body)=>{if(fail)throw Error('offline');if(action==='pull')return structuredClone(cloud);pushes++;if(conflict&&pushes===1){cloud.revision='two';throw Object.assign(Error('conflict'),{status:409});}assert.equal(body.revision,cloud.revision);cloud={...cloud,preset:body.preset,revision:'three'};return {revision:'three'};}};
 vm.runInNewContext(coordinator,context);return {context,cloud:()=>cloud,storage,pushes:()=>pushes};
}
{
 const {context,storage,pushes}=environment();const result=await context.window.naviSyncCalendarLogins({version:2,algorithm:'AES-256-GCM-SERVER',accounts:{}});
 assert.equal(result.accounts.canvas,a);assert.equal(pushes(),0);assert.equal(JSON.parse(storage.get('navi_calendar_vault')).accounts.canvas,a);
}
for(const conflict of [true,false]){
 const {context,cloud}=environment({conflict});
 const local={...envelope,accounts:{canvas:b}};
 assert.equal((await context.window.naviSyncCalendarLogins(local,['canvas'])).accounts.canvas,b);
 assert.equal(JSON.parse(cloud().preset.localStorage.navi_calendar_vault).accounts.canvas,b);
 assert.equal(cloud().preset.localStorage.theme_mode,'dark');assert.ok(cloud().preset.localStorage.bp_v7.includes('Cloud'));
}
{
 const {context}=environment();assert.equal((await context.window.naviSyncCalendarLogins({...envelope,accounts:{canvas:b}},[])).accounts.canvas,a,'stale inactive local backups cannot overwrite newer cloud state');
}
for(const options of [{signedIn:false},{busy:true}]){const {context,pushes}=environment(options);await context.window.naviSyncCalendarLogins(envelope);assert.equal(pushes(),0);}
{const {context}=environment({fail:true});await assert.rejects(()=>context.window.naviSyncCalendarLogins(envelope),/offline/);assert.equal(context.busy,false);}

const ui=await readFile(new URL('../js/calendar-vault.js',import.meta.url),'utf8');
const sync=ui.slice(ui.indexOf('async function sync('),ui.indexOf('function render()'));
function frontend({connected=false}={}){
 const calls=[],storage=new Map(),states=connected?{canvas:{authenticated:true,calendarAuthorized:true}}:{};
 const context={working:false,queued:false,queuedRestore:false,lastError:'',idleWaiters:[],captured:new Set(),queuedProviders:new Set(),VAULT_KEY:'navi_calendar_vault',saved:()=>({version:2,algorithm:'AES-256-GCM-SERVER',accounts:{}}),connections:()=>states,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},changed(){},reload:async()=>{},api:async(provider,action,body)=>{calls.push({provider,action,body});return {encrypted:b};},window:{naviSyncCalendarLogins:async value=>({...envelope,accounts:{...envelope.accounts,...value.accounts}})}};
 vm.runInNewContext(sync,context);return {context,calls};
}
{const {context,calls}=frontend();await context.sync(true);assert.equal(calls[0].action,'calendar-vault-restore');assert.equal(calls[0].body.encrypted,a);}
{const {context,calls}=frontend({connected:true});await context.sync(true);assert.deepEqual(calls.map(x=>x.action),['calendar-vault-capture']);}
console.log('PASS: server-key AES-GCM integrity, provider binding, rotation/missing key, opaque preset roundtrip, automatic cloud pull/merge with conflict retries, no unrelated setting overwrite, inactive backup priority, automatic restore and preserve connected calendars.');
