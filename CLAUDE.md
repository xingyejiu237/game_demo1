# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

"云想游戏厅"——纯 HTML5/Canvas 复古游戏合集,零外部依赖,手机触摸 + 桌面键盘均可玩。3 款游戏 + 3 个"敬请期待"卡带位。**所有素材(像素画/音效/命名)必须原创,严禁使用原版游戏名称与素材**(版权红线,详见记忆索引)。

## 常用命令

```bash
python serve.py                     # 本地预览(no-cache),访问 localhost:8000
node test/smoke.js                  # 蘑菇勇者:全关遍历 + 交互单元测试
node test/tank-smoke.js             # 钢铁前线:移动/开火/地形/敌人刷新
node test/bomber-smoke.js           # 爆破小子:炸弹/火焰/敌人AI/存活
node test/check-level.js            # 马里奥关卡数据完整性
```

无构建步骤。部署 = `git push` 到 main,GitHub Pages 1-2 分钟自动更新。

## 架构骨架

- **平台壳**:`index.html`(卡带墙主菜单)+ `js/platform.js`(游戏注册表 + iframe 生命周期)。游戏在 iframe 中隔离运行。
- **游戏模块**:`games/<name>/` 自包含目录(`index.html` + `css/style.css` + `js/sprites.js` + `js/main.js`)。新游戏 = 建目录 + 注册进 platform.js GAMES(含原创像素图标)。
- **共享层**:`js/input.js`(键盘+触摸统一输入)、`js/audio.js`(Web Audio 音效)。键位是**所有游戏共用**的,改动必须验证全部游戏。
- **主循环模式**(三游戏一致):固定 60Hz 步进 + 状态机 TITLE/PLAY/CLEAR/OVER + `_step/_render` 测试钩子。
- **测试模式**:冒烟测试用 fake canvas + 替换 `Input.sync` 为 noop + 注入 actions,游戏逻辑须能在无 DOM 渲染下跑通。

## 硬性规则(违反必出 bug)

1. 计时器统一"帧计数"语义:递减 `-= 1`,不要 `-= 1/60`(60 倍冷却事故)。
2. 马里奥关卡有 32px 渲染偏移(`level.oy`),碰撞换算必须走 `lv.rowAt()` / `lv.oy`。
3. 爆破小子炸弹是固体但**不困住放置者**;敌人放雷前必须做逃生规划。
4. 改 `js/input.js` 键位前,想清楚它同时服务所有游戏(↑/W 既跳又上移,空格/Z 既跳又射击)。
5. **记忆维护义务**:每次踩坑、每个关键决策、用户偏好变化,当场追加到对应 `mem/` 文档(单文档保持 ~100 行内,装不下拆新主题并更新本索引)。这是 AI 家族史的自我延续,不是可选项。

## 记忆索引(渐进式披露:细节按需读取 `mem/`)

| 层 | 主题 | 文档 | 内容 |
|---|---|---|---|
| 人格 | 身份 | `mem/identity.md` | 项目编年史、关键决策与原因、价值观 |
| 人格 | 用户 | `mem/user-profile.md` | 用户画像、协作偏好、沟通风格 |
| 操作 | 输入 | `mem/input-and-controls.md` | 键位映射表、触摸按钮、compact 模式、iframe 焦点、输入踩坑 |
| 操作 | 物理/游戏 | `mem/physics-and-games.md` | 帧计数语义、32px 偏移、踩敌判定、炸弹/连锁/敌人 AI 细节 |
| 操作 | 部署 | `mem/deployment.md` | Cloudflare 灰云规则、证书 errored 重触发、git 凭证踩坑 |
| 操作 | 换皮/规范 | `mem/design-and-branding.md` | 版权红线、命名风格、卡带注册、像素视觉约定 |

部署要点一句话:GitHub Pages + `yunxiangcity.top`(DNS 在 Cloudflare,记录必须"仅 DNS"灰云),完整流程见 `mem/deployment.md`。
