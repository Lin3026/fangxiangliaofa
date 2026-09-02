// verify Layer 1 (browser-side IIFE) syntax + drift detection
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
// 从 var DZ_ORGAN_IMG 起，跨过该行（任意字符直到 ;），再跨任意字符到 dzIntegrityCheck 结束
const m = html.match(/var DZ_ORGAN_IMG[^;]*;[\s\S]*?\(function dzIntegrityCheck\(\)\{[\s\S]*?\}\)\(\);/);
if (!m) { console.error('FAIL: cannot extract IIFE block'); process.exit(2); }
const block = m[0];
console.log('Extracted block, length:', block.length, 'chars');

// 1) Syntax check (empty data, should not throw)
try {
  new Function('var TONGUE_STEPS=[{key:"qi",options:[{key:"x",label:"X"}]}]; var DZ_PHOTO_MAP={qi:{x:"a.png"}}; var DZ_ORGAN_IMG=""; var document={createElement:()=>({style:{},innerHTML:""}),getElementById:()=>null};' + block);
  console.log('PASS 1/3: 语法正确');
} catch (e) { console.error('SYNTAX:', e.message); process.exit(1); }

// 2) Empty data → should NOT alarm (everything matches)
const errs2 = [];
const orig = console.error;
console.error = (...a) => errs2.push(a.join(' '));
new Function('var TONGUE_STEPS=[{key:"qi",short:"t",title:"t",options:[{key:"a",label:"A"},{key:"b",label:"B"}]}]; var DZ_PHOTO_MAP={qi:{a:"x.png",b:"y.png"}}; var DZ_ORGAN_IMG=""; var document={createElement:()=>({style:{},innerHTML:""}),getElementById:()=>null};' + block)();
console.error = orig;
if (errs2.length === 0) console.log('PASS 2/3: 完整数据不报警');
else { console.error('FAIL 2/3: 应不报警但报错:', errs2); process.exit(1); }

// 3) Drift → SHOULD alarm
const errs3 = [];
console.error = (...a) => errs3.push(a.join(' '));
new Function('var TONGUE_STEPS=[{key:"qi",short:"望舌质",title:"t",options:[{key:"a",label:"A"},{key:"b",label:"B"}]}]; var DZ_PHOTO_MAP={qi:{a:"x.png"}}; var DZ_ORGAN_IMG=""; var document={createElement:()=>({style:{},innerHTML:""}),getElementById:()=>null};' + block)();
console.error = orig;
if (errs3.some(e => e.includes('舌象数据漂移') && e.includes('望舌质') && e.includes('b'))) {
  console.log('PASS 3/4: 漂移检测触发（检测到 b 选项缺映射）');
} else { console.error('FAIL 3/4: 应报警但没有。捕获:', errs3); process.exit(1); }

// 4) qu 步骤无 options（区域多选设计）→ MUST NOT throw（回归测试，防 v1.4 初次部署的 TypeError）
let threw4 = null;
try {
  new Function('var TONGUE_STEPS=[{key:"qi",short:"t",title:"t",options:[{key:"a",label:"A"}]},{key:"qu",short:"分区",title:"q",qu:true}]; var DZ_PHOTO_MAP={qi:{a:"x.png"}}; var DZ_ORGAN_IMG=""; var document={createElement:()=>({style:{},innerHTML:""}),getElementById:()=>null};' + block)();
} catch (e) { threw4 = e; }
if (threw4 && String(threw4.message).includes("Cannot read properties of undefined (reading 'length')")) {
  console.error('FAIL 4/4: qu 步骤（无 options）触发 TypeError，正是线上 bug 现场！msg:', threw4.message);
  process.exit(1);
} else if (threw4) {
  console.error('FAIL 4/4: qu 步骤抛出非预期错误:', threw4.message);
  process.exit(1);
} else {
  console.log('PASS 4/4: qu 步骤（无 options）被正确跳过，未抛 TypeError');
}
console.log('\n✅ 三层防护全部验证通过');
