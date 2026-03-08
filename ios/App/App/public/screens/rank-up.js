/**
 * rank-up.js — Rank-up ceremony + progress widget + prob bar
 *
 * Shows a full-screen rank-up ceremony animation on canvas (starfield,
 * rank name, emblem) before the victory screen. Also renders the
 * rank/progress widget in the UI.
 *
 * Exports: window.startRankUpCeremony, window.renderProgressWidget
 * Dependencies: ctx, W, H, _canvasDpr, _rankUpActive, _rankUpRaf,
 *               drawRankEmblem(), computeRank(), loadProgress(),
 *               finishEndGame()
 * Load order: after star-renderer.js, after progression.js,
 *             after win-system.js
 */
(function () {
  'use strict';

  /**
   * Show rank-up ceremony on canvas: dark starfield, rank name, emblem.
   * Fades in 800ms, holds 2500ms, calls finishEndGame() when done.
   */
  function startRankUpCeremony(rankInfo) {
    _rankUpActive = true;
    var startMs = performance.now();
    var FADE_IN = 800, HOLD = 2500, FADE_OUT = 500;
    var TOTAL = FADE_IN + HOLD + FADE_OUT;

    function frame() {
      var elapsed = performance.now() - startMs;
      if (elapsed >= TOTAL) {
        _rankUpActive = false;
        _rankUpRaf = null;
        finishEndGame();
        return;
      }

      // Alpha envelope
      var alpha;
      if      (elapsed < FADE_IN)         alpha = elapsed / FADE_IN;
      else if (elapsed < FADE_IN + HOLD)  alpha = 1;
      else                                alpha = 1 - (elapsed - FADE_IN - HOLD) / FADE_OUT;

      ctx.setTransform(_canvasDpr, 0, 0, _canvasDpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.save();

      // Dark background
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, W, H);

      // Starfield (deterministic, seeded by rank)
      var rk = rankInfo.rank;
      for (var i = 0; i < 180; i++) {
        var sx = Math.abs(Math.sin(i * 127.3 + rk * 11)) * W;
        var sy = Math.abs(Math.cos(i * 73.9  + rk * 7))  * H;
        var sr = 0.4 + Math.abs(Math.sin(i * 211)) * 1.3;
        var sb = 0.25 + 0.55 * Math.abs(Math.sin(i * 333 + performance.now() / 3000));
        ctx.globalAlpha = alpha * sb;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = alpha;

      // Sub-text
      ctx.fillStyle = 'rgba(248,247,245,0.75)';
      ctx.font = '20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Новый ранг разблокирован', W / 2, H / 2 - 72);

      // Rank name
      ctx.fillStyle = '#C0BDBA';
      ctx.font = 'bold 42px serif';
      ctx.fillText(rankInfo.name, W / 2, H / 2 - 24);

      // Sub-rank numeral (I / II / III)
      ctx.fillStyle = 'rgba(220,218,215,0.7)';
      ctx.font = '24px serif';
      ctx.fillText(['','I','II','III'][rankInfo.subRank], W / 2, H / 2 + 18);

      // Emblem
      drawRankEmblem(rankInfo.rank, W / 2, H / 2 + 100);

      ctx.restore();
      _rankUpRaf = requestAnimationFrame(frame);
    }
    _rankUpRaf = requestAnimationFrame(frame);
  }

  /**
   * Render the progress widget: rank title + rating in #rank-display,
   * player level name in #p1level, stars in #p1-rank-stars.
   */
  function renderProgressWidget() {
    var p = loadProgress();
    var el = document.getElementById('rank-display');
    if (!el) return;
    var info = computeRank(p.rating);
    el.textContent = info.title + ' · ' + p.rating;
    var p1lvlEl = document.getElementById('p1level');
    var p1starsEl = document.getElementById('p1-rank-stars');
    if (p1lvlEl) p1lvlEl.textContent = info.name;
    if (p1starsEl) p1starsEl.textContent = '\u2605'.repeat(info.rank);
  }

  // ── Expose on window ─────────────────────────────────────────────────
  window.startRankUpCeremony  = startRankUpCeremony;
  window.renderProgressWidget = renderProgressWidget;

})();
