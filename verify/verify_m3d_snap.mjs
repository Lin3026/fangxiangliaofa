/* 无头验证 meridian3d.html 的「自动贴合」+「骨骼名」
 * 用法: node verify/verify_m3d_snap.mjs <url>
 * 依赖: Node 22 (内置 WebSocket) + 本机 Chrome
 */
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const url = process.argv[2] || 'http://127.0.0.1:8931/meridian3d.html?v=' + Date.now();
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const DEBUG_PORT = 9333;
const PROFILE = 'C:/Users/1/AppData/Local/Temp/cdp_m3dsnap_' + Date.now();

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${DEBUG_PORT}`,
  `--user-data-dir=${PROFILE}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  '--enable-unsafe-swiftshader', '--use-angle=swiftshader',
  '--window-size=1440,900',
  'about:blank'
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getJson(path) {
  const res = await fetch('http://127.0.0.1:' + DEBUG_PORT + path);
  return res.json();
}

// 等调试端口就绪
let targets = null;
for (let i = 0; i < 60; i++) {
  try { targets = await getJson('/json/list'); break; } catch { await sleep(300); }
}
if (!targets) { console.error('❌ Chrome 调试端口未就绪'); chrome.kill(); process.exit(1); }

const page = targets.find(t => t.type === 'page') || targets[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let msgId = 0;
const pending = new Map();
const consoleErrors = [];
let onEvent = null;

ws.onmessage = ev => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    return;
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    const d = msg.params.exceptionDetails;
    consoleErrors.push('EXC: ' + (d.exception?.description || d.text || '').slice(0, 500));
  }
  if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
    const txt = msg.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 300);
    consoleErrors.push(msg.params.type.toUpperCase() + ': ' + txt);
  }
  if (onEvent) onEvent(msg);
};

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error('eval error: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result?.value;
}
async function waitFor(expr, timeoutMs = 40000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const v = await evaluate(expr);
      if (v) return v;
    } catch { /* 页面可能还在加载 */ }
    await sleep(400);
  }
  throw new Error('等待超时: ' + expr);
}

await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');
await send('Page.navigate', { url });
console.log('▶ 导航到:', url);

// 等模型加载完成 (__m3d 与 mRecords 出现)
await waitFor('!!(window.__m3d && window.__m3d.mRecords && window.__m3d.mRecords.length===14)');
await sleep(1500); // 等渲染稳定

// === 身体横截面轮廓扫描 ===
const profile = await evaluate(`(()=>{
  const body = window.__m3d.getBody();
  if(!body) return {error:'body null'};
  body.updateMatrixWorld(true);
  const skin = window.__m3d.buildSkinSnap();
  const pts = [];
  skin.tris.forEach(t=>{ pts.push(t[0],t[1],t[2]); });
  const slices = [];
  for(let y=0; y<=1.75; y+=0.05){
    let mnX=1e9,mxX=-1e9,mnZ=1e9,mxZ=-1e9,cnt=0;
    for(let i=0;i<pts.length;i++){
      const p=pts[i];
      if(p.y>=y-0.025 && p.y<y+0.025){
        if(p.x<mnX)mnX=p.x; if(p.x>mxX)mxX=p.x;
        if(p.z<mnZ)mnZ=p.z; if(p.z>mxZ)mxZ=p.z;
        cnt++;
      }
    }
    slices.push({y:+y.toFixed(2), cnt, x:[+mnX.toFixed(2),+mxX.toFixed(2)], z:[+mnZ.toFixed(2),+mxZ.toFixed(2)]});
  }
  return {total:pts.length, slices};
})()`);
if(profile && !profile.error){
  console.log('\n========== 人体横截面轮廓 ==========');
  console.log('皮肤顶点样本数:', profile.total);
  console.log('y    | 顶点数 | x范围(左右) | z范围(前后)');
  console.log('-----|--------|-------------|-------------');
  profile.slices.forEach(s=>{
    if(s.cnt===0) return;
    console.log('  '+s.y.toFixed(2)+' |  '+String(s.cnt).padStart(5)+' | ['+s.x[0].toString().padStart(5)+','+s.x[1].toString().padStart(5)+'] | ['+s.z[0].toString().padStart(5)+','+s.z[1].toString().padStart(5)+']');
  });
} else {
  console.log('轮廓扫描失败:', profile && profile.error);
}

const report = await evaluate(`(async () => {
  const d = window.__m3d;
  d.mRecords.forEach(r=>d.setMeridianVisible(r.id, true));
  const skin = d.buildSkinSnap();

  function stats(curve){
    let sum=0,min=1e9,max=0,n=0;
    for(let i=0;i<=32;i++){
      const P=curve.getPoint(i/32);
      const Q=d.rotY(P, d.getYaw());
      const S=d.snapToSkin(Q, skin);
      if(!S) continue;
      const dist=Q.distanceTo(S.point);
      sum+=dist; min=Math.min(min,dist); max=Math.max(max,dist); n++;
    }
    return {n, avg:+(sum/n).toFixed(4), min:+(min).toFixed(4), max:+(max).toFixed(4)};
  }

  const before = d.mRecords.map(r=>({id:r.id, name:r.name, ...stats(r.baseCurve)}));

  document.getElementById('bSnap').click();
  await new Promise(r=>setTimeout(r, 800));
  const after = d.mRecords.map(r=>({id:r.id, name:r.name, ...stats(r.tube)}));

  // 真实穴位坐标覆盖探针: 对比每条经络首/末点 + 点数, 验证 acu_real.js 是否真正生效
  const ptsSample = d.mRecords.map(r=>{
    const h = r.basePts[0], t = r.basePts[r.basePts.length-1];
    return { id:r.id, n:r.basePts.length,
      head:[+h.x.toFixed(4),+h.y.toFixed(4),+h.z.toFixed(4)],
      tail:[+t.x.toFixed(4),+t.y.toFixed(4),+t.z.toFixed(4)] };
  });

  // 骨骼命名检查
  const boneNames = [];
  if(d.getBone()){
    d.getBone().traverse(o=>{
      const nm=(o.name||'').trim();
      if(nm && /[\\u4e00-\\u9fa5a-zA-Z]/.test(nm) && !/^(group|null|object\\d*)$/i.test(nm)) boneNames.push(nm);
    });
  }
  document.getElementById('bBoneLabels').click();
  await new Promise(r=>setTimeout(r, 400));
  const boneLabels = d.getBoneLabels() ? d.getBoneLabels().children.length : -1;

  // 骨骼 mesh 结构(纯 JS 算包围盒, 不依赖模块作用域 THREE)
  const boneStruct = (()=>{
    const b = d.getBone(); if(!b) return null;
    b.updateMatrixWorld(true);
    const out = [];
    b.traverse(o=>{
      if(!o.isMesh || !o.geometry) return;
      const pos = o.geometry.attributes.position; if(!pos) return;
      const mw = o.matrixWorld, e = mw.elements;
      let mnX=1e9,mnY=1e9,mnZ=1e9,mxX=-1e9,mxY=-1e9,mxZ=-1e9;
      const a = pos.array;
      for(let i=0;i<a.length;i+=3){
        const x=a[i],y=a[i+1],z=a[i+2];
        const wx=e[0]*x+e[4]*y+e[8]*z+e[12];
        const wy=e[1]*x+e[5]*y+e[9]*z+e[13];
        const wz=e[2]*x+e[6]*y+e[10]*z+e[14];
        if(wx<mnX)mnX=wx;if(wx>mxX)mxX=wx;
        if(wy<mnY)mnY=wy;if(wy>mxY)mxY=wy;
        if(wz<mnZ)mnZ=wz;if(wz>mxZ)mxZ=wz;
      }
      const tris = o.geometry.index ? o.geometry.index.count/3 : pos.count/3;
      out.push({name:o.name||'(no name)', tris:tris,
        min:[+mnX.toFixed(2),+mnY.toFixed(2),+mnZ.toFixed(2)],
        max:[+mxX.toFixed(2),+mxY.toFixed(2),+mxZ.toFixed(2)]});
    });
    return out;
  })();

  // 自动探测的骨骼标签坐标
  let anatomy = null;
  try{ anatomy = d.computeAnatomyPositions(); }catch(e){ anatomy = {error:String(e)}; }
  // 详细模式(脊柱分节 + 面骨)
  let detailed = null;
  try{ detailed = d.computeDetailedPositions(); }catch(e){ detailed = {error:String(e)}; }

  return {
    before, after, ptsSample,
    anatomy, detailed,
    skinTris: skin.tris.length,
    boneNames: boneNames.slice(0, 40),
    boneNameCount: boneNames.length,
    boneLabels,
    boneStruct,
    yaw: d.getYaw(),
    hasBody: !!d.getBody(),
    status: d.getStatus()
  };
})()`);

// 主截图: 贴合 + 全部经络 + 骨骼 + 骨骼名 都可见时的效果
await sleep(800);
const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
writeFileSync('C:/Users/1/WorkBuddy/fangxiangliaofa/verify/m3d_snap_verify.png', Buffer.from(shot.data, 'base64'));

// 第二张截图：只显示骨骼+骨骼名（验证标签视觉）
await evaluate(`(()=>{
  const d = window.__m3d;
  document.getElementById('bBody').click();
  document.getElementById('bSnap').click();
  d.mRecords.forEach(r=>d.setMeridianVisible(r.id, false));
  document.getElementById('bBone').click();
  // 直接打开骨骼名（不靠 click toggle, 避免第二次点反关掉）
  const grp = d.getBoneLabels();
  if(grp) grp.visible = true;
  return 'ok';
})()`);
await sleep(1200);
const shot2 = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
writeFileSync('C:/Users/1/WorkBuddy/fangxiangliaofa/verify/m3d_bones_only.png', Buffer.from(shot2.data, 'base64'));

// 第三张: 详细模式(脊柱分节 + 面骨)
await evaluate(`(()=>{
  const d = window.__m3d;
  const btn = document.getElementById('bBoneDetail');
  if(btn) btn.click();          // 切到详细
  const grp = d.getBoneLabels();
  if(grp) grp.visible = true;
  return 'ok';
})()`);
await sleep(1200);
const shot3 = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
writeFileSync('C:/Users/1/WorkBuddy/fangxiangliaofa/verify/m3d_bones_detail.png', Buffer.from(shot3.data, 'base64'));

console.log('\n========== 验证报告 ==========');
console.log('皮肤三角面数:', report.skinTris);
console.log('人体模型加载:', report.hasBody);
console.log('当前经络对齐角:', report.yaw + '°');
console.log('骨骼命名节点:', report.boneNameCount, report.boneNames.length ? '示例: ' + report.boneNames.slice(0, 10).join('、') : '(无)');
console.log('骨骼名标签生成:', report.boneLabels);
if(report.boneStruct){
  console.log('骨骼 mesh 结构:');
  report.boneStruct.forEach((m,i)=>console.log('  '+(i+1)+'. '+m.name+'  tris='+m.tris+'  bb=['+m.min.join(',')+' ~ '+m.max.join(',')+']'));
}
if(report.detailed && !report.detailed.error && report.detailed.length){
  console.log('\n-- 详细模式: 脊柱分节 + 颅面细骨 (x=前后 y=身高 z=左右) --');
  report.detailed.forEach(([nm,x,y,z])=>console.log('  '+nm.padEnd(12)+' x='+String(x).padStart(6)+'  y='+String(y).padStart(5)+'  z='+String(z).padStart(6)));
  console.log('  合计: '+report.detailed.length+' 个标签');
} else {
  console.log('\n详细模式探测失败:', report.detailed && report.detailed.error);
}

if(report.anatomy && !report.anatomy.error && report.anatomy.length){
  console.log('\n-- 自动探测的骨骼标签坐标 (x=前后 y=身高 z=左右) --');
  report.anatomy.forEach(([nm,x,y,z])=>console.log('  '+nm.padEnd(12)+' x='+String(x).padStart(6)+'  y='+y+'  z='+String(z).padStart(6)));
} else {
  console.log('\n骨骼标签自动探测失败:', report.anatomy && report.anatomy.error);
}

console.log('\n-- 贴合前(手工坐标到皮肤的平均距离, 米) --');
report.before.forEach(r=>console.log('  ' + r.id.padEnd(3), r.name.padEnd(10), 'avg=' + r.avg, 'min=' + r.min, 'max=' + r.max));
console.log('\n-- 贴合后(应≈0.012 = 12mm 偏移) --');
report.after.forEach(r=>console.log('  ' + r.id.padEnd(3), r.name.padEnd(10), 'avg=' + r.avg, 'min=' + r.min, 'max=' + r.max));
console.log('\n状态栏:', report.status);

console.log('\n-- 真实穴位坐标覆盖探针 (basePts 首/末点 + 点数) --');
console.log('  期望: ren 首≈[0.0005,0.9526,0.0699](下腹) 末≈[0.0002,1.6738,0.0546](下巴); st 首≈[-0.032,1.747,0.033](脸) 末≈[-0.109,0,0.124](脚趾)');
report.ptsSample.forEach(r=>console.log('  '+r.id.padEnd(3)+' n='+String(r.n).padStart(2)+'  head=['+r.head.join(',')+']  tail=['+r.tail.join(',')+']'));

if (consoleErrors.length) {
  console.log('\n-- 控制台错误/警告 --');
  consoleErrors.forEach(e => console.log('  ' + e));
} else {
  console.log('\n✅ 无控制台错误');
}

ws.close();
chrome.kill();
