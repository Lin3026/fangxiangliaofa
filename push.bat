@echo off
echo ========================================
echo   GitHub Push - fangxiangliaofa
echo ========================================
echo.

cd /d "D:\3drenti\fangxiangliaofa"

echo [1/4] Adding and committing local changes...
git add -A
git commit -m "update human-atlas: lung meridian manual positioning + label style optimization"
echo.

echo [2/4] Pulling latest from remote...
git pull --rebase origin main
if %errorlevel% neq 0 (
    echo.
    echo Pull failed! There may be conflicts.
    echo Run "git status" to see conflicts, resolve them, then run "git add -A" and "git rebase --continue"
    pause
    exit /b 1
)
echo.

echo [3/4] Checking status...
git status --short
echo.

echo [4/4] Pushing to GitHub...
git push origin main
echo.

if %errorlevel% equ 0 (
    echo ========================================
    echo   SUCCESS! Pushed to GitHub
    echo ========================================
) else (
    echo ========================================
    echo   FAILED! Check network or proxy
    echo ========================================
)

echo.
pause
