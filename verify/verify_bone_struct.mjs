/* 检查骨骼模型结构(纯 JS, 不依赖模块作用域 THREE) */
import { spawn } from 'node:child_process';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const DEBUG=9334, PROF='C:/Users/1/AppData/Local/Temp/cdp_m3dbone_'+Date.now();
const ch=spawn(CHROME,['--headless=new','--remote-debugging-port='+DEBUG,'--user-data-dir='+PROF,'--no-first-run','--no-default-browser-check','--disable-extensions','--enable-unsafe-swiftshader','--use-angle=swiftshader','about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let tg=null;for(let i=0;i<60;i++){try{tg=await(await fetch('http://127.0.0.1:'+DEBUG+'/json/list')).json();break;}catch{await sleep(300);}}
const ws=new WebSocket(tg[0].webSocketDebuggerUrl);
await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
let id=0;const pend=new Map();
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}};
function send(m,p={}){return new Promise((r,j)=>{const i=++id;pend.set(i,{resolve:r,reject:j});ws.send(JSON.stringify({id:i,method:m,params:p}));});}
async function ev(x,awaitP=false){const r=await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:awaitP});if(r.exceptionDetails){console.log('eval异常:',r.exceptionDetails.text,'|',r.exceptionDetails.exception&&r.exceptionDetails.exception.description);}return r.result&&r.result.value;}
async function evWait(expr,ms){const t0=Date.now();while(Date.now()-t0<ms){const v=await ev(expr);if(v)return v;await sleep(500);}return null;}
await send('Page.enable');await send('Runtime.enable');
await send('Page.navigate',{url:'http://127.0.0.1:8931/meridian3d.html?v='+Date.now()});
await sleep(3000);
console.log('  url:',await ev('window.location.href'));
console.log('  title:',await ev('document.title'));
console.log('  scripts:',await ev('document.querySelectorAll("script").length'));
console.log('  typeof __m3d:',await ev('typeof window.__m3d'));
console.log('  typeof __m3d.getBone:',await ev('typeof (window.__m3d && window.__m3d.getBone)'));
await evWait('!!(window.__m3d && window.__m3d.getBone && window.__m3d.getBone())',60000);
await sleep(1200);

// 调试: 确认 window.__m3d 存在
const probe=await ev('({hasM3d:typeof window.__m3d, hasGetBone: typeof (window.__m3d && window.__m3d.getBone), boneIsObj: window.__m3d && window.__m3d.getBone && typeof window.__m3d.getBone() === "object"})');
console.log('调试 probe:',JSON.stringify(probe));

// 用纯 JS: 通过 __m3d.getBone() 拿到骨骼对象, 遍历 isMesh, 从 geometry.attributes.position 自己算包围盒
const info=await ev(`(()=>{
  const b=window.__m3d.getBone(); if(!b) return {error:'bone null'};
  const out=[];
  // 我们需要 matrixWorld 把顶点转到 world 空间. 这些元素里 b.matrix 是它的局部变换,
  // 但 modelGroup 在 world 下, world 的 matrixWorld 在 __m3d 里没暴露. 不过
  // obj.matrixWorld 是 world 空间; 我们只需 bb.min/max 中心. 直接用 matrixWorld 即可.
  b.updateMatrixWorld(true);
  b.traverse(function(o){
    if(!o.isMesh || !o.geometry) return;
    const pos = o.geometry.attributes.position; if(!pos) return;
    const mw = o.matrixWorld;
    const e=mw.elements;
    let minX=1e9,minY=1e9,minZ=1e9,maxX=-1e9,maxY=-1e9,maxZ=-1e9;
    const arr=pos.array;
    for(let i=0;i<arr.length;i+=3){
      const x=arr[i],y=arr[i+1],z=arr[i+2];
      const wx=e[0]*x+e[4]*y+e[8]*z+e[12];
      const wy=e[1]*x+e[5]*y+e[9]*z+e[13];
      const wz=e[2]*x+e[6]*y+e[10]*z+e[14];
      if(wx<minX)minX=wx;if(wx>maxX)maxX=wx;
      if(wy<minY)minY=wy;if(wy>maxY)maxY=wy;
      if(wz<minZ)minZ=wz;if(wz>maxZ)maxZ=wz;
    }
    const cx=(minX+maxX)/2,cy=(minY+maxY)/2,cz=(minZ+maxZ)/2;
    const tris = o.geometry.index? o.geometry.index.count/3 : pos.count/3;
    out.push({name:o.name||'(no name)', tris:tris,
      min:[+minX.toFixed(2),+minY.toFixed(2),+minZ.toFixed(2)],
      max:[+maxX.toFixed(2),+maxY.toFixed(2),+maxZ.toFixed(2)],
      center:[+cx.toFixed(2),+cy.toFixed(2),+cz.toFixed(2)]});
  });
  return {meshCount:out.length, meshes:out};
})()`);
if(!info||info.error){console.log('错误:',info&&info.error);}
else{
  console.log('骨骼 mesh 总数:',info.meshCount);
  info.meshes.forEach(function(m,i){
    console.log('  '+(i+1)+'. '+m.name+'  tris='+m.tris+'  bb=['+m.min.join(',')+' ~ '+m.max.join(',')+']  center='+m.center.join(','));
  });
}
ws.close();ch.kill();