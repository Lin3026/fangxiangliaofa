/* 扫描人体皮肤网格的横截面轮廓: 每个高度 y 的 x/z 范围
 * 目的: 确认手臂是 T-pose(水平张开) 还是 垂直下垂, 以及各部位实际位置
 * 用法: node verify/verify_body_profile.mjs
 * 依赖: 先启动 http.server (端口 8931)
 */
import { spawn } from 'node:child_process';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const DEBUG=9335, PROF='C:/Users/1/AppData/Local/Temp/cdp_m3dprof_'+Date.now();
const ch=spawn(CHROME,['--headless=new','--remote-debugging-port='+DEBUG,'--user-data-dir='+PROF,'--no-first-run','--no-default-browser-check','--disable-extensions','--enable-unsafe-swiftshader','--use-angle=swiftshader','about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let tg=null;for(let i=0;i<60;i++){try{tg=await(await fetch('http://127.0.0.1:'+DEBUG+'/json/list')).json();break;}catch{await sleep(300);}}
const ws=new WebSocket(tg[0].webSocketDebuggerUrl);
await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
let id=0;const pend=new Map();
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}};
function send(m,p={}){return new Promise((r,j)=>{const i=++id;pend.set(i,{resolve:r,reject:j});ws.send(JSON.stringify({id:i,method:m,params:p}));});}
async function ev(x,a=false){const r=await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:a});if(r.exceptionDetails){console.log('eval异常:',r.exceptionDetails.text,r.exceptionDetails.exception&&r.exceptionDetails.exception.description);}return r.result&&r.result.value;}
await send('Page.enable');await send('Runtime.enable');
await send('Page.navigate',{url:'http://127.0.0.1:8931/meridian3d.html?v='+Date.now()});
// 等模型加载
for(let i=0;i<140;i++){if(await ev('!!(window.__m3d && window.__m3d.getBody && window.__m3d.getBody())'))break;await sleep(400);}
await sleep(1500);

const profile=await ev(`(()=>{
  const body = window.__m3d.getBody();
  if(!body) return {error:'body null'};
  body.updateMatrixWorld(true);
  // 去掉 world 旋转, 拿到人体空间(bbody space)顶点
  const skin = window.__m3d.buildSkinSnap();
  // 直接用 skin.tris 里的顶点(已在人体空间)
  const pts = [];
  skin.tris.forEach(t=>{ pts.push(t[0],t[1],t[2]); });
  // 按高度切片: 每 0.05m 一段
  const slices = [];
  for(let y=0; y<=1.75; y+=0.05){
    let mnX=1e9,mxX=-1e9,mnZ=1e9,mxZ=-1e9,cnt=0;
    // 统计该高度带(±0.025)内的点
    for(let i=0;i<pts.length;i++){
      const p=pts[i];
      if(p.y>=y-0.025 && p.y<y+0.025){
        if(p.x<mnX)mnX=p.x; if(p.x>mxX)mxX=p.x;
        if(p.z<mnZ)mnZ=p.z; if(p.z>mxZ)mxZ=p.z;
        cnt++;
      }
    }
    slices.push({y:+y.toFixed(2), cnt,
      x:[+mnX.toFixed(2),+mxX.toFixed(2)],
      z:[+mnZ.toFixed(2),+mxZ.toFixed(2)]});
  }
  return {total:pts.length, slices};
})()`);

if(!profile||profile.error){console.log('错误:',profile&&profile.error);}
else{
  console.log('皮肤顶点样本数:',profile.total);
  console.log('\n高度 y | 顶点数 | x范围(左右) | z范围(前后)');
  console.log('-------|--------|-------------|------------');
  profile.slices.forEach(s=>{
    if(s.cnt===0){ console.log('  '+s.y.toFixed(2)+'  |   0    |   (无)      |   (无)'); return; }
    console.log('  '+s.y.toFixed(2)+'  |  '+String(s.cnt).padStart(5)+' | ['+String(s.x[0]).padStart(5)+','+String(s.x[1]).padStart(5)+'] | ['+String(s.z[0]).padStart(5)+','+String(s.z[1]).padStart(5)+']');
  });
}
ws.close();ch.kill();