@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

REM 设置代理（本机 GitHub 走 127.0.0.1:7897）
git config --global http.proxy http://127.0.0.1:7897
git config --global https.proxy http://127.0.0.1:7897

REM 先提交本地改动（仅在确有改动时才提交）
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "sync: auto update %date% %time%"
)

REM 用 rebase + autostash 拉取（自动暂存任何残留改动，干净接上远程）
git pull --rebase --autostash origin main
if errorlevel 1 (
  echo.
  echo [!] 拉取时出现冲突，请手动解决后执行： git rebase --continue
  goto cleanup
)

REM 推送到 GitHub
git push -u origin main
if errorlevel 1 goto cleanup

:cleanup
git config --global --unset http.proxy
git config --global --unset https.proxy
echo.
echo Done. You can close this window.
pause >nul
