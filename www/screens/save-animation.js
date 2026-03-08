/**
 * save-animation.js — Save-to-sky constellation animation
 *
 * Full-screen overlay animation: constellation shrinks into a star point,
 * blinks, shows "saved" text, then fades out. Supports all themes.
 *
 * Exports: window.saveToSkyAnimation, window._drawSkyStar
 * Dependencies: LC (layout-config), canvas, W, H, points, lines,
 *               activeTheme, THEMES, _SKY_WORLD, _skyEnsureBg, _bgStars,
 *               t()
 * Load order: after sky-screen.js, after themes.js
 */
(function () {
  'use strict';

  /**
   * Helper: draw a star point on the overlay canvas.
   * Used for the target dot and background stars.
   */
  function _drawSkyStar(ctx, x, y, alpha, r, withGlow, starRGB) {
    if (alpha <= 0) return;
    var sr = starRGB || '255,245,210';
    ctx.save();
    ctx.globalAlpha = alpha;
    if (withGlow) {
      var g = ctx.createRadialGradient(x, y, 0, x, y, r * 7);
      g.addColorStop(0,    'rgba(' + sr + ',0.95)');
      g.addColorStop(0.25, 'rgba(' + sr + ',0.35)');
      g.addColorStop(1,    'rgba(' + sr + ',0)');
      ctx.beginPath(); ctx.arc(x, y, r * 7, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(' + sr + ',1.0)';
    ctx.fill();
    ctx.restore();
  }

  /**
   * saveToSkyAnimation — анимация сохранения созвездия:
   *   созвездие плавно сжимается сверху → становится точкой на небе →
   *   точка подмигивает → "Созвездие сохранено ✦" → затемнение → onDone()
   */
  function saveToSkyAnimation(constName, onDone) {
    var dpr = LC.dpr();

    var ov = document.getElementById('sky-anim-overlay');
    var VW = document.documentElement.clientWidth  || window.innerWidth;
    var VH = document.documentElement.clientHeight || window.innerHeight;
    LC.setupCanvas(ov, VW, VH);
    ov.style.display = 'block';
    var oc = ov.getContext('2d');

    // ── Цвета из активной темы ──────────────────────────────────────────────
    var _at = THEMES[activeTheme] || THEMES.stargazer;
    var _aBg      = _at.skyBg      || '#060612';
    var _aStarRGB = _at.skyStarRGB || '255,245,210';
    var _aHaloRGB = _at.skyBgStar  ? '255,200,120' : _aStarRGB;
    var _aLabel   = _at.skyLabelHL || 'rgba(255,248,235,1)';
    var _aHasBgStars = !!_at.skyBgStar;

    // Снапшот игрового созвездия в экранных координатах
    var rect   = canvas.getBoundingClientRect();
    var scaleX = rect.width  / W;
    var scaleY = rect.height / H;
    var snapPts = points.map(function (p) {
      return { sx: rect.left + p.x * scaleX, sy: rect.top + p.y * scaleY };
    });
    var snapEdges = Array.from(lines.keys()).map(function (key) {
      var parts = key.split('-').map(Number); return [parts[0], parts[1]];
    });
    var startCX = snapPts.reduce(function (s, p) { return s + p.sx; }, 0) / snapPts.length;
    var startCY = snapPts.reduce(function (s, p) { return s + p.sy; }, 0) / snapPts.length;

    // Целевая позиция — центр экрана
    var skyS   = 0.22;
    var skyOX  = VW / 2 - _SKY_WORLD / 2 * skyS;
    var skyOY  = VH / 2 - _SKY_WORLD / 2 * skyS;
    var tX  = VW / 2;
    var tY  = VH / 2;

    _skyEnsureBg();

    // Рисует звезду как в игре, но уменьшенную в 3×
    function _drawAnimBgStar(c, sx, sy, r, alpha, mA) {
      var fa = alpha * mA;
      if (fa <= 0.003) return;
      var coreR = Math.max(0.5, r * 1.2);
      var haloR = Math.max(1.5, r * 6);
      var hg = c.createRadialGradient(sx, sy, 0, sx, sy, haloR);
      hg.addColorStop(0,    'rgba(' + _aHaloRGB + ',' + Math.min(0.72, fa * 0.55).toFixed(3) + ')');
      hg.addColorStop(0.28, 'rgba(' + _aHaloRGB + ',' + (fa * 0.14).toFixed(3) + ')');
      hg.addColorStop(1,    'rgba(' + _aHaloRGB + ',0)');
      c.fillStyle = hg;
      c.beginPath(); c.arc(sx, sy, haloR, 0, Math.PI * 2); c.fill();
      var cg = c.createRadialGradient(sx, sy, 0, sx, sy, coreR);
      cg.addColorStop(0,    'rgba(' + _aStarRGB + ',' + Math.min(0.95, fa * 0.95).toFixed(3) + ')');
      cg.addColorStop(0.35, 'rgba(' + _aStarRGB + ',' + (fa * 0.55).toFixed(3) + ')');
      cg.addColorStop(0.75, 'rgba(' + _aStarRGB + ',' + (fa * 0.12).toFixed(3) + ')');
      cg.addColorStop(1,    'rgba(' + _aStarRGB + ',0)');
      c.fillStyle = cg;
      c.beginPath(); c.arc(sx, sy, coreR, 0, Math.PI * 2); c.fill();
    }

    // Тайминги (мс)
    var T_SKY    = 400;
    var T_SHRINK = 1600;
    var T_BLINK  = 1000;
    var T_TEXT   = 400;
    var T_HOLD   = 1000;
    var T_FADE   = 600;
    var TOTAL    = T_SHRINK + T_BLINK + T_TEXT + T_HOLD + T_FADE;

    var startT = performance.now();
    function eio(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }

    function frame() {
      var elapsed = performance.now() - startT;
      var done    = elapsed >= TOTAL;

      oc.clearRect(0, 0, VW, VH);

      var fadeStart = T_SHRINK + T_BLINK + T_TEXT + T_HOLD;
      var masterA   = elapsed >= fadeStart
        ? Math.max(0, 1 - (elapsed - fadeStart) / T_FADE) : 1;

      // ── Фон ──
      var bgA = Math.min(1, elapsed / T_SKY) * masterA;
      oc.globalAlpha = bgA;
      oc.fillStyle = _aBg;
      oc.fillRect(0, 0, VW, VH);

      oc.globalAlpha = 1;
      if (_aHasBgStars) {
        _bgStars.forEach(function (s) {
          var sx = s.x * skyS + skyOX;
          var sy = s.y * skyS + skyOY;
          if (sx < -10 || sx > VW + 10 || sy < -10 || sy > VH + 10) return;
          var r = Math.max(0.4, s.r * skyS * 5);
          _drawAnimBgStar(oc, sx, sy, r, s.a, bgA);
        });
      }

      // ── Фаза 1: каждая звезда летит к центру по своей дуге ──
      if (elapsed < T_SHRINK) {
        var tPhase = elapsed / T_SHRINK;
        function eoc(x) { return 1 - Math.pow(1 - x, 3); }

        snapPts.forEach(function (p, i) {
          var stagger = snapPts.length > 1 ? 0.12 / snapPts.length : 0;
          var delay   = i * stagger;
          var tStar   = Math.max(0, Math.min(1, (tPhase - delay) / (1 - delay)));
          var ease    = eoc(tStar);

          var dx    = tX - p.sx;
          var dy    = tY - p.sy;
          var ang   = Math.atan2(dy, dx);
          var perpX = -Math.sin(ang);
          var perpY =  Math.cos(ang);
          var sign  = (i % 2 === 0 ? 1 : -1);
          var arcH  = (10 + (i * 13) % 28);
          var arc   = sign * arcH * Math.sin(tStar * Math.PI);

          var px = p.sx + dx * ease + perpX * arc;
          var py = p.sy + dy * ease + perpY * arc;

          var starA = Math.max(0, 1 - tStar * 1.15) * masterA;
          var coreR = Math.max(0.3, 4 * (1 - ease * 0.84));
          if (starA < 0.01) return;

          var haloR = coreR * 5.5;
          var hg = oc.createRadialGradient(px, py, 0, px, py, haloR);
          hg.addColorStop(0,    'rgba(' + _aHaloRGB + ',' + (starA * 0.48).toFixed(3) + ')');
          hg.addColorStop(0.35, 'rgba(' + _aHaloRGB + ',' + (starA * 0.10).toFixed(3) + ')');
          hg.addColorStop(1,    'rgba(' + _aHaloRGB + ',0)');
          oc.fillStyle = hg;
          oc.beginPath(); oc.arc(px, py, haloR, 0, Math.PI * 2); oc.fill();

          var cg = oc.createRadialGradient(px, py, 0, px, py, coreR);
          cg.addColorStop(0,    'rgba(' + _aStarRGB + ',' + (starA * 0.95).toFixed(3) + ')');
          cg.addColorStop(0.45, 'rgba(' + _aStarRGB + ',' + (starA * 0.40).toFixed(3) + ')');
          cg.addColorStop(1,    'rgba(' + _aStarRGB + ',0)');
          oc.fillStyle = cg;
          oc.beginPath(); oc.arc(px, py, coreR, 0, Math.PI * 2); oc.fill();
        });

        var tLate = Math.max(0, (tPhase - 0.6) / 0.4);
        _drawSkyStar(oc, tX, tY, tLate * masterA, 2.5, tLate > 0.3, _aStarRGB);
      }

      // ── Фаза 2: точка мигает ──
      if (elapsed >= T_SHRINK && elapsed < T_SHRINK + T_BLINK) {
        var tBlink = (elapsed - T_SHRINK) / T_BLINK;
        var blink = 0.45 + 0.55 * Math.abs(Math.sin(tBlink * Math.PI * 4));
        _drawSkyStar(oc, tX, tY, blink * masterA, 2.5, true, _aStarRGB);
      }

      // ── Фазы 3–4: звезда + текст + удержание ──
      if (elapsed >= T_SHRINK + T_BLINK) {
        _drawSkyStar(oc, tX, tY, masterA, 2.5, true, _aStarRGB);
        var textElapsed = elapsed - T_SHRINK - T_BLINK;
        var textA = Math.min(1, textElapsed / T_TEXT) * masterA;
        if (textA > 0.01) {
          oc.save();
          oc.globalAlpha = textA;
          oc.font = '500 15px "Raleway", sans-serif';
          oc.textAlign = 'center';
          oc.shadowColor = 'rgba(' + _aStarRGB + ',0.40)';
          oc.shadowBlur  = 14;
          oc.fillStyle = _aLabel;
          oc.fillText(t('victory_saved'), tX, tY + 50);
          oc.restore();
        }
      }

      if (!done) requestAnimationFrame(frame);
      else {
        ov.style.display = 'none';
        ov.style.width = '';
        ov.style.height = '';
        if (typeof _resetZoom === 'function') _resetZoom();
        onDone();
      }
    }
    requestAnimationFrame(frame);
  }

  // ── Expose on window ─────────────────────────────────────────────────
  window._drawSkyStar       = _drawSkyStar;
  window.saveToSkyAnimation = saveToSkyAnimation;

})();
