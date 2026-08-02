// audio.js — Web Audio 合成音效与背景音乐(原版基调 + 创意改编)
(function (global) {
  'use strict';

  var AC = null, master = null, musicTimer = null, musicOn = false;
  var step = 0, nextNoteTime = 0;

  function ctx() {
    if (!AC) {
      try {
        AC = new (window.AudioContext || window.webkitAudioContext)();
        master = AC.createGain();
        master.gain.value = 0.5;
        master.connect(AC.destination);
      } catch (e) { AC = null; }
    }
    if (AC && AC.state === 'suspended') AC.resume();
    return AC;
  }

  function tone(freq, dur, type, vol, when, slideTo) {
    var c = ctx();
    if (!c) return;
    var t0 = (when || c.currentTime);
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol || 0.2, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, when) {
    var c = ctx();
    if (!c) return;
    var t0 = (when || c.currentTime);
    var len = Math.floor(c.sampleRate * dur);
    var buf = c.createBuffer(1, len, c.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var src = c.createBufferSource();
    src.buffer = buf;
    var g = c.createGain();
    g.gain.setValueAtTime(vol || 0.3, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    var f = c.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 1200; f.Q.value = 0.8;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0);
  }

  var SFX = {
    jump:    function () { tone(240, 0.16, 'square', 0.16, 0, 620); },
    coin:    function () { tone(988, 0.09, 'square', 0.15); tone(1319, 0.25, 'square', 0.15, ctx().currentTime + 0.08); },
    stomp:   function () { tone(300, 0.07, 'square', 0.18, 0, 160); noise(0.08, 0.12); },
    bump:    function () { tone(160, 0.08, 'square', 0.2, 0, 110); },
    brick:   function () { noise(0.22, 0.3); tone(120, 0.18, 'square', 0.15, 0, 60); },
    powerup: function () {
      var n = [523, 659, 784, 1047, 880, 659, 784, 523];
      var t = ctx().currentTime;
      for (var i = 0; i < n.length; i++) tone(n[i], 0.11, 'square', 0.13, t + i * 0.085);
    },
    oneup:   function () {
      var n = [659, 784, 988, 1319];
      var t = ctx().currentTime;
      for (var i = 0; i < n.length; i++) tone(n[i], 0.14, 'square', 0.14, t + i * 0.11);
    },
    die:     function () {
      var n = [523, 466, 392, 330, 262];
      var t = ctx().currentTime;
      for (var i = 0; i < n.length; i++) tone(n[i], 0.16, 'square', 0.16, t + i * 0.13);
    },
    shrink:  function () { tone(600, 0.3, 'sawtooth', 0.12, 0, 150); },
    flag:    function () { tone(880, 0.9, 'square', 0.14, 0, 200); },
    clear:   function () {
      var n = [659, 784, 988, 1047, 1319, 1047, 988, 784, 988, 1319];
      var t = ctx().currentTime;
      for (var i = 0; i < n.length; i++) tone(n[i], 0.14, 'square', 0.15, t + i * 0.13);
    },
    fire:    function () { tone(800, 0.12, 'square', 0.12, 0, 200); noise(0.1, 0.1); },
    kick:    function () { tone(220, 0.1, 'square', 0.16, 0, 90); },
    start:   function () { tone(523, 0.12, 'square', 0.15); tone(784, 0.2, 'square', 0.15, ctx().currentTime + 0.11); },
    pause:   function () { tone(392, 0.1, 'square', 0.12); tone(392, 0.1, 'square', 0.12, ctx().currentTime + 0.15); }
  };

  // ---------- 背景音乐(原创 chiptune,灵感取自经典旋律) ----------
  // 12/8 拍,主旋律 square,低音 triangle
  var SONG = [
    [587, 0.5], [659, 0.5], [784, 0.5], [659, 0.5],
    [587, 1.0], [523, 1.0], [587, 1.0], [659, 0.5], [784, 0.5],
    [880, 1.0], [784, 0.5], [659, 0.5], [587, 0.5], [523, 0.5],
    [587, 1.0], [659, 1.0], [784, 0.5], [659, 0.5], [587, 0.5],
    [523, 1.0], [0, 0.5], [0, 0.5]
  ];
  var BASS = [392, 440, 494, 440, 392, 349, 392, 440, 494, 523, 494, 440, 392, 349, 392, 440, 494, 440, 392, 349, 0, 0];

  function scheduleStep(when) {
    var c = ctx();
    if (!c) return;
    var i = step % SONG.length;
    var note = SONG[i];
    var bass = BASS[i];
    if (note[0] > 0) tone(note[0], note[1], 'square', 0.07, when);
    if (bass > 0) tone(bass / 2, 0.5, 'triangle', 0.12, when);
    step++;
    nextNoteTime = when + note[1];
  }

  function musicLoop() {
    if (!musicOn) return;
    var c = ctx();
    if (!c) return;
    while (nextNoteTime < c.currentTime + 0.15) {
      scheduleStep(nextNoteTime);
    }
    musicTimer = setTimeout(musicLoop, 60);
  }

  var AudioSys = {
    unlock: function () { ctx(); },
    sfx: function (name) {
      if (SFX[name]) { try { SFX[name](); } catch (e) {} }
    },
    music: function (on) {
      if (on === musicOn) return;
      musicOn = on;
      if (on) {
        if (!AC) ctx();
        if (!AC) return;
        step = 0;
        nextNoteTime = AC.currentTime + 0.05;
        musicLoop();
      } else {
        if (musicTimer) { clearTimeout(musicTimer); musicTimer = null; }
      }
    }
  };

  global.AudioSys = AudioSys;
})(typeof window !== 'undefined' ? window : globalThis);