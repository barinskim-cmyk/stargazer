/**
 * hints-renderer.js — Hint edge rendering and toggle UI
 *
 * Draws hint edges (dashed lines / chalk dots / stargazer shimmer)
 * underneath the regular edge layer. Also wires hint toggle button
 * and checkbox on the start screen.
 *
 * Exports: window.drawHints, window.ensureHintsLoop
 * Dependencies: ctx, points, activeTheme, currentPlayer, gameOver,
 *               _hintsOn, _hintEdges, _hintsRaf, COLOR, RADIUS,
 *               CHALK_RAINBOW, drawChalkDot(), computeHints(),
 *               draw(), T()
 * Load order: after themes.js, after star-renderer.js
 */
(function () {
  'use strict';

  /** RAF loop to drive the stargazer shimmer animation for hints. */
  function ensureHintsLoop() {
    if (_hintsRaf) return;
    function loop() {
      if (!_hintsOn || activeTheme !== 'stargazer' || gameOver || !_hintEdges.length) {
        _hintsRaf = null; return;
      }
      draw();
      _hintsRaf = requestAnimationFrame(loop);
    }
    _hintsRaf = requestAnimationFrame(loop);
  }

  /**
   * Draw hint edges on the canvas.
   * Must be called BEFORE the regular edge layer so hints appear underneath.
   */
  function drawHints() {
    if (!_hintEdges.length) return;
    ctx.save();

    var isStargazer = activeTheme === 'stargazer';
    var isChalk = activeTheme === 'chalk';

    _hintEdges.forEach(function (edge) {
      var a = edge.a, b = edge.b, value = edge.value;
      var ax = points[a].x, ay = points[a].y;
      var bx = points[b].x, by = points[b].y;

      if (isChalk) {
        // Series of small chalk dots along the edge path
        var dx = bx - ax, dy = by - ay;
        var len = Math.hypot(dx, dy);
        var n = Math.max(3, Math.floor(len / 18));
        var r = value === 'HIGH' ? 3.5 : 2.5;
        var dotAlpha = value === 'HIGH' ? 0.42 : 0.22;
        var color = value === 'HIGH'
          ? CHALK_RAINBOW[currentPlayer * 3 % CHALK_RAINBOW.length]
          : 'rgba(140,115,80,1)';
        var seed = Math.abs(Math.sin(ax * 0.37 + ay * 0.19 + bx * 0.13)) % 1;
        ctx.globalAlpha = dotAlpha;
        for (var k = 0; k <= n; k++) {
          var t = k / n;
          var jx = Math.sin(seed * 31.4 + k * 7.9) * 2.2;
          var jy = Math.cos(seed * 11.7 + k * 13.3) * 2.2;
          drawChalkDot(ctx, ax + dx * t + jx, ay + dy * t + jy, r, color);
        }
        ctx.globalAlpha = 1;
      } else {
        var alpha, dash, lw;
        if (value === 'HIGH') { alpha = 0.35; dash = [8, 6]; lw = 2; }
        else                  { alpha = 0.20; dash = [3, 8]; lw = 1.5; }

        if (isStargazer) {
          // Pulsing shimmer 20%→40%→20% over 2 s
          var phase = (performance.now() % 2000) / 2000;
          var pulse = 0.20 + 0.20 * Math.sin(phase * Math.PI * 2);
          alpha = value === 'HIGH' ? Math.min(0.55, pulse * 1.8) : pulse;
        }

        ctx.globalAlpha = alpha;
        ctx.strokeStyle = COLOR;
        ctx.lineWidth = lw;
        ctx.lineCap = 'round';
        ctx.setLineDash(dash);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    ctx.restore();
  }

  // ── Expose on window ─────────────────────────────────────────────────
  window.drawHints     = drawHints;
  window.ensureHintsLoop = ensureHintsLoop;

})();
