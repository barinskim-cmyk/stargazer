/**
 * audio.js — Web Audio sound synthesis
 *
 * All sounds are synthesized via Web Audio API (no external files).
 * AudioContext is created lazily on first call — browsers require
 * a user gesture (tap/click) to unlock audio.
 *
 * Sound types:
 *   'connect' — short ascending tone when connecting two points
 *   'score'   — sustained chord when capturing a region
 *   'victory' — ascending arpeggio sequence on win
 *   'twinkle' — soft ethereal shimmer on constellation save
 *
 * Exports: window.playSound
 * Dependencies: window._appSettings.sound
 * Load order: after early init (needs _appSettings)
 */
(function () {
  'use strict';

  var _audioCtx = null;

  /**
   * Play a synthesized sound effect via Web Audio API.
   * Does nothing if sound is disabled in settings or AudioContext unavailable.
   * @param {'connect'|'score'|'victory'|'twinkle'} type — sound type
   */
  function playSound(type) {
    if (!window._appSettings.sound) return;
    try {
      if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var ctx = _audioCtx;
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);

      if (type === 'connect') {
        o.frequency.setValueAtTime(440, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
        g.gain.setValueAtTime(0.1, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        o.start(); o.stop(ctx.currentTime + 0.2);
      }
      if (type === 'score') {
        o.frequency.setValueAtTime(523, ctx.currentTime);
        g.gain.setValueAtTime(0.15, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        o.start(); o.stop(ctx.currentTime + 0.4);
      }
      if (type === 'victory') {
        o.disconnect(); g.disconnect();
        [523, 659, 784, 1046].forEach(function (freq, i) {
          var o2 = ctx.createOscillator();
          var g2 = ctx.createGain();
          o2.connect(g2); g2.connect(ctx.destination);
          o2.frequency.value = freq;
          g2.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
          g2.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.15 + 0.05);
          g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3);
          o2.start(ctx.currentTime + i * 0.15);
          o2.stop(ctx.currentTime + i * 0.15 + 0.3);
        });
      }
      if (type === 'twinkle') {
        o.disconnect(); g.disconnect();
        [660, 880, 1320].forEach(function (freq, i) {
          var o2 = ctx.createOscillator();
          var g2 = ctx.createGain();
          o2.type = 'sine';
          o2.connect(g2); g2.connect(ctx.destination);
          o2.frequency.value = freq;
          g2.gain.setValueAtTime(0, ctx.currentTime + i * 0.09);
          g2.gain.linearRampToValueAtTime(0.07, ctx.currentTime + i * 0.09 + 0.03);
          g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.09 + 0.18);
          o2.start(ctx.currentTime + i * 0.09);
          o2.stop(ctx.currentTime + i * 0.09 + 0.2);
        });
      }
    } catch(e) {}
  }

  // ── Expose on window ─────────────────────────────────────────────────
  window.playSound = playSound;

})();
