@echo off
setlocal
cd /d "%~dp0"

REM ============================================================
REM  Push to GitHub Pages  (repo: Lin3026/fangxiangliaofa)
REM  Robustness notes:
REM   1. Probe proxy port 7897 first; only set git proxy when the
REM      port is actually listening (avoids git hanging forever).
REM   2. Proxy config is ALWAYS cleaned up before the final pause.
REM   3. On success the resulting short commit hash is printed.
REM
REM  IMPORTANT: this file is deliberately PURE ASCII.
REM  cmd.exe on some Windows builds mis-parses .bat files that mix
REM  chcp 65001 with non-ASCII text inside parenthesized blocks and
REM  flash-closes the window mid-run. Keeping it ASCII guarantees
REM  the window stays open until "Press any key".
REM ============================================================

set PROXY_SET=0
netstat -ano | findstr ":7897" | findstr "LISTENING" >nul
if %errorlevel%==0 (
  git config --global http.proxy http://127.0.0.1:7897
  git config --global https.proxy http://127.0.0.1:7897
  set PROXY_SET=1
  echo [proxy] enabled 127.0.0.1:7897
) else (
  echo [proxy] port 7897 not listening - going direct
)

REM ---- commit any local changes ----
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "sync: auto update %date% %time%"
  echo [commit] new commit created
) else (
  echo [commit] nothing new to commit - pushing as-is
)

REM ---- restore remote tracking ref (origin/main may be stale) ----
git fetch origin 2>nul
if errorlevel 1 echo [fetch] skipped - not fatal

REM ---- push with plain --force (single-user repo) ----
git push --force origin main

if errorlevel 1 (
  echo.
  echo ============================================================
  echo   PUSH FAILED
  echo   Check 1: is your proxy software listening on port 7897?
  echo   Check 2: is the GitHub PAT still valid?
  echo ============================================================
) else (
  echo.
  echo ============================================================
  echo   PUSH OK
  echo.
  for /f %%i in ('git rev-parse --short HEAD') do echo   HEAD commit: %%i
  echo   GitHub Pages will be live in about 1-2 minutes.
  echo.
  echo   IMPORTANT: hard-refresh the browser with Ctrl+Shift+R
  echo ============================================================
)

REM ---- always clean up proxy config ----
git config --global --unset http.proxy 2>nul
git config --global --unset https.proxy 2>nul
if %PROXY_SET%==1 echo [cleanup] proxy config removed

echo.
echo Done. Press any key to close.
pause >nul
