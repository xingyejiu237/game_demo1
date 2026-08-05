# 物理与游戏机制备忘

## 计时器:统一"帧计数"语义

冷却/倒计时递减用 `-= 1`(每帧 1),**不要**用 `-= 1/60`(那是秒级递减)。

**事故**:钢铁前线 `fireCd` 用帧数初始化(16/50-90)却按秒递减,冷却被放大 60 倍——玩家 16 秒才能开一炮,敌人 60 秒起步,表现为"开不了火"。修复后统一 `-= 1`。

## 马里奥:32px 渲染偏移

- 关卡瓦片画在 `ty*16 + level.oy`(`oy = 32`,HUD 高度),碰撞换算必须走 `lv.rowAt(screenY)` = `floor((y-32)/16)` 和 `lv.oy`。
- 地面顶 = `lv.groundTopY()` = `(h-2)*16+32`(地面固定占底部两行)。
- 碰撞与渲染错位的症状:角色浮空 32px、撞到"隐形障碍"、道具从错误位置冒出。修碰撞先确认偏移一致。
- 旗杆滑落从触杆高度开始(`slideY = max(0, y-36)`),杆底 = groundTopY。

## 踩敌人判定(马里奥)

- 踩中瞬间把玩家**吸附到敌人顶部再弹起**(`player.y = e.y - player.h; vy=-5`),否则多帧重叠会重复判定(秒踢壳反杀自己)。
- 被踩扁的敌人直接消失,不复活(`squash <= 0 → dead`)。
- 踢壳只发生在侧面走入时(`!fromAbove`),从上方踩静止壳只弹起不踢;起踢瞬间把壳推出玩家身体。

## 爆破小子:炸弹规则

- 炸弹是固体,但**不困住放置者**:`canStand(x, y, who)` 中,实体与炸弹格重叠时放行(经典规则:放完能走开,离开后进不去)。
- 火焰十字蔓延,硬砖/软砖阻挡;火焰碰到炸弹**连锁引爆**(用被引爆炸弹自己的 range,递归前先 splice)。
- 敌人 AI 放雷前必须 `canPlaceSafely`(找连续 range 格逃生通道),放雷后**沿预定通道逃跑**(flee 速度 ×1.4),撞墙才换全局逃离方向。
- 敌人 AI 三层决策:生存(威胁检测随时触发)> 直线进攻(视野内逼近/放雷)> 游走(65% 朝玩家 + 墙后 8 格内试探放雷)。

## 敌人 AI 通用

- 视野检测:`lineOfSight`(同行/列 + 中间无砖遮挡),攻击距离限制在炸弹范围才有意义。
- 威胁检测:`cellInDanger`(炸弹剩余帧数 < 35 且火焰可到达才触发逃跑,避免过度反应)。

## 马里奥:关卡系统(2026-08-05 新增,4 关)

- 数据格式:每关一个 `js/levels/wN-x.js`,定义 `globalThis.LEVEL_N_X` = { width, height:13, flagX, castleX, rows(ASCII 网格), special(问号/隐藏/金币块), enemies }。瓦片字符:`G`地面 `B`砖 `?`问号 `H`硬块/台阶 `T``P`管道顶/身 `C`城堡标记 `F``f`旗杆标记。
- main.js 用 `LEVELS = [LEVEL_1_1..LEVEL_1_4].filter(Boolean)` 收集(缺哪个少哪个,鲁棒),`levelIndex` 推进;HUD/标题用 `worldStr()` = '1-N' 动态显示。
- 过关流程:CLEAR 3s+按键 → 下一关(保留分数/金币/生命),最后一关回 TITLE 复位 levelIndex=0;OVER 回 TITLE 也复位。
- **台阶必须实心列**(每列从顶填到地面,如 1-1):自动上台阶判定 `isSolid(ax,fr)&&isSolid(ax,fr-1)&&!isSolid(ax,fr-2)` 需要相邻 2 个实心 + 上方空,单格悬浮 H 台阶会卡死玩家/AI。
- 关卡可通行验证:test/smoke.js [A] 对每关做"无敌星+清敌"自动遍历必须进 CLEAR;AI 长按跳跃弧线很长,障碍间距要留足(经典节奏,坑≤3 格、障碍间隔≥10 格),且高管道后别紧跟坑(长跳会带进坑)。
- **出生点安全**:玩家出生在第 6 格,任何敌人 x 必须 ≥ 8,否则出生即死(1-3 曾把板栗仔放 tile6 与玩家重叠,玩家"一出生就挂")。check-level.js 有对应校验。

## 马里奥:存档系统(2026-08-05 新增)

- localStorage 存 `mushroomHeroSave` = JSON `{ highScore, unlocked }`(同源 iframe 正常,无沙箱;无 localStorage 环境自动跳过,不崩)。
- 最高分:addScore 里超过历史才写;unlocked:过关推进(levelIndex++ 后)更新。
- TITLE:黄色 HI 最高分(textC 染色)+ WORLD 1-N(继续点)+ 无存档 PRESS TO START / 有存档 PRESS TO CONTINUE + "按住 B 键开始 = 新游戏"。
- 开始逻辑:TITLE 任意键 → `levelIndex = input.run ? 0 : save.unlocked`(B/加速键按住 = 从头,否则继续到最远解锁关)。
- 测试:smoke.js [C] 用内存 localStorage mock 验证最高分同步/不下降/过关解锁。
- 测试钩子:`Game.startAt(i)` / `Game.levelIndex()` / `Game.levelCount()`;check-level.js 与 smoke.js 会 require 全部关卡,新增关卡只需建文件 + index.html 加 script。
