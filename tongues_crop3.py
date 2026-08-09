"""裁切 3 行舌苔分类图为 3 张单象图（白苔/黄苔/灰黑苔）"""
from PIL import Image
import numpy as np

src = "tongues/05-coating-color-3types.jpg"
img = Image.open(src)
W, H = img.size
print(f"原图: {W}x{H}")

arr = np.array(img.convert("RGB"))
row_std = arr.std(axis=(1,2))

threshold = 10
in_content = False
segments = []
start = 0
for i, s in enumerate(row_std):
    if s > threshold:
        if not in_content:
            start = i
            in_content = True
    else:
        if in_content:
            length = i - start
            if length > H * 0.10:
                segments.append((start, i))
            in_content = False

if in_content:
    i = len(row_std)
    length = i - start
    if length > H * 0.10:
        segments.append((start, i))

print(f"找到 {len(segments)} 个内容段: {segments}")

merged = []
for s, e in segments:
    if merged and s - merged[-1][1] < 5:
        merged[-1] = (merged[-1][0], e)
    else:
        merged.append([s, e])

print(f"合并后 {len(merged)} 段: {merged}")

assert len(merged) == 3, f"期望 3 段，实际 {len(merged)} 段"

outputs = [
    ("tongue-11.jpg", "白苔"),
    ("tongue-12.jpg", "黄苔"),
    ("tongue-13.jpg", "灰黑苔"),
]

for i, (s, e) in enumerate(merged):
    top = max(0, s - 30)
    bottom = min(H, e + 30)
    cropped = img.crop((0, top, W, bottom))
    out = f"tongues/{outputs[i][0]}"
    cropped.save(out, quality=92)
    print(f"  {outputs[i][1]} ({outputs[i][0]}): {W}x{bottom-top} 像素")

print("\n完成！")
