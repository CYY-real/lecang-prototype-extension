declare const chrome: {
  runtime: {
    reload(): void
    onMessage: {
      addListener(callback: (message: unknown) => void): void
    }
  }
}

const RELOAD_MESSAGE = 'lecang-prototype:reload'

chrome.runtime.onMessage.addListener((message) => {
  if ((message as { type?: string } | null)?.type !== RELOAD_MESSAGE) return
  chrome.runtime.reload()
})
