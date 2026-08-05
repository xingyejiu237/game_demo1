// check-level.js — 关卡数据完整性检查(与渲染/碰撞无关的纯数据检查)
'use strict';

global.window = global;
global.document = {
  getElementById: function () { return makeCanvas(); },
  querySelectorAll: function () { return []; },
  addEventListener: function () {}
};
global.addEventListener = function () {};

function makeCtx() {
  return new Proxy({}, {
    get: function (t, k) {
      if (k === 'createImageData') return function (w, h) {
        return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
      };
      return function () {};
    },
    set: function () { return true; }
  });
}
function makeCanvas() {
  return {
    width: 256, height: 240,
    getContext: function () { return makeCtx(); },
    addEventListener: function () {}
  };
}

require('../games/mario/js/sprites.js');
require('../games/mario/js/level.js');

var LEVEL_NAMES = ['w1-1', 'w1-2', 'w1-3', 'w1-4'];
var GLOBALS = LEVEL_NAMES.map(function (n) {
  require('../games/mario/js/levels/' + n + '.js');
  return globalThis['LEVEL_' + n.replace('w', '').replace('-', '_')];
});

var problems = 0;
function bad(m) { problems++; console.log('  !! ' + m); }

GLOBALS.forEach(function (data) {
  var L = new global.Level(data);
  var tag = L.w + 'x' + L.h + ' flagX=' + data.flagX + ' castleX=' + data.castleX +
            ' enemies=' + data.enemies.length + ' specials=' + data.special.length;
  console.log('== ' + tag + ' ==');

  // 1) 行长
  data.rows.forEach(function (r, i) {
    if (r.length !== L.w) bad('row ' + i + ' 长度 ' + r.length + ' != ' + L.w);
  });

  // 2) 特殊块 vs 实际格子
  data.special.forEach(function (s) {
    var ch = L.cellChar(s.x, s.y);
    if (s.tile === 'h') {
      if (ch !== '.') bad('隐藏块 (' + s.x + ',' + s.y + ') 格子内容=' + JSON.stringify(ch) + ' 应为空');
    } else if (s.tile === '?' && ch !== '?') {
      bad('特殊块 ? (' + s.x + ',' + s.y + ') 格子内容=' + JSON.stringify(ch) + ' -> 隐形固体块!');
    } else if (s.tile === 'b' && ch !== 'B') {
      bad('特殊块 B (' + s.x + ',' + s.y + ') 格子内容=' + JSON.stringify(ch) + ' -> 隐形固体块!');
    }
  });

  // 3) 管道 T/P 配对
  for (var y = 0; y < L.h; y++) for (var x = 0; x < L.w; x++) {
    var c = L.cellChar(x, y);
    if (c === 'T') { var below = L.cellChar(x, y + 1); if (below !== 'P') bad('管道顶 T(' + x + ',' + y + ') 下方=' + JSON.stringify(below)); }
    if (c === 'P') { var above = L.cellChar(x, y - 1); if (above !== 'T' && above !== 'P') bad('管道身 P(' + x + ',' + y + ') 上方=' + JSON.stringify(above)); }
  }

  // 4) 旗杆列
  var flagCols = {};
  for (var fy = 0; fy < L.h; fy++) for (var fx = 0; fx < L.w; fx++) {
    var fc = L.cellChar(fx, fy);
    if (fc === 'F' || fc === 'f') flagCols[fx] = (flagCols[fx] || 0) + 1;
  }
  var flagOk = Object.keys(flagCols).length === 1 && flagCols[data.flagX] > 0;
  if (!flagOk) bad('旗杆列异常: ' + JSON.stringify(flagCols));

  // 5) 城堡列:应为连续块且包含 castleX
  var castleCols = {};
  for (var cy = 0; cy < L.h; cy++) for (var cx = 0; cx < L.w; cx++) {
    if (L.cellChar(cx, cy) === 'C') castleCols[cx] = (castleCols[cx] || 0) + 1;
  }
  var castleXs = Object.keys(castleCols).map(Number).sort(function (a, b) { return a - b; });
  if (!castleXs.length || castleXs.indexOf(data.castleX) < 0) {
    bad('城堡列异常(无 C 标记或未含 castleX): ' + JSON.stringify(castleCols));
  } else {
    for (var cc = 1; cc < castleXs.length; cc++) {
      if (castleXs[cc] !== castleXs[cc - 1] + 1) bad('城堡列不连续: ' + JSON.stringify(castleCols));
    }
  }

  // 6) 坑位与旗杆落点(地面顶在第 11 行)
  var pits = [];
  for (var px = 0; px < L.w; px++) {
    if (L.cellChar(px, 11) === '.' && L.cellChar(px, 12) === '.') pits.push(px);
  }
  if (pits.length) console.log('  坑位(第11/12行均空): ' + pits.join(','));
  for (var fx2 = data.flagX - 2; fx2 <= data.flagX + 3; fx2++) {
    if (L.cellChar(fx2, 11) !== 'G' || L.cellChar(fx2, 12) !== 'G') {
      bad('旗杆落点 x=' + fx2 + ' 下方无地面');
    }
  }

  // 7) 出生点(tile 6)附近不得有敌人:过近会出生即死(1-3 曾把板栗仔放在 tile6)
  data.enemies.forEach(function (e) {
    if (e.x < 8) bad('出生点附近有敌人 x=' + e.x + '(应 >= 8)');
  });
});

console.log(problems ? '发现问题 ' + problems + ' 处' : '全部 ' + GLOBALS.length + ' 关数据检查通过');
process.exit(problems ? 1 : 0);
