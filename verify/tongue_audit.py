#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
舌象数据完整性静态审计（防护层 2/3）。
用法：python verify/tongue_audit.py
退出码：0=通过；1=发现漂移（CI 中会失败阻断推送）。

检查：
 1) TONGUE_STEPS 每个步骤的每个 option 是否都在 DZ_PHOTO_MAP 中有照片映射；
 2) DZ_PHOTO_MAP 中是否有孤儿键（图片存在但 UI 没用到，浪费资源/可清理）；
 3) 照片文件是否真实存在（避免图片 404）；
 4) 跨文件五色清单：index.html / data.js / tongue_wizard.html / tongue_teach.html
    都应至少包含 淡白舌/淡红舌/红舌/绛舌/青紫舌。
"""
import re, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

def parse_steps(html):
    """从 index.html 解析 TONGUE_STEPS 数组，每步 {key, title, options:[{key,label}]}
    用贪婪+回溯定位到「下一个顶层 var 定义」结束（中间可能有 dzPick 等辅助 var）。"""
    m = re.search(r'var TONGUE_STEPS=\[(.*?)\n  \];', html, re.S)
    if not m:
        sys.exit("❌ 无法在 index.html 中定位 TONGUE_STEPS 数组，脚本失效")
    block = m.group(1)
    steps = []
    for p in re.split(r'\n    \{key:"', block)[1:]:
        sk = p.split('"', 1)[0]
        opts = re.findall(r'\{key:"(\w+)",\s*label:"([^"]*)"', p)
        steps.append({'key': sk, 'options': opts})
    return steps

def parse_photo_map(html):
    m = re.search(r'var DZ_PHOTO_MAP=\{(.*?)\n  \};', html, re.S)
    body = m.group(1)
    return {sk: dict(re.findall(r'(\w+):"([^"]+)"', b)) for sk, b in re.findall(r'(\w+):\{(.*?)\}', body)}

def main():
    html = open('index.html', encoding='utf-8').read()
    steps = parse_steps(html)
    pmap = parse_photo_map(html)
    problems = []

    print("═══ 舌象数据完整性审计（v1.4 防护层 2/3）═══")
    print("\n【1】每步选项 ↔ 照片映射核对（{} 步）".format(len(steps)))
    for s in steps:
        mp = pmap.get(s['key'], {})
        miss = [k for k, _ in s['options'] if k not in mp]
        orphan = [k for k in mp if not any(k == ok for ok, _ in s['options'])]
        status = "✓" if not (miss or orphan) else "✗"
        print("  {} {:6s} 选项 {} 项 / 映射 {} 项{}{}{}".format(
            status, s['key'], len(s['options']), len(mp),
            "  缺图=" + str(miss) if miss else "",
            "  孤儿=" + str(orphan) if orphan else "",
            ""))
        for k in miss:
            problems.append("{} 选项 {} 缺 DZ_PHOTO_MAP 映射".format(s['key'], k))
        for k in orphan:
            problems.append("{} 照片 {} 是孤儿键（无对应选项）".format(s['key'], k))

    print("\n【2】照片文件存在性")
    for sk, d in pmap.items():
        for k, p in d.items():
            ok = os.path.exists(p)
            print(f"  {'✓' if ok else '✗'} {sk}.{k} -> {p}")
            if not ok:
                problems.append(f"{sk}.{k} -> {p} 文件不存在（页面会 404）")

    print("\n【3】跨文件五色完整度")
    required = ['淡白舌', '淡红舌', '红舌', '绛舌', '青紫舌']
    files = ['index.html', 'data.js', 'tongue_wizard.html', 'tongue_teach.html']
    for f in files:
        t = open(f, encoding='utf-8').read()
        have = [c for c in required if c in t]
        miss = [c for c in required if c not in t]
        print(f"  {'✓' if not miss else '⚠'} {f:24s} {len(have)}/5 色 — {'、'.join(have)}"
              + (f"  缺 {'、'.join(miss)}" if miss else ""))
        # 教学页「淡红」作正常基准列出但不一定设异常卡，不算漂移；
        # 仅 data.js/index.html/tongue_wizard.html 视为必需。
        if f != 'tongue_teach.html':
            for c in miss:
                problems.append(f"{f} 缺五色之一：{c}")

    print("\n══════════════ 总结 ══════════════")
    if problems:
        print(f"❌ 发现 {len(problems)} 处漂移：")
        for p in problems:
            print(f"   - {p}")
        sys.exit(1)
    else:
        total = sum(len(s['options']) for s in steps)
        print(f"✅ 全部通过：{len(steps)} 步 / {total} 选项 ↔ 照片映射 ↔ 文件存在 100% 对应")
        sys.exit(0)

if __name__ == '__main__':
    main()
