# 换皮与命名规范

## 版权红线(用户明确要求)

- **所有素材必须原创**:像素画、音效、命名。玩法机制不受版权保护,但原版名称/美术/音乐是雷区。
- **不要在任何可见位置写"XXX换皮""坦克大战""炸弹人""SUPER MARIO"等字样**(游戏标题、卡带副标题、README、代码注释都清过一遍,新代码保持干净)。
- 命名风格:原创中文名 + 英文副标题,如"蘑菇勇者 MUSHROOM HERO""钢铁前线 STEEL FRONT""爆破小子 BLAST BOY"。
- 免责声明在 README 顶部:仅供学习交流、非商业用途、素材原创、MIT 协议。

## 卡带规范

- 平台注册:`js/platform.js` 的 GAMES 数组,每张卡带 = id/title/subtitle/url/status/icon。
- 卡带像素图标:platform.js 里用纯代码画(16x16 放大,原创),新游戏加 `drawXxxIcon` + buildMenu 分支。
- 槽位 6 格(2 行),未做的放"敬请期待",新游戏顶掉一个。

## 视觉风格

- 全部像素风:16x16 瓦片/精灵、monospace 字体、CRT 扫描线、霓虹辉光(主菜单)。
- 游戏内中文文案用 `ctx.fillText`(像素字库只有 ASCII),英文/数字用像素字形。
- 像素字库缺字形时补 FONT 表(曾缺 G/N/V/U/./,显示成空白)。
- 站点图标:`favicon.svg`(根目录,16x16 像素手柄:亮灰主体+握把、深色十字键、红黄蓝绿 2x2 按键、Start/Select 点)。README、浏览器标签页、手机主屏图标三处共用。

## 视觉评审工作流(用户认可,画图必走)

AI 画像素图/SVG → **用 vision skill 评审**(`node ~/.claude/skills/vision/vision.js <png路径> "评审问题"`)→ 按评审意见修改 → 再评审直到通过。

- SVG 需先渲染成 PNG(headless Chrome 打开包装页截图,256px 放大,`image-rendering: pixelated`)。
- vision 评审重点:造型完整性(是否像目标物)、对比度(深色元素是否在深背景上隐形)、配色协调、布局规范性。
- 案例:手柄图标经三轮评审修复——十字键穿背景隐形、主体无握把、握把断裂、按键不足 4 个。第一版永远有对比度问题,直接按评审改。
