@echo off
chcp 65001 >nul
title 中医芳香理疗 - 本地服务（解决经络3D骨骼加载问题）

REM 启动本地 HTTP 服务器（解决 Chrome 对 file:// 协议下多个 fetch 的安全限制）
REM 端口固定 8765；关闭此窗口即停止服务。

set PORT=8765
set ROOT=%~dp0

echo.
echo ======================================================
echo   中医芳香理疗 - 本地服务已启动
echo ======================================================
echo.
echo   访问地址（用浏览器打开下面的链接，不要双击 index.html）：
echo.
echo     http://127.0.0.1:%PORT%/index.html
echo.
echo   或者直接打开经络3D：
echo     http://127.0.0.1:%PORT%/meridian3d.html
echo.
echo   关闭此窗口 = 停止服务
echo.
echo ======================================================
echo.

REM 优先用系统的 python（通常已自带）；若没有则试 node
where python >nul 2>&1
if %errorlevel%==0 (
  start "" "http://127.0.0.1:%PORT%/index.html"
  python -m http.server %PORT%
  goto :eof
)

where py >nul 2>&1
if %errorlevel%==0 (
  start "" "http://127.0.0.1:%PORT%/index.html"
  py -m http.server %PORT%
  goto :eof
)

REM 兜底：用 node 启一个静态服务
where node >nul 2>&1
if %errorlevel%==0 (
  start "" "http://127.0.0.1:%PORT%/index.html"
  node -e "const http=require('http'),fs=require('fs'),path=require('path'),url=require('url');const root=process.cwd();const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.fbx':'application/octet-stream','.glb':'model/gltf-binary','.svg':'image/svg+xml'};http.createServer((req,res)=>{let p=decodeURIComponent(url.parse(req.url).pathname);if(p==='/')p='/index.html';const f=path.join(root,p);fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);res.end('404 '+p);}else{res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(d);}});}).listen(%PORT%,'127.0.0.1',()=>console.log('listening '+%PORT%));"
  goto :eof
)

echo 未找到 python 或 node，请先安装其一。
pause
