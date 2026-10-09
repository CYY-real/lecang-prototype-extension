var e=`lecang-prototype-root`,t=[{id:`user-management`,name:`用户管理`,matches:()=>location.pathname.replace(/\/$/,``)===`/setting/user`}],n=null,k=`lecang-prototype:showPanel`,w=!1;function r(e){n&&(n.frameWrap.hidden=!e,n.launcher.hidden=e,e&&i(n.frameWrap))}function i(e){let t=e.offsetWidth,n=e.offsetHeight,r=Math.max(208,window.innerWidth-t-8),i=Math.max(44,window.innerHeight-n-8),a=Math.min(Math.max(208,e.offsetLeft||208),r),o=Math.min(Math.max(44,e.offsetTop||44),i);e.style.left=`${a}px`,e.style.top=`${o}px`}function a(e,t){let n=null;e.addEventListener(`pointerdown`,r=>{r.target.closest(`button`)||(n={x:r.clientX,y:r.clientY,left:t.offsetLeft,top:t.offsetTop},e.setPointerCapture(r.pointerId))}),e.addEventListener(`pointermove`,e=>{n&&(t.style.left=`${n.left+e.clientX-n.x}px`,t.style.top=`${n.top+e.clientY-n.y}px`,i(t))});let r=()=>{n=null};e.addEventListener(`pointerup`,r),e.addEventListener(`pointercancel`,r)}function o(t){let i=document.createElement(`div`);i.id=e;let o=i.attachShadow({mode:`open`}),s=document.createElement(`style`);s.textContent=`
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
      width: min(600px, calc(100vw - 224px));
      left: 208px; top: 44px;
      display: flex; flex-direction: column;
      background: #fff;
      border: 1px solid #d7e2f0; border-radius: 4px;
      box-shadow: 0 6px 18px rgba(15, 30, 51, 0.18);
      max-height: calc(100vh - 88px);
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
  `;let c=document.createElement(`button`);c.type=`button`,c.className=`launcher`,c.textContent=`P`,c.setAttribute(`aria-label`,`打开${t.name}`);let l=document.createElement(`section`);l.className=`frame-wrap`,l.hidden=!0,l.setAttribute(`aria-label`,t.name);let u=document.createElement(`div`);u.className=`frame-header`;let d=document.createElement(`span`);d.textContent=t.name;let f=document.createElement(`button`);f.type=`button`,f.className=`frame-close`,f.setAttribute(`aria-label`,`退出原型`);let g=document.createElementNS(`http://www.w3.org/2000/svg`,`svg`);g.setAttribute(`viewBox`,`0 0 24 24`),g.setAttribute(`width`,`14`),g.setAttribute(`height`,`14`),g.setAttribute(`aria-hidden`,`true`),g.innerHTML=`<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>`,f.append(g,document.createTextNode(`退出原型`)),u.append(d,f);let p=document.createElement(`div`);p.className=`frame-body`;let m=document.createElement(`iframe`);m.title=`用户管理原型`,m.src=chrome.runtime.getURL(`index.html?embedded=user-management`),m.style.cssText=`width:100%;height:100%;border:0;background:#eef2f7;`,p.append(m),l.append(u,p),c.addEventListener(`click`,()=>r(!0)),f.addEventListener(`click`,()=>r(!1)),a(u,l),o.append(s,l,c),document.documentElement.appendChild(i),n={id:t.id,host:i,frameWrap:l,launcher:c}}function s(){if(!w)return;let e=t.find(e=>e.matches());n&&n.id===e?.id||(n?.host.remove(),n=null,e&&o(e))}function c(){setTimeout(s,150)}document.addEventListener(`click`,()=>{c()},!0),window.addEventListener(`popstate`,c),window.addEventListener(`hashchange`,c),window.addEventListener(`resize`,()=>{n&&!n.frameWrap.hidden&&i(n.frameWrap)}),new MutationObserver(c).observe(document.documentElement,{childList:!0,subtree:!0});async function q(){let e=await chrome.storage.local.get(k);w=Boolean(e[k]),s()}chrome.storage.onChanged.addListener((e,t)=>{if(t!==`local`||!(k in e))return;w=Boolean(e[k].newValue),w?s():(n?.host.remove(),n=null)}),void q();function l(){let e=document.cookie.match(/(?:^|;\s*)Admin-Token=([^;]+)/);return e?decodeURIComponent(e[1]):``}async function u(e,t){try{let n=`/api`+e.path+(e.query?`?`+new URLSearchParams(e.query).toString():``),r=l();console.log(`[乐仓原型桥] ->`,e.method,n,`token=`,r?`已读到(`+r.length+`字符)`:`空!`);let i={Authorization:r},a={method:e.method,credentials:`include`,headers:i};e.method!==`GET`&&(i[`Content-Type`]=`application/json;charset=UTF-8`,a.body=JSON.stringify(e.body??{}));let o=await fetch(n,a);console.log(`[乐仓原型桥] <-`,e.method,n,o.status);let s=(o.headers.get(`content-type`)||``).includes(`application/json`)?await o.json():await o.text(),c={__bridge:`lecang-prototype:res`,id:e.id,ok:o.ok,status:o.status,data:s};t.postMessage(c,`*`)}catch(n){let r={__bridge:`lecang-prototype:res`,id:e.id,ok:!1,status:0,error:String(n)};t.postMessage(r,`*`)}}window.addEventListener(`message`,e=>{let t=e.data;if(!t||t.__bridge!==`lecang-prototype:req`||!n)return;let r=n.frameWrap.querySelector(`iframe`);!e.source||e.source!==r?.contentWindow||u(t,e.source)});var VERSION_URL=chrome.runtime.getURL(`version.json`),VERSION_KEY=`lecang-prototype:version`;async function autoReloadCheck(){try{let r=await fetch(VERSION_URL+`?t=`+Date.now()),t=(await r.text()).trim();if(!t)return;let p=(await chrome.storage.local.get(VERSION_KEY))[VERSION_KEY]||``;if(p&&t!==p){window.setTimeout(()=>chrome.runtime.reload(),3e3);return}if(!p||t!==p)await chrome.storage.local.set({[VERSION_KEY]:t})}catch{}}window.setInterval(autoReloadCheck,15e3);void autoReloadCheck();