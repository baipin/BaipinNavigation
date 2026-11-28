export function winnerBadge(candidate,sc=document.documentElement.lang==='zh-CN'){
 if(candidate?.elected!==true)return null;
 const badge=document.createElement('span');badge.className='election-winner';const label=sc?'当选（来源已确认）':'當選（來源已確認）';badge.title=label;badge.setAttribute('aria-label',label);
 const icon=document.createElement('span');icon.className='material-icons';icon.textContent='verified';icon.setAttribute('aria-hidden','true');const text=document.createElement('span');text.textContent=sc?'当选':'當選';badge.append(icon,text);return badge;
}
