@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

REM Set proxy for GitHub (local proxy at 127.0.0.1:7897)
git config --global http.proxy http://127.0.0.1:7897
git config --global https.proxy http://127.0.0.1:7897

REM Stage and commit any local changes
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "sync: auto update %date% %time%"
)

REM Restore remote-tracking ref (local origin/main may be stale/gone)
git fetch origin || echo [fetch skipped]

REM Single-user repo: local has all files. Plain --force overwrites remote main.
REM (deploy.js pushes via API with different SHAs, so --force-with-lease fails
REM  with "stale info". Plain --force is the correct tool here.)
git push --force origin main

if errorlevel 1 (
  echo.
  echo PUSH FAILED. Check network / PAT and try again.
) else (
  echo.
  echo PUSH OK.
  echo.
  echo >>> IMPORTANT: Browser may show CACHED old page. <<<
  echo >>> Press Ctrl+Shift+R (or Cmd+Shift+R) on the site to hard-refresh. <<<
)

REM Always clean up proxy
git config --global --unset http.proxy
git config --global --unset https.proxy
echo.
echo Done. You can close this window.
pause >nul
