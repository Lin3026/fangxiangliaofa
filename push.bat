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

REM 【重要】本仓库由 deploy.js 经 GitHub API 直接建提交，与本地 git 提交 SHA 不同；
REM   若用 git pull --rebase 会把两端的同名文件误判为 add/add 冲突。
REM   故不拉取，直接以本地完整历史强制覆盖远端（单人仓库、本地含全部文件，内容不丢；
REM   覆盖后两端 SHA 一致，日后 git pull 即为干净快进，不会再冲突）。
git push --force-with-lease origin main
if errorlevel 1 goto cleanup

:cleanup
git config --global --unset http.proxy
git config --global --unset https.proxy
echo.
echo Done. You can close this window.
pause >nul
