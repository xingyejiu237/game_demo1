// entities.js — 玩家 / 敌人 / 道具 / 火球 / 粒子 实体系统
(function (global) {
  'use strict';

  var GRAV = 0.5;          // 下落重力
  var JUMP = 6.5;          // 起跳初速
  var MAXFALL = 6.0;
  var WALK = 1.5, RUN = 3.0;
  var ACCW = 0.14, ACCR = 0.22, FRIC = 0.1;

  var Game = null;         // main 注入

  function setGame(g) { Game = g; }

  // =========================================================
  // 通用实体
  // =========================================================
  function Actor(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.vx = 0; this.vy = 0;
    this.onGround = false;
    this.dead = false;
    this.timer = 0;
    this.face = 1;         // 1 右 / -1 左
    this.animT = 0;
    this.type = 'actor';
  }

  Actor.prototype.collidesWith = function (o) {
    return this.x < o.x + o.w && this.x + this.w > o.x &&
           this.y < o.y + o.h && this.y + this.h > o.y;
  };

  // 与瓦片碰撞:分别按 X / Y 轴移动
  Actor.prototype.moveX = function () {
    var lv = Game.level;
    this.x += this.vx;
    var ty0 = lv.rowAt(this.y), ty1 = lv.rowAt(this.y + this.h - 1);
    if (this.vx > 0) {
      var tx = Math.floor((this.x + this.w) / 16);
      for (var t = ty0; t <= ty1; t++) {
        if (lv.isSolid(tx, t)) { this.x = tx * 16 - this.w - 0.01; this.vx = 0; break; }
      }
    } else if (this.vx < 0) {
      var tx2 = Math.floor(this.x / 16);
      for (var t2 = ty0; t2 <= ty1; t2++) {
        if (lv.isSolid(tx2, t2)) { this.x = (tx2 + 1) * 16 + 0.01; this.vx = 0; break; }
      }
    }
  };

  Actor.prototype.moveY = function () {
    var lv = Game.level;
    this.y += this.vy;
    var tx0 = Math.floor(this.x / 16), tx1 = Math.floor((this.x + this.w) / 16);
    if (this.vy > 0) {
      var ty = lv.rowAt(this.y + this.h);
      for (var t = tx0; t <= tx1; t++) {
        if (lv.isSolid(t, ty)) {
          this.y = ty * 16 + lv.oy - this.h - 0.01;
          this.vy = 0; this.onGround = true;
          break;
        }
      }
    } else if (this.vy < 0) {
      var ty2 = lv.rowAt(this.y);
      for (var t2 = tx0; t2 <= tx1; t2++) {
        if (lv.isSolid(t2, ty2)) {
          this.y = (ty2 + 1) * 16 + lv.oy + 0.01;
          this.vy = 0;
          this.onGround = false;
          break;
        }
      }
    }
  };

  Actor.prototype.applyGravity = function () {
    if (!this.onGround) {
      this.vy = Math.min(this.vy + GRAV, MAXFALL);
    }
  };

  // =========================================================
  // 玩家
  // =========================================================
  function Player() {
    Actor.call(this, 8 * 16, 10 * 16, 13, 16);
    this.type = 'player';
    this.state = 0;          // 0小 1大 2火
    this.score = 0;
    this.coins = 0;
    this.lives = 3;
    this.world = '1-1';
    this.time = 400;
    this.skid = false;
    this.jumpHeld = false;
    this.invincible = 0;     // 被击中后的无敌时间
    this.starPower = 0;      // 无敌星时间
    this.deathTimer = 0;
    this.dead = false;
    this.growAnim = 0;       // 变身动画计时
    this.fireCooldown = 0;
    this.runTap = false;
    this.flagMode = 0;       // 0无 1滑杆 2跑向城堡 3结束
    this.slideY = 0;
    this.anim = 0;           // 走路帧计时
    this.lastJump = false;
  }
  Player.prototype = Object.create(Actor.prototype);
  Player.prototype.constructor = Player;

  Object.defineProperty(Player.prototype, 'isBig', {
    get: function () { return this.state > 0; }
  });

  Player.prototype.height = function () {
    return this.isBig ? 31 : 16;
  };

  Player.prototype.update = function (dt, input) {
    if (this.dead) { this.updateDead(dt); return; }
    if (this.flagMode) { this.updateFlag(dt); return; }

    var accel = input.run ? ACCR : ACCW;
    var top = input.run ? RUN : WALK;

    if (input.dir !== 0) {
      this.face = input.dir;
      var target = input.dir * top;
      if (this.vx * input.dir < 0) {
        this.skid = true;          // 急转打滑
      } else this.skid = false;
      this.vx += input.dir * accel;
      if (input.dir > 0 && this.vx > target) this.vx = target;
      if (input.dir < 0 && this.vx < target) this.vx = target;
    } else {
      this.skid = false;
      if (this.vx > 0) this.vx = Math.max(0, this.vx - FRIC);
      else if (this.vx < 0) this.vx = Math.min(0, this.vx + FRIC);
    }

    // 跳跃(可变高度)
    if (input.jumpTap && this.onGround) {
      this.vy = -JUMP;
      this.onGround = false;
      Game.sfx('jump');
    }
    if (this.vy < 0) {
      this.vy += input.jump ? 0.30 : 0.9;   // 按住跳得更高(与原版一致,可越过 4 格高管道)
    } else {
      this.vy = Math.min(this.vy + GRAV, MAXFALL);
    }

    this.animT += Math.abs(this.vx) * 0.5;
    if (this.animT > 8) this.animT = 0;

    // 记录移动前的底部(用于判定"踩到"而非"撞到")
    this._prevBottom = this.y + this.h;

    // 移动 + 碰撞
    this.moveX();
    this.onGround = false;
    this.moveYHead();
    this.moveYFeet();

    // 火球
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    if (input.runTap && this.state >= 2 && this.fireCooldown <= 0) {
      this.fireCooldown = 0.4;
      Game.spawnFireball(this);
      Game.sfx('fire');
    }

    // 计时器
    if (this.invincible > 0) this.invincible -= dt;
    if (this.starPower > 0) this.starPower -= dt;

    // 掉出世界(屏幕底部在 h*16+oy)
    if (this.y > Game.level.h * 16 + Game.level.oy + 8) this.die(false);
  };

  Player.prototype.moveX = function () {
    var lv = Game.level;
    // 原版手感:站在地面时允许自动走上 1 格高的台阶
    // (用 face 而非 vx:撞上台阶的瞬间 vx 已被清零,用 vx 会永远错过触发)
    if (this.face !== 0 && this.onGround) {
      // 向右用 ceil:撞墙吸附点(x+w 距台阶列 0.01px)也能识别到正前方的 1 格台阶
      var ax = this.face > 0 ? Math.ceil((this.x + this.w) / 16) : Math.floor(this.x / 16);
      var fr = lv.rowAt(this.y + this.h + 0.01);
      if (lv.isSolid(ax, fr) && lv.isSolid(ax, fr - 1) && !lv.isSolid(ax, fr - 2)) {
        this.y = (fr - 1) * 16 + lv.oy - this.h;
      }
    }
    Actor.prototype.moveX.call(this);
  };

  Player.prototype.moveYHead = function () {
    var lv = Game.level;
    if (this.vy < 0) {
      this.y += this.vy;
      var tx0 = Math.floor(this.x / 16), tx1 = Math.floor((this.x + this.w) / 16);
      var ty = lv.rowAt(this.y);
      for (var t = tx0; t <= tx1; t++) {
        if (lv.isSolid(t, ty)) {
          this.y = (ty + 1) * 16 + lv.oy + 0.01;
          this.vy = 0;
          this.bumpBlocks(t, ty);
          break;
        }
      }
    }
  };

  Player.prototype.moveYFeet = function () {
    var lv = Game.level;
    if (this.vy > 0) {
      this.y += this.vy;
      var tx0 = Math.floor(this.x / 16), tx1 = Math.floor((this.x + this.w) / 16);
      var ty = lv.rowAt(this.y + this.h);
      for (var t = tx0; t <= tx1; t++) {
        if (lv.isSolid(t, ty)) {
          this.y = ty * 16 + lv.oy - this.h - 0.01;
          this.vy = 0;
          this.onGround = true;
          break;
        }
      }
    }
  };

  // 顶砖
  Player.prototype.bumpBlocks = function (tx, ty) {
    var lv = Game.level;
    var t = lv.tile(tx, ty);
    if (t === TILE.QUESTION) {
      Game.activateBlock(tx, ty);
    } else if (t === TILE.BRICK) {
      var sp = lv.getSpecial(tx, ty);
      if (sp && (sp.kind === '10coins' || sp.kind === 'star')) {
        Game.activateBlock(tx, ty);   // 金币砖/星星砖:小马里奥顶一下也能出
      } else if (this.isBig) {
        Game.smashBrick(tx, ty);
      } else {
        Game.bumpBlock(tx, ty);
      }
    } else if (t === TILE.HARD || t === TILE.USED || t === TILE.PIPE_TOP || t === TILE.PIPE_BODY) {
      Game.bumpBlock(tx, ty);
    } else if (lv.getSpecial(tx, ty)) {
      // 隐藏块
      Game.activateBlock(tx, ty);
    }
  };

  // 受到伤害
  Player.prototype.hurt = function () {
    if (this.starPower > 0 || this.invincible > 0) return;
    if (this.isBig) {
      this.state = 0;
      this.h = 16;
      this.y += 15;
      this.invincible = 1.5;
      Game.sfx('shrink');
    } else {
      this.die(false);
    }
  };

  Player.prototype.die = function (stomp) {
    if (this.dead) return;
    this.dead = true;
    this.deathTimer = 0;
    if (!stomp) {
      this.vy = -8;
      this.y -= 4;
      Game.sfx('die');
    } else {
      this.vy = -10;
      Game.sfx('stomp');
    }
    Game.onPlayerDeath();
  };

  Player.prototype.updateDead = function (dt) {
    this.deathTimer += dt;
    this.vy = Math.min(this.vy + GRAV, MAXFALL);
    this.y += this.vy;
  };

  // 旗杆流程
  Player.prototype.startFlag = function () {
    this.flagMode = 1;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.slideY = Math.max(0, this.y - 36);   // 从触杆高度开始滑,不瞬移到杆顶
    Game.flagStart();
  };

  Player.prototype.updateFlag = function (dt) {
    if (this.flagMode === 1) {
      // 锁定在杆上,滑落
      var poleX = Game.level.flagX * 16 + 1;
      this.x = poleX - this.w / 2 - 2;
      this.slideY = Math.min(this.slideY + 3.2, Game.level.groundTopY() - 36);
      this.y = 36 + this.slideY;
      Game.flagFallY = this.y - 8;
      if (this.slideY >= 116) {
        this.flagMode = 2;
        Game.flagLanded();
      }
    } else if (this.flagMode === 2) {
      // 走进城堡(贴地走:底部对齐地面顶)
      this.face = 1;
      this.vx = 1.2;
      this.x += this.vx;
      this.y = Game.level.groundTopY() - this.h;
      if (this.x > Game.level.castleX * 16 + 8) {
        this.flagMode = 3;
        Game.flagDone();
      }
    }
  };

  // 渲染
  Player.prototype.render = function (ctx, camX) {
    var Sp = global.Sprites;
    var drawX = this.x - camX | 0;
    var drawY = this.y | 0;

    // 无敌闪烁
    if (this.invincible > 0 && Math.floor(this.invincible * 20) % 2 === 0) return;

    var set = this.isBig ? 'big' : 'small';
    var fset = this.state === 2 ? 'fire' : 'normal';
    var name;
    if (this.dead) {
      name = 'small_jump';
    } else if (this.flagMode === 1) {
      name = 'small_jump';
    } else if (!this.onGround) {
      name = set + '_jump';
    } else if (this.skid) {
      name = set + '_skid';
    } else if (Math.abs(this.vx) > 0.3) {
      var ph = Math.floor(this.animT / 4) % 3;
      name = set + (ph === 1 ? '_walk1' : ph === 2 ? '_walk2' : '_stand');
    } else {
      name = set + '_stand';
    }
    if (fset === 'fire') name = set + 'f_' + name.split('_').slice(1).join('_');

    var spr = Sp.get(name);
    ctx.save();
    var fx = drawX;
    if (this.face < 0) { ctx.scale(-1, 1); fx = -fx - spr.width; }
    if (this.dead) {
      ctx.translate(fx + spr.width / 2, drawY + spr.height / 2);
      ctx.scale(1, -1);
      ctx.drawImage(spr, -spr.width / 2, -spr.height / 2);
    } else {
      ctx.drawImage(spr, fx, drawY);
    }
    ctx.restore();
  };

  // =========================================================
  // 敌人
  // =========================================================
  function Goomba(x, y) {
    Actor.call(this, x * 16 + 2, y * 16 - 16 + 2, 12, 14);
    this.type = 'goomba';
    this.face = -1;
    this.squash = 0;
  }
  Goomba.prototype = Object.create(Actor.prototype);

  Goomba.prototype.update = function (dt, game) {
    if (this.squash > 0) {
      this.squash -= dt;
      if (this.squash <= 0) this.dead = true;   // 被踩扁后消失,不复活
      return;
    }
    this.animT += dt;
    this.applyGravity();
    this.vx = this.face * 0.7;
    this.moveX();
    this.moveY();
    if (this.onGround) {
      // 转向:撞墙时
      var lv = game.level;
      var aheadX = this.face > 0 ? this.x + this.w + 1 : this.x - 1;
      var ty = lv.rowAt(this.y + this.h + 1);
      if (lv.isSolid(Math.floor(aheadX / 16), ty)) this.face = -this.face;
    }
    if (this.y > game.level.h * 16 + game.level.oy + 16) this.dead = true;
  };

  Goomba.prototype.render = function (ctx, camX) {
    var Sp = global.Sprites;
    var spr;
    if (this.squash > 0) spr = 'goomba_squash';
    else spr = (Math.floor(this.animT * 10) % 2 === 0) ? 'goomba1' : 'goomba2';
    var img = Sp.get(spr);
    ctx.drawImage(img, (this.x - camX) | 0, this.y | 0);
  };

  function Koopa(x, y) {
    Actor.call(this, x * 16 + 2, y * 16 - 24 + 2, 12, 22);
    this.type = 'koopa';
    this.face = -1;
    this.shell = false;     // 壳状态
    this.shellSpeed = 0;    // 壳滑动速度(0=静止壳)
    this.animT = 0;
  }
  Koopa.prototype = Object.create(Actor.prototype);

  Koopa.prototype.update = function (dt, game) {
    this.animT += dt;
    var lv = game.level;
    if (this.shell) {
      if (this.shellSpeed !== 0) {
        this.vx = this.shellSpeed;
      } else {
        this.vx = 0;
      }
      this.applyGravity();
      this.moveX();
      this.moveY();
      if (this.shellSpeed !== 0) {
        var ahead = this.shellSpeed > 0 ? this.x + this.w + 1 : this.x - 1;
        var ty = lv.rowAt(this.y + this.h);
        if (lv.isSolid(Math.floor(ahead / 16), ty)) {
          this.shellSpeed = -this.shellSpeed;
          game.sfx('bump');
        }
      }
      if (this.y > lv.h * 16 + lv.oy + 16) this.dead = true;
      return;
    }
    this.applyGravity();
    this.vx = this.face * 0.6;
    this.moveX();
    this.moveY();
    if (this.onGround) {
      var ty2 = lv.rowAt(this.y + this.h + 1);
      if (lv.isSolid(Math.floor((this.face > 0 ? this.x + this.w + 1 : this.x - 1) / 16), ty2)) {
        this.face = -this.face;
      }
    }
    if (this.y > lv.h * 16 + lv.oy + 16) this.dead = true;
  };

  Koopa.prototype.render = function (ctx, camX) {
    var Sp = global.Sprites;
    var spr;
    if (this.shell) spr = 'koopa_shell';
    else spr = (Math.floor(this.animT * 8) % 2 === 0) ? 'koopa1' : 'koopa2';
    var img = Sp.get(spr);
    ctx.drawImage(img, (this.x - camX) | 0, this.y | 0);
  };

  // =========================================================
  // 道具
  // =========================================================
  function Item(type, x, y, vy0) {
    Actor.call(this, x, y, 16, 16);
    this.type = 'item';
    this.itemType = type;        // mushroom / 1up / flower / star / coin
    this.rising = true;
    this.riseT = 0;
    this.vy = vy0 || 0;
  }
  Item.prototype = Object.create(Actor.prototype);

  Item.prototype.update = function (dt, game) {
    if (this.rising) {
      this.riseT += dt * 60;
      this.y -= 0.8;
      if (this.riseT >= 8) { this.rising = false; }
      return;
    }
    if (this.itemType === 'flower' || this.itemType === 'coin') {
      this.animT += dt;
      if (this.itemType === 'coin') {
        this.y -= 0.3;
        this.timer += dt;
        if (this.timer > 0.6) this.dead = true;
      }
      return;
    }
    this.applyGravity();
    if (this.itemType === 'star') {
      // 星星上下弹跳
      this.vx = 1.5;
      if (this.onGround) this.vy = -4.5;
    } else {
      this.vx = 1.2;
    }
    this.moveX();
    this.moveY();
    if (this.y > game.level.h * 16 + game.level.oy + 16) this.dead = true;
  };

  Item.prototype.render = function (ctx, camX) {
    var Sp = global.Sprites;
    var name = this.itemType === '1up' ? 'mushroom_1up'
             : this.itemType === 'star' ? 'star'
             : this.itemType === 'flower' ? 'flower'
             : this.itemType === 'coin' ? 'coin'
             : 'mushroom';
    var img = Sp.get(name);
    if (this.itemType === 'star' || this.itemType === 'coin') {
      if (Math.floor(this.animT * 8) % 2 === 1) img = Sp.get(name === 'star' ? 'star' : 'coin2');
    }
    ctx.drawImage(img, (this.x - camX) | 0, this.y | 0);
  };

  // =========================================================
  // 火球
  // =========================================================
  function Fireball(x, y, dir) {
    Actor.call(this, x, y, 10, 10);
    this.type = 'fireball';
    this.vx = dir * 4.5;
    this.vy = 0;
    this.animT = 0;
  }
  Fireball.prototype = Object.create(Actor.prototype);

  Fireball.prototype.update = function (dt, game) {
    this.animT += dt;
    this.vy += GRAV * 0.4;
    this.moveX();
    this.moveY();
    if (this.onGround) this.vy = -2.6;   // 弹跳
    if (this.y > game.level.h * 16 + game.level.oy + 16) this.dead = true;
  };

  Fireball.prototype.render = function (ctx, camX) {
    var img = global.Sprites.get('fireball');
    ctx.drawImage(img, (this.x - camX) | 0, this.y | 0);
  };

  // =========================================================
  // 碎片
  // =========================================================
  function Fragment(x, y, vx, vy) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.timer = 0.8;
    this.dead = false;
  }
  Fragment.prototype.update = function (dt, game) {
    this.vy += GRAV * 0.6;
    this.x += this.vx;
    this.y += this.vy;
    this.timer -= dt;
    if (this.timer <= 0) this.dead = true;
  };
  Fragment.prototype.render = function (ctx, camX) {
    ctx.fillStyle = '#c44a28';
    ctx.fillRect((this.x - camX) | 0, this.y | 0, 6, 6);
  };

  global.Entities = {
    Player: Player,
    Goomba: Goomba,
    Koopa: Koopa,
    Item: Item,
    Fireball: Fireball,
    Fragment: Fragment,
    Actor: Actor,
    setGame: setGame
  };
})(typeof window !== 'undefined' ? window : globalThis);