var fs = require('fs');
var s = fs.readFileSync('C:/Users/14291/AppData/Local/Temp/opencode/smb/LEVEL_1_1.js', 'utf8');
s = s.replace('const LEVEL_1_1 = {', 'globalThis.LEVEL_1_1 = {');
s = s.replace('  flagX: 198,', '  flagX: 198,\n  castleX: 205,');
s = s.replace(
  '\u4e16\u754c 1-1 \u5173\u5361\u6570\u636e \u2014\u2014 \u7531 SMB1 \u539f\u7248\u5bf9\u8c61\u5b57\u8282\u89e3\u7801\u751f\u6210,\u5750\u6807\u4e0e\u539f\u7248\u4e00\u81f4',
  'World 1-1 level data - decoded from the original SMB1 object bytes by an automated script.\n// Contains: exact tile layout (question blocks, bricks, pipes, stairs, flag, castle),\n// block "special" contents, and enemy spawn points.'
);
fs.writeFileSync('js/levels/w1-1.js', s);
console.log('ok, bytes=' + s.length);
