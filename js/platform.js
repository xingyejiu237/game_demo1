// platform.js — 云想游戏厅平台壳:卡带墙主菜单 / 游戏注册表 / 生命周期
(function (global) {
  'use strict';

  // ---------- 卡带注册表 ----------
  // status: 'play' 可玩 / 'soon' 敬请期待
  var GAMES = [
    {
      id: 'mario', title: '蘑菇勇者', subtitle: '横版跳关 · 经典手感',
      url: 'games/mario/index.html', status: 'play', icon: 'mario'
    },
    {
      id: 'tank', title: '钢铁前线', subtitle: '坦克大战 · 轻量版',
      url: 'games/tank/index.html', status: 'play', icon: 'tank'
    },
    { id: 'soon1', title: '敬请期待', subtitle: '新卡带制作中…', status: 'soon' },
    { id: 'soon2', title: '敬请期待', subtitle: '新卡带制作中…', status: 'soon' }
  ];

  // ---------- 像素图标(纯代码绘制,原创) ----------
  // 马里奥风格小人:红帽+蓝裤(16x16 放大)
  function drawMarioIcon(c) {
    var s = 3, x0 = 2, y0 = 1;
    var px = [
      // 帽檐/帽顶(红)
      [4,0,1],[5,0,1],[6,0,1],[7,0,1],[8,0,1],[9,0,1],[10,0,1],
      [3,1,1],[4,1,1],[5,1,1],[6,1,1],[7,1,1],[8,1,1],[9,1,1],[10,1,1],[11,1,1],
      [3,2,1],[4,2,2],[5,2,2],[6,2,2],[7,2,2],[8,2,2],[9,2,2],[10,2,2],[11,2,1],
      [3,3,2],[4,3,3],[5,3,3],[6,3,3],[7,3,3],[8,3,3],[9,3,3],[10,3,3],[11,3,2],
      // 眼睛/脸
      [3,4,2],[4,4,3],[5,4,3],[6,4,4],[7,4,5],[8,4,3],[9,4,3],[10,4,3],[11,4,2],
      [3,5,2],[4,5,3],[5,5,3],[6,5,3],[7,5,3],[8,5,3],[9,5,3],[10,5,3],[11,5,2],
      [3,6,2],[4,6,3],[5,6,3],[6,6,1],[7,6,1],[8,6,1],[9,6,3],[10,6,3],[11,6,2],
      // 身体(蓝)
      [4,7,6],[5,7,6],[6,7,6],[7,7,6],[8,7,6],[9,7,6],[10,7,6],[11,7,6],
      [4,8,6],[5,8,6],[6,8,6],[7,8,6],[8,8,6],[9,8,6],[10,8,6],[11,8,6],
      [3,9,6],[4,9,1],[5,9,6],[6,9,6],[7,9,6],[8,9,6],[9,9,6],[10,9,1],[11,9,6],
      // 裤腿(蓝)与鞋(棕)
      [3,10,6],[4,10,6],[5,10,6],[6,10,7],[7,10,7],[8,10,6],[9,10,6],[10,10,6],[11,10,6],
      [3,11,6],[4,11,6],[5,11,6],[6,11,7],[7,11,7],[8,11,6],[9,11,6],[10,11,6],[11,11,6],
      [3,12,7],[4,12,7],[5,12,7],[6,12,7],[7,12,7],[8,12,7],[9,12,7],[10,12,7],[11,12,7]
    ];
    var COL = ['#000', '#e40000', '#f8b880', '#2838f8', '#000000', '#ffffff', '#2838f8', '#4a2a12'];
    c.fillStyle = 'rgba(255,255,255,0.06)';
    c.fillRect(0, 0, 16 * s, 16 * s);
    for (var i = 0; i < px.length; i++) {
      c.fillStyle = COL[px[i][2]];
      c.fillRect(x0 + px[i][0] * s, y0 + px[i][1] * s, s, s);
    }
  }

  // 坦克:车体+炮塔+履带(16x16 放大)
  function drawTankIcon(c) {
    var s = 3, x0 = 2, y0 = 2;
    var px = [
      [6,0,2],[7,0,2],[8,0,2],[9,0,2],            // 炮管
      [5,1,3],[6,1,3],[7,1,3],[8,1,3],[9,1,3],[10,1,3],
      [4,2,3],[5,2,3],[6,2,3],[7,2,4],[8,2,4],[9,2,3],[10,2,3],[11,2,3],  // 炮塔
      [3,3,3],[4,3,3],[5,3,3],[6,3,3],[7,3,3],[8,3,3],[9,3,3],[10,3,3],[11,3,3],[12,3,3],
      [3,4,3],[4,4,3],[5,4,3],[6,4,3],[7,4,3],[8,4,3],[9,4,3],[10,4,3],[11,4,3],[12,4,3],
      [2,5,5],[3,5,5],[4,5,5],[5,5,5],[6,5,5],[7,5,5],[8,5,5],[9,5,5],[10,5,5],[11,5,5],[12,5,5],[13,5,5]
    ];
    var COL = ['#000', '#3cb848', '#1e8a1e', '#4a4a4a', '#f4c878', '#222222'];
    c.fillStyle = 'rgba(255,255,255,0.06)';
    c.fillRect(0, 0, 16 * s, 16 * s);
    for (var i = 0; i < px.length; i++) {
      c.fillStyle = COL[px[i][2]];
      c.fillRect(x0 + px[i][0] * s, y0 + px[i][1] * s, s, s);
    }
  }

  // ---------- 渲染卡带墙 ----------
  function buildMenu() {
    var grid = document.getElementById('cart-grid');
    GAMES.forEach(function (g) {
      var card = document.createElement('button');
      card.className = 'cart ' + (g.status === 'soon' ? 'cart-soon' : 'cart-play');
      card.setAttribute('data-id', g.id);

      // 卡带齿(上缘)
      var teeth = document.createElement('span');
      teeth.className = 'cart-teeth';

      // 标签区:图标 + 文字
      var label = document.createElement('span');
      label.className = 'cart-label';

      var art = document.createElement('span');
      art.className = 'cart-art';
      if (g.icon) {
        var cv = document.createElement('canvas');
        cv.width = 64; cv.height = 64;
        if (g.icon === 'mario') drawMarioIcon(cv.getContext('2d'));
        if (g.icon === 'tank') drawTankIcon(cv.getContext('2d'));
        art.appendChild(cv);
      } else {
        var q = document.createElement('span');
        q.className = 'cart-question';
        q.textContent = '?';
        art.appendChild(q);
      }

      var info = document.createElement('span');
      info.className = 'cart-info';
      var t = document.createElement('b');
      t.textContent = g.title;
      var s = document.createElement('i');
      s.textContent = g.subtitle;
      info.appendChild(t); info.appendChild(s);

      label.appendChild(art);
      label.appendChild(info);

      // 状态徽章
      var badge = document.createElement('em');
      badge.className = 'cart-badge';
      badge.textContent = g.status === 'play' ? '▶ 开始' : '敬请期待';

      card.appendChild(teeth);
      card.appendChild(label);
      card.appendChild(badge);
      card.addEventListener('click', function () {
        if (g.status === 'play') launch(g);
      });
      grid.appendChild(card);
    });
  }

  // ---------- 生命周期 ----------
  function launch(g) {
    var wrap = document.getElementById('game-wrap');
    var frame = document.getElementById('game-frame');
    frame.src = g.url;
    wrap.classList.remove('hidden');
    document.body.classList.add('in-game');
    // 键盘焦点给到 iframe,否则游戏收不到按键
    setTimeout(function () { try { frame.focus(); } catch (e) {} }, 50);
    // 防止 iframe 滚动
    if (history.replaceState) history.replaceState(null, '', '#play-' + g.id);
  }

  function exitGame() {
    var wrap = document.getElementById('game-wrap');
    var frame = document.getElementById('game-frame');
    frame.src = 'about:blank';   // 彻底停止游戏循环
    wrap.classList.add('hidden');
    document.body.classList.remove('in-game');
    if (history.replaceState) history.replaceState(null, '', location.pathname);
  }

  // ---------- 启动 ----------
  function boot() {
    document.getElementById('btn-back').addEventListener('click', exitGame);
    buildMenu();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else boot();

  global.Platform = { launch: launch, exit: exitGame, games: GAMES };
})(typeof window !== 'undefined' ? window : globalThis);
