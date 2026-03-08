/**
 * tutorial-overlay.js — Tutorial tooltip and pulse overlay
 *
 * Draws tutorial moments (tooltips, pulsing point rings) on top
 * of the game canvas. Manages tutorial RAF loop independently.
 *
 * Exports: window.showTutorialTooltip, window.startDismissTutorial,
 *          window.checkTutorialMoments, window.ensureTutorialLoop,
 *          window.drawTutorialOverlay
 * Dependencies: ctx, W, H, points, RADIUS, polygons, gameOver,
 *               _tutorialMode, _tutorialStep, _tutorialBlocked,
 *               _tutorialTooltip, _tutorialBtnRect, _tutorialPulseIdx,
 *               _tutorialPulseStart, _tutorialPolygonSeen, _tutorialRaf,
 *               _rrect(), draw(), t(), estimateRemainingMoves()
 * Load order: after themes.js, after star-renderer.js
 */
(function () {
  'use strict';

  /** Show a tutorial tooltip at canvas position (x, y). Blocks game input. */
  function showTutorialTooltip(text, x, y) {
    _tutorialTooltip = { text: text, x: x, y: y, startMs: performance.now(), fadingOut: false, fadeStartMs: 0 };
    _tutorialBlocked = true;
    _tutorialBtnRect = null;
    ensureTutorialLoop();
  }

  /** Begin fade-out of the current tooltip. Input unblocked when fade completes. */
  function startDismissTutorial() {
    if (!_tutorialTooltip || _tutorialTooltip.fadingOut) return;
    _tutorialTooltip.fadingOut = true;
    _tutorialTooltip.fadeStartMs = performance.now();
    ensureTutorialLoop();
  }

  /**
   * Check whether a new tutorial moment should be triggered after a move.
   * Moment 2: first polygon scored.
   * Moment 3: ≤3 valid moves remain.
   */
  function checkTutorialMoments() {
    if (!_tutorialMode || _tutorialBlocked || gameOver) return;
    if (_tutorialStep === 1 && !_tutorialPolygonSeen && polygons.length > 0) {
      _tutorialPolygonSeen = true;
      _tutorialStep = 2;
      _tutorialPulseIdx = -1; // stop moment-1 pulse
      showTutorialTooltip(
        t('tut_caught'),
        W / 2 - 148, H / 2 - 80
      );
      return;
    }
    if (_tutorialStep === 2 && estimateRemainingMoves() <= 3) {
      _tutorialStep = 3;
      showTutorialTooltip(
        t('tut_final'),
        W / 2 - 148, H - 170
      );
    }
  }

  /** Keep a tutorial animation loop running while tooltip or pulse is active. */
  function ensureTutorialLoop() {
    if (_tutorialRaf) return;
    function loop() {
      if (!_tutorialMode || (!_tutorialTooltip && _tutorialPulseIdx < 0)) {
        _tutorialRaf = null; return;
      }
      draw();
      _tutorialRaf = requestAnimationFrame(loop);
    }
    _tutorialRaf = requestAnimationFrame(loop);
  }

  /** Wrap text to lines fitting maxWidth using current ctx font. */
  function tutWrapText(text, maxWidth) {
    var result = [];
    var paragraphs = text.split('\n');
    for (var p = 0; p < paragraphs.length; p++) {
      var words = paragraphs[p].split(' ');
      var line = '';
      for (var w = 0; w < words.length; w++) {
        var test = line ? line + ' ' + words[w] : words[w];
        if (ctx.measureText(test).width > maxWidth && line) { result.push(line); line = words[w]; }
        else line = test;
      }
      if (line) result.push(line);
    }
    return result;
  }

  /**
   * Draw tutorial tooltip and point pulse on top of the game canvas.
   * Called at the end of draw() when _tutorialMode is true.
   */
  function drawTutorialOverlay() {
    // Pulse ring on the selected point (moment 1)
    if (_tutorialPulseIdx >= 0 && points[_tutorialPulseIdx]) {
      var pp = points[_tutorialPulseIdx];
      var elapsed = (performance.now() - _tutorialPulseStart) / 1200;
      var pr = RADIUS * 2 + 4 * Math.sin(elapsed * Math.PI * 2);
      ctx.save();
      ctx.beginPath();
      ctx.arc(pp.x, pp.y, pr, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(225,223,220,0.75)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    if (!_tutorialTooltip) return;
    var text = _tutorialTooltip.text;
    var x = _tutorialTooltip.x;
    var y = _tutorialTooltip.y;
    var startMs = _tutorialTooltip.startMs;
    var fadingOut = _tutorialTooltip.fadingOut;
    var fadeStartMs = _tutorialTooltip.fadeStartMs;
    var now = performance.now();
    var alpha;
    if (fadingOut) {
      alpha = 1 - Math.min(1, (now - fadeStartMs) / 300);
      if (alpha <= 0) {
        _tutorialTooltip = null;
        _tutorialBlocked = false;
        if (!gameOver) checkTutorialMoments(); // re-check after dismiss
        return;
      }
    } else {
      alpha = Math.min(1, (now - startMs) / 400);
    }

    ctx.save();
    ctx.font = '18px system-ui, sans-serif';
    var pad = 16, lineH = 26, btnH = 34, btnW = 130, boxW = 300;
    var wrappedLines = tutWrapText(text, boxW - pad * 2);
    var boxH = pad * 2 + wrappedLines.length * lineH + 10 + btnH;
    var bx = Math.max(10, Math.min(W - boxW - 10, x));
    var by = Math.max(10, Math.min(H - boxH - 10, y));

    ctx.globalAlpha = alpha;

    // Box
    ctx.fillStyle = 'rgba(26,26,46,0.92)';
    _rrect(ctx, bx, by, boxW, boxH, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(248,247,245,0.18)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Text
    ctx.fillStyle = '#F8F7F5';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    for (var i = 0; i < wrappedLines.length; i++) {
      ctx.fillText(wrappedLines[i], bx + pad, by + pad + i * lineH);
    }

    // Dismiss button
    var btnX = bx + boxW - pad - btnW;
    var btnY = by + boxH - pad - btnH;
    ctx.fillStyle = 'rgba(248,247,245,0.14)';
    _rrect(ctx, btnX, btnY, btnW, btnH, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(248,247,245,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#F8F7F5';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Понятно →', btnX + btnW / 2, btnY + btnH / 2);

    // Store button rect for click detection (in canvas coordinates)
    _tutorialBtnRect = { x: btnX, y: btnY, w: btnW, h: btnH };

    ctx.restore();
  }

  // ── Expose on window ─────────────────────────────────────────────────
  window.showTutorialTooltip  = showTutorialTooltip;
  window.startDismissTutorial = startDismissTutorial;
  window.checkTutorialMoments = checkTutorialMoments;
  window.ensureTutorialLoop   = ensureTutorialLoop;
  window.drawTutorialOverlay  = drawTutorialOverlay;

})();
