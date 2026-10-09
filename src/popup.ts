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
}

const refreshButton = document.querySelector<HTMLButtonElement>('#refresh-page')
const status = document.querySelector<HTMLParagraphElement>('#status')

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
