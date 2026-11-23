(() => {
 const root=document.documentElement,trigger=document.getElementById('background-view-button');
 const cover=document.createElement('button');cover.type='button';cover.id='background-view-restore';cover.hidden=true;
 const hint=document.createElement('span');hint.className='background-view-hint';cover.append(hint);document.body.append(cover);
 let pinned=false,preview=false,suppressHover=false,previousFocus=null,openedAt=0;
 const hover=matchMedia('(hover:hover) and (pointer:fine)');
 function labels(){const sc=root.lang==='zh-CN',name=sc?'欣赏背景':'欣賞背景';trigger.title=name;trigger.setAttribute('aria-label',name);const message=sc?'点按任意位置或按 Esc 恢复':'點按任意位置或按 Esc 還原';hint.textContent=message;cover.setAttribute('aria-label',message);}
 function showPreview(event){if(event.pointerType!=='mouse'||pinned||suppressHover||!hover.matches)return;preview=true;root.classList.add('background-preview');}
 function clearPreview(){preview=false;root.classList.remove('background-preview');}
 function restore(){if(!pinned)return;pinned=false;root.classList.remove('background-view');cover.hidden=true;trigger.setAttribute('aria-pressed','false');suppressHover=true;previousFocus?.focus?.({preventScroll:true});}
 trigger.addEventListener('pointerenter',showPreview);
 trigger.addEventListener('pointerleave',()=>{suppressHover=false;clearPreview();});
 trigger.addEventListener('click',()=>{if(pinned)return;previousFocus=document.activeElement;clearPreview();pinned=true;openedAt=Date.now();root.classList.add('background-view');cover.hidden=false;trigger.setAttribute('aria-pressed','true');cover.focus({preventScroll:true});});
 cover.addEventListener('click',()=>{if(Date.now()-openedAt>350)restore();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&(pinned||preview)){event.preventDefault();if(pinned)restore();else clearPreview();}});
 window.addEventListener('blur',()=>{if(!pinned)clearPreview();});
 new MutationObserver(labels).observe(root,{attributes:true,attributeFilter:['lang']});labels();
})();
