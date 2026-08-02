// main.js(爆破小子)— 放炸弹炸软砖/敌人,注意别炸到自己
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
                     dir: 0, speed: 1.05, alive: true, aiT: Math.random(), animT: 0,
                     mode: 'wander', modeT: 0, bombCd: 1.5 + Math.random(), bombRange: 2 });
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
  function bombAt(cx, cy) {
    for (var i = 0; i < bombs.length; i++) {
      if (bombs[i].cx === cx && bombs[i].cy === cy) return bombs[i];
    }
    return null;
  }
  // 12x12 矩形能否站(像素坐标);who 与炸弹格重叠时允许离开(经典规则)
  function canStand(x, y, who) {
    for (var cy = 0; cy < 12; cy += 11) {
      for (var cx = 0; cx < 12; cx += 11) {
        var col = (x + cx) >> 4, row = (y + cy) >> 4;
        var t = tileAt(col, row);
        if (t === 'X' || t === 'B') return false;
        var b = bombAt(col, row);
        if (b) {
          if (who && who.x < col * 16 + 16 && who.x + 12 > col * 16 &&
              who.y < row * 16 + 16 && who.y + 12 > row * 16) continue;   // 正踩在炸弹上:放行
          return false;
        }
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
      // 轴分离移动(刚放的炸弹允许离开)
      if (canStand(nx, player.y, player)) player.x = nx;
      if (canStand(player.x, ny, player)) player.y = ny;
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

  // ============================================================
  // 敌人 AI(有感知、会躲雷、会主动进攻)
  // ============================================================
  function isBlocked(cx, cy) {
    var t = tileAt(cx, cy);
    return t === 'X' || t === 'B' || !!bombAt(cx, cy);
  }
  // 炸弹火焰能否沿直线到达目标格(中间无砖阻挡)
  function flameReaches(b, tx, ty) {
    var dist = Math.abs(tx - b.cx) + Math.abs(ty - b.cy);
    if (dist > b.range) return false;
    var sx = tx === b.cx ? 0 : (tx > b.cx ? 1 : -1);
    var sy = ty === b.cy ? 0 : (ty > b.cy ? 1 : -1);
    var x = b.cx + sx, y = b.cy + sy;
    while (!(x === tx && y === ty)) {
      var t = tileAt(x, y);
      if (t === 'X' || t === 'B') return false;
      x += sx; y += sy;
    }
    return true;
  }
  // 格子是否会被场上"即将爆炸"的炸弹炸到
  function cellInDanger(cx, cy) {
    for (var i = 0; i < bombs.length; i++) {
      var b = bombs[i];
      if (b.t > 35) continue;                 // 还有时间,不构成紧迫威胁
      if (flameReaches(b, cx, cy)) return true;
    }
    return false;
  }
  // 放炸弹前评估:沿某方向是否存在足够长的逃生通道(爆炸范围格数)
  // 返回逃生方向,无安全方向返回 -1
  function escapePathOk(ax, ay, dir, depth) {
    var dx = [0, 1, 0, -1][dir], dy = [-1, 0, 1, 0][dir];
    var cx = ax, cy = ay;
    for (var i = 0; i < depth; i++) {
      if (isBlocked(cx, cy)) return false;
      cx += dx; cy += dy;
    }
    return true;
  }
  function canPlaceSafely(e) {
    var bx = (e.x + 6) >> 4, by = (e.y + 6) >> 4;
    if (bombAt(bx, by)) return -1;
    for (var d = 0; d < 4; d++) {
      var ax = bx + [0, 1, 0, -1][d], ay = by + [-1, 0, 1, 0][d];
      if (escapePathOk(ax, ay, d, e.bombRange)) return d;
    }
    return -1;
  }
  // 逃离所有炸弹的最佳方向
  function escapeDir(e) {
    var ex = (e.x + 6) >> 4, ey = (e.y + 6) >> 4;
    var best = 0, bestScore = -999;
    for (var d = 0; d < 4; d++) {
      var nx = ex + [0, 1, 0, -1][d], ny = ey + [-1, 0, 1, 0][d];
      if (isBlocked(nx, ny)) continue;
      var score = 0;
      for (var i = 0; i < bombs.length; i++) {
        score += Math.abs(nx - bombs[i].cx) + Math.abs(ny - bombs[i].cy);
      }
      score += Math.random() * 0.5;
      if (score > bestScore) { bestScore = score; best = d; }
    }
    return bestScore === -999 ? Math.floor(Math.random() * 4) : best;
  }
  // 朝目标方向(有障碍时顺延)
  function dirToward(e, tx, ty) {
    var ex = (e.x + 6) >> 4, ey = (e.y + 6) >> 4;
    var dx = tx - ex, dy = ty - ey;
    var cand = Math.abs(dx) >= Math.abs(dy)
      ? [dx > 0 ? 1 : 3, dy > 0 ? 2 : 0, dx > 0 ? 1 : 3, dy > 0 ? 2 : 0]
      : [dy > 0 ? 2 : 0, dx > 0 ? 1 : 3, dy > 0 ? 2 : 0, dx > 0 ? 1 : 3];
    for (var k = 0; k < cand.length; k++) {
      var nx = ex + [0, 1, 0, -1][cand[k]], ny = ey + [-1, 0, 1, 0][cand[k]];
      if (!isBlocked(nx, ny)) return cand[k];
    }
    return Math.floor(Math.random() * 4);
  }
  // 直线视野:与玩家同列/同行且中间无遮挡 → {dist, dir}
  function lineOfSight(e) {
    var ex = (e.x + 6) >> 4, ey = (e.y + 6) >> 4;
    var px = (player.x + 6) >> 4, py = (player.y + 6) >> 4;
    var dist = Math.abs(ex - px) + Math.abs(ey - py);
    if (dist > 7 || !player.alive) return null;
    if (ex === px) {
      var dirY = py > ey ? 1 : -1;
      for (var y = ey + dirY; y !== py; y += dirY) {
        var t = tileAt(ex, y);
        if (t === 'X' || t === 'B') return null;
      }
      return { dist: dist, dir: py > ey ? 2 : 0 };
    }
    if (ey === py) {
      var dirX = px > ex ? 1 : -1;
      for (var x = ex + dirX; x !== px; x += dirX) {
        var t2 = tileAt(x, ey);
        if (t2 === 'X' || t2 === 'B') return null;
      }
      return { dist: dist, dir: px > ex ? 1 : 3 };
    }
    return null;
  }
  function placeEnemyBomb(e) {
    var bx = (e.x + 6) >> 4, by = (e.y + 6) >> 4;
    bombs.push({ cx: bx, cy: by, t: BOMB_TICKS, range: e.bombRange, owner: 'enemy' });
    global.AudioSys.sfx('place');
  }
  // 核心决策
  function decideEnemy(e) {
    var ex = (e.x + 6) >> 4, ey = (e.y + 6) >> 4;
    // 1) 生存优先:正被火焰威胁 → 逃跑
    if (cellInDanger(ex, ey)) {
      e.mode = 'flee'; e.modeT = 1.1;
      e.dir = escapeDir(e);
      return;
    }
    // 2) 攻击:玩家在直线视野内
    var sight = lineOfSight(e);
    if (sight) {
      e.mode = 'attack';
      // 距离足够近且放雷有逃生路 → 放雷逼玩家
      var fd = canPlaceSafely(e);
      if (sight.dist <= e.bombRange && e.bombCd <= 0 && fd >= 0) {
        placeEnemyBomb(e);
        e.bombCd = 2.5 + Math.random() * 1.5;
        e.mode = 'flee'; e.modeT = 1.2;
        e.dir = fd;   // 沿预定的逃生通道跑
        return;
      }
      e.dir = sight.dir;   // 逼近玩家
      return;
    }
    // 3) 游走:玩家在附近(墙后)时试探放雷封路,否则向玩家方向靠拢
    var mdist = Math.abs(ex - ((player.x + 6) >> 4)) + Math.abs(ey - ((player.y + 6) >> 4));
    var fd2 = canPlaceSafely(e);
    if (e.bombCd <= 0 && mdist <= 8 && Math.random() < 0.5 && fd2 >= 0) {
      placeEnemyBomb(e);
      e.bombCd = 3 + Math.random() * 2;
      e.mode = 'flee'; e.modeT = 1.2;
      e.dir = fd2;   // 沿预定的逃生通道跑
      return;
    }
    e.mode = 'wander';
    if (Math.random() < 0.65) e.dir = dirToward(e, (player.x + 6) >> 4, (player.y + 6) >> 4);
    else e.dir = Math.floor(Math.random() * 4);
  }

  function updateEnemies(dt) {
    for (var i = enemies.length - 1; i >= 0; i--) {
      var e = enemies[i];
      if (!e.alive) { enemies.splice(i, 1); continue; }
      e.animT += dt;
      e.bombCd -= dt;
      e.aiT -= dt;

      // 紧迫威胁随时触发逃跑(最高优先级)
      var ex = (e.x + 6) >> 4, ey = (e.y + 6) >> 4;
      if (cellInDanger(ex, ey) && e.mode !== 'flee') {
        e.mode = 'flee'; e.modeT = 1.0;
        e.dir = escapeDir(e);
      }
      // 逃跑超时回归游走
      if (e.mode === 'flee') {
        e.modeT -= dt;
        if (e.modeT <= 0) e.mode = 'wander';
      }
      // 决策周期
      if (e.aiT <= 0) {
        e.aiT = 0.45 + Math.random() * 0.55;
        decideEnemy(e);
      }

      var dx = [0, 1, 0, -1][e.dir], dy = [-1, 0, 1, 0][e.dir];
      var sp = e.mode === 'flee' ? e.speed * 1.4 : e.speed;   // 逃跑加速
      var nx = e.x + dx * sp, ny = e.y + dy * sp;
      if (canStand(nx, e.y, e) && canStand(e.x, ny, e)) { e.x = nx; e.y = ny; }
      else {
        // 撞墙:逃跑中重算逃跑方向,否则立即重新决策
        if (e.mode === 'flee') e.dir = escapeDir(e);
        else e.aiT = 0;
      }

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
    ctx.fillText('BLAST BOY · 引爆全场', 48, 130);
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
