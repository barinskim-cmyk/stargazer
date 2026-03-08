/* ═══════════════════════════════════════════════════════════════════════════
 *  Stargazer — Line Renderer
 *  Line drawing animation (A→B over 200ms) and point birth animation.
 *
 *  Reads from window: draw()
 *  Exposes on window: _lineAnimating, _lineAnim, _lineAnimRaf,
 *                     _pointBirthT, _pointBirthRaf,
 *                     _pointBirthScale, _startBirthAnim, _startLineAnimLoop
 * ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── State ─────────────────────────────────────────────────────────────
  var _lineAnimating = false;
  var _lineAnim      = null;  // {a, b, player, startT}
  var _lineAnimRaf   = null;
  var _pointBirthT   = [];    // _pointBirthT[i] = timestamp when point i starts appearing
  var _pointBirthRaf = null;

  // ── Point birth scale (0→1 over 200ms) ────────────────────────────────

  function _pointBirthScale(i) {
    if (!_pointBirthT.length) return 1;
    var start = _pointBirthT[i];
    if (start === undefined) return 1;
    var now = performance.now();
    if (now < start) return 0;
    return Math.min(1, (now - start) / 200);
  }

  // ── Point birth animation loop ────────────────────────────────────────

  function _startBirthAnim() {
    _lineAnimating = true;
    var endTime = _pointBirthT[_pointBirthT.length - 1] + 200;
    if (_pointBirthRaf) cancelAnimationFrame(_pointBirthRaf);
    (function loop() {
      draw();
      if (performance.now() < endTime) {
        _pointBirthRaf = requestAnimationFrame(loop);
      } else {
        _pointBirthRaf = null;
        _pointBirthT = [];
        _lineAnimating = false;
        draw();
      }
    })();
  }

  // ── Line drawing animation loop ───────────────────────────────────────

  function _startLineAnimLoop() {
    if (_lineAnimRaf) cancelAnimationFrame(_lineAnimRaf);
    (function loop() {
      if (!_lineAnim) { _lineAnimRaf = null; return; }
      draw();
      _lineAnimRaf = requestAnimationFrame(loop);
    })();
  }

  // ── Expose on window ──────────────────────────────────────────────────

  // Use defineProperty so code can read/write these from window scope
  Object.defineProperty(window, '_lineAnimating', {
    get: function () { return _lineAnimating; },
    set: function (v) { _lineAnimating = v; },
    configurable: true,
  });
  Object.defineProperty(window, '_lineAnim', {
    get: function () { return _lineAnim; },
    set: function (v) { _lineAnim = v; },
    configurable: true,
  });
  Object.defineProperty(window, '_lineAnimRaf', {
    get: function () { return _lineAnimRaf; },
    set: function (v) { _lineAnimRaf = v; },
    configurable: true,
  });
  Object.defineProperty(window, '_pointBirthT', {
    get: function () { return _pointBirthT; },
    set: function (v) { _pointBirthT = v; },
    configurable: true,
  });
  Object.defineProperty(window, '_pointBirthRaf', {
    get: function () { return _pointBirthRaf; },
    set: function (v) { _pointBirthRaf = v; },
    configurable: true,
  });

  window._pointBirthScale   = _pointBirthScale;
  window._startBirthAnim    = _startBirthAnim;
  window._startLineAnimLoop = _startLineAnimLoop;

})();
