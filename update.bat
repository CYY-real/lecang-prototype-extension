@echo off
chcp 65001 >nul
cd /d %~dp0
echo 正在从 GitHub 拉取最新版本...
git pull
echo.
if %errorlevel%==0 (
  echo 拉取完成。插件会在几秒内自动重新加载，无需手动刷新。
) else (
  echo 拉取失败，请检查网络或 Git 凭据。
)
pause
