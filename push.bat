@echo off
setlocal
cd /d "%~dp0"

REM Set proxy for GitHub (local machine proxy at 127.0.0.1:7897)
git config --global http.proxy http://127.0.0.1:7897
git config --global https.proxy http://127.0.0.1:7897

REM If a previous merge was left unfinished, finish it first
git rev-parse -q --verify MERGE_HEAD >nul 2>&1
if not errorlevel 1 (
  echo Unfinished merge detected, finishing it...
  git add -A
  git commit --no-edit
  if errorlevel 1 goto cleanup
)

REM Pull remote first to avoid non-fast-forward
git pull origin main --allow-unrelated-histories --no-edit
if errorlevel 1 goto cleanup

REM Commit any local changes
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "sync: auto update %date% %time%"
)

REM Push to GitHub
git push -u origin main
if errorlevel 1 goto cleanup

:cleanup
git config --global --unset http.proxy
git config --global --unset https.proxy

echo.
echo Done. You can close this window.
pause >nul
