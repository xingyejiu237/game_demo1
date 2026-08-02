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
require('../games/mario/js/levels/w1-1.js');

var L = new global.Level(LEVEL_1_1);
var problems = 0;
function bad(msg) { problems++; console.log('  !! ' + msg); }

console.log('size:', L.w, 'x', L.h);

// 1) 行长
LEVEL_1_1.rows.forEach(function (r, i) {
  if (r.length !== L.w) bad('row ' + i + ' 长度 ' + r.length + ' != ' + L.w);
});

// 2) 特殊块 vs 实际格子
LEVEL_1_1.special.forEach(function (s) {
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
console.log('旗杆列:', JSON.stringify(flagCols), 'flagX=', LEVEL_1_1.flagX);

// 5) 城堡列
var castleCols = {};
for (var cy = 0; cy < L.h; cy++) for (var cx = 0; cx < L.w; cx++) {
  if (L.cellChar(cx, cy) === 'C') castleCols[cx] = (castleCols[cx] || 0) + 1;
}
console.log('城堡列:', JSON.stringify(castleCols), 'castleX=', LEVEL_1_1.castleX);

// 6) 坑位与旗杆落点(地面顶在第 11 行)
var pits = [];
for (var px = 0; px < L.w; px++) {
  if (L.cellChar(px, 11) === '.' && L.cellChar(px, 12) === '.') pits.push(px);
}
console.log('坑位(第11/12行均空):', pits.join(','));
for (var fx2 = LEVEL_1_1.flagX - 2; fx2 <= LEVEL_1_1.flagX + 3; fx2++) {
  if (L.cellChar(fx2, 11) !== 'G' || L.cellChar(fx2, 12) !== 'G') {
    bad('旗杆落点 x=' + fx2 + ' 下方无地面');
  }
}

console.log(problems ? '发现问题 ' + problems + ' 处' : '数据检查通过');
process.exit(problems ? 1 : 0);
