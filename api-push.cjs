// 乐仓原型插件发布脚本（GitHub Git Data API 版）
// 用途：把本地项目文件同步到 GitHub 私有仓库，绕开公司网络对 git push 的劫持。
// 用法（PowerShell）：
//   $env:GITHUB_TOKEN="你的token"; node api-push.cjs
// 可选环境变量：OWNER（默认 CYY-real）、REPO（默认 lecang-prototype-extension）、COMMIT_MSG（默认 "publish"）
'use strict'
const fs = require('fs')
const path = require('path')

const token = process.env.GITHUB_TOKEN
const owner = process.env.OWNER || 'CYY-real'
const repo = process.env.REPO || 'lecang-prototype-extension'
const root = process.cwd()
const commitMsg = process.env.COMMIT_MSG || `publish ${new Date().toISOString().slice(0, 10)}`

if (!token) { console.error('缺少环境变量 GITHUB_TOKEN，先执行：$env:GITHUB_TOKEN="你的token"'); process.exit(1) }

const API = `https://api.github.com/repos/${owner}/${repo}`
const HEADERS = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'lecang-publish',
  'Content-Type': 'application/json',
}

async function api(method, url, body) {
  const resp = await fetch(url, { method, headers: HEADERS, body: body ? JSON.stringify(body) : undefined })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`${method} ${url.replace(API, '')} -> ${resp.status} ${text.slice(0, 200)}`)
  }
  if (resp.status === 204) return null
  return resp.json().catch(() => null)
}

function collectFiles(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === '.diag' || entry.name === 'node_modules') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...collectFiles(full))
    else if (path.extname(entry.name).toLowerCase() !== '.zip') out.push(full)
  }
  return out
}

async function main() {
  const files = collectFiles(root)
    .map(f => path.relative(root, f).split(path.sep).join('/'))
    .filter(f => !/^\./.test(f)) // 排除隐藏文件（.gitignore 需保留，单独特判）
    .sort()
  const withGitignore = files.includes('gitignore') || fs.existsSync(path.join(root, '.gitignore'))
  const finalFiles = withGitignore && !files.includes('.gitignore') ? ['.gitignore', ...files].sort() : files
  console.log(`仓库: ${owner}/${repo}  待上传文件: ${finalFiles.length} 个`)

  // 1) 创建/更新 blobs
  const blobs = new Map()
  for (const rel of finalFiles) {
    const buf = fs.readFileSync(path.join(root, rel))
    const r = await api('POST', `${API}/git/blobs`, { content: buf.toString('base64'), encoding: 'base64' })
    blobs.set(rel, r.sha)
  }

  // 2) 创建 tree
  const tree = await api('POST', `${API}/git/trees`, {
    tree: [...blobs].map(([p, sha]) => ({ path: p, mode: '100644', type: 'blob', sha })),
  })

  // 3) 查当前 main 指针，创建 commit（保持线性历史）
  let parentSha = null
  try {
    const ref = await api('GET', `${API}/git/ref/heads/main`)
    parentSha = ref.object.sha
  } catch { parentSha = null }
  const commit = await api('POST', `${API}/git/commits`, {
    message: commitMsg,
    tree: tree.sha,
    parents: parentSha ? [parentSha] : [],
  })

  // 4) 更新 ref
  if (parentSha) await api('PATCH', `${API}/git/refs/heads/main`, { sha: commit.sha, force: true })
  else await api('POST', `${API}/git/refs`, { ref: 'refs/heads/main', sha: commit.sha })

  console.log(`发布完成  commit: ${commit.sha}`)
}

main().catch((e) => { console.error('发布失败:', e.message); process.exit(1) })
