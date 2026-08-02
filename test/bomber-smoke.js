// bomber-smoke.js — 爆破小子(爆破小子)冒烟测试
'use strict';

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

global.window = global;
global.document = {
  getElementById: function () { return makeCanvas(); },
  querySelectorAll: function () { return []; },
  addEventListener: function () {}
};
global.addEventListener = function () {};
global.requestAnimationFrame = function () {};
global.performance = { now: function () { return 0; } };

require('../games/bomber/js/sprites.js');
require('../js/audio.js');
require('../js/input.js');
require('../games/bomber/js/main.js');

var BG = global.BomberGame;
var Input = global.Input;
Input.sync = function () {};
var act = Input.actions;

var failures = [];
function check(name, cond, extra) {
  if (cond) console.log('  PASS', name);
  else { console.error('  FAIL', name, extra || ''); failures.push(name); }
}

function reset() {
  act.anyKey = true;
  act.up = act.down = act.dir = act.fire = act.jump = act.run = false;
  BG._step(1 / 60);
  act.anyKey = false;
}

console.log('[B] 爆破小子冒烟测试');
reset();
check('进入 PLAY', BG._state() === 'PLAY');

var p = BG._player();
check('玩家出生在 (1,1) 格', p.x === 1 * 16 + 2 && p.y === 1 * 16 + 2);

// 放炸弹
act.fire = true;
BG._step(1 / 60);
act.fire = false;
check('放置炸弹', BG._bombs().length === 1);

// 放炸弹后玩家应能离开炸弹格(经典规则,炸弹不困住放置者)
var px1 = BG._player().x;
act.dir = 1;
for (var mv = 0; mv < 20; mv++) BG._step(1 / 60);
act.dir = 0;
check('放炸弹后可以移动', BG._player().x > px1);

// 炸弹爆炸(移动消耗了 20 帧,剩余约 130 帧引爆),爆炸瞬间有火焰
for (var i = 0; i < 140; i++) BG._step(1 / 60);
check('炸弹爆炸消失', BG._bombs().length === 0);
check('产生火焰', BG._flames().length > 0);
// 等火焰熄灭,避免干扰后续
for (var fw = 0; fw < 60; fw++) BG._step(1 / 60);

// 火焰会烧毁软砖(出生点右侧 (2,1) 若为软砖则被烧毁或已被清空)
// 玩家向右移动,位置应变化
var px0 = BG._player().x;
act.dir = 1;
for (var j = 0; j < 60; j++) BG._step(1 / 60);
act.dir = 0;
check('玩家可向右移动', BG._player().x > px0);

// 敌人存在
check('敌人生成', BG._enemies().length > 0);
check('敌人不超过 5 个', BG._enemies().length <= 5);

// 地图含软砖与硬砖
var m = BG._map();
var hasSoft = false, hasHard = false;
m.forEach(function (row) {
  if (row.indexOf('B') >= 0) hasSoft = true;
  if (row.indexOf('X') >= 0) hasHard = true;
});
check('地图含软砖', hasSoft);
check('地图含硬砖', hasHard);

// 长时间运行不崩;同时统计敌人放炸弹
var enemyBombs = 0;
for (var k = 0; k < 3000; k++) {
  BG._step(1 / 60);
  var bs2 = BG._bombs();
  for (var bi2 = 0; bi2 < bs2.length; bi2++) {
    if (bs2[bi2].owner === 'enemy') { enemyBombs++; break; }
  }
}
check('敌人会放炸弹(enemyBombs=' + enemyBombs + ')', enemyBombs > 0);
check('长时间运行状态正常', ['PLAY', 'OVER', 'CLEAR', 'TITLE'].indexOf(BG._state()) >= 0);

if (failures.length) {
  console.error('FAILURES:', failures.join('; '));
  process.exit(1);
}
console.log('BOMBER SMOKE TEST PASS');
process.exit(0);
