// main.js(爆破小子)— 炸弹人换皮:放炸弹炸软砖/敌人,注意别炸到自己
(function (global) {
  'use strict';

  var CELL = 16, GRID = 13;
  var canvas, ctx;
  var state = 'TITLE';       // TITLE / PLAY / CLEAR / OVER
  var stateTimer = 0;
  var stage = 0;
  var map = [];
  var player = null;
  var enemies = [], bombs = [], flames = [], items = [];
  var score = 0, lives = 3;
  var playerSpawn = { x: 1, y: 1 };
  var BOMB_TICKS = 150, FLAME_TICKS = 24;

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

  // ---------- 关卡生成 ----------
  function genMap() {
    var m = [];
    for (var y = 0; y < GRID; y++) {
      var row = [];
      for (var x = 0; x < GRID; x++) {
        if (x === 0 || y === 0 || x === GRID - 1 || y === GRID - 1) row.push('X');
        else if (x % 2 === 0 && y % 2 === 0) row.push('X');
        else row.push(Math.random() < 0.72 ? 'B' : '.');
      }
      m.push(row);
    }
    // 玩家与敌人出生区清空(保证可动)
    var clears = [[1,1],[1,2],[2,1], [11,1],[10,1],[11,2],
                  [1,11],[1,10],[2,11], [11,11],[10,11],[11,10]];
    for (var i = 0; i < clears.length; i++) m[clears[i][1]][clears[i][0]] = '.';
    return m;
  }

  function startStage(s) {
    stage = s;
    map = genMap();
    bombs = []; flames = []; items = [];
    player = { x: 1 * CELL + 2, y: 1 * CELL + 2, dir: 0, speed: 1.6,
               bombMax: 1, range: 2, alive: true, inv: 2, firePrev: false, animT: 0 };
    // 敌人
    var enemyN = 3 + stage * 2;
    var spots = [[11,1],[1,11],[11,11],[6,11],[11,6]];
    enemies = [];
    for (var i = 0; i < enemyN && i < spots.length; i++) {
      enemies.push({ x: spots[i][0] * CELL + 2, y: spots[i][1] * CELL + 2,
                     dir: 0, speed: 0.9, alive: true, aiT: Math.random(), animT: 0 });
    }
    state = 'PLAY';
  }

  function startGame() {
    score = 0; lives = 3;
    startStage(0);
    global.AudioSys.sfx('start');
  }

  // ---------- 格子与碰撞 ----------
  function tileAt(cx, cy) {
    if (cx < 0 || cy < 0 || cx >= GRID || cy >= GRID) return 'X';
    return map[cy][cx];
  }
  function solidCell(cx, cy) {
    var t = tileAt(cx, cy);
    if (t === 'X' || t === 'B') return true;
    // 炸弹占位
    for (var i = 0; i < bombs.length; i++) {
      if (bombs[i].cx === cx && bombs[i].cy === cy) return true;
    }
    return false;
  }
  // 12x12 矩形能否站(像素坐标)
  function canStand(x, y) {
    for (var cy = 0; cy < 12; cy += 11) {
      for (var cx = 0; cx < 12; cx += 11) {
        if (solidCell((x + cx) >> 4, (y + cy) >> 4)) return false;
      }
    }
    return true;
  }

  // ---------- 主步进 ----------
  function step(dt) {
    var input = global.Input.actions;
    global.Input.sync();

    if (state === 'TITLE') {
      if (input.anyKey) startGame();
    } else if (state === 'PLAY') {
      updatePlayer(dt);
      updateEnemies(dt);
      updateBombs(dt);
      updateFlames(dt);
      updateItems(dt);
      // 胜利:敌全灭
      if (enemies.length === 0) {
        state = 'CLEAR';
        stateTimer = 0;
        score += 1000;
        global.AudioSys.sfx('clear2');
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

  function updatePlayer(dt) {
    if (!player.alive) return;
    if (player.inv > 0) player.inv -= dt;
    player.animT += dt;
    var inp = global.Input.actions;
    var dx = 0, dy = 0;
    if (inp.up) { dy = -1; player.dir = 0; }
    else if (inp.down) { dy = 1; player.dir = 2; }
    else if (inp.dir < 0) { dx = -1; player.dir = 3; }
    else if (inp.dir > 0) { dx = 1; player.dir = 1; }
    if (dx !== 0 || dy !== 0) {
      var nx = player.x + dx * player.speed, ny = player.y + dy * player.speed;
      // 轴分离移动
      if (canStand(nx, player.y)) player.x = nx;
      if (canStand(player.x, ny)) player.y = ny;
    }
    // 放炸弹
    if (inp.fire && !player.firePrev) placeBomb();
    player.firePrev = inp.fire;
  }

  function placeBomb() {
    var cx = (player.x + 6) >> 4, cy = (player.y + 6) >> 4;
    var count = 0;
    for (var i = 0; i < bombs.length; i++) if (bombs[i].owner === 'player') count++;
    if (count >= player.bombMax) return;
    for (var j = 0; j < bombs.length; j++) {
      if (bombs[j].cx === cx && bombs[j].cy === cy) return;
    }
    bombs.push({ cx: cx, cy: cy, t: BOMB_TICKS, range: player.range, owner: 'player' });
    global.AudioSys.sfx('place');
  }

  function updateBombs(dt) {
    for (var i = bombs.length - 1; i >= 0; i--) {
      var b = bombs[i];
      b.t -= 1;
      if (b.t <= 0) {
        bombs.splice(i, 1);
        explode(b.cx, b.cy, b.range);
      }
    }
  }

  // 十字爆炸(连锁引爆)
  function explode(cx, cy, range) {
    var cells = [[cx, cy]];
    var dirs = [[0,-1],[1,0],[0,1],[-1,0]];
    for (var d = 0; d < 4; d++) {
      for (var k = 1; k <= range; k++) {
        var x = cx + dirs[d][0] * k, y = cy + dirs[d][1] * k;
        var t = tileAt(x, y);
        if (t === 'X') break;
        if (t === 'B') {
          map[y][x] = '.';
          maybeDropItem(x, y);
          break;
        }
        // 炸弹连锁(用被引爆炸弹自己的范围)
        var chained = false;
        for (var bi = bombs.length - 1; bi >= 0; bi--) {
          if (bombs[bi].cx === x && bombs[bi].cy === y) {
            var br = bombs[bi].range;
            bombs.splice(bi, 1);
            explode(x, y, br);
            chained = true;
            break;
          }
        }
        if (chained) break;
        cells.push([x, y]);
      }
    }
    flames.push({ cells: cells, t: FLAME_TICKS });
    global.AudioSys.sfx('explode');
  }

  function maybeDropItem(cx, cy) {
    if (Math.random() < 0.38) {
      var r = Math.random();
      var type = r < 0.34 ? 'bomb' : r < 0.67 ? 'range' : 'speed';
      items.push({ x: cx * CELL + 2, y: cy * CELL + 2, type: type });
    }
  }

  function updateFlames(dt) {
    for (var i = flames.length - 1; i >= 0; i--) {
      var f = flames[i];
      f.t -= 1;
      if (f.t <= 0) { flames.splice(i, 1); continue; }
      // 判定命中
      for (var c = 0; c < f.cells.length; c++) {
        var cell = f.cells[c];
        var fx = cell[0] * CELL, fy = cell[1] * CELL;
        // 玩家
        if (player.alive && player.inv <= 0 &&
            player.x < fx + 16 && player.x + 12 > fx &&
            player.y < fy + 16 && player.y + 12 > fy) {
          onPlayerDead();
        }
        // 敌人
        for (var e = enemies.length - 1; e >= 0; e--) {
          var en = enemies[e];
          if (!en.alive) continue;
          if (en.x < fx + 16 && en.x + 12 > fx &&
              en.y < fy + 16 && en.y + 12 > fy) {
            en.alive = false;
            enemies.splice(e, 1);
            score += 100;
          }
        }
      }
    }
  }

  function updateItems(dt) {
    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      if (player.alive &&
          player.x < it.x + 14 && player.x + 12 > it.x &&
          player.y < it.y + 14 && player.y + 12 > it.y) {
        if (it.type === 'bomb') player.bombMax = Math.min(6, player.bombMax + 1);
        else if (it.type === 'range') player.range = Math.min(5, player.range + 1);
        else player.speed = Math.min(3, player.speed + 0.5);
        score += 100;
        global.AudioSys.sfx('coin');
        items.splice(i, 1);
      }
    }
  }

  function updateEnemies(dt) {
    for (var i = enemies.length - 1; i >= 0; i--) {
      var e = enemies[i];
      if (!e.alive) { enemies.splice(i, 1); continue; }
      e.animT += dt;
      e.aiT -= dt;
      if (e.aiT <= 0) {
        e.aiT = 0.7 + Math.random() * 0.8;
        e.dir = Math.floor(Math.random() * 4);
      }
      var dx = [0, 1, 0, -1][e.dir], dy = [-1, 0, 1, 0][e.dir];
      var nx = e.x + dx * e.speed, ny = e.y + dy * e.speed;
      if (canStand(nx, e.y) && canStand(e.x, ny)) { e.x = nx; e.y = ny; }
      else { e.dir = Math.floor(Math.random() * 4); }
      // 撞到玩家
      if (player.alive && player.inv <= 0 &&
          player.x < e.x + 12 && player.x + 12 > e.x &&
          player.y < e.y + 12 && player.y + 12 > e.y) {
        onPlayerDead();
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
      player.alive = true;
      player.x = playerSpawn.x * CELL + 2;
      player.y = playerSpawn.y * CELL + 2;
      player.inv = 2;
      global.AudioSys.sfx('explode');
    }
  }

  // ---------- 渲染 ----------
  function render() {
    ctx.fillStyle = '#12121c';
    ctx.fillRect(0, 0, 256, 240);

    if (state !== 'TITLE') {
      var Sp = global.BomberSprites;
      // 地图
      for (var y = 0; y < GRID; y++) {
        for (var x = 0; x < GRID; x++) {
          var t = map[y][x], img = null;
          if (t === 'X') img = Sp.get('brick_hard');
          else if (t === 'B') img = Sp.get('brick_soft');
          if (img) ctx.drawImage(img, x * CELL, y * CELL + 32);
        }
      }
      // 道具
      for (var ii = 0; ii < items.length; ii++) {
        var it = items[ii];
        ctx.drawImage(Sp.get(it.type === 'bomb' ? 'item_bomb' : it.type === 'range' ? 'item_range' : 'item_speed'),
                      it.x, it.y + 32);
      }
      // 炸弹
      for (var bi = 0; bi < bombs.length; bi++) {
        var b = bombs[bi];
        var frame = b.t % 40 < 20 ? 'bomb1' : 'bomb2';
        ctx.drawImage(Sp.get(frame), b.cx * CELL, b.cy * CELL + 32);
      }
      // 敌人
      for (var ei = 0; ei < enemies.length; ei++) {
        var e = enemies[ei];
        var ef = Math.floor(e.animT * 8) % 2 === 0 ? 'enemy1' : 'enemy2';
        ctx.drawImage(Sp.get(ef), e.x, e.y + 32);
      }
      // 玩家
      if (player.alive && !(player.inv > 0 && Math.floor(performance.now() / 90) % 2 === 0)) {
        var pf = Math.floor(player.animT * 8) % 2 === 0 ? 'player1' : 'player2';
        ctx.drawImage(Sp.get(pf), player.x, player.y + 32);
      }
      // 火焰
      for (var fi = 0; fi < flames.length; fi++) {
        var f = flames[fi];
        for (var c = 0; c < f.cells.length; c++) {
          var cell = f.cells[c];
          var isC = cell[0] === f.cells[0][0] && cell[1] === f.cells[0][1];
          ctx.drawImage(Sp.get(isC ? 'flame_c' : 'flame_h'), cell[0] * CELL, cell[1] * CELL + 32);
        }
      }

      drawHUD();
    }

    if (state === 'TITLE') drawTitle();
    else if (state === 'CLEAR') drawCenter('STAGE CLEAR!', '进入下一关…');
    else if (state === 'OVER') drawCenter('GAME OVER', 'SCORE ' + score);
  }

  function drawHUD() {
    ctx.fillStyle = '#101018';
    ctx.fillRect(0, 0, 256, 32);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('爆破小子', 8, 14);
    ctx.fillText('STAGE ' + (stage + 1), 8, 28);
    ctx.fillText('SCORE ' + score, 92, 14);
    ctx.fillText('BOMB x' + player.bombMax + ' RANGE ' + player.range, 92, 28);
    // 生命
    var Sp = global.BomberSprites;
    for (var i = 0; i < Math.max(0, lives); i++) {
      ctx.drawImage(Sp.get('player1'), 214 + i * 14, 10);
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
    ctx.fillText('爆破小子', 52, 100);
    ctx.fillStyle = '#ffd23c';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('BLAST BOY · 炸弹人换皮', 40, 130);
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.fillText('炸掉软砖与敌人,小心别炸到自己', 36, 156);
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
  global.BomberGame = {
    _boot: boot,
    _step: step,
    _render: render,
    _state: function () { return state; },
    startGame: startGame,
    _player: function () { return player; },
    _enemies: function () { return enemies; },
    _bombs: function () { return bombs; },
    _flames: function () { return flames; },
    _map: function () { return map; },
    _lives: function () { return lives; }
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', boot);
  }
})(typeof window !== 'undefined' ? window : globalThis);
