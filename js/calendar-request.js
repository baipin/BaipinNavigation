// Keep transport errors separate from application JSON; never include response bodies or credentials in errors.
const proxyStatuses=new Set([502,503,504]);
const safeCode=/^(?:FUNCTION_INVOCATION_FAILED|FUNCTION_INVOCATION_TIMEOUT|FUNCTION_RESPONSE_PAYLOAD_TOO_LARGE|BODY_NOT_A_STRING_FROM_FUNCTION|NO_RESPONSE_FROM_FUNCTION|INTERNAL_FUNCTION_INVOCATION_FAILED|EDGE_FUNCTION_INVOCATION_TIMEOUT)$/;
function diagnostic(response,raw){
 const header=response.headers.get('x-vercel-error')||'',code=safeCode.test(header)?header:(raw.match(/\b(?:FUNCTION_INVOCATION_FAILED|FUNCTION_INVOCATION_TIMEOUT|FUNCTION_RESPONSE_PAYLOAD_TOO_LARGE|NO_RESPONSE_FROM_FUNCTION)\b/)||[])[0];
 const vercel=response.headers.get('x-vercel-id')||'',ray=response.headers.get('cf-ray')||'';
 const reference=/^[a-zA-Z0-9:._-]{4,150}$/.test(vercel)?vercel:/^[a-fA-F0-9]{16,32}-[A-Z]{3}$/.test(ray)?ray:null;
 return [code,reference].filter(Boolean).join(' / ');
}
export async function calendarRequest(endpoint,provider,action,body,params={},t=(s)=>s,request=fetch){
 const options={cache:'no-store',credentials:'same-origin',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})};
 const query=new URLSearchParams({action,...params});
 const canRetry=provider==='canvas'&&['connect','status','calendar-list','calendar-events'].includes(action);
 for(let attempt=0;attempt<(canRetry?2:1);attempt++){
  const target=attempt?'/api/sync?'+new URLSearchParams({provider:'canvas',action,...params}):endpoint+'?'+query;
  const response=await request(target,options),raw=await response.text();let data;
  try{data=JSON.parse(raw);}catch{
   if(canRetry&&attempt===0&&proxyStatuses.has(response.status))continue;
   const detail=diagnostic(response,raw),suffix=detail?'；'+detail:'';
   throw Error(t('日历接口返回异常响应（HTTP '+response.status+suffix+'），请稍后重试','日曆介面傳回異常回應（HTTP '+response.status+suffix+'），請稍後重試'));
  }
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error(t('日历接口响应格式不正确','日曆介面回應格式不正確'));
  if(!response.ok)throw Error(data.error||t('日历请求失败（HTTP '+response.status+'）','日曆請求失敗（HTTP '+response.status+'）'));
  return data;
 }
}
