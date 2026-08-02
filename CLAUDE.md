# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

"云想游戏厅"——纯 HTML5/Canvas 复古游戏合集,零外部依赖(音效 Web Audio 实时合成),手机触摸 + 桌面键盘均可玩。当前含 3 款游戏(蘑菇勇者/钢铁前线/爆破小子)+ 3 个"敬请期待"卡带位。所有素材(像素画/音效/命名)必须保持原创,严禁使用原版游戏名称与素材(版权考虑,README 有声明)。

## 常用命令

```bash
python serve.py                     # 本地预览(no-cache),访问 localhost:8000
node test/smoke.js                  # 蘑菇勇者:全关遍历 + 交互单元测试
node test/tank-smoke.js             # 钢铁前线:移动/开火/地形/敌人刷新
node test/bomber-smoke.js           # 爆破小子:炸弹/火焰/敌人AI/存活
node test/check-level.js            # 马里奥关卡数据完整性(特殊块/管道/旗杆)
```

无构建步骤,纯静态文件。部署 = `git push` 到 main,GitHub Pages 1-2 分钟自动更新。

## 架构

**平台壳**:`index.html`(主菜单卡带墙)+ `js/platform.js`(游戏注册表 GAMES + 卡带渲染 + iframe 生命周期)。游戏在 iframe 中隔离运行,主菜单"‹ 菜单"按钮退出。

**游戏模块**:每个游戏是独立目录 `games/<name>/`,自包含(相对路径引用,不依赖平台):`index.html` + `css/style.css` + `js/sprites.js`(原创像素画,`define`/`get` 模式)+ `js/main.js`(全部逻辑)。新游戏 = 新建目录 + 注册进 platform.js 的 GAMES(带原创像素图标函数)。

**共享层**(根 `js/`):
- `input.js` — 键盘+触摸统一输入。`actions` 对象:dir/jump/run/jumpTap/up/down/fire/anyKey。**键位是两游戏共用的**:↑/W = jump+up,空格/Z = jump+fire,J/Enter = fire。改键位映射必须同时验证马里奥跳跃和坦克/爆破的射击。触摸按钮 JS 兜底 + 矮屏 `compact` 类也在此。
- `audio.js` — 音效合成,SFX 表按名字调用;新增音效往 SFX 加。

**游戏主循环模式**(三个游戏一致):固定 60Hz 步进(`acc` 累积 + `step(1/60)`)+ 每帧 `render()`;状态机 TITLE/PLAY/CLEAR/OVER;`_step/_render/_state` 等测试钩子导出。

**测试模式**:冒烟测试用 fake canvas Proxy + 替换 `Input.sync` 为 noop + 直接注入 `actions`;游戏逻辑必须能在无 DOM 渲染下跑通。

## 关键经验(踩过的坑)

- **计时器统一"帧计数"语义**:递减 `-= 1`(每帧 1),不要 `-= 1/60`(那是秒级)。混用会导致 60 倍冷却(钢铁前线曾因此 16 秒才能开一炮)。
- **马里奥关卡渲染偏移**:Level 有 `oy=32`(HUD 高度),瓦片画在 `ty*16+32`,碰撞换算必须走 `lv.rowAt(screenY)` 和 `lv.oy`。修改碰撞前先确认偏移一致。
- **爆破小子炸弹规则**:炸弹是固体但**不困住放置者**(canStand 的 who 豁免);敌人 AI 放雷前必须 `canPlaceSafely`(逃生通道)+ 放雷后沿通道逃跑,否则敌人自杀。
- 改共享 `input.js` 前,想清楚它同时服务所有游戏(上次把 ↑/W 从跳跃键拆出,导致马里奥跳不了)。

## 部署

- GitHub Pages + 自定义域名 `yunxiangcity.top`(仓库 `xingyejiu237/game_demo1`,main 分支)。`github.io` 默认地址与自定义域名并存。
- DNS 托管在 Cloudflare(邮箱 Email Routing 共存):GitHub Pages 的 A/CNAME 记录必须"仅 DNS"灰云,橙云代理会导致证书签不出来。
- 证书踩坑:若 Pages 域名状态 `errored`,用 `PUT /repos/{owner}/{repo}/pages {"cname":"..."}` 重新触发签发。
- 完整部署流程见本地文件 `部署流程.md`(已被 .gitignore 忽略,不推送)。
