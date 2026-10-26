/*
 * 为 human-atlas 肌肉系统(402部件)添加中英文对照名称
 * 生成格式: name = "中文名 原英文名"
 * 用法: node verify/add_muscle_zh.js
 */
const fs = require("fs");
const path = require("path");

const ATLAS = path.join(__dirname, "..", "models", "atlas.json");
const j = JSON.parse(fs.readFileSync(ATLAS, "utf8"));

// ---------- 特例表(整名精确匹配, 小写) ----------
const SPECIAL = {
  "anterolateral head of lateral papillary muscle of left ventricle": "左心室外侧乳头肌前外侧头",
  "anterior papillary muscle of right ventricle": "右心室前乳头肌",
  "lateral papillary muscle of left ventricle": "左心室外侧乳头肌",
  "posterior papillary muscle of right ventricle": "右心室后乳头肌",
  "septal papillary muscle of right ventricle": "右心室隔侧乳头肌",
};

// ---------- 基础肌肉名词典(小写) ----------
const D = {
  // 眼外肌
  "inferior oblique": "下斜肌", "superior oblique": "上斜肌",
  "inferior rectus": "下直肌", "superior rectus": "上直肌",
  "lateral rectus": "外直肌", "medial rectus": "内直肌",
  "levator palpebrae superioris": "上睑提肌",
  // 足部
  "abductor hallucis": "踇展肌", "adductor hallucis": "踇收肌",
  "flexor hallucis brevis": "踇短屈肌", "flexor hallucis longus": "踇长屈肌",
  "extensor hallucis brevis": "踇短伸肌", "extensor hallucis longus": "踇长伸肌",
  "adductor brevis": "短收肌", "adductor longus": "长收肌",
  "adductor magnus": "大收肌", "adductor minimus": "小收肌",
  "extensor digitorum longus": "趾长伸肌",
  "flexor accessorius": "足底方肌",
  "flexor digitorum brevis": "趾短屈肌", "flexor digitorum longus": "趾长屈肌",
  "gemellus inferior": "下孖肌", "gemellus superior": "上孖肌",
  "gluteus maximus": "臀大肌", "gluteus medius": "臀中肌", "gluteus minimus": "臀小肌",
  "gracilis": "股薄肌", "iliacus": "髂肌",
  "obturator externus": "闭孔外肌", "obturator internus": "闭孔内肌",
  "pectineus": "耻骨肌", "piriformis": "梨状肌", "plantaris": "跖肌",
  "popliteus": "腘肌", "psoas major": "腰大肌", "quadratus femoris": "股方肌",
  "rectus femoris": "股直肌", "sartorius": "缝匠肌",
  "semimembranosus": "半膜肌", "semitendinosus": "半腱肌", "soleus": "比目鱼肌",
  "vastus intermedius": "股中间肌", "vastus lateralis": "股外侧肌", "vastus medialis": "股内侧肌",
  "gastrocnemius": "腓肠肌", "biceps femoris": "股二头肌",
  "lumbrical": "蚓状肌", "plantar interosseous": "骨间足底肌",
  // 躯干
  "pectoralis major": "胸大肌", "pectoralis minor": "胸小肌",
  "coccygeus": "尾骨肌", "iliococcygeus": "髂尾肌",
  "pubococcygeus": "耻尾肌", "puborectalis": "耻骨直肠肌",
  "superficial perineal muscle": "会阴浅肌",
  "external anal sphincter": "肛门外括约肌",
  "external intercostal muscle": "肋间外肌", "internal intercostal muscle": "肋间内肌",
  "innermost intercostal muscle": "肋间最内肌",
  "external oblique": "腹外斜肌",
  "serratus anterior": "前锯肌", "subclavius": "锁骨下肌",
  "transversus thoracis": "胸横肌",
  "levatores costarum breves": "肋短提肌", "levatores costarum longi": "肋长提肌",
  // 臂/手
  "deltoid": "三角肌",
  "extensor carpi ulnaris": "尺侧腕伸肌", "flexor carpi ulnaris": "尺侧腕屈肌",
  "extensor carpi radialis brevis": "桡侧腕短伸肌", "extensor carpi radialis longus": "桡侧腕长伸肌",
  "flexor carpi radialis": "桡侧腕屈肌",
  "pronator teres": "旋前圆肌", "pronator quadratus": "旋前方肌", "supinator": "旋后肌",
  "flexor digitorum superficialis": "指浅屈肌", "flexor digitorum profundus": "指深屈肌",
  "triceps brachii": "肱三头肌", "biceps brachii": "肱二头肌",
  "abductor pollicis brevis": "拇短展肌", "abductor pollicis longus": "拇长展肌",
  "adductor pollicis": "拇收肌", "opponens pollicis": "拇对掌肌",
  "flexor pollicis brevis": "拇短屈肌", "flexor pollicis longus": "拇长屈肌",
  "extensor pollicis brevis": "拇短伸肌", "extensor pollicis longus": "拇长伸肌",
  "extensor digiti minimi": "小指伸肌", "extensor digitorum": "指伸肌",
  "extensor indicis": "示指伸肌",
  "anconeus": "肘肌", "brachialis": "肱肌", "brachioradialis": "肱桡肌", "coracobrachialis": "喙肱肌",
  "infraspinatus muscle": "冈下肌", "infraspinatus": "冈下肌",
  "supraspinatus": "冈上肌", "teres major": "大圆肌", "teres minor": "小圆肌",
  "palmaris longus": "掌长肌",
  "dorsal interossei": "骨间背侧肌", "palmar interossei": "骨间掌侧肌", "lumbricals": "蚓状肌",
  // 背部
  "lumbar rotator": "腰回旋肌", "cervical rotator": "颈回旋肌", "thoracic rotator": "胸回旋肌",
  "iliocostalis cervicis": "颈髂肋肌", "iliocostalis lumborum": "腰髂肋肌", "iliocostalis thoracis": "胸髂肋肌",
  "longissimus capitis": "头最长肌", "longissimus cervicis": "颈最长肌", "longissimus thoracis": "胸最长肌",
  "rhomboid major": "大菱形肌", "rhomboid minor": "小菱形肌",
  "semispinalis capitis": "头半棘肌", "semispinalis cervicis": "颈半棘肌", "semispinalis thoracis": "胸半棘肌",
  "serratus posterior inferior": "下后锯肌", "serratus posterior superior": "上后锯肌",
  "spinalis": "棘肌", "spinalis thoracis": "胸棘肌",
  "splenius capitis": "头夹肌", "splenius cervicis": "颈夹肌",
  "lateral lumbar intertransversarius": "腰横突间外侧肌", "medial lumbar intertransversarius": "腰横突间内侧肌",
  "anterior cervical intertransversarii": "颈横突间前肌", "posterior cervical intertransversarii": "颈横突间后肌",
  "interspinales lumborum": "腰棘间肌", "interspinales cervicis": "颈棘间肌", "interspinalis thoracis": "胸棘间肌",
  "trapezius": "斜方肌",
  // 颈部
  "digastric": "二腹肌", "longus colli": "颈长肌", "longus capitis": "头长肌",
  "platysma": "颈阔肌", "geniohyoid": "颏舌骨肌", "mylohyoid": "下颌舌骨肌",
  "obliquus capitis inferior": "头下斜肌", "obliquus capitis superior": "头上斜肌",
  "omohyoid": "肩胛舌骨肌",
  "rectus capitis anterior": "头前直肌", "rectus capitis posterior major": "头后大直肌",
  "rectus capitis posterior minor": "头后小直肌", "rectus capitis lateralis": "头外侧直肌",
  "scalenus anterior": "前斜角肌", "scalenus medius": "中斜角肌", "scalenus posterior": "后斜角肌",
  "sternocleidomastoid": "胸锁乳突肌", "sternohyoid": "胸骨舌骨肌", "sternothyroid": "胸骨甲状肌",
  "stylohyoid": "茎突舌骨肌", "thyrohyoid": "甲状舌骨肌",
  // 舌/腭/喉
  "genioglossus": "颏舌肌", "hyoglossus": "舌骨舌肌",
  "levator veli palatini": "腭帆提肌", "tensor veli palatini": "腭帆张肌",
  "uvular muscle": "悬雍垂肌",
  "aryepiglotticus": "杓会厌肌", "lateral crico-arytenoid": "环杓侧肌",
  "posterior crico-arytenoid": "环杓后肌", "oblique arytenoid": "杓斜肌",
  "transverse arytenoid": "杓横肌", "cricothyroid": "环甲肌",
  "thyro-arytenoid": "甲杓肌", "vocalis": "声带肌",
  // 其他
  "diaphragm": "膈肌",
};

// 肌小头 → 中文后缀
const HEADS = {
  "lateral": "外侧头", "medial": "内侧头", "long": "长头", "short": "短头",
  "oblique": "斜头", "transverse": "横头", "anterolateral": "前外侧头",
  "superficial": "浅头", "humeral": "肱头", "ulnar": "尺头",
};
// 肌部 → 中文后缀
const PARTS = {
  "abdominal": "腹部", "clavicular": "锁骨部", "sternocostal": "胸肋部",
  "acromial": "肩峰部", "spinal": "脊柱部",
  "ascending": "下部", "descending": "上部", "transverse": "中部",
  "inferior oblique": "下斜部", "superior oblique": "上斜部",
  "vertical intermediate": "垂直中间部", "oblique": "斜部", "straight": "直部",
};
const ORDINALS = { "first": 1, "second": 2, "third": 3, "fourth": 4 };
const SIDES = { "left": "左", "right": "右" };
const REGIONS = { "right foot": "右足", "left foot": "左足", "right hand": "右手", "left hand": "左手" };
// 手/足语境差异词
const REGION_WORDS = {
  "abductor digiti minimi": { "foot": "小趾展肌", "hand": "小指展肌" },
  "flexor digiti minimi brevis": { "foot": "小趾短屈肌", "hand": "小指短屈肌" },
  "opponens digiti minimi": { "foot": "小趾对跖肌", "hand": "小指对掌肌" },
};

function lookupBase(name, limbKind) {
  if (limbKind && REGION_WORDS[name]) return REGION_WORDS[name][limbKind];
  if (D[name]) return D[name];
  return null;
}

function translateCore(n) {
  // n 已小写、去除 "set of " 前缀后的核心
  let side = "";
  let m;
  // 1) 左/右 前缀
  if ((m = n.match(/^(left|right)\s+(.+)$/))) { side = SIDES[m[1]]; n = m[2]; }
  // 2) "X head of right/left Y"
  if ((m = n.match(/^([a-z]+)\s+head\s+of\s+(left|right)\s+(.+)$/)) && HEADS[m[1]]) {
    const base = lookupBase(m[3]);
    if (base) return SIDES[m[2]] + base + HEADS[m[1]];
  }
  // 3) "X part of right/left Y"
  if ((m = n.match(/^(.+?)\s+part\s+of\s+(left|right)\s+(.+)$/)) && PARTS[m[1]]) {
    const base = lookupBase(m[3]);
    if (base) return SIDES[m[2]] + base + PARTS[m[1]];
  }
  // 4) 序数 + 足部肌
  if ((m = n.match(/^(first|second|third|fourth)\s+(lumbrical|plantar interosseous|dorsal interosseous)\s+of\s+(left|right)\s+(foot|hand)$/))) {
    const base = lookupBase(m[2]);
    if (base) return SIDES[m[3]] + (m[4] === "foot" ? "足" : "手") + "第" + ORDINALS[m[1]] + base;
  }
  // 5) "X of right/left foot|hand" 尾缀
  if ((m = n.match(/^(.+?)\s+of\s+(left|right)\s+(foot|hand)$/))) {
    const base = lookupBase(m[1], m[3]);
    if (base) return SIDES[m[2]] + (m[3] === "foot" ? "足" : "手") + base;
  }
  // 6) 纯基础名
  const base = lookupBase(n);
  if (base) return side + base;
  return null;
}

function translate(name) {
  const low = name.toLowerCase().trim();
  if (SPECIAL[low]) return SPECIAL[low];
  // "Set of X" → 核心 + "群"
  const sm = low.match(/^set\s+of\s+(.+)$/);
  if (sm) {
    const core = translateCore(sm[1]);
    if (core) return core + "群";
    return null;
  }
  return translateCore(low);
}

// ---------- 执行 ----------
const muscles = j.parts.filter(p => p.system === "muscular");
const misses = [];
let changed = 0;
for (const p of muscles) {
  const zh = translate(p.name);
  if (!zh) { misses.push(p.id + "\t" + p.name); continue; }
  if (!p.name.includes(zh)) {
    p.name = zh + " " + p.name;
    changed++;
  }
}

if (misses.length) {
  console.error("未翻译 " + misses.length + " 条:\n" + misses.join("\n"));
  process.exit(1);
}

fs.writeFileSync(ATLAS, JSON.stringify(j));
console.log("完成: 共 " + muscles.length + " 块肌肉, 更新 " + changed + " 条名称, 未翻译 0 条");
console.log("\n样例(前12条):");
muscles.slice(0, 12).forEach(p => console.log("  " + p.id + "  " + p.name));
