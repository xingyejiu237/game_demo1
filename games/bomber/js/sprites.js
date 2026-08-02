// sprites.js(爆破小子)— 原创像素画:角色/炸弹/火焰/砖/道具
(function (global) {
  'use strict';

  var PAL = {
    player: { B:'#2838f8', D:'#1a24b8', S:'#f8b880', W:'#ffffff', K:'#101010', R:'#e40000' },
    enemy:  { R:'#e04838', D:'#8a1e14', W:'#ffffff', K:'#101010', Y:'#f8c878' },
    brickH: { T:'#c8c0d8', D:'#8880a0', K:'#3a3450' },
    brickS: { R:'#c44a28', D:'#7c2410', L:'#e89460' },
    bomb:   { K:'#1a1a1a', W:'#f8f8f8', Y:'#f8d020', R:'#e83010' },
    flame:  { Y:'#f8e000', W:'#fff8d0', O:'#f8a000', R:'#e83010' },
    item:   { R:'#e40000', B:'#2838f8', G:'#28a030', W:'#ffffff', K:'#101010' }
  };

  var DEFS = {};
  var cache = {};

  function normalizeRows(rows) {
    for (var i = 0; i < rows.length; i++) {
      var d = 16 - rows[i].length;
      for (var j = 0; j < d; j++) rows[i] += '.';
      rows[i] = rows[i].substring(0, 16);
    }
    return rows;
  }

  function buildTile(rows, palName) {
    var out = normalizeRows(rows);
    var w = out[0].length, h = out.length;
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d');
    var img = ctx.createImageData(w, h);
    var d = img.data, p = 0;
    var pal = PAL[palName];
    for (var y = 0; y < h; y++) {
      var row = out[y];
      for (var x = 0; x < w; x++) {
        var ch = row[x];
        if (ch === '.') d[p]=d[p+1]=d[p+2]=0, d[p+3]=0;
        else {
          var col = pal[ch] || '#ff00ff';
          d[p]=parseInt(col.substr(1,2),16);
          d[p+1]=parseInt(col.substr(3,2),16);
          d[p+2]=parseInt(col.substr(5,2),16);
          d[p+3]=255;
        }
        p += 4;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  function define(name, rows, palName) {
    DEFS[name] = { rows: rows, palName: palName };
  }
  function get(name) {
    if (!cache[name]) cache[name] = buildTile(DEFS[name].rows, DEFS[name].palName);
    return cache[name];
  }

  /* ============================================================
     爆破小子 14x14(白盔蓝衣,2 帧)
     ============================================================ */
  var boy1 = [
    '..............',
    '....WWWWWW....',
    '...WWWWWWWW...',
    '...WWKKWWKK...',
    '...WWWWWWWW...',
    '....SSSSSS....',
    '...SSSSSSSS...',
    '...SKKSSSKS...',
    '...BBBBBBBB...',
    '..BBBBBBBBBB..',
    '..BWWBBBBWWB..',
    '..BBBBBBBBBB..',
    '..BBBBBBBBBB..',
    '..............'
  ];
  var boy2 = boy1.slice();
  boy2[11] = '..BBBBBBBBBBR.';
  boy2[12] = '..BBBBBBBBBR..';
  define('player1', boy1, 'player');
  define('player2', boy2, 'player');

  /* ============================================================
     敌人 14x14(红色圆怪,2 帧)
     ============================================================ */
  var e1 = [
    '..............',
    '.....RRRR.....',
    '...RRRRRRRR...',
    '..RRRRRRRRRR..',
    '..RRWWRRWWRR..',
    '..RRRRRRRRRR..',
    '..RRRRRRRRRR..',
    '.RRRRRRRRRRRR.',
    '.RRRRKRRKRRRR.',
    '.RRRRRRRRRRRR.',
    '.RRRYYYYYYRRR.',
    '.RRRYYYYYYRRR.',
    '..RRYYYYYYRR..',
    '..............'
  ];
  var e2 = e1.slice();
  e2[11] = '.RRRYYYYYYRRR.';
  e2[12] = '..RYYYYYYYYR..';
  define('enemy1', e1, 'enemy');
  define('enemy2', e2, 'enemy');

  /* ============================================================
     砖
     ============================================================ */
  define('brick_hard', [
    '................',
    '.TTTTTTTTTTTTTT.',
    '.TTTKTTTTTTKTTT.',
    '.TTTTTTTTTTTTTT.',
    '.TTTTTTTTTTTTTT.',
    '.TTTKTTTTTTKTTT.',
    '.TTTTTTTTTTTTTT.',
    '.TTTTTTTTTTTTTT.',
    '.TTTKTTTTTTKTTT.',
    '.TTTTTTTTTTTTTT.',
    '.TTTTTTTTTTTTTT.',
    '.TTTKTTTTTTKTTT.',
    '.TTTTTTTTTTTTTT.',
    '.TTTTTTTTTTTTTT.',
    '.TTTKTTTTTTKTTT.',
    '................'
  ], 'brickH');

  define('brick_soft', [
    '................',
    '..RRRRRRRRRRRR..',
    '..RLLLLLLLLLLR..',
    '..RRRRRRRRRRRR..',
    '..RRRRRRRRRRRR..',
    '..DDDDDDDDDDDD..',
    '..RRRRRRRRRRRR..',
    '..RLLLLLLLLLLR..',
    '..RRRRRRRRRRRR..',
    '..DDDDDDDDDDDD..',
    '..RRRRRRRRRRRR..',
    '..RLLLLLLLLLLR..',
    '..RRRRRRRRRRRR..',
    '..RRRRRRRRRRRR..',
    '..DDDDDDDDDDDD..',
    '................'
  ], 'brickS');

  /* ============================================================
     炸弹 16x16(引信闪烁)
     ============================================================ */
  var bomb = [
    '................',
    '.......YY.......',
    '......YWWY......',
    '................',
    '....KKKKKKKK....',
    '...KKKKKKKKKK...',
    '..KKKKKKKKKKKK..',
    '..KKKKKKKKKKKK..',
    '..KKKKKKKKKKKK..',
    '..KKKKKKKKKKKK..',
    '..KKKKKKKKKKKK..',
    '..KKKKKKKKKKKK..',
    '...KKKKKKKKKK...',
    '....KKKKKKKK....',
    '................',
    '................'
  ];
  var bomb2 = bomb.slice();
  bomb2[1] = '......RR.......';
  bomb2[2] = '.....RYYR......';
  define('bomb1', bomb, 'bomb');
  define('bomb2', bomb2, 'bomb');

  /* ============================================================
     火焰(中心/横/纵)
     ============================================================ */
  function flameCenter() {
    var rows = [];
    for (var i = 0; i < 16; i++) {
      var r = [];
      for (var j = 0; j < 16; j++) {
        var dx = Math.abs(j - 7.5), dy = Math.abs(i - 7.5);
        var d = Math.max(dx, dy);
        r.push(d > 7 ? '.' : d > 5 ? 'O' : d > 3 ? 'Y' : d > 1 ? 'W' : 'W');
      }
      rows.push(r.join(''));
    }
    return rows;
  }
  function flameArm() {   // 横臂(水平)
    var rows = [];
    for (var i = 0; i < 16; i++) {
      var r = [];
      for (var j = 0; j < 16; j++) {
        var dy = Math.abs(i - 7.5);
        var d = Math.max(dy, 0);
        r.push(j < 3 ? '.' : d > 7 ? '.' : d > 5 ? 'O' : d > 3 ? 'Y' : d > 1 ? 'W' : 'W');
      }
      rows.push(r.join(''));
    }
    return rows;
  }
  function rotate90(rows) {
    var out = [];
    for (var x = 0; x < rows[0].length; x++) {
      var r = '';
      for (var y = rows.length - 1; y >= 0; y--) r += rows[y][x];
      out.push(r);
    }
    return out;
  }
  define('flame_c', flameCenter(), 'flame');
  define('flame_h', flameArm(), 'flame');
  define('flame_v', rotate90(flameArm()), 'flame');

  /* ============================================================
     道具 14x14
     ============================================================ */
  define('item_bomb', [
    '..............',
    '....KKKKKK....',
    '...KKKKKKKK...',
    '...KKKKKKKK...',
    '...KKKKKKKK...',
    '...KKKKKKKK...',
    '...KKKKKKKK...',
    '...KKKKKKKK...',
    '....KKKKKK....',
    '......RR......',
    '......RR......',
    '..RRRRRRRRRR..',
    '..RRRRRRRRRR..',
    '..............'
  ], 'item');

  define('item_range', [
    '..............',
    '....BBBBBB....',
    '...BBBBBBBB...',
    '...BBBBBBBB...',
    '...BBBBBBBB...',
    '...BBBBBBBB...',
    '...BBBBBBBB...',
    '...BBBBBBBB...',
    '....BBBBBB....',
    '....BBBBBB....',
    '...BBBBBBBB...',
    '..BBBBBBBBBB..',
    '.BBBBBBBBBBBB.',
    '..............'
  ], 'item');

  define('item_speed', [
    '..............',
    '......GG......',
    '.....GGGG.....',
    '....GGGGGG....',
    '...GGGGGGGG...',
    '..GGGGGGGGGG..',
    '..GGGGGGGGGG..',
    '..GGGGGGGGGG..',
    '..GGGGGGGGGG..',
    '...GGGGGGGG...',
    '....GGGGGG....',
    '.....GGGG.....',
    '......GG......',
    '..............'
  ], 'item');

  global.BomberSprites = { get: get };
})(typeof window !== 'undefined' ? window : globalThis);
