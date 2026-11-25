import {XMLParser} from 'fast-xml-parser';
const SOURCE='https://www.mtr.com.hk/alert/ryg_line_status.xml';
const DETAILS='https://www.mtr.com.hk/alert/alert_simpletxt_title_tc.html';
export function parseMtrStatus(xml){
 if(typeof xml!=='string'||xml.length>200000||!xml.includes('<ryg_status>'))throw Error('Invalid MTR feed');
 const feed=new XMLParser({ignoreAttributes:true}).parse(xml).ryg_status;
 const rows=Array.isArray(feed?.line)?feed.line:feed?.line?[feed.line]:[];
 const lines={};
 for(const row of rows){const code=String(row.line_code||'').trim(),status=String(row.status||'').trim().toLowerCase();if(!/^[A-Z]{2,3}$/.test(code))continue;
 let url=DETAILS;try{const candidate=new URL(String(row.url_tc||''));if(candidate.protocol==='https:'&&['www.mtr.com.hk','tnews.mtr.com.hk'].includes(candidate.hostname))url=candidate.href;}catch{}
 lines[code]={status:['green','yellow','red'].includes(status)?status:'unknown',url};}
 if(!Object.keys(lines).length)throw Error('Empty MTR feed');
 return {lines,updatedAt:Number.isFinite(Date.parse(feed.lastBuildDate))?new Date(feed.lastBuildDate).toISOString():null};
}
export default async function mtrStatus(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
 try{const response=await fetch(SOURCE+'?_='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(10000),redirect:'error'});if(!response.ok)throw Error('MTR unavailable');return res.status(200).json({...parseMtrStatus(await response.text()),checkedAt:new Date().toISOString()});}
 catch{return res.status(502).json({error:'港鐵車務狀態暫時無法確認'});}
}
