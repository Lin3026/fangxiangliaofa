@echo off
echo ========================================
echo   GitHub Push - fangxiangliaofa
echo ========================================
echo.

cd /d "D:\3drenti\fangxiangliaofa"

echo [1/3] Checking changes...
git status --short
echo.

echo [2/3] Adding and committing...
git add -A
git commit -m "update human-atlas: lung meridian manual positioning + label style optimization"
echo.

echo [3/3] Pushing to GitHub (force)...
git push --force origin main
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
