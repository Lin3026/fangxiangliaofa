@echo off
chcp 65001 >nul
echo ========================================
echo   芳疗网站 GitHub 一键推送
echo ========================================
echo.

cd /d "D:\3drenti\fangxiangliaofa"

echo [1/3] 检查变更...
git status --short
echo.

echo [2/3] 添加并提交...
git add -A
git commit -m "更新human-atlas：手太阴肺经手动定位+标签样式优化"
echo.

echo [3/3] 推送到GitHub...
git push origin main
echo.

if %errorlevel% equ 0 (
    echo ========================================
    echo   ✅ 推送成功！线上即将更新
    echo ========================================
) else (
    echo ========================================
    echo   ❌ 推送失败，请检查网络或代理
    echo ========================================
)

echo.
pause
