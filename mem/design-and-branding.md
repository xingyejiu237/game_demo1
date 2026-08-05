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
- 像素字库缺字形时补 FONT 表(曾缺 G/N/V/U/./P,显示成空白,补完重截图确认)。**text() 画白色字形,不受 ctx.fillStyle 影响;要彩色文字必须用 textC()/glyphColored()(source-in 染色)**。
- 站点图标:`favicon.svg`(根目录,16x16 像素手柄:亮灰主体+握把、深色十字键、红黄蓝绿 2x2 按键、Start/Select 点)。README、浏览器标签页、手机主屏图标三处共用。
- **蘑菇勇者英雄精灵 2026-08-05 重绘**:16x16(小)/16x32(大),Q 版二头身——大帽+2x2 黑眼睛+白手套+红衫蓝背带裤+深色鞋底纹;脚底必须落地面(旧大英雄悬空 2px)。行走帧=左右脚交替抬落,站立/跳跃/急转帧严格左右对称。评审 4 轮从"抽象色块"到 9/10(详见 vision 工作流案例)。

## 视觉评审工作流(用户认可,画图必走)

AI 画像素图/SVG → **用全局 vision MCP 评审**(模型 `mimo-v2.5`,经 opencodeGo 代理)→ 按评审意见修改 → 再评审直到通过。

- 识图 MCP:`vision`,注册在全局 `~/.claude/settings.json` 的 `mcpServers`(`node C:/Users/14291/.claude/mcp-servers/vision-mcp/index.cjs`,零依赖)。自动读 settings.json 的 env(base/token/opus 模型别名)直连代理,新会话生效。
- 调用姿势:工具 `vision`,参数 `path`(本地图片)/ `url`(网络图)+ `question`。模型路由别名用 `ANTHROPIC_DEFAULT_OPUS_MODEL`(当前 `claude-opus-4-8[1M]` → mimo-v2.5)。
- 曾用 DashScope vision skill(`~/.claude/skills/vision/`)已于 2026-08-05 **删除**:key 401 失效、用户弃用。不要再假设那个路径存在。
- SVG 需先渲染成 PNG(headless Chrome 打开包装页截图,256px 放大,`image-rendering: pixelated`)。
- vision 评审重点:造型完整性(是否像目标物)、对比度(深色元素是否在深背景上隐形)、配色协调、布局规范性。
- 案例:手柄图标经三轮评审修复——十字键穿背景隐形、主体无握把、握把断裂、按键不足 4 个。第一版永远有对比度问题,直接按评审改。
- 案例(蘑菇勇者英雄):旧版小英雄无脚、大英雄悬空+下半身扁 → 4 轮迭代(加脚/鞋底、Q 版比例、2x2 黑瞳、白手套、行走帧交替、站立帧对称)。**经验:评审前先程序化校验(行像素 ≤16、对称帧镜像相等),能挡掉 70% 的像素返工;识图模型会编造 1px 级瑕疵,对称帧以代码校验为准**。
