/* 实证 v2：关闭 entryMask 后，用 CDP 真实鼠标点击对比「顶部」与「舌象下方」搜索配方按钮
 * 用法: node verify/verify_top_button.mjs
 */
import { spawn } from 'node:child_process';

const url = process.argv[2] || 'file:///C:/Users/1/WorkBuddy/fangxiangliaofa/index.html';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const DEBUG_PORT = 9343;
const PROFILE = 'C:/Users/1/AppData/Local/Temp/cdp_topbtn_' + Date.now();

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${DEBUG_PORT}`,
  `--user-data-dir=${PROFILE}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--no-proxy-server',
  '--window-size=1440,900',
  'about:blank'
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function getJson(path) {
  const res = await fetch('http://127.0.0.1:' + DEBUG_PORT + path);
  return res.json();
}
let targets = null;
for (let i = 0; i < 60; i++) {
  try { targets = await getJson('/json/list'); break; } catch { await sleep(300); }
}
if (!targets) { console.error('Chrome debug port not ready'); chrome.kill(); process.exit(1); }
const page = targets.find(t => t.type === 'page') || targets[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let msgId = 0;
const pending = new Map();
const logs = [];
ws.onmessage = ev => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    return;
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    logs.push('EXC: ' + (msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text || '').slice(0, 600));
  }
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    logs.push('CONSOLE.ERROR: ' + msg.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 400));
  }
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
async function realClick(x, y) {
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await sleep(60);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

// ---- 1) 打开页面 ----
await send('Runtime.enable');
await send('Page.enable');
await send('Page.navigate', { url });
let navOk = false;
for (let i = 0; i < 60; i++) {
  await sleep(400);
  const st = await evaluate(`({ hasQ: !!document.getElementById('q'), hasTab: !!document.querySelector('#tab-search') })`);
  if (st.hasQ && st.hasTab) { navOk = true; break; }
}
if (!navOk) { console.error('页面未就绪'); chrome.kill(); process.exit(1); }
await sleep(1200);

// ---- 2) 关掉须知遮罩 + 注入计数钩子 ----
await evaluate(`(() => {
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
await sleep(300);

// ---- 3) mask 关闭后的命中测试 ----
const hitInfo = await evaluate(`(() => {
  const b = document.querySelector('#tab-search .sticky-search .toolbar .btn');
  const b2 = document.querySelector('#tab-search .dz-pickbar button[onclick="runSearch()"]');
  const mask = document.getElementById('entryMask');
  function probe(btn) {
    const r = btn.getBoundingClientRect();
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {
      text: btn.textContent.trim(),
      rect: { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) },
      hitIsBtn: el === btn || btn.contains(el),
      hit: el ? el.tagName + '.' + (String(el.className).split(' ')[0]) : 'none'
    };
  }
  return { maskDisplay: mask ? mask.style.display : 'no-mask', top: probe(b), bottom: probe(b2) };
})()`);
console.log('=== mask 关闭后 hit-test ===');
console.log(JSON.stringify(hitInfo, null, 1));

// ---- 4) 设状态 q=失眠 + 舌象 红舌，真实点击【顶部】按钮 ----
await evaluate(`(() => {
  document.getElementById('q').value = '失眠';
  if (window.szSelectPick) window.szSelectPick('qi', 'hong');
  document.getElementById('results').innerHTML = '__RESET__';
  window.__probe._last = 'top';
  return true;
})()`);
const t = hitInfo.top.rect;
await realClick(t.x, t.y);
await sleep(500);
const afterTop = await evaluate(`(() => ({
  topCalls: window.__probe.top,
  resultsReset: document.getElementById('results').innerHTML.slice(0, 9),
  resultsChildren: document.getElementById('results').children.length,
  countText: document.getElementById('count').textContent.slice(0, 90)
}))()`);
console.log('=== 真实点击【顶部】后 ===');
console.log(JSON.stringify(afterTop, null, 1));

// ---- 5) 真实点击【舌象下方】按钮 ----
await evaluate(`(() => { document.getElementById('results').innerHTML = '__RESET2__'; window.__probe._last = 'bottom'; return true; })()`);
const b2 = hitInfo.bottom.rect;
await realClick(b2.x, b2.y);
await sleep(500);
const afterBottom = await evaluate(`(() => ({
  bottomCalls: window.__probe.bottom,
  resultsReset: document.getElementById('results').innerHTML.slice(0, 10),
  resultsChildren: document.getElementById('results').children.length,
  countText: document.getElementById('count').textContent.slice(0, 90)
}))()`);
console.log('=== 真实点击【舌象下方】后 ===');
console.log(JSON.stringify(afterBottom, null, 1));

// ---- 6) 顺带验证：mask 未关闭时顶部按钮真实点击（模拟用户没点我已知晓）----
await evaluate(`(() => { document.getElementById('results').innerHTML = '__RESET3__'; window.__probe._last = 'top'; window.showEntryModal(); return true; })()`);
await sleep(300);
await realClick(t.x, t.y);
await sleep(400);
const underMask = await evaluate(`(() => ({ topCalls: window.__probe.top,
  resultsReset: document.getElementById('results').innerHTML.slice(0, 10) }))()`);
console.log('=== mask【未关】时真实点击顶部 ===');
console.log(JSON.stringify(underMask, null, 1));

console.log('=== 页面异常/console.error ===');
console.log(logs.length ? logs.join('\n') : '(无)');
chrome.kill();
process.exit(0);
