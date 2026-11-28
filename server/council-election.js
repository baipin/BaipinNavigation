import {loadTvbs,normCity} from './tvbs-election.js';
import {ELECTION_SOURCES} from '../js/election-sources.js';
import {readFileSync} from 'node:fs';
import {parseSetnResults,SETN_PAGE} from './setn-election.js';
import {electionPhase} from '../js/election-time.js';
const directory=JSON.parse(readFileSync(new URL('../data/election/council-districts.json',import.meta.url),'utf8')).cities;
const cache=new Map(),pending=new Map();
export function councilQuery(query){const city=directory.find(city=>city.id===query.get('city')),district=city?.districts.find(district=>district.id===query.get('district'));return city&&district?{city,district}:null;}
export function parseCouncil(html,area,counting){const races=parseSetnResults(html,{counting});if(races.length!==1||races[0].id!==area.city.id||!races[0].name.includes(area.district.name))throw Error('Unexpected council district');return {...races[0],name:area.district.name,city:area.city.name,cityId:area.city.id,district:area.district.id};}
export default async function councilElection(req,res){
 const query=new URL(req.url||'/','https://123.baipon.com').searchParams;for(const [key,value]of Object.entries(req.query||{}))if(typeof value==='string')query.set(key,value);
 const provider=query.get('source')||'setn';if(!Object.hasOwn(ELECTION_SOURCES,provider))return res.status(400).json({error:'未知的開票來源。'});if(!ELECTION_SOURCES[provider].council)return res.status(422).json({error:ELECTION_SOURCES[provider].tc+' 未提供本站可讀取的議員票數，請選擇三立或 TVBS。',unsupported:true,source:ELECTION_SOURCES[provider].page});
 const area=councilQuery(query);if(!area)return res.status(400).json({error:'請選擇有效的縣市及議員選區。'});
 if(provider==='tvbs'){try{const data=await loadTvbs('councilor'),number=Number(area.district.name.match(/第(\d+)/)?.[1]);const match=data.races.find(race=>normCity(race.city)===normCity(area.city.name)&&race.districtNo===number);if(!match)throw Error();return res.status(200).json({race:{...match,name:area.district.name,cityId:area.city.id,district:area.district.id},phase:electionPhase(),checkedAt:new Date().toISOString(),sourceTime:data.sourceTime,provider,source:ELECTION_SOURCES.tvbs.page});}catch{return res.status(502).json({error:'TVBS 議員票數暫時無法讀取，請稍後再試。'});}}
 const phase=electionPhase();if(phase==='ended')return res.status(200).json({phase,race:null});
 const key=area.city.id+':'+area.district.id+':'+phase;try{let item=cache.get(key);if(!item||Date.now()-item.at>30000){if(!pending.has(key)){const task=(async()=>{const url=new URL(SETN_PAGE+'/getcouncilmember');for(const [name,value]of Object.entries({element:'sub',reg:area.city.reg,city:area.city.id,dist:area.district.id}))url.searchParams.set(name,value);const response=await fetch(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error();const html=await response.text();if(html.length>1500000)throw Error();const race=parseCouncil(html,area,phase==='counting');const data={race,phase,checkedAt:new Date().toISOString(),source:SETN_PAGE,provider:'setn'};cache.set(key,{at:Date.now(),data});if(cache.size>250)cache.delete(cache.keys().next().value);return data;})().finally(()=>pending.delete(key));pending.set(key,task);}await pending.get(key);item=cache.get(key);}return res.status(200).json(item.data);}catch{return res.status(502).json({error:'議員票數暫時無法讀取，將自動重試。'});}
}
