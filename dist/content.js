var e=`lecang-prototype-root`,t=[{id:`user-management`,name:`用户管理`,matches:()=>location.pathname.replace(/\/$/,``)===`/setting/user`}],n=null,r=`lecang-prototype:showPanel`,i=!1,a=`lecang-prototype:launcherPos`,o=!1;function s(e){n&&(n.frameWrap.hidden=!e,n.launcher.hidden=e,e&&c(n.frameWrap))}function c(e){let t=Math.max(208,window.innerWidth-360),n=Math.max(44,window.innerHeight-200),r=Math.min(Math.max(208,e.offsetLeft||208),t),i=Math.min(Math.max(44,e.offsetTop||44),n);e.style.left=`${r}px`,e.style.top=`${i}px`}function l(e,t){let n=null;e.addEventListener(`pointerdown`,r=>{r.target.closest(`button`)||(n={x:r.clientX,y:r.clientY,left:t.offsetLeft,top:t.offsetTop},e.setPointerCapture(r.pointerId))}),e.addEventListener(`pointermove`,e=>{n&&(t.style.left=`${n.left+e.clientX-n.x}px`,t.style.top=`${n.top+e.clientY-n.y}px`,c(t))});let r=()=>{n=null};e.addEventListener(`pointerup`,r),e.addEventListener(`pointercancel`,r)}function u(e){let t=null;e.addEventListener(`pointerdown`,n=>{n.button===0&&(o=!1,t={x:n.clientX,y:n.clientY,left:e.offsetLeft,top:e.offsetTop},e.setPointerCapture(n.pointerId))}),e.addEventListener(`pointermove`,n=>{if(!t)return;let r=n.clientX-t.x,i=n.clientY-t.y;if(!o&&(Math.abs(r)>3||Math.abs(i)>3)&&(o=!0),!o)return;let a=Math.min(Math.max(0,t.left+r),window.innerWidth-e.offsetWidth),s=Math.min(Math.max(0,t.top+i),window.innerHeight-e.offsetHeight);e.style.left=`${a}px`,e.style.top=`${s}px`,e.style.right=`auto`,e.style.bottom=`auto`});let n=()=>{if(t){if(o){let t=e.style.left,n=e.style.top;t&&n&&chrome.storage.local.set({[a]:{left:parseInt(t,10),top:parseInt(n,10)}})}t=null}};e.addEventListener(`pointerup`,n),e.addEventListener(`pointercancel`,n)}function d(t){let r=document.createElement(`div`);r.id=e;let i=r.attachShadow({mode:`open`}),c=document.createElement(`style`);c.textContent=`
    :host { all: initial; }
    .launcher {
      position: fixed; z-index: 2147483646; right: 24px; bottom: 24px;
      display: flex; align-items: center; justify-content: center;
      width: 44px; height: 44px; border: 0; border-radius: 50%;
      background: #1f2d40; color: #fff; cursor: pointer;
      box-shadow: 0 6px 18px rgba(15, 30, 51, 0.25);
      font-size: 18px;
    }
    .launcher:hover { background: #2a3c54; }
    .launcher[hidden] { display: none; }
    .frame-wrap {
      position: fixed; z-index: 2147483645;
      left: 208px; right: 0; top: 44px; bottom: 0;
      display: flex; flex-direction: column;
      background: #fff;
      border-left: 1px solid #d7e2f0;
    }
    .frame-wrap[hidden] { display: none; }
    .frame-header {
      display: flex; align-items: center; justify-content: space-between;
      height: 36px; box-sizing: border-box; padding: 0 12px; border-bottom: 1px solid #d8dce5;
      background: #f2f4f7;
      cursor: move; user-select: none; touch-action: none;
      font: 12px Arial, "Microsoft YaHei", sans-serif; font-weight: 400; color: #1677ff;
    }
    .frame-close {
      display: inline-flex; align-items: center; gap: 4px;
      height: 32px; padding: 0 12px; border: 1px solid #d5d9e0; border-radius: 4px; background: #fff; color: #526b8e;
      font-size: 13px; cursor: pointer; white-space: nowrap; line-height: 30px;
    }
    .frame-close svg { flex: none; }
    .frame-close:hover { color: #244570; }
    .frame-body {
      flex: 1; min-height: 0; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 12px;
      color: #94a3b8; font-size: 14px;
    }
    .frame-body .anticon { font-size: 40px; color: #cbd5e1; }
    .frame-body p { margin: 0; }
  `;let d=document.createElement(`button`);d.type=`button`,d.className=`launcher`,d.textContent=`P`,d.setAttribute(`aria-label`,`打开${t.name}`);let f=document.createElement(`section`);f.className=`frame-wrap`,f.hidden=!0,f.setAttribute(`aria-label`,t.name);let p=document.createElement(`div`);p.className=`frame-header`;let m=document.createElement(`span`);m.textContent=t.name;let h=document.createElement(`button`);h.type=`button`,h.className=`frame-close`,h.setAttribute(`aria-label`,`退出原型`);let g=document.createElementNS(`http://www.w3.org/2000/svg`,`svg`);g.setAttribute(`viewBox`,`0 0 24 24`),g.setAttribute(`width`,`14`),g.setAttribute(`height`,`14`),g.setAttribute(`aria-hidden`,`true`),g.innerHTML=`<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>`,h.append(g,document.createTextNode(`退出原型`)),p.append(m,h);let _=document.createElement(`div`);_.className=`frame-body`;let v=document.createElement(`iframe`);v.title=`用户管理原型`,v.src=chrome.runtime.getURL(`index.html?embedded=user-management`),v.style.cssText=`width:100%;height:100%;border:0;background:#eef2f7;`,_.append(v),f.append(p,_),d.addEventListener(`click`,()=>{if(o){o=!1;return}s(!0)}),h.addEventListener(`click`,()=>s(!1)),l(p,f),u(d),chrome.storage.local.get(a).then(e=>{let t=e[a];t&&typeof t.left==`number`&&typeof t.top==`number`&&(d.style.left=`${t.left}px`,d.style.top=`${t.top}px`,d.style.right=`auto`,d.style.bottom=`auto`)}),i.append(c,f,d),document.documentElement.appendChild(r),n={id:t.id,host:r,frameWrap:f,launcher:d}}function f(){if(!i)return;let e=t.find(e=>e.matches());n&&n.id===e?.id||(n?.host.remove(),n=null,e&&d(e))}function p(){setTimeout(f,150)}document.addEventListener(`click`,()=>{p()},!0),window.addEventListener(`popstate`,p),window.addEventListener(`hashchange`,p),window.addEventListener(`resize`,()=>{n&&!n.frameWrap.hidden&&c(n.frameWrap)}),new MutationObserver(p).observe(document.documentElement,{childList:!0,subtree:!0});async function m(){i=!!(await chrome.storage.local.get(r))[r],f()}chrome.storage.onChanged.addListener((e,t)=>{t!==`local`||!(r in e)||(i=!!e[r].newValue,i?f():(n?.host.remove(),n=null))}),m();function h(){let e=document.cookie.match(/(?:^|;\s*)Admin-Token=([^;]+)/);return e?decodeURIComponent(e[1]):``}async function g(e,t){try{let n=`/api`+e.path+(e.query?`?`+new URLSearchParams(e.query).toString():``),r=h();console.log(`[乐仓原型桥] ->`,e.method,n,`token=`,r?`已读到(`+r.length+`字符)`:`空!`);let i={Authorization:r},a={method:e.method,credentials:`include`,headers:i};e.method!==`GET`&&(i[`Content-Type`]=`application/json;charset=UTF-8`,a.body=JSON.stringify(e.body??{}));let o=await fetch(n,a);console.log(`[乐仓原型桥] <-`,e.method,n,o.status);let s=(o.headers.get(`content-type`)||``).includes(`application/json`)?await o.json():await o.text(),c={__bridge:`lecang-prototype:res`,id:e.id,ok:o.ok,status:o.status,data:s};t.postMessage(c,`*`)}catch(n){let r={__bridge:`lecang-prototype:res`,id:e.id,ok:!1,status:0,error:String(n)};t.postMessage(r,`*`)}}window.addEventListener(`message`,e=>{let t=e.data;if(!t||t.__bridge!==`lecang-prototype:req`||!n)return;let r=n.frameWrap.querySelector(`iframe`);!e.source||e.source!==r?.contentWindow||g(t,e.source)});var _=chrome.runtime.getURL(`version.json`),v=`lecang-prototype:version`,y=`lecang-prototype:reload`;async function b(){try{let e=(await(await fetch(_+`?t=`+Date.now())).text()).trim();if(!e)return;let t=(await chrome.storage.local.get(v))[v]||``;if(t&&e!==t){await chrome.storage.local.set({[v]:e}),window.setTimeout(()=>{chrome.runtime.sendMessage({type:y}).catch(()=>{})},3e3);return}(!t||e!==t)&&await chrome.storage.local.set({[v]:e})}catch{}}window.setInterval(b,15e3),b();