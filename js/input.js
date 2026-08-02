// input.js — 把键盘与触摸按钮统一成一份输入状态
(function (global) {
  'use strict';

  // 暴露给游戏的最终输入状态
  var actions = {
    dir: 0,          // -1 左 / 0 / +1 右
    jump: false,     // 跳跃键按住
    run:  false,     // 加速键按住
    jumpTap: false,  // 本帧“刚刚按下跳跃”的边沿触发
    up: false,       // 上(坦克大战等)
    down: false,     // 下
    fire: false,     // 射击按住
    anyKey: false    // 本帧有任意输入(用于标题/继续)
  };

  var key = { left:false, right:false, jump:false, accel:false, up:false, down:false, fire:false };
  var touch = { left:false, right:false, jump:false, run:false, up:false, down:false, fire:false };

  var init = false;

  function initAll() {
    if (init) return;
    init = true;

    // 触摸按钮显示兜底:部分手机浏览器(微信内置/老 WebView)匹配不上 pointer:coarse
    if (navigator.maxTouchPoints > 0 || 'ontouchstart' in window) {
      var touchUI = document.getElementById('touch');
      if (touchUI) touchUI.style.display = 'block';
    }

    // ---- 键盘 ----
    document.addEventListener('keydown', function (e) {
      var r = true;
      switch (e.code) {
        case 'ArrowLeft':  case 'KeyA': key.left = true; break;
        case 'ArrowRight': case 'KeyD': key.right = true; break;
        case 'ArrowUp': case 'KeyW': case 'Space': case 'KeyZ':
          if (!key.jump) actions.jumpTap = true;
          key.jump = true;
          key.up = true;     // 坦克大战的上方向
          key.fire = true;   // 空格/Z 也当射击(坦克)
          break;
        case 'ArrowDown': case 'KeyS': key.down = true; break;
        case 'KeyJ': case 'Enter': key.fire = true; break;
        case 'ShiftLeft': case 'ShiftRight': case 'KeyX': key.accel = true; break;
        default: r = false;
      }
      if (r) {
        actions.anyKey = true;
        e.preventDefault();
      }
      // 标题画面任意键
      if (e.code === 'Enter' || e.code === 'KeyR') { actions.anyKey = true; r = true; e.preventDefault(); }
    });
    document.addEventListener('keyup', function (e) {
      switch (e.code) {
        case 'ArrowLeft':  case 'KeyA': key.left = false; break;
        case 'ArrowRight': case 'KeyD': key.right = false; break;
        case 'ArrowUp': case 'KeyW': case 'Space': case 'KeyZ':
          key.jump = false; key.up = false; key.fire = false; break;
        case 'ArrowDown': case 'KeyS': key.down = false; break;
        case 'KeyJ': case 'Enter': key.fire = false; break;
        case 'ShiftLeft': case 'ShiftRight': case 'KeyX': key.accel = false; break;
      }
    });

    // 阻止页面滚动
    // (按键在<body>不滚动;这里是兜底)
    window.addEventListener('keydown', function (e) {
      if (['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].indexOf(e.code) >= 0) {
        e.preventDefault();
      }
    }, { passive: false });

    // ---- 触摸按钮 ----
    var btns = document.querySelectorAll('.tbtn');
    btns.forEach(function (btn) {
      var set = function (on) {
        var k = btn.getAttribute('data-key');
        btn.classList.toggle('pressed', on);
        if (k === 'left')  touch.left = on;
        if (k === 'right') touch.right = on;
        if (k === 'up')    touch.up = on;
        if (k === 'down')  touch.down = on;
        if (k === 'fire')  touch.fire = on;
        if (k === 'jump') {
          if (on && !touch.jump) actions.jumpTap = true;
          touch.jump = on;
        }
        if (k === 'run')   touch.run = on;
        if (on) actions.anyKey = true;
      };
      btn.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        try { btn.setPointerCapture(e.pointerId); } catch (err) {}
        set(true);
      });
      btn.addEventListener('pointerup',        function (e) { set(false); });
      btn.addEventListener('pointercancel',    function (e) { set(false); });
      btn.addEventListener('lostpointercapture', function (e) { set(false); });
      btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    });

    document.addEventListener('touchmove', function (e) {
      if (e.target === document.getElementById('stage') ||
          e.target === document.getElementById('game')) e.preventDefault();
    }, { passive: false });
  }

  // 每帧开头调用:合并键盘+触摸到 actions
  function sync() {
    actions.dir = (key.left || touch.left ? -1 : 0) + (key.right || touch.right ? 1 : 0);
    actions.jump = !!(key.jump || touch.jump);
    actions.run  = !!(key.accel || touch.run);
    actions.up   = !!(key.up || touch.up);
    actions.down = !!(key.down || touch.down);
    actions.fire = !!(key.fire || touch.fire);
  }

  function endFrame() {
    actions.jumpTap = false;
    actions.anyKey = false;
  }

  global.Input = {
    init: initAll,
    sync: sync,
    endFrame: endFrame,
    get actions() { return actions; }
  };
})(typeof window !== 'undefined' ? window : globalThis);