# Maria Phone(超级玛丽 1-1)

纯 HTML5/Canvas 复刻的《超级马里奥兄弟》第 1-1 关,零外部依赖(音效用 Web Audio 实时合成),手机触摸与桌面键盘均可游玩。

## 快速开始

```bash
# 本地预览(任意静态服务器均可)
python -m http.server 8000
# 浏览器打开 http://localhost:8000
```

## 测试

```bash
node test/smoke.js
```

冒烟测试包含:

- **A. 全关遍历**:机器人持无敌星自动通关,校验最终进入 CLEAR 状态、过关加分、时间奖励。
- **B. 交互单元测试**:踩敌人加分、顶 ? 块、隐藏 1UP 块、10 金币砖连喷、大马里奥砸砖、踢龟壳撞敌等 11 项。

## 操作说明

| 操作 | 键盘 | 触摸 |
| --- | --- | --- |
| 移动 | ← → | 屏幕左/右半区 |
| 加速 | Shift | 按住移动后持续 |
| 跳跃 | Z / 空格 | 屏幕上方 |

## 部署(GitHub Pages)

1. 推送本目录到 GitHub 仓库并开启 Pages(分支设为 `main`)。
2. 仓库内已含 `CNAME` 文件(内容为 `yunxiangcity.top`),开启 Pages 后会自动应用。
3. 在域名注册商处配置 DNS:

   | 类型 | 名称 | 值 |
   | --- | --- | --- |
   | A | @ | 185.199.108.153 / 185.199.109.153 / 185.199.110.153 / 185.199.111.153 |
   | CNAME | www | `你的用户名.github.io` |

4. 等待 DNS 生效,访问 https://yunxiangcity.top。

## 文件结构

```
index.html            入口页面
css/style.css         布局与样式
js/main.js            游戏主循环、状态机(PLAY/DEAD/CLEAR…)
js/level.js           关卡加载与碰撞判定
js/levels/w1-1.js     第 1-1 关数据(由原版 ROM 对象字节解码生成)
js/entities.js        玩家/敌人/道具实体
js/input.js           键盘 + 触摸输入
js/sprites.js         像素画精灵
js/audio.js           Web Audio 音效合成
test/smoke.js         Node 冒烟测试
```

## 技术备注

- 关卡布局按原版对象解码还原:管道位置、砖块排布、隐藏块、楼梯/金字塔、坑、旗杆(198)、城堡(205)均与 SMB 1-1 一致。
- 物理参考原版:跳跃高度约 4 格(按住跳),支持原地小跳、落地缓冲等手感。
- 渲染尺寸 256×240,瓦片 16px,画面按手机屏幕自适应缩放。
# demo1
