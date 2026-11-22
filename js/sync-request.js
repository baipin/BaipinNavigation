const temporary=new Set([500,502,503,504]);
const safeCode=/^[A-Z][A-Z0-9_]{2,80}$/;
const safeReference=/^[a-zA-Z0-9:._-]{4,150}$/;
export async function syncRequest(endpoint,action,body,{name='',t=s=>s,request=fetch}={}){
 const read=body===undefined&&['status','pull'].includes(action);
 for(let attempt=0;attempt<(read?2:1);attempt++){
  let response;
  try{response=await request(endpoint+'?'+new URLSearchParams({action}),{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(45000),...(body!==undefined?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});}
  catch{
   if(read&&attempt===0)continue;
   throw new Error(t(name+' 同步请求未能完成，请检查网络后重试。',name+' 同步請求未能完成，請檢查網絡後再試。'));
  }
  const raw=await response.text();let data;
  try{data=JSON.parse(raw);}catch{
   if(read&&attempt===0&&temporary.has(response.status))continue;
   const code=response.headers.get('x-vercel-error')||'',reference=response.headers.get('x-vercel-id')||response.headers.get('cf-ray')||'';
   const details=[safeCode.test(code)?code:null,safeReference.test(reference)?reference:null].filter(Boolean).join(' / ');
   const tag='HTTP '+response.status+(details?'；'+details:'')+'；'+action;
   throw Object.assign(new Error(t(name+' 同步接口返回异常响应（'+tag+'），请稍后重试。',name+' 同步介面傳回異常回應（'+tag+'），請稍後再試。')),{status:response.status});
  }
  if(!data||typeof data!=='object'||Array.isArray(data))throw new Error(t(name+' 同步接口响应格式不正确，请刷新后重试。',name+' 同步介面回應格式不正確，請重新整理後再試。'));
  if(!response.ok)throw Object.assign(new Error(data.error||t('同步失败，请稍后重试','同步失敗，請稍後再試')),{status:response.status});
  return data;
 }
}
