// main.js — 游戏主控:状态机 / 循环 / 相机 / HUD / 关卡逻辑
(function (global) {
  'use strict';

  var canvas, ctx;
  var level, player, enemies, items, fireballs, fragments;
  var state = 'TITLE';       // TITLE / PLAY / DEAD / CLEAR / OVER
  var stateTimer = 0;
  var camera = 0;
  var timeTimer = 0;
  var coinPopQueue = [];
  var lastRun = false;
  var frame = 0;

  var Game = {
    level: null,
    flagFallY: 40
  };

  // ---------- 初始化 ----------
  function boot() {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
    global.Input.init();
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    // 首次交互解锁音频
    var unlock = function () {
      global.AudioSys.unlock();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

    // 固定 60Hz 步进循环
    var last = performance.now();
    var acc = 0;
    function loop(now) {
      try {
        var dt = Math.min(now - last, 100);
        last = now;
        acc += dt;
        while (acc >= 1000 / 60) {
          acc -= 1000 / 60;
          step(1 / 60);
        }
        render();
      } catch (e) {
        // 单帧异常不冻结游戏(记录但不中断)
        last = now;
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  // ---------- 状态与关卡 ----------
  function startGame() {
    level = new global.Level(LEVEL_1_1);
    Game.level = level;
    player = new global.Entities.Player();
    player.x = 6 * 16;
    player.y = 10 * 16 + 8;
    enemies = [];
    for (var i = 0; i < level.enemyData.length; i++) {
      var e = level.enemyData[i];
      enemies.push(e.k === 'goomba'
        ? new global.Entities.Goomba(e.x, e.y)
        : new global.Entities.Koopa(e.x, e.y));
    }
    items = []; fireballs = []; fragments = [];
    coinPopQueue = [];
    camera = 0;
    timeTimer = 0;
    player.time = 400;
    Game.flagFallY = 40;
    state = 'PLAY';
    global.AudioSys.sfx('start');
    global.AudioSys.music(true);
  }

  function respawn() {
    // 死亡后重开本关(保留分数/金币/生命)
    var score = player.score, coins = player.coins, lives = player.lives;
    startGame();
    player.score = score; player.coins = coins; player.lives = lives;
    if (lives <= 0) { state = 'OVER'; stateTimer = 0; global.AudioSys.music(false); }
  }

  // ---------- 主步进 ----------
  function step(dt) {
    frame++;
    var input = global.Input.actions;
    global.Input.sync();

    if (state === 'TITLE') {
      if (input.anyKey) startGame();
    } else if (state === 'PLAY') {
      // 时间倒数
      timeTimer += dt;
      if (timeTimer >= 0.6) {
        timeTimer = 0;
        player.time--;
        if (player.time <= 0) player.die(false);
      }
      // 跑键边沿(火球)
      player.runTap = input.run && !lastRun;
      lastRun = input.run;

      player.update(dt, input);
      level.updateFrame(dt);

      // 相机:跟随玩家左右移动(限制在关卡范围内)
      camera = player.x - 80;
      camera = Math.max(0, camera);
      camera = Math.min(camera, level.w * 16 - 256);

      updateEnemies(dt);
      updateItems(dt);
      updateFireballs(dt);
      updateFragments(dt);
      handleCollisions();
      handleCoinPops();

      // 旗杆触发(仅未开始时,防止滑杆/跑城堡阶段被反复打回)
      if (player.flagMode === 0 && player.x + player.w >= level.flagX * 16 + 4) {
        player.startFlag();
      }

      // 过关
      if (player.flagMode === 3 && state === 'PLAY') {
        state = 'CLEAR';
        stateTimer = 0;
        global.AudioSys.music(false);
        global.AudioSys.sfx('clear');
      }
    } else if (state === 'DEAD') {
      player.updateDead(dt);
      stateTimer += dt;
      if (stateTimer > 2.2) respawn();
    } else if (state === 'CLEAR') {
      stateTimer += dt;
      if (stateTimer > 3.0 && input.anyKey) {
        state = 'TITLE';
        global.AudioSys.sfx('start');
      }
    } else if (state === 'OVER') {
      stateTimer += dt;
      if (stateTimer > 3.0) state = 'TITLE';
    }

    global.Input.endFrame();
  }

  // ---------- 各实体更新 ----------
  function updateEnemies(dt) {
    for (var i = enemies.length - 1; i >= 0; i--) {
      var e = enemies[i];
      if (e.dead) { enemies.splice(i, 1); continue; }
      e.update(dt, Game);
    }
  }
  function updateItems(dt) {
    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      if (it.dead) { items.splice(i, 1); continue; }
      it.update(dt, Game);
    }
  }
  function updateFireballs(dt) {
    for (var i = fireballs.length - 1; i >= 0; i--) {
      var f = fireballs[i];
      if (f.dead) { fireballs.splice(i, 1); continue; }
      f.update(dt, Game);
    }
  }
  function updateFragments(dt) {
    for (var i = fragments.length - 1; i >= 0; i--) {
      var f = fragments[i];
      if (f.dead) { fragments.splice(i, 1); continue; }
      f.update(dt, Game);
    }
  }

  // ---------- 碰撞结算 ----------
  function handleCollisions() {
    if (player.dead) return;
    // 敌人
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.dead || e.squash > 0) continue;   // 已压扁的不再造成伤害
      if (!player.collidesWith(e)) continue;

      if (player.starPower > 0) {
        killEnemy(e, 200);
        player.vy = -5;
        continue;
      }
      // 从上踩
      var falling = player.vy > 0;
      var fromAbove = (player._prevBottom || (player.y + player.h)) <= e.y + 10;
      if (falling && fromAbove) {
        if (e.type === 'goomba') {
          e.squash = 0.5;
          e.vy = 0;
          e.vx = 0;
          addScore(100);
          global.AudioSys.sfx('stomp');
        } else if (e.type === 'koopa') {
          if (!e.shell) {
            e.shell = true;
            e.shellSpeed = 0;
            e.h = 16;
            e.y += 6;
            addScore(100);
          } else if (e.shellSpeed !== 0) {
            e.shellSpeed = 0;   // 停住壳
            addScore(100);
          }
          // 注意:踩壳只弹起不踢出——落地瞬间的重叠帧若踢壳,壳会弹回打死玩家
          global.AudioSys.sfx('stomp');
        }
        // 吸附到敌人顶部再弹起,避免下帧仍重叠而重复判定/误判
        player.y = e.y - player.h;
        player.vy = -5;
        continue;
      }
      // 撞静止壳:踢
      if (e.type === 'koopa' && e.shell && e.shellSpeed === 0) {
        if (Math.abs(player.vx) > 0.4) {
          e.shellSpeed = player.vx > 0 ? 5 : -5;
          // 把壳推出玩家身体,避免起踢瞬间壳仍贴着脚边弹回伤到自己
          e.x = player.vx > 0 ? player.x + player.w + 1 : player.x - e.w - 1;
          addScore(100);
          global.AudioSys.sfx('kick');
          continue;
        }
        continue;
      }
      // 被壳撞 / 普通伤害
      if (e.type === 'koopa' && e.shell && e.shellSpeed !== 0) {
        player.hurt();
      } else if (!(e.type === 'koopa' && e.shell)) {
        player.hurt();
      }
    }

    // 壳撞敌人
    for (var j = 0; j < enemies.length; j++) {
      var shell = enemies[j];
      if (!(shell.type === 'koopa' && shell.shell && shell.shellSpeed !== 0)) continue;
      if (shell.dead) continue;
      for (var k = 0; k < enemies.length; k++) {
        var t = enemies[k];
        if (t === shell || t.dead) continue;
        if (shell.collidesWith(t)) {
          killEnemy(t, 200);
        }
      }
    }

    // 道具
    for (var m = items.length - 1; m >= 0; m--) {
      var it = items[m];
      if (it.dead) continue;
      if (player.collidesWith(it)) {
        collectItem(it);
        it.dead = true;
      }
    }

    // 火球
    for (var n = fireballs.length - 1; n >= 0; n--) {
      var fb = fireballs[n];
      if (fb.dead) continue;
      for (var o = 0; o < enemies.length; o++) {
        var en = enemies[o];
        if (en.dead) continue;
        if (fb.collidesWith(en)) {
          killEnemy(en, 100);
          fb.dead = true;
          break;
        }
      }
    }
  }

  function killEnemy(e, score) {
    e.dead = true;
    addScore(score);
    if (e.type === 'goomba') e.squash = 0.4;
  }

  function collectItem(it) {
    switch (it.itemType) {
      case 'coin':
        player.coins++;
        addScore(200);
        if (player.coins % 100 === 0) player.lives++;
        global.AudioSys.sfx('coin');
        break;
      case 'mushroom':
        if (player.state < 1) {
          player.state = 1;
          player.h = 31;
          player.y -= 15;
        }
        addScore(1000);
        global.AudioSys.sfx('powerup');
        break;
      case 'flower':
        if (player.state < 2) player.state = 2;
        addScore(1000);
        global.AudioSys.sfx('powerup');
        break;
      case 'star':
        player.starPower = 8;
        addScore(1000);
        global.AudioSys.sfx('powerup');
        break;
      case '1up':
        player.lives++;
        addScore(1000);
        global.AudioSys.sfx('oneup');
        break;
    }
  }

  function addScore(n) {
    player.score += n;
  }

  // ---------- 方块交互 ----------
  function bumpBlock(tx, ty) {
    level.bump[tx + ',' + ty] = [0, 1];
    global.AudioSys.sfx('bump');
  }

  function smashBrick(tx, ty) {
    level.setCell(tx, ty, '.');
    level.special[tx + ',' + ty] = null;
    addScore(50);
    global.AudioSys.sfx('brick');
    var px = tx * 16, py = ty * 16 + level.oy;
    fragments.push(new global.Entities.Fragment(px, py, -1.5, -4));
    fragments.push(new global.Entities.Fragment(px + 8, py, 1.5, -4));
    fragments.push(new global.Entities.Fragment(px, py + 8, -1.5, -2));
    fragments.push(new global.Entities.Fragment(px + 8, py + 8, 1.5, -2));
  }

  function activateBlock(tx, ty) {
    var sp = level.getSpecial(tx, ty);
    var kind = sp ? sp.kind : 'coin';
    var cellX = tx * 16 + 8 - 8;
    var cellY = ty * 16 + level.oy;   // 与渲染偏移一致,道具从方块可视位置弹出

    if (kind === 'coin') {
      level.setCell(tx, ty, 'U');
      level.special[tx + ',' + ty] = null;
      addScore(200);
      player.coins++;
      global.AudioSys.sfx('coin');
      items.push(new global.Entities.Item('coin', cellX, cellY - 8, 0));
      if (player.coins % 100 === 0) player.lives++;
    } else if (kind === 'power') {
      level.setCell(tx, ty, 'U');
      level.special[tx + ',' + ty] = null;
      var ptype = player.state >= 1 ? 'flower' : 'mushroom';
      var it = new global.Entities.Item(ptype, cellX, cellY);
      items.push(it);
      bumpBlock(tx, ty);
      global.AudioSys.sfx('powerup');
    } else if (kind === '1up') {
      level.setCell(tx, ty, 'U');   // 隐藏块现身
      level.special[tx + ',' + ty] = null;
      var up = new global.Entities.Item('1up', cellX, cellY);
      items.push(up);
      bumpBlock(tx, ty);
      global.AudioSys.sfx('oneup');
    } else if (kind === 'star') {
      level.setCell(tx, ty, 'U');
      level.special[tx + ',' + ty] = null;
      items.push(new global.Entities.Item('star', cellX, cellY));
      bumpBlock(tx, ty);
      global.AudioSys.sfx('powerup');
    } else if (kind === '10coins') {
      level.setCell(tx, ty, 'U');
      level.special[tx + ',' + ty] = null;
      global.AudioSys.sfx('coin');
      for (var i = 0; i < 10; i++) coinPopQueue.push({ x: tx * 16, y: ty * 16 + level.oy, t: i * 0.12 });
    }
  }

  function handleCoinPops() {
    for (var i = coinPopQueue.length - 1; i >= 0; i--) {
      var c = coinPopQueue[i];
      c.t -= 1 / 60;
      if (c.t <= 0) {
        coinPopQueue.splice(i, 1);
        player.coins++;
        addScore(200);
        global.AudioSys.sfx('coin');
        items.push(new global.Entities.Item('coin', c.x + 4, c.y - 8, 0));
      }
    }
  }

  // ---------- 火球 ----------
  function spawnFireball(p) {
    fireballs.push(new global.Entities.Fireball(
      p.x + p.face * 10, p.y + 6, p.face));
  }

  // ---------- 旗杆流程 ----------
  function flagStart() {
    global.AudioSys.sfx('flag');
    // 分数:按滑落高度
  }
  function flagLanded() {
    // 杆底即地面顶:滑得越低奖励越高(上限 10 格,对应原版 5000 分)
    var heightBonus = Math.max(0, Math.ceil((Game.level.groundTopY() - Game.flagFallY) / 16));
    heightBonus = Math.min(heightBonus, 10);
    var bonus = heightBonus * 500;
    if (bonus > 0) addScore(bonus);
    var timeBonus = player.time * 50;
    addScore(timeBonus);
  }
  function flagDone() {
    // 进入 CLEAR 状态在 step 中处理
  }
  function onPlayerDeath() {
    state = 'DEAD';
    stateTimer = 0;
    global.AudioSys.music(false);
  }

  // ---------- 渲染 ----------
  function render() {
    ctx.imageSmoothingEnabled = false;
    if (level) {
      level.render(ctx, camera);

      // 实体(按 y 排序)
      var drawables = [];
      for (var i = 0; i < enemies.length; i++) drawables.push(enemies[i]);
      for (var j = 0; j < items.length; j++) drawables.push(items[j]);
      for (var k = 0; k < fireballs.length; k++) drawables.push(fireballs[k]);
      for (var m = 0; m < fragments.length; m++) drawables.push(fragments[m]);
      drawables.sort(function (a, b) { return a.y - b.y; });
      for (var n = 0; n < drawables.length; n++) drawables[n].render(ctx, camera);
      player.render(ctx, camera);

      drawHUD();
    }

    if (state === 'TITLE') drawTitle();
    if (state === 'CLEAR') drawClear();
    if (state === 'OVER') drawGameOver();
  }

  // ---------- HUD ----------
  function text(str, x, y, scale) {
    scale = scale || 1;
    for (var i = 0; i < str.length; i++) {
      var g = global.Sprites.glyph(str[i]);
      ctx.drawImage(g, x + i * 8 * scale, y, 8 * scale, 8 * scale);
    }
  }

  function drawHUD() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 256, 32);
    ctx.fillStyle = '#fff';
    text('HERO', 8, 4);
    text(pad(player.score, 6), 8, 14);
    // 金币
    global.Sprites.get('coin');
    ctx.drawImage(global.Sprites.get('coin'), 108, 6);
    text('x' + pad(player.coins, 2), 120, 6);
    // 世界
    text('WORLD', 176, 4);
    text('1-1', 184, 14);
    // 时间
    text('TIME', 224, 4);
    text(pad(Math.max(0, player.time), 3), 226, 14);
  }

  function pad(n, len) {
    var s = String(n);
    while (s.length < len) s = '0' + s;
    return s;
  }

  // ---------- 覆盖画面 ----------
  function drawTitle() {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, 256, 240);
    ctx.fillStyle = '#fff';
    text('MUSHROOM', 52, 60, 2);
    text('HERO', 92, 88, 2);
    ctx.fillStyle = '#8ad0ff';
    ctx.font = '10px monospace';
    ctx.fillText('蘑菇勇者 · 云想游戏厅', 72, 112);
    text('WORLD 1-1', 88, 136, 1);
    if (Math.floor(Date.now() / 500) % 2 === 0) {
      text('PRESS TO START', 64, 172, 1);
      // 中文提示用系统字体(像素字库无中文字形)
      ctx.fillStyle = '#fff';
      ctx.font = '9px monospace';
      ctx.fillText('手机:屏幕按钮   电脑:方向键+空格', 32, 204);
    }
    // 生命
    text('LIVES x' + (player ? player.lives : 3), 76, 220, 1);
  }

  function drawClear() {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, 256, 240);
    ctx.fillStyle = '#fff';
    text('COURSE CLEAR', 64, 100, 1);
    text('SCORE  ' + player.score, 72, 124, 1);
    if (stateTimer > 1.5 && Math.floor(Date.now() / 400) % 2 === 0) {
      text('TOUCH / PRESS TO CONTINUE', 40, 170, 0.8);
    }
  }

  function drawGameOver() {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, 256, 240);
    ctx.fillStyle = '#fff';
    text('GAME OVER', 80, 108, 1);
    text('SCORE  ' + player.score, 72, 132, 1);
  }

  // ---------- 导出 ----------
  Game.startGame = startGame;
  Game.respawn = respawn;
  Game.sfx = function (n) { global.AudioSys.sfx(n); };
  Game.spawnFireball = spawnFireball;
  Game.activateBlock = activateBlock;
  Game.smashBrick = smashBrick;
  Game.bumpBlock = bumpBlock;
  Game.flagStart = flagStart;
  Game.flagLanded = flagLanded;
  Game.flagDone = flagDone;
  Game.onPlayerDeath = onPlayerDeath;
  Game.player = function () { return player; };
  // 测试钩子
  Game._boot = boot;
  Game._step = step;
  Game._render = render;
  Game._state = function () { return state; };
  Game._player = function () { return player; };
  Game._cam = function () { return camera; };
  Game._enemies = function () { return enemies; };

  global.Game = Game;
  global.Entities.setGame(Game);

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', boot);
  }
})(typeof window !== 'undefined' ? window : globalThis);