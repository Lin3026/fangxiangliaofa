/*
 * 为 65 种精油添加血压影响标注 (xueya 字段)
 *   "升血压" / "轻度升血压" / "降血压" / "轻度降血压"
 * 口径原则：
 *   - 与库内既有 zhuyi 原文一致(丁香/欧洲赤松/艾草=升, 高地薰衣草=降)
 *   - 《芳香疗法学》明确强调温和的条目不标(高地牛膝草/沉香醇百里香)
 *   - 传统芳疗"高血压慎用"经典名单 + 降血压镇静类经典名单
 * 同时修复 fx-116 引用名(迷迭香→樟脑迷迭香, 肉桂→锡兰肉桂)对齐精油档案
 * 用法: node verify/add_xueya.js
 */
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "data.js");
const src = fs.readFileSync(FILE, "utf8");

const m = src.match(/^([\s\S]*?)window\.AROMA_BASE\s*=\s*(\{[\s\S]*\});?\s*$/);
if (!m) { console.error("未匹配到 AROMA_BASE"); process.exit(1); }
const header = m[1]; // 保留文件头注释
const obj = eval("(" + m[2] + ")");

// ---------- 血压影响标注表 ----------
const BP = {
  // —— 升血压(高血压者勿用/慎用) ——
  "樟脑迷迭香": "升血压",   // 经典升血压/神经强壮精油
  "胡椒薄荷":   "升血压",   // 神经强壮类；主站免责声明已提示高血压慎用薄荷
  "鼠尾草":     "升血压",   // 传统高血压慎用名单
  "丁香":       "升血压",   // zhuyi 已有"高血压者勿用"
  "锡兰肉桂":   "升血压",   // 强心升压、循环刺激
  "欧洲赤松":   "升血压",   // zhuyi 已有"高血压者勿用"
  "艾草":       "升血压",   // zhuyi 已有"高血压禁用（易升血压）"
  "甜罗勒":     "轻度升血压", // 神经强壮类
  "黑胡椒":     "轻度升血压", // 温和循环促进
  "肉豆蔻":     "轻度升血压", // 过量心悸；库内已警示中毒风险
  "黑云杉":     "轻度升血压", // 类皮质醇作用，长期大量需注意
  // —— 降血压(低血压者慎用；与降压药叠加注意) ——
  "高地薰衣草": "降血压",   // zhuyi 已有"低血压者勿高剂量使用"
  "马郁兰":     "降血压",   // 经典降血压
  "快乐鼠尾草": "降血压",   // 经典降血压/镇静
  "香蜂草":     "降血压",
  "依兰":       "降血压",
  "橙花":       "降血压",
  "苦橙叶":     "降血压",
  "缬草":       "降血压",   // 强镇静
  "柠檬香茅":   "降血压",   // 柠檬草降血压有明确文献与传统应用
  "柠檬":       "轻度降血压",
  "香柠檬（佛手柑）": "轻度降血压",
  "佛手柑":     "轻度降血压",
  "罗马洋甘菊": "轻度降血压",
  "德国洋甘菊": "轻度降血压",
  "岩兰草":     "轻度降血压",
  "千叶玫瑰":   "轻度降血压",
  "大马士革玫瑰": "轻度降血压",
};

let setCount = 0, missNames = [];
for (const [name, flag] of Object.entries(BP)) {
  const o = obj.oils.find(x => x.name === name);
  if (!o) { missNames.push(name); continue; }
  o.xueya = flag;
  setCount++;
}
if (missNames.length) { console.error("血压表中未找到精油: " + missNames.join(", ")); process.exit(1); }

// ---------- 修复 fx-116 引用名对齐 ----------
let fixed = [];
obj.formulas.forEach(f => {
  if (f.id !== "fx-116") return;
  ((f.oils) || []).forEach(o => {
    if (o.name === "迷迭香") { o.name = "樟脑迷迭香"; fixed.push("fx-116 oils 迷迭香→樟脑迷迭香"); }
    if (o.name === "肉桂") { o.name = "锡兰肉桂"; fixed.push("fx-116 oils 肉桂→锡兰肉桂"); }
  });
  ((f.blend) || []).forEach(b => {
    if (b.oil === "迷迭香") { b.oil = "樟脑迷迭香"; fixed.push("fx-116 blend 迷迭香→樟脑迷迭香"); }
    if (b.oil === "肉桂") { b.oil = "锡兰肉桂"; fixed.push("fx-116 blend 肉桂→锡兰肉桂"); }
  });
});

// ---------- meta 更新 ----------
obj.meta.version = "1.7.0";
obj.meta.updated = "2026-10-26";
obj.meta.note += "血压影响标注（2026-10-26）：65种精油中30种新增xueya字段——升血压类（迷迭香/胡椒薄荷/鼠尾草/丁香/锡兰肉桂/欧洲赤松/艾草，轻度：甜罗勒/黑胡椒/肉豆蔻/黑云杉）高血压者慎用；降血压类（高地薰衣草/马郁兰/快乐鼠尾草/香蜂草/依兰/橙花/苦橙叶/缬草/柠檬香茅，轻度：柠檬/佛手柑/洋甘菊/岩兰草/玫瑰）低血压者慎用、服降压药者注意叠加；精油卡片红/蓝警示框展示，配方详情自动汇总本方血压提示。高地牛膝草/沉香醇百里香依原书温和口径不标注。";

// ---------- 写回 ----------
fs.writeFileSync(FILE, header + "window.AROMA_BASE = " + JSON.stringify(obj, null, 2) + ";\n");

// ---------- 回读验证 ----------
const re = fs.readFileSync(FILE, "utf8");
const robj = eval("(" + re.match(/window\.AROMA_BASE\s*=\s*(\{[\s\S]*\});?\s*$/)[1] + ")");
const flagged = robj.oils.filter(o => o.xueya);
const ups = flagged.filter(o => o.xueya.indexOf("升") >= 0);
const downs = flagged.filter(o => o.xueya.indexOf("降") >= 0);
const names = new Set(robj.oils.map(o => o.name));
let badRef = 0;
robj.formulas.forEach(f => {
  ((f.oils) || []).forEach(o => { if (!names.has(o.name)) badRef++; });
  ((f.blend) || []).forEach(b => { if (!names.has(b.oil)) badRef++; });
});
console.log("标注完成: 升血压 " + ups.length + " 种, 降血压 " + downs.length + " 种, 共 " + flagged.length + " 种");
console.log("fx-116 修复: " + (fixed.length ? fixed.join("; ") : "无需修复"));
console.log("回读验证: oils=" + robj.oils.length + ", 配方引用不匹配=" + badRef + ", meta.version=" + robj.meta.version);
if (flagged.length !== 28 || badRef !== 0) { console.error("校验失败"); process.exit(1); }
console.log("✓ 全部通过");
