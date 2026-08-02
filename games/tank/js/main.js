// main.js(坦克大战·轻量版)— 钢铁前线:单机 1P 守卫基地
(function (global) {
  'use strict';

  var CELL = 16, GRID = 13;
  var canvas, ctx;
  var state = 'TITLE';       // TITLE / PLAY / CLEAR / OVER
  var stateTimer = 0;
  var stage = 0;
  var map = [];
  var player = null;
  var enemies = [], bullets = [], booms = [];
  var score = 0, lives = 3;
  var enemyLeft = 0, enemyAlive = 0, enemyTimer = 0;
  var baseAlive = true;
  var spawns = [];
  var playerSpawn = null;
  var baseTgt = { x: 6 * 16 + 8, y: 12 * 16 + 8 };   // 基地中心(敌人瞄准用)

  // ---------- 地图(13x13,原创布局) ----------
  // . 空地  B 砖  S 钢  G 草(装饰)  F 基地  P 玩家出生  E 敌人出生
  var MAPS = [
    {
      enemies: 10,
      rows: [
        "E..E.......E..",
        ".............",
        ".BB..B.B..BB.",
        ".BB..B.B..BB.",
        "....B...B....",
        "..SS.B.B.SS..",
        ".............",
        "..BB..G..BB..",
        "....B.G.B....",
        "..BB.BBB.BB..",
        ".............",
        "......P......",
        "..B..FF..B..."
      ]
    },
    {
      enemies: 14,
      rows: [
        "E..E...E...E.",
        ".............",
        ".B.BB.BB.BB.B",
        ".B.SB...BS.B.",
        "...B..G..B...",
        "..BB.GGG.BB..",
        "....SS.SS....",
        "..BB.....BB..",
        ".B..B...B..B.",
        ".B.BB.BB.B.B.",
        ".............",
        "......P......",
        "..B..FF..B..."
      ]
    }
  ];

  // ---------- 初始化 ----------
  function boot() {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
    global.Input.init();
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    var unlock = function () {
      global.AudioSys.unlock();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

    var last = performance.now(), acc = 0;
    function loop(now) {
      var dt = Math.min(now - last, 100);
      last = now;
      acc += dt;
      while (acc >= 1000 / 60) {
        acc -= 1000 / 60;
        step(1 / 60);
      }
      render();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  // ---------- 关卡 ----------
  function startStage(s) {
    stage = s % MAPS.length;
    var rows = MAPS[stage].rows;
    map = [];
    spawns = [];
    for (var y = 0; y < GRID; y++) {
      map.push(rows[y].split(''));
      for (var x = 0; x < GRID; x++) {
        var c = map[y][x];
        if (c === 'P') { playerSpawn = { x: x, y: y }; map[y][x] = '.'; }
        else if (c === 'E') { spawns.push({ x: x, y: y }); map[y][x] = '.'; }
        else if (c === 'F') { baseTgt.x = x * 16 + 8; baseTgt.y = y * 16 + 8; }
      }
    }
    player = { x: playerSpawn.x * 16 + 1, y: playerSpawn.y * 16 + 1,
               dir: 0, speed: 1.4, isPlayer: true, alive: true, fireCd: 0, inv: 2 };
    enemies = []; bullets = []; booms = [];
    enemyLeft = MAPS[stage].enemies;
    enemyAlive = 0;
    enemyTimer = 1.5;
    baseAlive = true;
    state = 'PLAY';
  }

  function startGame() {
    score = 0; lives = 3;
    startStage(0);
    global.AudioSys.sfx('start');
  }

  // ---------- 工具 ----------
  function tileAt(col, row) {
    if (col < 0 || row < 0 || col >= GRID || row >= GRID) return 'S';   // 边界当钢墙
    return map[row][col];
  }
  function isSolidT(t) { return t === 'B' || t === 'S' || t === 'F'; }

  function tankCanMove(t, ndir) {
    var dx = [0, 1, 0, -1][ndir], dy = [-1, 0, 1, 0][ndir];
    var nx = t.x + dx * t.speed, ny = t.y + dy * t.speed;
    if (nx < 0 || ny < 0 || nx + 14 > GRID * 16 || ny + 14 > GRID * 16) return null;
    // 四角所在的格必须可通行
    for (var cy = 0; cy < 14; cy += 13) {
      for (var cx = 0; cx < 14; cx += 13) {
        if (isSolidT(tileAt((nx + cx) >> 4, (ny + cy) >> 4))) return null;
      }
    }
    // 与其他坦克不重叠
    var list = enemies.concat([player]);
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (o === t || !o.alive) continue;
      if (nx < o.x + 14 && nx + 14 > o.x && ny < o.y + 14 && ny + 14 > o.y) return null;
    }
    return { x: nx, y: ny };
  }

  function fire(t) {
    if (t.fireCd > 0) return;
    t.fireCd = t.isPlayer ? 16 : 50 + Math.floor(Math.random() * 40);
    var dx = [0, 1, 0, -1][t.dir], dy = [-1, 0, 1, 0][t.dir];
    var cx = t.x + 7 + dx * 8, cy = t.y + 7 + dy * 8;
    bullets.push({ x: cx - 2, y: cy - 2, dx: dx, dy: dy, owner: t, dead: false });
    global.AudioSys.sfx('shot');
  }

  function boom(x, y) {
    booms.push({ x: x, y: y, t: 0.35 });
  }

  // ---------- 主步进 ----------
  function step(dt) {
    var input = global.Input.actions;
    global.Input.sync();

    if (state === 'TITLE') {
      if (input.anyKey) startGame();
    } else if (state === 'PLAY') {
      updatePlayer();
      updateEnemies(dt);
      updateBullets();
      for (var i = booms.length - 1; i >= 0; i--) {
        booms[i].t -= dt;
        if (booms[i].t <= 0) booms.splice(i, 1);
      }
      // 胜利:敌全灭
      if (enemyLeft <= 0 && enemies.length === 0) {
        state = 'CLEAR';
        stateTimer = 0;
        score += 1000;
        global.AudioSys.sfx('clear2');
      }
      // 失败:基地被毁
      if (!baseAlive) {
        state = 'OVER';
        stateTimer = 0;
        global.AudioSys.sfx('over');
      }
    } else if (state === 'CLEAR') {
      stateTimer += dt;
      if (stateTimer > 2.5) startStage(stage + 1);
    } else if (state === 'OVER') {
      stateTimer += dt;
      if (stateTimer > 3) state = 'TITLE';
    }
    global.Input.endFrame();
  }

  function updatePlayer() {
    if (!player.alive) return;
    if (player.inv > 0) player.inv -= 1 / 60;
    if (player.fireCd > 0) player.fireCd -= 1;   // 帧计数
    var inp = global.Input.actions;
    var ndir = -1;
    if (inp.up) ndir = 0;
    else if (inp.down) ndir = 2;
    else if (inp.dir < 0) ndir = 3;
    else if (inp.dir > 0) ndir = 1;
    if (ndir >= 0) {
      player.dir = ndir;
      var m = tankCanMove(player, ndir);
      if (m) { player.x = m.x; player.y = m.y; }
    }
    if (inp.fire) fire(player);
  }

  function updateEnemies(dt) {
    // 刷新敌人:同时最多 3 个
    if (enemyLeft > 0 && enemyAlive < 3) {
      enemyTimer -= dt;
      if (enemyTimer <= 0) {
        enemyTimer = 3;
        for (var s = 0; s < 4 && enemyLeft > 0 && enemyAlive < 3; s++) {
          var sp = spawns[Math.floor(Math.random() * spawns.length)];
          var busy = false;
          for (var b = 0; b < enemies.length; b++) {
            var o = enemies[b];
            if (o.alive && Math.abs(o.x - sp.x * 16) < 16 && Math.abs(o.y - sp.y * 16) < 16) busy = true;
          }
          if (!busy) {
            var e = { x: sp.x * 16 + 1, y: sp.y * 16 + 1, dir: 2, speed: 0.8,
                      isPlayer: false, alive: true, fireCd: 60, inv: 1, aiT: 0.8 };
            enemies.push(e);
            enemyAlive++;
            enemyLeft--;
          }
        }
      }
    }

    for (var i = enemies.length - 1; i >= 0; i--) {
      var e = enemies[i];
      if (!e.alive) { enemies.splice(i, 1); enemyAlive--; continue; }
      if (e.inv > 0) e.inv -= dt;
      if (e.fireCd > 0) e.fireCd -= 1;   // 帧计数

      // AI:随机转向(30% 朝玩家),撞墙顺延
      e.aiT -= dt;
      if (e.aiT <= 0) {
        e.aiT = 1.1 + Math.random() * 1.4;
        if (player.alive && Math.random() < 0.3) {
          var dx = player.x - e.x, dy = player.y - e.y;
          e.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
        } else {
          e.dir = Math.floor(Math.random() * 4);
        }
        for (var k = 0; k < 4; k++) {
          if (tankCanMove(e, e.dir)) break;
          e.dir = (e.dir + 1) % 4;
        }
      }
      var m = tankCanMove(e, e.dir);
      if (m) { e.x = m.x; e.y = m.y; }
      // 开火:35% 概率,瞄准目标(65% 玩家 / 35% 基地)
      if (e.fireCd <= 0 && Math.random() < 0.35) {
        var tgt = (player.alive && Math.random() < 0.65) ? player : baseTgt;
        var ddx = tgt.x - e.x, ddy = tgt.y - e.y;
        e.dir = Math.abs(ddx) > Math.abs(ddy) ? (ddx > 0 ? 1 : 3) : (ddy > 0 ? 2 : 0);
        fire(e);
      }
    }
  }

  function updateBullets() {
    for (var i = bullets.length - 1; i >= 0; i--) {
      var b = bullets[i];
      if (b.dead) { bullets.splice(i, 1); continue; }
      b.x += b.dx * 3.5;
      b.y += b.dy * 3.5;
      var col = (b.x + 2) >> 4, row = (b.y + 2) >> 4;
      var t = tileAt(col, row);
      if (t === 'B') { map[row][col] = '.'; b.dead = true; global.AudioSys.sfx('hit'); continue; }
      if (t === 'S') { b.dead = true; global.AudioSys.sfx('hit'); continue; }
      if (t === 'F') {
        b.dead = true;
        baseAlive = false;
        boom(col * 16, row * 16);
        global.AudioSys.sfx('explode');
        continue;
      }
      // 命中坦克
      var list = b.owner.isPlayer ? enemies : [player];
      for (var j = 0; j < list.length; j++) {
        var o = list[j];
        if (!o.alive || (o.isPlayer && o.inv > 0)) continue;
        if (b.x < o.x + 14 && b.x + 4 > o.x && b.y < o.y + 14 && b.y + 4 > o.y) {
          o.alive = false;
          b.dead = true;
          boom(o.x, o.y);
          if (b.owner.isPlayer) {
            score += 100;
            enemyAlive--;
            global.AudioSys.sfx('explode');
          } else {
            global.AudioSys.sfx('explode');
            onPlayerDead();
          }
          break;
        }
      }
    }
  }

  function onPlayerDead() {
    lives--;
    if (lives < 0) {
      state = 'OVER';
      stateTimer = 0;
      global.AudioSys.sfx('over');
    } else {
      // 重生(短暂无敌)
      player.alive = true;
      player.x = playerSpawn.x * 16 + 1;
      player.y = playerSpawn.y * 16 + 1;
      player.dir = 0;
      player.inv = 2;
      player.fireCd = 0;
    }
  }

  // ---------- 渲染 ----------
  function render() {
    ctx.fillStyle = '#0c0c14';
    ctx.fillRect(0, 0, 256, 240);

    if (state !== 'TITLE') {
      // 地形
      var Sp = global.TankSprites;
      for (var y = 0; y < GRID; y++) {
        for (var x = 0; x < GRID; x++) {
          var t = map[y][x], img = null;
          if (t === 'B') img = Sp.get('brick');
          else if (t === 'S') img = Sp.get('steel');
          else if (t === 'F') img = Sp.get(baseAlive ? 'base_flag' : 'base_dead');
          if (img) ctx.drawImage(img, x * 16, y * 16 + 32);
        }
      }
      // 子弹
      for (var bi = 0; bi < bullets.length; bi++) {
        ctx.drawImage(Sp.get('bullet'), bullets[bi].x, bullets[bi].y + 32);
      }
      // 坦克
      for (var ei = 0; ei < enemies.length; ei++) {
        drawTank(Sp.get('tankE_up'), enemies[ei]);
      }
      if (player.alive) drawTank(Sp.get('tankP_up'), player);
      // 草丛(覆盖坦克)
      for (var gy = 0; gy < GRID; gy++) {
        for (var gx = 0; gx < GRID; gx++) {
          if (map[gy][gx] === 'G') ctx.drawImage(Sp.get('grass'), gx * 16, gy * 16 + 32);
        }
      }
      // 爆炸
      for (var bo = 0; bo < booms.length; bo++) {
        var bm = booms[bo];
        ctx.drawImage(Sp.get(bm.t > 0.18 ? 'boom1' : 'boom2'), bm.x - 1, bm.y + 31);
      }

      drawHUD();
    }

    if (state === 'TITLE') drawTitle();
    else if (state === 'CLEAR') drawCenter('STAGE CLEAR!', '进入下一关…');
    else if (state === 'OVER') drawCenter('GAME OVER', 'SCORE ' + score);
  }

  function drawTank(img, t) {
    if (t.inv > 0 && Math.floor(performance.now() / 80) % 2 === 0) return;
    ctx.save();
    ctx.translate(t.x + 7, t.y + 7 + 32);
    ctx.rotate(t.dir * Math.PI / 2);
    ctx.drawImage(img, -7, -7);
    ctx.restore();
  }

  function drawHUD() {
    ctx.fillStyle = '#101018';
    ctx.fillRect(0, 0, 256, 32);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('钢铁前线', 8, 14);
    ctx.fillText('STAGE ' + (stage + 1), 8, 28);
    ctx.fillText('SCORE ' + score, 92, 14);
    ctx.fillText('ENEMY ' + (enemyLeft + enemies.length), 92, 28);
    // 生命图标(右侧)
    var Sp = global.TankSprites;
    for (var i = 0; i < Math.max(0, lives); i++) {
      ctx.drawImage(Sp.get('tankP_up'), 214 + i * 14, 10);
    }
    ctx.fillStyle = '#8a8ab8';
    ctx.font = '10px monospace';
    ctx.fillText('LIFE', 214, 8);
  }

  function drawTitle() {
    ctx.fillStyle = 'rgba(10,10,20,0.55)';
    ctx.fillRect(0, 0, 256, 240);
    ctx.fillStyle = '#e8e8f0';
    ctx.font = 'bold 34px monospace';
    ctx.fillText('钢铁前线', 52, 100);
    ctx.fillStyle = '#7ab8ff';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('STEEL FRONT · 坦克大战轻量版', 28, 130);
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.fillText('守住基地,消灭全部敌人', 56, 156);
    if (Math.floor(performance.now() / 500) % 2 === 0) {
      ctx.fillText('按任意键 / 触摸屏幕开始', 48, 192);
    }
  }

  function drawCenter(title, sub) {
    ctx.fillStyle = 'rgba(10,10,20,0.6)';
    ctx.fillRect(0, 0, 256, 240);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px monospace';
    ctx.fillText(title, 44, 112);
    ctx.fillStyle = '#9fd0ff';
    ctx.font = '13px monospace';
    ctx.fillText(sub, 64, 142);
  }

  // ---------- 导出 ----------
  global.TankGame = {
    _boot: boot,
    _step: step,
    _render: render,
    _state: function () { return state; },
    startGame: startGame,
    _player: function () { return player; },
    _enemies: function () { return enemies; },
    _bullets: function () { return bullets; },
    _map: function () { return map; },
    _lives: function () { return lives; }
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', boot);
  }
})(typeof window !== 'undefined' ? window : globalThis);
