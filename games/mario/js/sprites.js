// sprites.js — 像素精灵数据与渲染(原创像素绘制,力求还原经典造型)
(function (global) {
  'use strict';

  var PAL = {
    mario: { R:'#e40000', S:'#f8b880', B:'#2838f8', H:'#6a3a18',
             W:'#ffffff', K:'#000000', J:'#5a3315', V:'#4a2a12' },
    marioFire: { R:'#ffffff', S:'#f8b880', B:'#e40000', H:'#6a3a18',
                 W:'#ffffff', K:'#000000', J:'#5a3315', V:'#4a2a12' },   // 火焰:白帽红衣
    goomba: { G:'#c08048', D:'#8a4a28', W:'#ffffff', K:'#000000' },
    koopa: { G:'#3cb848', D:'#1e8a1e', Y:'#f4c878', W:'#ffffff', K:'#000000' },
    mushroom:  { R:'#e40000', W:'#ffffff', S:'#f8c880', K:'#000000' },
    mushroomG: { R:'#00b000', W:'#ffffff', S:'#f8c880', K:'#000000' },
    flower: { R:'#e40000', G:'#00a800', S:'#ffe080', K:'#000000', W:'#ffffff' },
    star:   { Y:'#f8e000', O:'#f8a000', W:'#ffffff', K:'#000000' },
    fire:   { A:'#f8a000', B:'#ffe040', C:'#f83008', D:'#f8f8f8' },
    coin:   { Y:'#f8c000', W:'#ffffff', K:'#e80000' },
    brick:  { R:'#c44a28', D:'#7c2410', L:'#e89460' },
    ground: { T:'#c87850', B:'#a86038', D:'#7e3c20', G:'#50a030' },
    stone:  { T:'#f0e8d0', L:'#fff8e8', D:'#a89878', K:'#403020' },
    pipe:   { T:'#3cd048', D:'#1e8a24', L:'#9cfc60', K:'#e8fcf0' },
    bblock: { T:'#f8a800', B:'#b06800', W:'#fff8d0', K:'#402000' },
    used:   { A:'#b0a088', B:'#90806c' },
    castle: { A:'#b89878', B:'#6a4a38', D:'#3a2818', W:'#f8f8f8' },
    bg:     { S:'#7ec8f0', W:'#ffffff', G:'#50b050' }
  };

  // ---------- 构建精灵 ----------
  var DEFS = {};
  var cache = {};

  function normalizeRows(rows) {
    // 统一行长(右补 '.'),系统自动填充,避免人工计数错误
    var w = 0;
    for (var i = 0; i < rows.length; i++) if (rows[i].length > w) w = rows[i].length;
    var out = [];
    for (var j = 0; j < rows.length; j++) {
      var s = rows[j];
      while (s.length < w) s += '.';
      out.push(s);
    }
    return out;
  }

  function build(rows, pal) {
    var R = normalizeRows ; // placeholder
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
    if (!cache[name]) {
      cache[name] = buildTile(DEFS[name].rows, DEFS[name].palName);
    }
    return cache[name];
  }

  /* ============================================================
     小马里奥 16x16(3 帧 + 跳 + 急转)
     ============================================================ */
  var s_stand = [
    '................',
    '....RRRRRRRR...',
    '...RRRRRRRRRR..',
    '...RRRRRRRRRR..',
    '...RRRRRRRRRR..',
    '...RRHHHHHHHR..',
    '...RHSSSSSSHR..',
    '...RBSKSSSSHHR.',  // 眼睛/脸颊
    '...RHSSSSSSHR..',
    '...RHHSSSSHHR..',
    '...RRHSSSSHRR..',
    '...RRRRRRRRR...',
    '...RBBBBBBBR...',
    '...BBBBBBBBB...',
    '...BBBBBBBBB...',
    '..VVVVVVVVVV...'
  ];
  define('small_stand', s_stand, 'mario');

  var s_walk1 = [
    '................',
    '....RRRRRRRR...',
    '...RRRRRRRRRR..',
    '...RRRRRRRRRR..',
    '...RRRRRRRRRR..',
    '...RRHHHHHHHR..',
    '...RHSSSSSSHR..',
    '...RBSKSSSSH...',
    '...RHSSSSSSH...',
    '...RHHSSSSHR...',
    '...RRHSSSSHRR..',
    '...RRRRRRRRR...',
    '...RBBBBBBBR...',
    '...BBBBBBBBB...',
    '..VRBBBBBVRR...',
    '..VVV....VVV...'
  ];
  define('small_walk1', s_walk1, 'mario');

  var s_walk2 = [
    '................',
    '....RRRRRRRR...',
    '...RRRRRRRRRR..',
    '...RRRRRRRRRR..',
    '...RRRRRRRRRR..',
    '...RRHHHHHHHR..',
    '...RHSSSSSSHR..',
    '...RBSKSSSSH...',
    '...RHSSSSSSH...',
    '...RHHSSSSHR...',
    '...RRHSSSSHRR..',
    '...RRRRRRRRR...',
    '...RBBBBBBBB...',
    '...BBBBBBBBB...',
    '..RV.BBBBBBV...',
    '...VVV...VVV...'
  ];
  define('small_walk2', s_walk2, 'mario');

  var s_jump = [
    '................',
    '....RRRRRRRR...',
    '...RRRRRRRRRR..',
    '...RRRRRRRRRR..',
    '...RRRRRRRRRR..',
    '...RRHHHHHHHR..',
    '...RHSSSSSSHR..',
    '...RBSKSSSSH...',
    '...RHSSSSSSH...',
    '...RHHSSSSHR...',
    '...RRHSSSSHRR..',
    '...RRRRRRRRR...',
    '...RBBBBBBBR...',
    '..BBBBBBBBB....',
    '..BBBBBBBBB....',
    '................'
  ];
  define('small_jump', s_jump, 'mario');

  var s_skid = [
    '................',
    '....RRRRRRRR...',
    '...RRRRRRRRRR..',
    '...RRRRRRRRRR..',
    '...RRRRRRRRRR..',
    '...RRHHHHHHHR..',
    '...RHSSSSSSHR..',
    '...RBSKSSSSHR..',
    '..RHSSSSSSHR...',
    '..RHHSSSSHR....',
    '..RRHSSSHR.....',
    '..RRRRRRR......',
    '..BBBBBBBBV....',
    '..BBBBBBBBBB...',
    '..V.BBBBBBBB...',
    '................'
  ];
  define('small_skid', s_skid, 'mario');

  /* ============================================================
     大马里奥 16x32
     ============================================================ */
  var b_stand = [
    '................',
    '.....RRRRRRR...',
    '....RRRRRRRRR..',
    '....RRRRRRRRR..',
    '....RRRRRRRRR..',
    '....RRHHHHHHR..',
    '....RHSSSSSHR..',
    '....RRSSSSSSR..',
    '...RRHSSSSSSR..',
    '...RRHSSSSSSR..',
    '...RRHSKSSSS...',
    '...R.RHSSSSS...',
    '...R.RHSSSSS...',
    '...R.RHSSSSHR..',
    '...RRHHSSHRRR..',
    '....RRRRRRRR...',
    '...RRKRRRRRR...',
    '..S.RRRRRR.SR..',
    '..S.RBBBBBR.R..',
    '..S.RBBBBBRS...',
    '..SR.BBBBB .RS.',
    '..RRBBBBBB.br.',
    '..RRBBBBBBRBRL',
    '.RRRBBBBBBBRL.',
    '.RRRBBBBBBBR..',
    '.RRBBBBBBBBR..',
    '.RRBBBBBBBBR..',
    '..RBBBBBBBB...',
    '..VV.VVVVV.V..',
    '..VV.VVVVV.V..',
    '................'
  ];
  define('big_stand', b_stand, 'mario');

  // 大马里奥行走帧:基于 stand 修改脚部
  var b_walk1 = b_stand.slice();
  b_walk1[26] = '..RBBBBBBBBV..';
  b_walk1[27] = '..BBBBBBBBV...';
  b_walk1[28] = '.VV.VVVVV.V...';
  b_walk1[29] = '................';
  define('big_walk1', b_walk1, 'mario');

  var b_walk2 = b_stand.slice();
  b_walk2[26] = '...RBBBBBBB...';
  b_walk2[27] = '..V.BBBBBBB...';
  b_walk2[28] = '..V.VVVVV....';
  b_walk2[29] = '................';
  define('big_walk2', b_walk2, 'mario');

  var b_jump = b_stand.slice();
  b_jump[24] = '..RRBBBBBBR....';
  b_jump[25] = '..RRBBBBBR.....';
  b_jump[26] = '..RBBBBBBR.....';
  b_jump[27] = '..RBBBBBBR.....';
  b_jump[28] = '.V..VVVVV.V....';
  b_jump[29] = '.V..VVVVV.V....';
  b_jump[30] = '................';
  define('big_jump', b_jump, 'mario');

  var b_skid = b_stand.slice();
  b_skid[27] = '..BBBBBBBBBB...';
  b_skid[28] = '..VVVVVVVVV....';
  b_skid[29] = '.V..VVVV........';
  define('big_skid', b_skid, 'mario');

  // 火焰马里奥:用 marioFire 调色板重建
  var FIRE_NAMES = ['small_stand','small_walk1','small_walk2','small_jump','small_skid',
                    'big_stand','big_walk1','big_walk2','big_jump','big_skid'];
  var fireMap = {
    small_stand:'smallf_stand', small_walk1:'smallf_walk1', small_walk2:'smallf_walk2',
    small_jump:'smallf_jump', small_skid:'smallf_skid',
    big_stand:'bigf_stand', big_walk1:'bigf_walk1', big_walk2:'bigf_walk2',
    big_jump:'bigf_jump', big_skid:'bigf_skid'
  };
  for (var fk in fireMap) {
    DEFS[fireMap[fk]] = { rows: DEFS[fk].rows, palName: 'marioFire' };
  }

  /* ============================================================
     敌人
     ============================================================ */
  var g_walk1 = [
    '................',
    '................',
    '................',
    '.....GGGGGG....',
    '..GGGGGGGGGGG..',
    '..GGGGGGGGGGG..',
    '..GGGGGGGGGGG..',
    '.GGGGGGGGWGGGG.',
    '.GGGGGGGGGGGGG.',
    '.GGGGGGGGGGGGG.',
    '.GGGGGGGGGGGGG.',
    '..GGGGGGGGGGG..',
    '...GGGGGGGGG...',
    '...DD...DD....',
    '..DD...DD...',
    '..DDDD.DDDDD..'
  ];
  define('goomba1', g_walk1, 'goomba');

  var g_walk2 = g_walk1.slice();
  g_walk2[13] = '..........DD...';
  g_walk2[14] = '...DD......DD..';
  g_walk2[15] = '..DDDDD..DDDD..';
  define('goomba2', g_walk2, 'goomba');

  var g_squash = [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.....GGGGGG.....',
    '..GGGGGGGGGGG..',
    '..GGGGGGGGGGGG.',
    '..GGGGGGGGGGGG.',
    '..GGGGGGGGGGGG.',
    '................',
    '................',
    '................',
    '................',
    '................'
  ];
  define('goomba_squash', g_squash, 'goomba');

  var k_walk1 = [
    '................',
    '................',
    '....TTTTTT.....',
    '...TWWTTTTT....',
    '..TWWTTTTTTT...',
    '..TWWTTTTTTT...',
    '..TWWTTTTTTT...',
    '..TTTTTTTTTT...',
    '..TTTTTTTTTT...',
    '..TTTDDTTTTT...',
    '..TTTTTTTTTT...',
    '..TTTTTTTTTT...',
    '..GGGGGGGGGG...',
    '..GGGGGGGGGG...',
    '.GGGGGGGGGGG...',
    '.GGGGGGGGGGG...',
    '.GGGG..GGGGG...',
    '.....DDDD......',
    '................',
    '................'
  ];
  define('koopa1', k_walk1, 'koopa');

  var k_walk2 = k_walk1.slice();
  k_walk2[17] = '...DD..DD......';
  k_walk2[16] = '.GGGG..GGGG....';
  define('koopa2', k_walk2, 'koopa');

  var k_shell = [
    '................',
    '................',
    '................',
    '..GGGGGGG......',
    '..GGGGGGGGG....',
    '.GGGGGGGGGGG...',
    '.GGGGGGGGGGGG..',
    '.GGWWGGGGGGGG..',
    '.GGWWGGGGGGGG..',
    '.GGGGGGGGGGGG..',
    '.GGGGGGGGGGGG..',
    '..GGGGGGGGGG...',
    '..GGGGGGGGG....',
    '..GGGGGGG......',
    '................',
    '................'
  ];
  define('koopa_shell', k_shell, 'koopa');

  /* ============================================================
     道具
     ============================================================ */
  var mushroomArt = [
    '................',
    '..RRRRRRRRR....',
    '.RWWWWWWWWRR...',
    '.RWWRRRRWWWW.R.',
    '.RWRRRRRRWWW.R.',
    '.RRRRRRRRRRRRR.',
    '.RRWWRRRRWWRR..',
    '..SSSSSSSSSS...',
    '..SKKSSSSSKK...',
    '..SSSSSSSSSS...',
    '..SSSSSSSSSS...',
    '..SSSSSSSSSS...',
    '..SSSSSSSSSS...',
    '..SKKSSSSKK....',
    '..SSSSSSSSS....',
    '................'
  ];
  define('mushroom', mushroomArt, 'mushroom');
  define('mushroom_1up', mushroomArt, 'mushroomG');

  define('flower', [
    '................',
    '.....RRRRRR....',
    '...RRRRRRRRRR..',
    '..RSSSSSSSSSSR.',
    '..RSSSSSSSSSR..',
    '.RRSSWWSSSSRSS.',
    '.RRSSSSSSSSSSR.',
    '.RRRRRRRRRRRRR.',
    '....GGGGGGG....',
    '.....GSSG......',
    '.......G.......',
    '......GG.......',
    '......GG.......',
    '.....GG........',
    '.....GG........',
    '................'
  ], 'flower');

  define('star', [
    '................',
    '................',
    '....OOOOO.......',
    '..OOOOOOOOOOO...',
    '..OWOOOOOOOWO...',
    '.OWYYYYYYYYYW...',
    '.OYYYYYYYYYYO...',
    '.OYOYYYYYYOYO...',
    '.OYYYYYYYYYYO...',
    '..OYYYYYYYYO....',
    '..OYYYYYYOO.....',
    '...OOO.OOO......',
    '................',
    '................',
    '................',
    '................'
  ], 'star');

  define('fireball', [
    '................',
    '................',
    '......AA........',
    '....AAAA..A.....',
    '...ABBBBB..A....',
    '..ABBCCBBBB.....',
    '..ABBCCBBBB.....',
    '..ABBBBBBB......',
    '..ABBBDDBBA.....',
    '...ABBBBBA......',
    '......AAA.......',
    '................',
    '................',
    '................',
    '................',
    '................'
  ], 'fire');

  define('coin', [
    '................',
    '....YYYYY.......',
    '..YYYYYYYYY.....',
    '..YWWYYYYYY.....',
    '.Y..WYYYYYY.....',
    '.Y..YYYYYYY.....',
    '.Y..YYYYYYY.....',
    '.Y..YYYYYYY.....',
    '.Y..YYYYYYY.....',
    '..YYYYYYYYY.....',
    '..YYYYYYYYY.....',
    '....YYYYYY......',
    '................',
    '................',
    '................',
    '................'
  ], 'coin');

  define('coin2', DEFS['coin'].rows, 'coin');

  /* ============================================================
     瓦片
     ============================================================ */
  define('tile_ground', [
    '.GGGGGGGGGGGGGG.',
    '.GGGGGGGGGGGGGG.',
    '..GGGGGGGGGGGG..',
    '..GGGGGGGGGGGG..',
    '..GGGGGGGGGGGG..',
    '..GGGGGGGGGGGG..',
    '..TTTTTTTTTTTT..',
    '..TTTTTTTTTTTT..',
    '..DDDDDDDDDDDD..',
    '..TTTTTTTTTTTT..',
    '..TTTTTTTTTTTT..',
    '..DDDDDDDDDDDD..',
    '..TTTTTTTTTTTT..',
    '..TTTTTTTTTTTT..',
    '..DDDDDDDDDDDD..',
    '..TTTTTTTTTTTT..'
  ], 'ground');

  define('tile_brick', [
    '................',
    '................',
    '................',
    '................',
    '..DDDDDDDDDDDD..',
    '..TTTTTTTTTTTT..',
    '..TTTTTTTTTTTT..',
    '..TTTTTTTTTTTT..',
    '..DDDDDDDDDDDD..',
    '..TTTTTTTTTTTT..',
    '..TTTTTTTTTTTT..',
    '..DDDDDDDDDDDD..',
    '..TTTTTTTTTTTT..',
    '..TTTTTTTTTTTT..',
    '..TTTTTTTTTTTT..',
    '..DDDDDDDDDDDD..'
  ], 'brick');

  define('tile_question', [
    '................',
    '................',
    '................',
    '...WWWWWWWWWW...',
    '..WTBBBBBBBBTW..',
    '..WBKKBBBKKBW..',  // '?'
    '..WBBBKBKBBB W..',
    '..WBBBBKBBBKBW..',
    '..WBBBKKBBBKB...',
    '..WBBBBBBBBB W..',
    '..WTBBBBBBBBTW..',
    '...WWWWWWWWWW...',
    '................',
    '................',
    '................',
    '................'
  ], 'bblock');

  define('tile_used', [
    '................',
    '................',
    '................',
    '................',
    '..AAAAAAAAAAA...',
    '..AAAAAAAAAAA...',
    '..AAAAAAAAAAA...',
    '..AAAAAAAAAAA...',
    '..AAAAAAAAAAA...',
    '..AAAAAAAAAAA...',
    '..AAAAAAAAAAA...',
    '..AAAAAAAAAAA...',
    '................',
    '................',
    '................',
    '................'
  ], 'used');

  define('tile_stone', [
    '................',
    '................',
    '................',
    '..DDDDDDDDDDDD..',
    '.DTTTTTTTTTTTTD.',
    '.DTTTTTTTTTTTTD.',
    '.DTTTTTTTTTTTTD.',
    '.DTTTTTTTTTTTTD.',
    '.DTTTTTTTTTTTTD.',
    '.DTTTTTTTTTTTTD.',
    '.DTTTTTTTTTTTTD.',
    '.DTTTTTTTTTTTTD.',
    '..DDDDDDDDDDDD..',
    '................',
    '................',
    '................'
  ], 'stone');

  define('tile_pipe_tl', [
    '................',
    'TTTTTTTTTTTTTT..',
    'TTTKTTTTTTTTKTT.',
    'TTTKTTTTTTTTKTT.',
    'TTTKTTTTTTTTKTT.',
    'TTTKTTTTTTTTKTT.',
    'TKKKTTTTTTTTK..',
    'TKTTTTTTTTTTKTT.',
    'TKTTTTTTTTTTKTT.',
    'TKTTTTTTTTTTKTT.',
    'TKTTTTTTTTTTKTT.',
    'TKTTTTTTTTTTKTT.',
    'TKKTTTTTTTTKKT..',
    'TTTKTTTTTTKTTT..',
    'TTTTTTTTTTTTTT..',
    'TTTTTTTTTTTTTT..'
  ], 'pipe');

  define('tile_pipe_tr', mirrorRows('tile_pipe_tl'), 'pipe');
  define('tile_pipe_bl', bodyRows('l'), 'pipe');
  define('tile_pipe_br', bodyRows('r'), 'pipe');

  function normalizeRows(rows) {
    for (var i = 0; i < rows.length; i++) {
      var d = 16 - rows[i].length;
      for (var j = 0; j < d; j++) rows[i] += '.';
      rows[i] = rows[i].substring(0, 16);
    }
    return rows;
  }
  function pad16(c) { return c + '................' + c; }

  function bodyRows(pos) {
    var out = [];
    for (var i = 0; i < 16; i++) {
      out.push(pos === 'l' ? 'TTTTTTTTTTTTTTK.' : '.KTTTTTTTTTTTTT');
    }
    return out;
  }
  function mirrorRows(name) {
    var rows = DEFS[name].rows.slice();
    var out = rows.map(function (r) {
      return r.split('').reverse().join('');
    });
    return out;
  }

  /* ============================================================
     背景装饰
     ============================================================ */
  define('cloud', [
    '................',
    '................',
    '................',
    '.....WWWWWW....',
    '....WWWWWWWW...',
    '...WWWWWWWWWW..',
    '...WWWWWWWWWW..',
    '..WWWWWWWWWWWW.',
    '..WWWWWWWWWWWW.',
    '..WWWWWWWWWWWW.',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................'
  ], 'bg');

  /* ============================================================
     8x8 字体
     ============================================================ */
  var FONT = {
    '0': ["01111110","11000011","11000111","11001111","11011011","11110011","01111110","00000000"],
    '1': ["00111000","00011000","00011000","00011000","00011000","00011000","00111100","00000000"],
    '2': ["01111110","11000011","00000110","00001100","00011000","00110000","11111111","00000000"],
    '3': ["01111110","11000011","00000011","00111110","00000011","11000011","01111110","00000000"],
    '4': ["00001100","00011100","00111100","01101100","11111111","00001100","00001100","00000000"],
    '5': ["11111111","11000000","11111110","00000011","00000011","11000011","01111110","00000000"],
    '6': ["00111110","01100000","11000000","11111110","11000011","11000011","01111110","00000000"],
    '7': ["11111111","00000011","00000110","00001100","00011000","00110000","01100000","00000000"],
    '8': ["01111110","11000011","11000011","01111110","11000011","11000011","01111110","00000000"],
    '9': ["01111110","11000011","11000011","01111111","00000011","00000110","01111100","00000000"],
    'A': ["01111110","11000011","11000011","11111111","11000011","11000011","11000011","00000000"],
    'B': ["11111100","11000110","11000110","11111100","11000110","11000110","11111110","00000000"],
    'C': ["01111110","11000011","11000000","11000000","11000000","11000011","01111110","00000000"],
    'D': ["11111100","11000110","11000011","11000011","11000011","11000110","11111100","00000000"],
    'E': ["11111111","11000000","11000000","11111100","11000000","11000000","11111111","00000000"],
    'G': ["01111110","11000011","11000000","11001111","11000011","11000011","01111110","00000000"],
    'N': ["11000011","11100011","11110011","11011011","11001111","11000111","11000011","00000000"],
    'V': ["11000011","11000011","11000011","11000011","01100110","00111100","00011000","00000000"],
    'H': ["11000011","11000011","11000011","11111111","11000011","11000011","11000011","00000000"],
    'I': ["01111110","00011000","00011000","00011000","00011000","00011000","01111110","00000000"],
    'L': ["11000000","11000000","11000000","11000000","11000000","11000000","11111111","00000000"],
    'M': ["11000011","11100111","11111111","11011011","11011011","11000011","11000011","00000000"],
    'O': ["01111110","11000011","11000011","11000011","11000011","11000011","01111110","00000000"],
    'R': ["11111110","11000011","11000011","11111110","11001100","11000110","11000011","00000000"],
    'U': ["11000011","11000011","11000011","11000011","11000011","11000011","01111110","00000000"],
    'S': ["01111110","11000000","11100000","00111100","00000010","00000011","11111100","00000000"],
    'T': ["11111111","00011000","00011000","00011000","00011000","00011000","00011000","00000000"],
    'W': ["11000011","11000011","11000011","11011011","11111111","11100111","11000011","00000000"],
    'X': ["11000011","01100110","00111100","00011000","00111100","01100110","11000011","00000000"],
    'x': ["00000000","11000011","01000110","00101100","00011000","00101100","01000110","11000011"],
    '-': ["00000000","00000000","00000000","01111110","00000000","00000000","00000000","00000000"],
    '.': ["00000000","00000000","00000000","00000000","00000000","00110000","00110000","00000000"],
    '/': ["00000011","00000110","00001100","00011000","00110000","01100000","11000000","00000000"]
  };

  var glyphCache = {};
  function glyph(ch) {
    if (!glyphCache[ch]) {
      var c = document.createElement('canvas');
      c.width = 8; c.height = 8;
      var g = c.getContext('2d');
      g.fillStyle = '#ffffff';
      var rows = FONT[ch];
      if (rows) {
        for (var y = 0; y < 8; y++) {
          for (var x = 0; x < 8; x++) {
            if (rows[y][x] === '1') g.fillRect(x, y, 1, 1);
          }
        }
      }
      glyphCache[ch] = c;
    }
    return glyphCache[ch];
  }

  global.Sprites = {
    get: get,
    glyph: glyph
  };
})(typeof window !== 'undefined' ? window : globalThis);