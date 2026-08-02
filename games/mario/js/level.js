// level.js — 瓦片定义 / 关卡加载 / 渲染 / 碰撞查询
(function (global) {
  'use strict';

  var TILE = {
    EMPTY: 0, GROUND: 1, BRICK: 2, QUESTION: 3, USED: 4, HARD: 5,
    PIPE_TOP: 6, PIPE_BODY: 7, CASTLE: 8, FLAG: 9
  };

  var CHAR_TO_TILE = {
    '.': TILE.EMPTY, 'G': TILE.GROUND, 'B': TILE.BRICK, '?': TILE.QUESTION,
    'H': TILE.HARD, 'T': TILE.PIPE_TOP, 'P': TILE.PIPE_BODY,
    'C': TILE.CASTLE, 'F': TILE.FLAG, 'f': TILE.FLAG
  };

  function Level(data) {
    this.w = data.width;
    this.h = data.height;
    this.oy = 32;           // 关卡纵向偏移:HUD 占顶部 32px,渲染整体下移,碰撞必须同步
    this.flagX = data.flagX;
    this.castleX = data.castleX;

    this.cells = [];
    for (var y = 0; y < this.h; y++) this.cells.push(data.rows[y].split(''));

    // 特殊块(hidden/box contents) key = "x,y"
    this.special = {};
    this.hidden = [];
    for (var i = 0; i < data.special.length; i++) {
      var s = data.special[i];
      this.special[s.x + ',' + s.y] = s;
      if (s.tile === 'h') {
        this.cells[s.y][s.x] = '.';
        this.hidden[s.x + ',' + s.y] = true;
      }
    }
    this.enemyData = data.enemies;

    // 砖块/方块被顶起的动画偏移(x,y)->dy)
    this.bump = {};
  }

  Level.prototype.cellChar = function (tx, ty) {
    if (tx < 0 || tx >= this.w || ty < 0 || ty >= this.h) return '.';
    return this.cells[ty][tx];
  };
  Level.prototype.setCell = function (tx, ty, ch) {
    if (tx < 0 || tx >= this.w || ty < 0 || ty >= this.h) return;
    this.cells[ty][tx] = ch;
  };
  Level.prototype.tile = function (tx, ty) {
    if (tx < 0 || tx >= this.w || ty < 0 || ty >= this.h) return TILE.EMPTY;
    return CHAR_TO_TILE[this.cells[ty][tx]] || TILE.EMPTY;
  };
  // 屏幕坐标 → 瓦片行(与渲染偏移 oy 保持一致)
  Level.prototype.rowAt = function (screenY) {
    return Math.floor((screenY - this.oy) / 16);
  };
  // 地面顶部的屏幕 Y(地面固定占底部两行)
  Level.prototype.groundTopY = function () {
    return (this.h - 2) * 16 + this.oy;
  };
  Level.prototype.isSolid = function (tx, ty) {
    var t = this.tile(tx, ty);
    if (t === TILE.GROUND || t === TILE.BRICK || t === TILE.QUESTION ||
        t === TILE.USED || t === TILE.HARD || t === TILE.PIPE_TOP ||
        t === TILE.PIPE_BODY) return true;
    // 隐藏块:不可见但实心,顶到才现身
    return !!this.special[tx + ',' + ty];
  };
  Level.prototype.isBrick = function (tx, ty) {
    return this.tile(tx, ty) === TILE.BRICK;
  };
  Level.prototype.getSpecial = function (tx, ty) {
    return this.special[tx + ',' + ty] || null;
  };

  // 每帧更新砖块弹跳动画
  Level.prototype.updateFrame = function (dt) {
    for (var key in this.bump) {
      var v = this.bump[key];
      v[1] -= dt * 2.5;   // 上升
      if (v[1] <= 0) delete this.bump[key];
      else v[0] = -v[1];
    }
  };

  // ---------- 渲染 ----------
  Level.prototype.render = function (ctx, camX) {
    var Sp = global.Sprites;
    var firstCol = Math.floor(camX / 16) - 1;
    var lastCol = firstCol + 18;

    // 背景(云/山/灌木)
    drawBackground(ctx, camX);

    var ty, tx;
    for (ty = 0; ty < this.h; ty++) {
      for (tx = Math.max(0, firstCol); tx < Math.min(this.w, lastCol); tx++) {
        var x = tx * 16 - camX;
        var ch = this.cells[ty][tx];
        var t = CHAR_TO_TILE[ch];
        if (t === TILE.EMPTY) continue;
        var spr = null;
        switch (t) {
          case TILE.GROUND: spr = 'tile_ground'; break;
          case TILE.BRICK:  spr = 'tile_brick'; break;
          case TILE.QUESTION:
            spr = (Math.floor(Date.now() / 300) % 2 === 0) ? 'tile_question' : 'tile_question';
            break;
          case TILE.USED:   spr = 'tile_used'; break;
          case TILE.HARD:   spr = 'tile_stone'; break;
          case TILE.PIPE_TOP:
            spr = (this.cellChar(tx - 1, ty) === 'P' || this.cellChar(tx - 1, ty) === 'T')
              ? 'tile_pipe_tr' : 'tile_pipe_tl';
            break;
          case TILE.PIPE_BODY:
            spr = (this.cellChar(tx - 1, ty) === 'P' || this.cellChar(tx - 1, ty) === 'T')
              ? 'tile_pipe_br' : 'tile_pipe_bl';
            break;
          case TILE.CASTLE: continue; // 城堡单独画
          default: continue;
        }
        if (!spr) continue;
        var dy = (this.bump[tx + ',' + ty] || [0, 0])[0] | 0;
        ctx.drawImage(Sp.get(spr), x | 0, ty * 16 + 32 + dy);
      }
    }

    drawFlagPole(ctx, this.flagX * 16 - camX);
    drawCastle(ctx, this.castleX * 16 - camX);
  };

  // 旗杆
  function drawFlag(ctx, x) { drawFlagPole(ctx, x); }
  Level.prototype.drawFlag = drawFlag;

  // 背景山/云/灌木(伪随机种子布置)
  function drawBackground(ctx, camX) {
    var Sp = global.Sprites;
    // 天空渐变
    var grad = ctx.createLinearGradient(0, 0, 0, 240);
    grad.addColorStop(0, '#5c94fc');
    grad.addColorStop(1, '#a8d8f8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 240);

    // 云(固定若干位置)
    var cloudXs = [40, 200, 420, 640, 900, 1150, 1450, 1750, 2050, 2350, 2650, 2950, 3250];
    var Sp2 = global.Sprites;
    for (var i = 0; i < cloudXs.length; i++) {
      var cx = cloudXs[i] - camX * 0.6;   // 视差 0.6
      var cy = 40 + (i % 3) * 24;
      while (cx > 320) cx -= 900;
      if (cx < -80 || cx > 330) continue;
      ctx.drawImage(Sp2.get('cloud'), cx | 0, cy);
    }

    // 灌木(地面装饰,视差 1,固定在低处)
    ctx.fillStyle = '#50b050';
    var bushes = [120, 780, 1500, 2200, 2900];
    for (var b = 0; b < bushes.length; b++) {
      var bx = bushes[b] - camX;
      if (bx < -80 || bx > 340) continue;
      ctx.beginPath();
      ctx.arc(bx + 8, 190, 10, Math.PI, 0);
      ctx.arc(bx + 20, 190, 8, Math.PI, 0);
      ctx.arc(bx + 30, 190, 10, Math.PI, 0);
      ctx.fill();
    }

    // 小山(背景,行 12 上方)
    ctx.fillStyle = '#50a030';
    var hills = [0, 900, 2100];
    for (var h = 0; h < hills.length; h++) {
      var hx = hills[h] - camX;
      if (hx < -200 || hx > 500) continue;
      ctx.beginPath();
      ctx.moveTo(hx, 44);
      ctx.lineTo(hx + 70, 44 - 54);
      ctx.lineTo(hx + 140, 44);
      ctx.fill();
    }
  }

  function drawFlagPole(ctx, x) {
    if (x < -16 || x > 272) return;
    // 杆
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(x + 7, 40, 2, 10 * 16 + 8);
    // 顶部球
    ctx.fillStyle = '#f8f890';
    ctx.beginPath();
    ctx.arc(x + 8, 38, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f8a800';
    ctx.beginPath();
    ctx.arc(x + 8, 38, 2, 0, Math.PI * 2);
    ctx.fill();
    // 旗帜
    var fy = global.Game && global.Game.flagFallY || 40;
    ctx.fillStyle = '#e40000';
    ctx.fillRect(x - 12, fy, 16, 7);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 12, fy + 3, 16, 2);
  }

  function drawCastle(ctx, x) {
    if (x < -64 || x > 320) return;
    ctx.fillStyle = '#a89878';
    ctx.fillRect(x, 96, 80, 112);
    ctx.fillRect(x + 4, 88, 72, 8);
    // 垛口
    ctx.fillStyle = '#8a7a58';
    for (var i = 0; i < 4; i++) ctx.fillRect(x + 4 + i * 17, 84, 10, 6);
    // 门
    ctx.fillStyle = '#3a2818';
    ctx.fillRect(x + 28, 140, 24, 68);
    ctx.beginPath();
    ctx.arc(x + 40, 140, 12, Math.PI, 0);
    ctx.fill();
    // 窗
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(x + 58, 112, 12, 10);
    ctx.fillStyle = '#6a4a38';
    ctx.fillRect(x + 62, 112, 4, 10);
  }

  Level.TILE = TILE;
  global.Level = Level;
  global.TILE = TILE;
})(typeof window !== 'undefined' ? window : globalThis);