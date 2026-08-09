"""按新大图裁切 20 张单象舌图（最终版：S1 分组+等分，S5 线描包围盒）。"""
import numpy as np
from PIL import Image

src = r"C:\Users\1\.workbuddy\clipboard-images\clipboard-2026-08-09T15-12-32-885Z-46beacc5.jpg"
img = Image.open(src).convert("RGB")
W, H = img.size
arr = np.array(img).astype(np.int16)
gray = arr.mean(axis=2)

# 每个 section: (y照片区, 是否线描固定, 各舌象的 x 单元列表, 对应 tongue 编号)
SECS = [
  # S1 舌苔3: 白/黄紧贴成一组(12-414)等2，灰黑单独(426-860)
  ("S1舌苔3", (351,598), False, [(12,213),(213,414),(426,860)], [11,12,13]),
  # S2 舌态2: 等分2
  ("S2舌态2", (741,977), False, [(12,436),(436,860)], [19,20]),
  # S3 苔质5: 等分5
  ("S3苔质5", (1132,1341), False, [(12,186),(186,350),(350,514),(514,678),(678,860)], [14,15,16,17,18]),
  # S4 舌色5: 等分5
  ("S4舌色5", (1483,1680), False, [(12,186),(186,350),(350,514),(514,678),(678,860)], [1,2,3,4,5]),
  # S5 舌形5: 黑白线描，固定 y，等分5 + 包围盒
  ("S5舌形5", (1680,1764), True, [(12,186),(186,350),(350,514),(514,678),(678,860)], [6,7,8,9,10]),
]

for name,(py0,py1),isdraw,units,outs in SECS:
    print(f"\n{name}: y={py0}-{py1}, 切 {len(units)} 张")
    for (xc0,xc1),out_idx in zip(units,outs):
        crop = img.crop((xc0,py0,xc1,py1))
        if isdraw:
            cg = np.array(crop).astype(np.int16).mean(axis=2)
            ys,xs = np.where(cg<235)
            if len(xs)>50:
                bb=(max(0,xs.min()-4),max(0,ys.min()-4),min(crop.width,xs.max()+5),min(crop.height,ys.max()+5))
                crop=crop.crop(bb)
        else:
            crop=crop.crop((8,8,crop.width-8,crop.height-8))
        fn=f"tongues/tongue-{out_idx:02d}.jpg"
        crop.save(fn,quality=92)
        ca=np.array(crop).astype(np.int16)
        nw=(ca.mean(axis=2)<235).mean()
        sats=((ca.max(axis=2)-ca.min(axis=2))>25).mean()
        print(f"  tongue-{out_idx:02d}.jpg {crop.width}x{crop.height}px 非白={nw:.2f} 彩={sats:.2f}{' 线描' if isdraw else ''}")
print("\n完成。")
