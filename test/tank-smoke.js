// tank-smoke.js — 钢铁前线(钢铁前线)冒烟测试
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

require('../games/tank/js/sprites.js');
require('../js/audio.js');
require('../js/input.js');
require('../games/tank/js/main.js');

var TG = global.TankGame;
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
  TG._step(1 / 60);   // TITLE → PLAY
  act.anyKey = false;
}

console.log('[T] 钢铁前线冒烟测试');
reset();
check('进入 PLAY', TG._state() === 'PLAY');

// 玩家位置记录(出生点中央,基地正上方一行)
var p0 = TG._player();
var px0 = p0.x, py0 = p0.y;
check('玩家出生在基地上方', py0 === 11 * 16 + 1);

// 开火(出生点头顶是空地,子弹能正常飞出)
act.fire = true;
TG._step(1 / 60);
TG._step(1 / 60);
act.fire = false;
check('子弹出现', TG._bullets().length > 0);

// 连发:按住射击 120 帧(冷却 16 帧/发),应打出多颗子弹
var shotFrames = 0;
act.fire = true;
for (var fi = 0; fi < 120; fi++) { TG._step(1 / 60); if (TG._bullets().length > 0) shotFrames++; }
act.fire = false;
check('按住射击可连发(shotFrames=' + shotFrames + ')', shotFrames >= 10);

// 向上移动(子弹已开路,砖会被打碎)
act.up = true;
for (var i = 0; i < 40; i++) TG._step(1 / 60);
var moved = TG._player();
check('玩家向上移动', moved.y < py0);

// 单元测试:头顶放一块砖,坦克必须被挡住无法进入
var p3 = TG._player();
var mapArr = TG._map();
mapArr[10][6] = 'B';           // 玩家正上方一格放砖
p3.x = 97; p3.y = 11 * 16 + 1; // 放回出生点
p3.alive = true; p3.dir = 0; p3.fireCd = 99;   // 禁止开火
var y3 = p3.y;
act.up = true;
for (var k = 0; k < 30; k++) TG._step(1 / 60);
act.up = false;
check('坦克不能进入砖格', TG._player().y === y3);
mapArr[10][6] = '.';           // 还原

// 敌人刷新(3 秒后应有敌人)
for (var k = 0; k < 240; k++) TG._step(1 / 60);
check('敌人生成', TG._enemies().length > 0);
check('敌人不超过 3 个', TG._enemies().length <= 3);

// 敌人会开火(冷却 1 秒+35% 概率,1800 帧内应打出子弹)
var enemyShots = 0;
TG._bullets().length = 0;
for (var ks = 0; ks < 1800; ks++) {
  TG._step(1 / 60);
  var bs = TG._bullets();
  for (var bi = 0; bi < bs.length; bi++) if (!bs[bi].owner.isPlayer) enemyShots++;
}
check('敌人会开火(enemyShots=' + enemyShots + ')', enemyShots > 0);

// 长时间运行不崩(5000 帧 ≈ 83 秒,可能经历死亡回标题等完整流程)
for (var m = 0; m < 5000; m++) TG._step(1 / 60);
check('长时间运行状态正常', ['PLAY', 'OVER', 'CLEAR', 'TITLE'].indexOf(TG._state()) >= 0);

// 基地存在性:地图含 F
var hasBase = false;
TG._map().forEach(function (row) { if (row.indexOf('F') >= 0) hasBase = true; });
check('地图含基地', hasBase);

if (failures.length) {
  console.error('FAILURES:', failures.join('; '));
  process.exit(1);
}
console.log('TANK SMOKE TEST PASS');
process.exit(0);
