declare const chrome: {
  runtime: {
    getURL(path: string): string
    reload(): void
  }
  storage: {
    local: {
      get(keys: string | Record<string, unknown>): Promise<Record<string, unknown>>
      set(items: Record<string, unknown>): Promise<void>
    }
  }
}

type PrototypeRoute = {
  id: string
  name: string
  matches: () => boolean
}

const ROOT_ID = 'lecang-prototype-root'

const prototypeRoutes: PrototypeRoute[] = [
  {
    id: 'user-management',
    name: '用户管理',
    matches: () => location.pathname.replace(/\/$/, '') === '/setting/user',
  },
]

type MountedPrototype = {
  id: string
  host: HTMLElement
  frameWrap: HTMLElement
  launcher: HTMLButtonElement
}

let mounted: MountedPrototype | null = null

function setOpen(open: boolean) {
  if (!mounted) return
  mounted.frameWrap.hidden = !open
  mounted.launcher.hidden = open
  if (open) positionFrame(mounted.frameWrap)
}

function positionFrame(frameWrap: HTMLElement) {
  const minLeft = 208
  const minTop = 44
  const maxLeft = Math.max(minLeft, window.innerWidth - 360)
  const maxTop = Math.max(minTop, window.innerHeight - 200)
  const left = Math.min(Math.max(minLeft, frameWrap.offsetLeft || minLeft), maxLeft)
  const top = Math.min(Math.max(minTop, frameWrap.offsetTop || minTop), maxTop)
  frameWrap.style.left = `${left}px`
  frameWrap.style.top = `${top}px`
}

function attachDrag(frameHeader: HTMLElement, frameWrap: HTMLElement) {
  let grab: { x: number; y: number; left: number; top: number } | null = null
  frameHeader.addEventListener('pointerdown', (event) => {
    if ((event.target as HTMLElement).closest('button')) return
    grab = { x: event.clientX, y: event.clientY, left: frameWrap.offsetLeft, top: frameWrap.offsetTop }
    frameHeader.setPointerCapture(event.pointerId)
  })
  frameHeader.addEventListener('pointermove', (event) => {
    if (!grab) return
    frameWrap.style.left = `${grab.left + event.clientX - grab.x}px`
    frameWrap.style.top = `${grab.top + event.clientY - grab.y}px`
    positionFrame(frameWrap)
  })
  const stopDrag = () => {
    grab = null
  }
  frameHeader.addEventListener('pointerup', stopDrag)
  frameHeader.addEventListener('pointercancel', stopDrag)
}

function mountPrototype(route: PrototypeRoute) {
  const host = document.createElement('div')
  host.id = ROOT_ID
  const shadow = host.attachShadow({ mode: 'open' })

  const style = document.createElement('style')
  style.textContent = `
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
  `

  const launcher = document.createElement('button')
  launcher.type = 'button'
  launcher.className = 'launcher'
  launcher.textContent = 'P'
  launcher.setAttribute('aria-label', `打开${route.name}`)

  const frameWrap = document.createElement('section')
  frameWrap.className = 'frame-wrap'
  frameWrap.hidden = true
  frameWrap.setAttribute('aria-label', route.name)

  const frameHeader = document.createElement('div')
  frameHeader.className = 'frame-header'
  const frameTitle = document.createElement('span')
  frameTitle.textContent = route.name
  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'frame-close'
  close.setAttribute('aria-label', '退出原型')
  const closeIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  closeIcon.setAttribute('viewBox', '0 0 24 24')
  closeIcon.setAttribute('width', '14')
  closeIcon.setAttribute('height', '14')
  closeIcon.setAttribute('aria-hidden', 'true')
  closeIcon.innerHTML =
    '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>'
  close.append(closeIcon, document.createTextNode('退出原型'))
  frameHeader.append(frameTitle, close)

  const frameBody = document.createElement('div')
  frameBody.className = 'frame-body'
  const frame = document.createElement('iframe')
  frame.title = '用户管理原型'
  frame.src = chrome.runtime.getURL('index.html?embedded=user-management')
  frame.style.cssText = 'width:100%;height:100%;border:0;background:#eef2f7;'
  frameBody.append(frame)

  frameWrap.append(frameHeader, frameBody)

  launcher.addEventListener('click', () => setOpen(true))
  close.addEventListener('click', () => setOpen(false))
  attachDrag(frameHeader, frameWrap)
  shadow.append(style, frameWrap, launcher)
  document.documentElement.appendChild(host)
  mounted = { id: route.id, host, frameWrap, launcher }
}

function syncPrototype() {
  const route = prototypeRoutes.find((item) => item.matches())
  if (mounted && mounted.id === route?.id) return
  mounted?.host.remove()
  mounted = null
  if (route) mountPrototype(route)
}

function scheduleSync() {
  setTimeout(syncPrototype, 150)
}

document.addEventListener('click', () => {
  scheduleSync()
}, true)
window.addEventListener('popstate', scheduleSync)
window.addEventListener('hashchange', scheduleSync)
window.addEventListener('resize', () => {
  if (mounted && !mounted.frameWrap.hidden) positionFrame(mounted.frameWrap)
})
new MutationObserver(scheduleSync).observe(document.documentElement, { childList: true, subtree: true })
syncPrototype()

// ---------- 真实接口桥：iframe 内原型通过本 content script 在页面上下文发起请求 ----------
// iframe 是 chrome-extension:// origin，跨域且不带业务 cookie，故由本脚本（同源页面上下文）代发。
type BridgeRequestMessage = {
  __bridge: 'lecang-prototype:req'
  id: number
  method: 'GET' | 'POST'
  path: string
  query?: Record<string, string>
  body?: unknown
}

type BridgeEnvelope = {
  __bridge: 'lecang-prototype:res'
  id: number
  ok: boolean
  status: number
  data?: unknown
  error?: string
}

function readToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)Admin-Token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

async function handleBridgeRequest(msg: BridgeRequestMessage, source: MessageEventSource): Promise<void> {
  try {
    const url = '/api' + msg.path + (msg.query ? '?' + new URLSearchParams(msg.query).toString() : '')
    const token = readToken()
    console.log('[乐仓原型桥] ->', msg.method, url, 'token=', token ? '已读到(' + token.length + '字符)' : '空!')
    const headers: Record<string, string> = { Authorization: token }
    const init: RequestInit = { method: msg.method, credentials: 'include', headers }
    if (msg.method !== 'GET') {
      headers['Content-Type'] = 'application/json;charset=UTF-8'
      init.body = JSON.stringify(msg.body ?? {})
    }
    const resp = await fetch(url, init)
    console.log('[乐仓原型桥] <-', msg.method, url, resp.status)
    const contentType = resp.headers.get('content-type') || ''
    const data = contentType.includes('application/json') ? await resp.json() : await resp.text()
    const env: BridgeEnvelope = { __bridge: 'lecang-prototype:res', id: msg.id, ok: resp.ok, status: resp.status, data }
    ;(source as Window).postMessage(env, '*')
  } catch (error) {
    const env: BridgeEnvelope = { __bridge: 'lecang-prototype:res', id: msg.id, ok: false, status: 0, error: String(error) }
    ;(source as Window).postMessage(env, '*')
  }
}

window.addEventListener('message', (event: MessageEvent) => {
  const data = event.data as BridgeRequestMessage | undefined
  if (!data || data.__bridge !== 'lecang-prototype:req') return
  if (!mounted) return
  const iframe = mounted.frameWrap.querySelector('iframe')
  if (!event.source || event.source !== iframe?.contentWindow) return
  void handleBridgeRequest(data, event.source)
})

// ---------- 本地文件变更自动重载 ----------
// 扩展定期读取自身包内 version.json，与上次记录对比；文件更新（git pull / 覆盖 dist）后自动重载，
// 免去同事在 chrome://extensions 手动刷新。发布新版本时务必同步更新 version.json。
const VERSION_URL = chrome.runtime.getURL('version.json')
const VERSION_KEY = 'lecang-prototype:version'

async function autoReloadCheck(): Promise<void> {
  try {
    const resp = await fetch(VERSION_URL + '?t=' + Date.now())
    const text = (await resp.text()).trim()
    if (!text) return
    const stored = await chrome.storage.local.get(VERSION_KEY)
    const prev = (stored[VERSION_KEY] as string | undefined) || ''
    if (prev && text !== prev) {
      // 等 git pull 写完文件再重载，避免加载半成品
      window.setTimeout(() => chrome.runtime.reload(), 3000)
      return
    }
    if (!prev || text !== prev) {
      await chrome.storage.local.set({ [VERSION_KEY]: text })
    }
  } catch {
    // 读取失败时静默忽略，不影响乐仓页面
  }
}
window.setInterval(autoReloadCheck, 15000)
void autoReloadCheck()
