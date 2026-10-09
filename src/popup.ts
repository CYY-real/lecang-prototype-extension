declare const chrome: {
  runtime: {
    reload(): void
  }
  scripting: {
    executeScript(options: {
      target: { tabId: number }
      world: 'MAIN'
      func: () => void
    }): Promise<void>
  }
  tabs: {
    query(queryInfo: { active: boolean; currentWindow: boolean }): Promise<Array<{ id?: number }>>
  }
  storage: {
    local: {
      get(keys: string | Record<string, unknown>): Promise<Record<string, unknown>>
      set(items: Record<string, unknown>): Promise<void>
    }
  }
}

const SHOW_KEY = 'lecang-prototype:showPanel'

const refreshButton = document.querySelector<HTMLButtonElement>('#refresh-page')
const status = document.querySelector<HTMLParagraphElement>('#status')
const showSwitch = document.querySelector<HTMLInputElement>('#show-panel')

// 浮窗显示开关：状态存 chrome.storage.local，content script 据此挂载/卸载浮窗
async function initShowSwitch(): Promise<void> {
  if (!showSwitch) return
  const stored = await chrome.storage.local.get(SHOW_KEY)
  showSwitch.checked = Boolean(stored[SHOW_KEY])
  showSwitch.addEventListener('change', () => {
    void chrome.storage.local.set({ [SHOW_KEY]: showSwitch.checked })
  })
}
void initShowSwitch()

refreshButton?.addEventListener('click', async () => {
  refreshButton.disabled = true
  if (status) status.textContent = '正在重新加载插件并刷新页面…'

  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (activeTab?.id === undefined) throw new Error('未找到当前页面')
    await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      world: 'MAIN',
      func: () => {
        window.setTimeout(() => window.location.reload(), 600)
      },
    })
    chrome.runtime.reload()
  } catch {
    refreshButton.disabled = false
    if (status) status.textContent = '重新加载失败，请重试'
  }
})
