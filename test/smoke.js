// smoke.js — Node 冒烟测试
// A) 无敌星自动遍历:跑通整关并进入 CLEAR
// B) 单元测试:踩敌人/顶砖/隐藏1UP
'use strict';

function makeCtx() {
  return new Proxy({}, {
    get: function (t, k) {
      if (k === 'createImageData') return function (w, h) {
        return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
      };
      if (k === 'createLinearGradient') return function () {
        return { addColorStop: function () {} };
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
if (!global.AudioContext) global.AudioContext = undefined;

// localStorage 内存替身(在 require main.js 之前定义,main.js 加载时会读存档)
var _store = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(_store, k) ? _store[k] : null; },
  setItem: function (k, v) { _store[k] = String(v); },
  removeItem: function (k) { delete _store[k]; }
};

require('../games/mario/js/sprites.js');
require('../js/audio.js');
require('../js/input.js');
require('../games/mario/js/level.js');
require('../games/mario/js/levels/w1-1.js');
require('../games/mario/js/levels/w1-2.js');
require('../games/mario/js/levels/w1-3.js');
require('../games/mario/js/levels/w1-4.js');
require('../games/mario/js/entities.js');
require('../games/mario/js/main.js');

var Game = global.Game;
var Input = global.Input;
var Entities = global.Entities;
Input.sync = function () {};
var act = Input.actions;

var failures = [];
function check(name, cond, extra) {
  if (cond) console.log('  PASS', name);
  else { console.error('  FAIL', name, extra || ''); failures.push(name); }
}

// 重置到全新关卡(清空敌人,避免相互干扰);单元测试固定用第 1 关坐标
function resetGame() {
  Game.startAt(0);
  Game._enemies().length = 0;
  return Game._player();
}

// ============ A) 各关卡遍历测试 ============
console.log('[A] 各关卡全关遍历(无敌星)');
Game._boot();
act.anyKey = true;
Game._step(1 / 60);

function level() { return Game.level; }
function decideJump() {
  var p = Game._player();
  var lv = level();
  var tx = Math.floor((p.x + p.w + 6) / 16);
  var fr = lv.rowAt(p.y + p.h + 1);
  // 2 格以上高障碍(管道)或深坑 → 起跳
  var obs = lv.isSolid(tx, fr - 1) && lv.isSolid(tx, fr - 2);
  var ty = lv.rowAt(p.y + p.h + 2);
  var gap = !lv.isSolid(tx, ty) && !lv.isSolid(tx, ty + 1);
  return (obs || gap) && p.onGround;
}

function traverse(i) {
  Game.startAt(i);
  var p = Game._player();
  p.starPower = 999999;   // 清空敌人+无敌,专注验证布局可通行
  Game._enemies().length = 0;
  var maxX = 0, cleared = false, frames = 0;
  for (var f = 0; f < 30000; f++) {
    act.dir = 1;
    act.run = true;
    act.jump = true;       // 长按:跳得更高,足以跨 4 格坑
    act.jumpTap = false;
    if (decideJump()) act.jumpTap = true;
    Game._step(1 / 60);
    frames++;
    if (Game._state() === 'PLAY') maxX = Math.max(maxX, p.x);
    if (Game._state() === 'CLEAR') { cleared = true; break; }
    if (Game._state() === 'DEAD') break;
  }
  return { cleared: cleared, maxX: maxX, levelW: level().w * 16, frames: frames, score: p.score, time: p.time };
}

var results = [];
var LEVEL_COUNT = Game.levelCount();
for (var li = 0; li < LEVEL_COUNT; li++) {
  results[li] = traverse(li);
  var r = results[li];
  check('关卡 ' + (li + 1) + ' 到达旗杆(maxX=' + (r.maxX | 0) + '/' + r.levelW + ')', r.maxX >= r.levelW * 0.95);
  check('关卡 ' + (li + 1) + ' 进入 CLEAR', r.cleared);
  console.log('  关卡' + (li + 1) + ': maxX=' + (r.maxX | 0) + ' 帧数=' + r.frames + ' 分数=' + r.score);
}
var r0 = results[0];
if (r0.cleared) {
  check('过关时分数>0', r0.score > 0);
  check('时间奖励生效(time=' + r0.time + ')', r0.time < 400);
}

// ============ B) 单元测试 ============
console.log('[B] 交互单元测试');
var p;

// B1 踩板栗仔
p = resetGame();
var g = new Entities.Goomba(10, 11);
Game._enemies().push(g);
var scoreBefore = p.score;
p.x = 10 * 16 - 4; p.y = 11 * 16 - 40; p.vy = 2; p._prevBottom = p.y + p.h;
act.dir = 0; act.run = false; act.jump = false; act.jumpTap = false;
for (var i = 0; i < 60; i++) Game._step(1 / 60);
check('踩死板栗仔(dead=' + g.dead + ')', g.dead || g.squash > 0);
check('踩敌加分(score=' + p.score + ')', p.score > scoreBefore);

// B2 顶?块得金币
p = resetGame();
var lv = Game.level;
var qx = 16, qy = 7;   // 1-1 第一个 ? 块
var coinsBefore = p.coins;
p.x = qx * 16 - 4; p.y = (qy + 1) * 16 + 4 + 32; p.vy = -6;   // +32:关卡渲染偏移
Game._step(1 / 60); Game._step(1 / 60); Game._step(1 / 60);
check('顶?块变已使用(cell=' + lv.cellChar(qx, qy) + ')', lv.cellChar(qx, qy) === 'U');
check('?块金币入账(coins=' + p.coins + ')', p.coins > coinsBefore);

// B3 隐藏 1UP 块(64,6):顶出后要走到蘑菇上吃到
p = resetGame();
var lv = Game.level;
var hidX = 64, hidY = 6;
var livesBefore = p.lives;
p.x = hidX * 16 - 10; p.y = (hidY + 1) * 16 + 4 + 32; p.vy = -6;
act.dir = 0; act.run = false; act.jump = false; act.jumpTap = false;
Game._step(1 / 60); Game._step(1 / 60); Game._step(1 / 60);
check('隐藏块现身(cell=' + lv.cellChar(hidX, hidY) + ')', lv.cellChar(hidX, hidY) === 'U');
act.dir = 1;   // 追上掉下来的 1UP 蘑菇
for (var b3i = 0; b3i < 200 && p.lives === livesBefore; b3i++) Game._step(1 / 60);
check('吃到 1UP(lives=' + p.lives + ')', p.lives > livesBefore);

// B4 金币砖 10 连击(94,7)
p = resetGame();
var lv = Game.level;
var bX = 94, bY = 7;
p.x = bX * 16 - 4; p.y = (bY + 1) * 16 + 4 + 32; p.vy = -6;
coinsBefore = p.coins;
for (var j = 0; j < 90; j++) Game._step(1 / 60);
var coinGain = p.coins - coinsBefore;
check('10金币砖连喷(gain=' + coinGain + ')', coinGain >= 10);
check('10金币砖变已使用', lv.cellChar(bX, bY) === 'U');

// B5 大马里奥砸砖(19,7 是普通砖)
p = resetGame();
var lv = Game.level;
var brX = 19, brY = 7;
p.state = 1; p.h = 31; p.y -= 15;
p.x = brX * 16 - 4; p.y = (brY + 1) * 16 + 4 + 32; p.vy = -6;
Game._step(1 / 60); Game._step(1 / 60); Game._step(1 / 60);
check('大马里奥砸碎砖(cell=' + lv.cellChar(brX, brY) + ')', lv.cellChar(brX, brY) === '.');

// B6 踢壳
p = resetGame();
var k = new Entities.Koopa(30, 11);
Game._enemies().push(k);
k.shell = true; k.shellSpeed = 0; k.h = 16; k.y = 11 * 16 - 16 + 2 + 6;
var g2 = new Entities.Goomba(33, 11);
Game._enemies().push(g2);
p.x = 30 * 16 - 10; p.y = 11 * 16 + 16;   // 站在地面上,与壳同高度,从侧面走入
p.vx = 2;
act.dir = 1; act.run = false; act.jump = false; act.jumpTap = false;
for (var m = 0; m < 30; m++) Game._step(1 / 60);
check('踩静止壳→踢出(speed=' + k.shellSpeed + ')', k.shellSpeed !== 0);
check('飞壳撞死板栗仔', g2.dead);
check('起踢瞬间不伤玩家(dead=' + p.dead + ')', !p.dead);

// B7 踩行走的龟壳→只弹起,不自动踢出(原 bug:多帧重叠导致秒踢壳反杀)
p = resetGame();
var k2 = new Entities.Koopa(40, 11);
Game._enemies().push(k2);
p.x = 40 * 16 - 4; p.y = 11 * 16 - 40; p.vy = 2; p._prevBottom = p.y + p.h;
act.dir = 0; act.run = false; act.jump = false; act.jumpTap = false;
for (var m2 = 0; m2 < 60; m2++) Game._step(1 / 60);
check('踩行走龟→变壳且静止(speed=' + k2.shellSpeed + ')', k2.shell && k2.shellSpeed === 0);
check('踩行走龟→玩家存活(dead=' + p.dead + ')', !p.dead);

// B8 站在地面上的底部位置 = 地面顶(渲染偏移对齐)
p = resetGame();
act.dir = 0; act.run = false; act.jump = false; act.jumpTap = false;
for (var m3 = 0; m3 < 60; m3++) Game._step(1 / 60);
check('落地高度=地面顶(bottom=' + (p.y + p.h) + ')', Math.abs(p.y + p.h - Game.level.groundTopY()) < 1);

// ============ C) 存档系统 ============
console.log('[C] 存档系统(localStorage)');

// C1 最高分随得分更新,且不随低分下降
p = resetGame();
Game._save().highScore = 0;
p.score = 0;
var gC1 = new Entities.Goomba(10, 11);
Game._enemies().push(gC1);
p.x = 10 * 16 - 4; p.y = 11 * 16 - 40; p.vy = 2; p._prevBottom = p.y + p.h;
act.dir = 0; act.run = false; act.jump = false; act.jumpTap = false;
for (var c1 = 0; c1 < 60; c1++) Game._step(1 / 60);
check('踩敌后最高分同步(hi=' + Game._save().highScore + ')', Game._save().highScore >= 100);
Game._save().highScore = 99999;
p.score = 20;
Game._step(1 / 60);
check('最高分不随低分下降(hi=' + Game._save().highScore + ')', Game._save().highScore === 99999);

// C2 过关解锁下一关并推进
Game.startAt(0);
p = Game._player();
p.starPower = 999999;
Game._enemies().length = 0;
p.x = Game.level.flagX * 16; p.y = 8 * 16 + 32; p.vy = 0; p.onGround = true;
for (var c2 = 0; c2 < 1200 && Game._state() !== 'CLEAR'; c2++) {
  act.dir = 0; act.run = false; act.jump = false; act.jumpTap = false;
  Game._step(1 / 60);
}
check('进入 CLEAR', Game._state() === 'CLEAR');
for (var c3 = 0; c3 < 220; c3++) Game._step(1 / 60);   // 等 3s
act.anyKey = true; Game._step(1 / 60);
check('过关后解锁 1-2(unlocked=' + Game._save().unlocked + ')', Game._save().unlocked === 1);
check('推进到下一关(index=' + Game.levelIndex() + ')', Game.levelIndex() === 1);

if (failures.length) {
  console.error('FAILURES:', failures.join('; '));
  process.exit(1);
}
console.log('SMOKE TEST PASS');
process.exit(0);