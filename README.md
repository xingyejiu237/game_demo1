<p align="center">
  <img src="favicon.svg" width="88" height="88" alt="云想游戏厅">
</p>

<h1 align="center">云想游戏厅 · YUNXIANG ARCADE</h1>

<p align="center">
  <b>童年游戏一盒装 —— 由 AI 全权管理与维护的复古游戏合集</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/状态-在线-brightgreen" alt="在线">
  <img src="https://img.shields.io/badge/游戏-3%20款-3c88ff" alt="游戏数">
  <img src="https://img.shields.io/badge/技术-纯%20HTML5%2FJS-ffd23c" alt="技术栈">
  <img src="https://img.shields.io/badge/依赖-零-3cff88" alt="零依赖">
  <img src="https://img.shields.io/badge/协议-MIT-7a5cff" alt="MIT">
</p>

---

> 🎮 **在线游玩**:https://yunxiangcity.top
>
> 🤖 **本仓库由 AI(DeepSeek-V4-Flash-0731)全权管理**:代码、测试、部署、文档与记忆架构均由 AI 维护。用户是产品方向决策者,AI 是工程执行者。仓库内的 `CLAUDE.md` 与 `mem/` 是 AI 的家族记忆——每一代会话都继承同样的经验与人格。

---

## 🕹️ 游戏列表

| 卡带 | 说明 | 状态 |
|:---:|:---:|:---:|
| 🍄 **蘑菇勇者** | 横版跳关,经典手感 | ✅ 可玩 |
| 🎖️ **钢铁前线** | 装甲对决,守住基地 | ✅ 可玩 |
| 💣 **爆破小子** | 炸弹迷宫,连锁引爆 | ✅ 可玩 |
| 🔒 敬请期待 | 新卡带制作中… | ⏳ |

## 🚀 快速开始

```bash
# 本地预览(任意静态服务器均可)
python -m http.server 8000
# 浏览器打开 http://localhost:8000
```

## 🎮 操作说明

### 蘑菇勇者(横版)

| 操作 | 键盘 | 触摸 |
|:---:|:---:|:---:|
| 移动 | ← → | 屏幕左下按钮 |
| 加速 | Shift | B 键 |
| 跳跃 | ↑ / W / 空格 / Z | A 键 |

### 钢铁前线 & 爆破小子

| 操作 | 键盘 | 触摸 |
|:---:|:---:|:---:|
| 移动/转向 | ↑ ↓ ← →(或 WASD) | 十字方向键 |
| 射击/放炸弹 | 空格 / Z / J / Enter | 右侧大按钮 |

## 🧪 测试

```bash
node test/smoke.js        # 蘑菇勇者:全关遍历 + 交互单元测试
node test/tank-smoke.js   # 钢铁前线:移动/开火/地形/敌人刷新
node test/bomber-smoke.js # 爆破小子:炸弹/火焰/敌人AI/存活
node test/check-level.js  # 关卡数据完整性
```

## 🏗️ 架构

```
index.html            游戏厅主菜单(卡带墙)
js/platform.js        平台壳:游戏注册与生命周期
js/input.js           共享输入(键盘+触摸)
js/audio.js           共享音效合成(Web Audio)
games/mario/          蘑菇勇者(横版)
games/tank/           钢铁前线
games/bomber/         爆破小子
mem/                  AI 家族记忆(渐进式披露 wiki)
test/                 冒烟测试
```

## 📜 声明与协议

> 仅供学习交流,非商业用途。所有像素美术、音效与代码均为原创,玩法机制向经典致敬。请勿在商业项目中使用本仓库的任何素材。

[MIT License](LICENSE)
