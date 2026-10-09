# 乐仓页面内原型插件

此目录是独立于仓库现有原型的 Chrome 插件。插件在已打开的乐仓系统页面中运行，点击浏览器工具栏的扩展图标弹出原型面板（popup）。只有在 `src/content.ts` 配置了对应路由的页面，扩展图标才会显示绿色角标，弹窗内展示对应原型内容。

当前配置：`https://app.lecangs.com/setting/user` →「用户管理原型」。页面依据 GDAWS 前端用户管理源码实现筛选、分页、新增、编辑、详情、启用/禁用，以及员工档案和角色字段联动。

## 代码结构

- `src/`：源码（`content.ts` 页面注入脚本、`background.ts` 自动重载后台、`App.vue` 原型界面、`PermissionSelect.vue` 权限选择器）
- `dist/`：构建产物，Chrome 加载的就是这个目录
- `public/version.json`：版本标识的源文件，构建时自动复制到 `dist/version.json`；**自动重载机制依赖它**，每次发布新版本务必更新

## 环境切换

`manifest.json` 的 `content_scripts.matches` 使用 `*.lecangs.com` 通配，生产/测试等任意 lecangs 域名自动生效；若需接入非 lecangs 域名，在该处补上对应匹配规则。

## GitHub 私有仓库 + 自动重载（当前协作方式）

仓库：`https://github.com/CYY-real/lecang-prototype-extension`（私有）

**首次安装（同事侧，一次）**
1. 电脑安装 git（`https://git-scm.com`）
2. 让维护者把自己加为仓库协作者（Settings → Collaborators），用自己的 GitHub 账号 clone：
   `git clone https://github.com/CYY-real/lecang-prototype-extension.git`
3. 打开 `chrome://extensions`，开启右上角「开发者模式」，点击「加载已解压的扩展程序」，选择 clone 下来目录里的 `dist` 文件夹
4. 打开乐仓系统 `/setting/user` 页面，右下角出现「P」按钮即可使用

**日常更新（同事侧）**
- 双击仓库目录下的 `update.bat`（自动 `git pull`），插件检测到 `dist/version.json` 变化后 **约 18 秒内自动重载**，无需再碰 chrome://extensions
- 也可手动在仓库目录执行 `git pull`，效果相同

**发布新版本（维护者侧）**
1. 修改 `src/` 源码，并**更新 `public/version.json`**（例如 `{"version":"0.7.0","build":"20261020-1"}`）——不更新它同事不会收到重载
2. 从仓库根目录运行 `npm run extension:build`，生成包含 `dist/version.json`、`dist/manifest.json` 等文件的完整产物
3. 运行发布脚本（公司网络下 `git push` 会被劫持到内部 GitLab，故用 GitHub API 发布）：
   ```powershell
   $env:GITHUB_TOKEN="你的token"
   node api-push.cjs
   ```
   脚本会把全部文件以一次 commit 同步到 `main`（保持线性历史）
4. 同事双击 `update.bat` 即可，全自动

> 提示：`api-push.cjs` 通过 GitHub Git Data API 推送，不依赖 git push，token 只从环境变量读取、不会写进文件或仓库。

## 换电脑 / 新电脑初始化（维护者）

1. 安装 Git：https://git-scm.com/download/win
2. 安装 Node.js（LTS 版）：https://nodejs.org （`api-push.cjs` 发布脚本依赖）
3. 打开命令行，执行（公司网络 clone 报 SSL 证书错误时先执行第一条）：
   ```powershell
   git config --global http.sslverify false
   git clone https://github.com/CYY-real/lecang-prototype-extension.git
   ```
4. `chrome://extensions` → 开发者模式 → 加载已解压 → 选择 clone 下来的 `dist` 文件夹
5. 发布代码前，在 GitHub 生成新的 fine-grained PAT（Settings → Developer settings → Personal access tokens，权限：本仓库 Contents 读写），旧的轮换掉
6. 发布：`$env:GITHUB_TOKEN="新token"; node api-push.cjs`（在仓库目录下运行）

## 自动重载原理

`dist/content.js` 每 15 秒读取自身包内 `version.json` 并与 `chrome.storage.local` 中上次记录对比；发现内容变化后先保存新版本，再延迟 3 秒通知 `dist/background.js` 重载整个扩展，使新代码立即生效，并避免同一版本循环重载。因此发布时改 `public/version.json` 并重新构建是关键步骤。

## 本地构建/预览

从仓库根目录构建（需先 `npm install` 初始化环境；当前目录未内置 node_modules）：

```powershell
npm run extension:build
```

`npm run extension:preview` 可在 `http://127.0.0.1:4174` 单独预览原型内容，但不会展示 popup 面板或角标状态。

## 注意

- `dist/version.json` 是自动重载的触发文件，由 `public/version.json` 构建生成；它与 `manifest.json` 的 `version` 字段是两回事，发布时两者都要维护。
- 私钥/访问令牌不要提交进仓库。
