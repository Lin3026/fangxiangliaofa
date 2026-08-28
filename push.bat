@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

REM ============================================================
REM  推送到 GitHub Pages (Lin3026/fangxiangliaofa)
REM  健壮性要点:
REM   1. 先探测代理端口 7897 是否真在监听, 没开就不设代理(避免全部 git 操作卡死)
REM   2. 无论成功/失败/中途 Ctrl+C, 结尾都清理代理配置(不留残留)
REM   3. 成功时打印 commit hash, 方便肉眼确认
REM ============================================================

set PROXY_SET=0
netstat -ano | findstr ":7897" | findstr "LISTENING" >nul
if %errorlevel%==0 (
  git config --global http.proxy http://127.0.0.1:7897
  git config --global https.proxy http://127.0.0.1:7897
  set PROXY_SET=1
  echo [代理] 已启用 127.0.0.1:7897
) else (
  echo [代理] 端口 7897 未监听, 本次直连 GitHub
)

REM ---- 提交本地改动 ----
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "sync: auto update %date% %time%"
  echo [提交] 已创建新提交
) else (
  echo [提交] 无新改动, 直接推送
)

REM ---- 恢复远端跟踪引用(本地 origin/main 可能是 stale/gone) ----
git fetch origin 2>nul || echo [fetch] 跳过(不影响推送)

REM ---- 推送: 单用户仓库, 用 plain --force 覆盖远端 ----
git push --force origin main

if errorlevel 1 (
  echo.
  echo ============================================================
  echo   PUSH FAILED - 推送失败
  echo   请检查: 1) 代理软件(Clash 等)是否已开启
  echo           2) GitHub PAT 是否过期
  echo ============================================================
) else (
  echo.
  echo ============================================================
  echo   PUSH OK - 推送成功
  echo.
  for /f %%i in ('git rev-parse --short HEAD') do echo   最新提交: %%i
  echo   GitHub Pages 约 1-2 分钟后生效
  echo.
  echo   重要: 浏览器请按 Ctrl+Shift+R 硬刷新,
  echo         否则看到的还是缓存的旧页面!
  echo ============================================================
)

REM ---- 无论如何都清理代理(防止残留导致下次 git 全部卡死) ----
git config --global --unset http.proxy 2>nul
git config --global --unset https.proxy 2>nul
if %PROXY_SET%==1 echo [清理] 代理配置已移除

echo.
echo Done. 按任意键关闭.
pause >nul
