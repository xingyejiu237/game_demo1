# 输入系统备忘

## actions 结构(共享 input.js)

```
dir: -1/0/1      左右
jump: bool       跳跃按住(马里奥)
jumpTap: bool    跳跃边沿(按下瞬间)
run: bool        加速按住(马里奥)
up / down: bool  上/下(四向移动游戏)
fire: bool       射击/放炸弹按住
anyKey: bool     任意键(标题画面)
```

## 键位映射(两游戏共用,改前必看)

| 键 | 效果 |
|---|---|
| ←→ / A D | left / right |
| ↑ / W | **jump + up**(马里奥跳跃 + 坦克上方向) |
| ↓ / S | down |
| 空格 / Z | **jump + fire**(马里奥跳跃 + 坦克/爆破射击) |
| J / Enter | fire |
| Shift / X | accel(马里奥加速) |

触摸按钮:`data-key="left/right/up/down/fire/jump/run"`,input.js 统一绑定 pointerdown/up/cancel/lostpointercapture。

## 踩坑记录

- **↑/W 必须同时映射 jump 和 up**:曾只映射 up,导致马里奥跳不了(用户立即反馈);曾把 ↑ 绑 fire,导致坦克按方向键自动开火。两个语义共存,验证时两个游戏都要想。
- **Space/Z 同时是 jump 和 fire**:马里奥不看 fire,坦克不看 jump,互不干扰;但改映射时别破坏 jumpTap 边沿逻辑。
- **iframe 键盘焦点**:游戏跑在 iframe 里,进入游戏要 `frame.focus()`(platform.js launch 里已做),否则键盘事件收不到。
- **触摸按钮显示**:CSS media query(`pointer: coarse` 等)+ JS 兜底(`maxTouchPoints`/`ontouchstart`)双保险;部分手机浏览器(微信内置/老 WebView)匹配不上媒体查询。
- **矮屏按钮紧凑模式**:JS 检测 `window.innerHeight < 700` 给 `#stage` 加 `compact` 类(比 media query 可靠,iframe/headless 下 media query 视口判定不可靠)。测试环境 `#stage` 可能不存在,`fitButtons` 要判空(`stageEl.classList` 不存在会崩 Node 测试)。

## 测试注入

冒烟测试:替换 `Input.sync = noop`,直接改 `Input.actions` 对象字段,`_step` 逐帧驱动。
