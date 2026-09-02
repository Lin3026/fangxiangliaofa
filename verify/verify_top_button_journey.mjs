/* 高保真完整旅程：症状+体质+舌象 后，真实鼠标依次点击「舌象下方(428)」与「顶部(376)」按钮
 * 截图留证。用法: node verify/verify_top_button_journey.mjs
 */
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const url = process.argv[2] || 'file:///C:/Users/1/WorkBuddy/fangxiangliaofa/index.html';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const DEBUG_PORT = 9345;
const PROFILE = 'C:/Users/1/AppData/Local/Temp/cdp_journey_' + Date.now();
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${PROFILE}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--no-proxy-server',
  '--window-size=1440,1800', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let targets;
for (let i = 0; i < 60; i++) { try { targets = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json(); break; } catch { await sleep(300); } }
const page = targets.find(t => t.type === 'page') || targets[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pend = new Map();
ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } };
const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result?.value;
};
async function realClick(x, y) {
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await sleep(60);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  await sleep(500);
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync('verify/' + name + '.png', Buffer.from(r.data, 'base64'));
  console.log('截图:', name + '.png');
}

await send('Runtime.enable'); await send('Page.enable');
await send('Page.navigate', { url });
for (let i = 0; i < 60; i++) { await sleep(400); if (await ev(`!!document.getElementById('q')`)) break; }
await sleep(1200);

// 注入探针
await ev(`(() => {
  window.closeEntryModal();
  window.__probe = { top: 0, bottom: 0 };
  const orig = window.runSearch;
  window.runSearch = function() {
    if (window.__probe._last === 'top') window.__probe.top++;
    if (window.__probe._last === 'bottom') window.__probe.bottom++;
    return orig.apply(this, arguments);
  };
  return true;
})()`);
await sleep(200);

// 用户旅程：填症状 + 选体质(第1张卡) + 选舌象 红舌
await ev(`(() => {
  document.getElementById('q').value = '失眠';
  const tc = document.querySelector('#searchTizhiGrid .tizhi-card');
  if (tc) tc.click();   // 选第一个体质
  if (window.szSelectPick) window.szSelectPick('qi', 'hong');
  return { tizhiSel: document.getElementById('searchTizhiSel').textContent };
})()`);
console.log('体质已选:', await ev(`document.getElementById('searchTizhiSel').textContent`));
console.log('szPick =', JSON.stringify(await ev(`window.szPick`)));

// ---- 先点【舌象下方】按钮（需滚动到可见）----
const bottom = await ev(`(() => {
  const b = document.querySelector('#tab-search .dz-pickbar button[onclick="runSearch()"]');
  const r = b.getBoundingClientRect();
  const absTop = r.top + window.scrollY;
  window.scrollTo(0, absTop - 350);
  return true;
})()`);
await sleep(600);
const bc = await ev(`(() => {
  const b = document.querySelector('#tab-search .dz-pickbar button[onclick="runSearch()"]');
  const r = b.getBoundingClientRect();
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), inView: r.top >= 0 && r.top < innerHeight };
})()`);
console.log('舌象下方按钮坐标(滚后):', JSON.stringify(bc));
await ev(`window.__probe._last = 'bottom'; true`);
if (bc.inView) await realClick(bc.x, bc.y);
await shot('journey_after_bottom');
const st1 = await ev(`(() => ({
  bottomCalls: window.__probe.bottom,
  children: document.getElementById('results').children.length,
  count: document.getElementById('count').textContent.slice(0, 110)
}))()`);
console.log('== 点【舌象下方】后 ==', JSON.stringify(st1, null, 1));

// ---- 再点【顶部】按钮（滚回顶部）----
await ev(`window.scrollTo(0, 0)`);
await sleep(500);
await ev(`window.__probe._last = 'top'; document.getElementById('results').innerHTML='__RESET__'; true`);
const tc2 = await ev(`(() => {
  const b = document.querySelector('#tab-search .sticky-search .toolbar .btn');
  const r = b.getBoundingClientRect();
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
})()`);
await realClick(tc2.x, tc2.y);
await shot('journey_after_top');
const st2 = await ev(`(() => ({
  topCalls: window.__probe.top,
  reset: document.getElementById('results').innerHTML.slice(0, 10),
  children: document.getElementById('results').children.length,
  count: document.getElementById('count').textContent.slice(0, 110)
}))()`);
console.log('== 点【顶部】后 ==', JSON.stringify(st2, null, 1));

chrome.kill(); process.exit(0);
