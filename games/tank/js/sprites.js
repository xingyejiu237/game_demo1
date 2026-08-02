// sprites.js(坦克大战)— 原创像素画:坦克/地形/基地/爆炸
(function (global) {
  'use strict';

  var PAL = {
    tankP: { G:'#3cb848', D:'#1e8a1e', K:'#101010', Y:'#f4c878', W:'#ffffff', B:'#245a24' },
    tankE: { G:'#d84838', D:'#8a1e14', K:'#101010', Y:'#f4c878', W:'#ffffff', B:'#5a1a10' },
    brick: { R:'#c44a28', D:'#7c2410', L:'#e89460' },
    steel: { T:'#e8e8f0', D:'#a0a0b8', K:'#404050' },
    grass: { G:'#28a030', D:'#1a6a20' },
    base:  { R:'#e40000', W:'#ffffff', K:'#101010', G:'#3cb848' },
    boom:  { Y:'#f8e000', O:'#f8a000', R:'#e83010', K:'#202020' },
    bullet:{ Y:'#f8e000', W:'#ffffff' }
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
     坦克 14x14(俯视,炮管朝上;其他朝向运行时翻转)
     ============================================================ */
  var tankUp = [
    '..............',
    '.....GGGG.....',
    '....GYYYYG....',
    '...GYYKKYYG...',
    '...GYKKKKYG...',
    '..GGGGGGGGGG..',
    '..GGGGGGGGGG..',
    '..GGWWGGWWGG..',
    '..GGGGGGGGGG..',
    '..GGGGGGGGGG..',
    '..GGGGGGGGGG..',
    '.BBBBBBBBBBBB.',
    '.BBBBBBBBBBBB.',
    '..............'
  ];
  define('tankP_up', tankUp, 'tankP');
  define('tankE_up', tankUp, 'tankE');

  /* ============================================================
     地形 16x16
     ============================================================ */
  define('brick', [
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
  ], 'brick');

  define('steel', [
    '................',
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
    '.TTTTTTTTTTTTTT.',
    '.TTTTTTTTTTTTTT.',
    '................'
  ], 'steel');

  define('grass', [
    '................',
    '...GG..GG.GG...',
    '..GGG.GGG.GGG..',
    '.GGGGGGGGGGGGG.',
    '..GGGGGGGGGGG..',
    '..G.GG.GG.GG...',
    '..GG.GGGG.GGG..',
    '.GGGG.GG.GGGG..',
    '.GGGGGGGGGGGG..',
    '..GGGGGGGGGGG..',
    '...GG.GGG.GG...',
    '..GGGG.GGGGG...',
    '..GGG.GGGG.GG..',
    '.GGGGGGGGGGGGG.',
    '..GGGGGGGGGGG..',
    '................'
  ], 'grass');

  define('base_flag', [
    '................',
    '..RRRRRR.......',
    '..RWWWRR.......',
    '..RRRRRR.......',
    '......RR.......',
    '......RR.......',
    '......RR.......',
    '......RR.......',
    '......RR.......',
    '.....RRRR......',
    '.....RRRR......',
    '.....RRRR......',
    '....RRRRRR.....',
    '....RRRRRR.....',
    '................',
    '................'
  ], 'base');

  define('base_dead', [
    '................',
    '................',
    '................',
    '..KKKKK.KKKK...',
    '.KKKKKKKKKKKK..',
    '.KKKK.KKKKKKK..',
    '..KKK.KKKKK....',
    '..KKKKKKKKKKK..',
    '.KKKKKK.KKKKK..',
    '.KKK..KKKKKK...',
    '.KKK.KKKKKKKK..',
    '..KKKKKK.KKK...',
    '.KKKKKKKKKKK...',
    '................',
    '................',
    '................'
  ], 'boom');

  /* ============================================================
     子弹 / 爆炸
     ============================================================ */
  define('bullet', [
    '................',
    '................',
    '................',
    '................',
    '.....YYYY.......',
    '.....YYYY.......',
    '.....WWWW.......',
    '.....WWWW.......',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................'
  ], 'bullet');

  define('boom1', [
    '................',
    '.....YYYY.......',
    '....YYOOYY......',
    '...YYOORRYY.....',
    '...YORRRROY.....',
    '..YYORRKKROYY...',
    '..YORRKKRROY....',
    '..YORRKKRROY....',
    '..YYORRRROYY....',
    '...YORRRROY.....',
    '...YYOORRYY.....',
    '....YYOOYY......',
    '.....YYYY.......',
    '................',
    '................',
    '................'
  ], 'boom');

  define('boom2', [
    '................',
    '................',
    '....YY...YY.....',
    '..YYOYY.YYOY....',
    '..YORRYYOROY....',
    '...YORRORROY....',
    '..YYORRRRROY....',
    '..YORRRRRRROY...',
    '..YORRRRRRROY...',
    '...YORRRRROYY...',
    '..YYORRORRYY....',
    '..YOYY.OYYO.....',
    '....YY...YY.....',
    '................',
    '................',
    '................'
  ], 'boom');

  global.TankSprites = { get: get };
})(typeof window !== 'undefined' ? window : globalThis);
