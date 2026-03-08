/**
 * victory-duel.js — Draw split-screen constellation duel on victory
 *
 * Renders each player's constellation into their own canvas half
 * (c-duel-left / c-duel-right). Supports all themes: stargazer,
 * minimal, suprematist, chalk, default.
 *
 * Exports: window.drawVictoryDuel
 * Dependencies: winner, points, lines, polygons, COUNT, RADIUS,
 *               activeTheme, DW, DH, ctxDL, ctxDR,
 *               CHALK_RAINBOW, CHALK_FILL, T(),
 *               drawChalkDot(), drawChalkSpiral(),
 *               getTwinkleBoost(), drawStarPointTo()
 * Load order: after themes.js, after star-renderer.js
 */
(function () {
  'use strict';

  /**
   * Draw the victory duel — each player's constellation side by side.
   * @param {CanvasRenderingContext2D} mainCtx — unused (kept for call compat)
   * @param {number} canvasW — main canvas width (unused)
   * @param {number} canvasH — main canvas height (unused)
   */
  function drawVictoryDuel(mainCtx, canvasW, canvasH) {
    var leftPlayer  = winner >= 0 ? winner   : 0;
    var rightPlayer = winner >= 0 ? 1-winner : 1;

    // Вычисляет массив степеней точек по линиям конкретного игрока
    function degreeOf(pl) {
      var d = new Array(COUNT).fill(0);
      lines.forEach(function (player, key) {
        if (player !== pl) return;
        var parts = key.split('-').map(Number);
        d[parts[0]]++; d[parts[1]]++;
      });
      return d;
    }

    var degL = degreeOf(leftPlayer);
    var degR = degreeOf(rightPlayer);

    /**
     * Вычисляет трансформацию точек игрока в пространство DW×DH.
     * Масштабирует bounding-box активных точек с отступом PAD.
     */
    function makeTransform(deg) {
      var PAD = 90;
      var active = points.filter(function (_, i) { return deg[i] > 0; });
      if (active.length === 0) return { tx: function (p) { return p.x; }, ty: function (p) { return p.y; }, scale: 1 };
      var minX = Math.min.apply(null, active.map(function (p) { return p.x; }));
      var maxX = Math.max.apply(null, active.map(function (p) { return p.x; }));
      var minY = Math.min.apply(null, active.map(function (p) { return p.y; }));
      var maxY = Math.max.apply(null, active.map(function (p) { return p.y; }));
      var srcW = (maxX - minX) || 1;
      var srcH = (maxY - minY) || 1;
      var scale = Math.min((DW - PAD*2) / srcW, (DH - PAD*2) / srcH);
      var offX = PAD + ((DW - PAD*2) - srcW * scale) / 2;
      var offY = PAD + ((DH - PAD*2) - srcH * scale) / 2;
      return {
        tx: function (p) { return (p.x - minX) * scale + offX; },
        ty: function (p) { return (p.y - minY) * scale + offY; },
        scale: scale,
      };
    }

    var tfL = makeTransform(degL);
    var tfR = makeTransform(degR);

    /**
     * Рисует созвездие одного игрока на переданный контекст c.
     * Рендер зависит от activeTheme: stargazer — звёзды, minimal — S-кривые,
     * suprematist — базовые слои + виниловый круг, остальные — T().dots/lines.
     */
    function drawConstellation(c, player, deg, tf) {
      c.clearRect(0, 0, DW, DH);
      c.fillStyle = T().background;
      c.fillRect(0, 0, DW, DH);

      if (activeTheme === 'stargazer') {
        // ── Stargazer: светящиеся линии + звёзды ──────────────────────────
        c.lineCap = 'round';
        lines.forEach(function (pl, key) {
          if (pl !== player) return;
          var parts = key.split('-').map(Number);
          var ax = tf.tx(points[parts[0]]), ay = tf.ty(points[parts[0]]);
          var bx = tf.tx(points[parts[1]]), by = tf.ty(points[parts[1]]);
          c.save();
          c.lineCap = 'round';
          c.shadowBlur  = 3;
          c.shadowColor = 'rgba(248,247,245,0.90)';
          c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by);
          c.strokeStyle = 'rgba(248,247,245,0.88)'; c.lineWidth = 1.4; c.stroke();
          c.restore();
        });
        points.forEach(function (p, i) {
          var d = deg[i];
          if (d === 0) return;
          var twinkle = getTwinkleBoost(i);
          drawStarPointTo(c, tf.tx(p), tf.ty(p), Math.max(d, 2), false, false, false, 0.7 + twinkle * 0.9);
        });

      } else if (activeTheme === 'minimal') {
        // ── Minimal: S-кривые + увеличенные узлы ─
        var sc = tf.scale;
        c.strokeStyle = '#000000';
        c.lineWidth   = 1.5 * sc;
        c.globalAlpha = 0.55;
        lines.forEach(function (pl, key) {
          if (pl !== player) return;
          var parts = key.split('-').map(Number);
          var x1 = tf.tx(points[parts[0]]), y1 = tf.ty(points[parts[0]]);
          var x2 = tf.tx(points[parts[1]]), y2 = tf.ty(points[parts[1]]);
          var dx = x2 - x1, dy = y2 - y1;
          var len = Math.hypot(dx, dy);
          if (len === 0) return;
          var nx = -dy / len, ny = dx / len;
          var off = len * 0.25;
          c.beginPath();
          c.moveTo(x1, y1);
          c.bezierCurveTo(x1+dx/3+nx*off, y1+dy/3+ny*off,
                          x1+2*dx/3-nx*off, y1+2*dy/3-ny*off,
                          x2, y2);
          c.stroke();
        });
        c.globalAlpha = 1;
        var BASE_R = RADIUS * 4 * sc;
        points.forEach(function (p, i) {
          var d = deg[i];
          if (d === 0) return;
          var r = BASE_R * Math.pow(1.4, d);
          var px = tf.tx(p), py = tf.ty(p);
          c.beginPath(); c.arc(px, py, r, 0, Math.PI * 2);
          if (d === 1) {
            c.strokeStyle = '#000000'; c.lineWidth = 1.5 * sc; c.stroke();
          } else if (d === 2) {
            c.fillStyle = '#ffffff'; c.fill();
            c.strokeStyle = '#000000'; c.lineWidth = 2 * sc; c.stroke();
          } else {
            c.fillStyle = '#ffffff'; c.fill();
            c.strokeStyle = '#000000'; c.lineWidth = 2.5 * sc; c.stroke();
            c.beginPath(); c.arc(px, py, r * 0.18, 0, Math.PI * 2);
            c.fillStyle = '#000000'; c.fill();
          }
        });

      } else {
        // ── Suprematist / Chalk / Default: полигоны + линии + точки ─────────
        polygons.forEach(function (poly, polyIdx) {
          if (poly.player !== player) return;
          var path = poly.path.map(function (i) { return points[i]; });
          c.beginPath();
          c.moveTo(tf.tx(path[0]), tf.ty(path[0]));
          for (var k = 1; k < path.length; k++) c.lineTo(tf.tx(path[k]), tf.ty(path[k]));
          c.closePath();
          if (activeTheme === 'chalk') {
            c.globalAlpha = 0.28;
            c.fillStyle = CHALK_FILL[polyIdx % CHALK_FILL.length];
            c.fill();
            c.globalAlpha = 1;
          } else {
            c.fillStyle = T().captured; c.fill();
          }
        });
        lines.forEach(function (pl, key) {
          if (pl !== player) return;
          var parts = key.split('-').map(Number);
          var ax = tf.tx(points[parts[0]]), ay = tf.ty(points[parts[0]]);
          var bx = tf.tx(points[parts[1]]), by = tf.ty(points[parts[1]]);
          c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by);
          c.strokeStyle = T().lines; c.lineWidth = 2; c.stroke();
        });
        points.forEach(function (p, i) {
          var d = deg[i];
          if (d === 0) return;
          var px = tf.tx(p), py = tf.ty(p);
          if (activeTheme === 'chalk') {
            drawChalkSpiral(c, px, py, 24, CHALK_RAINBOW[i % CHALK_RAINBOW.length], d);
          } else {
            var r = d >= 3 ? RADIUS*2 : d === 2 ? RADIUS*1.5 : RADIUS;
            c.beginPath(); c.arc(px, py, r, 0, Math.PI * 2);
            c.fillStyle = T().dots; c.fill();
          }
        });
        // ── Suprematist: виниловый круг по centroid активных точек игрока ──
        if (activeTheme === 'suprematist') {
          var creamColor = '#F5F0E8';
          var mainColor  = player === 0 ? '#CC2200' : '#1A1A1A';
          var darkColor  = player === 0 ? '#1A1A1A' : '#CC2200';
          var activeObjs = points.filter(function (_, i) { return deg[i] > 0; });
          if (activeObjs.length > 0) {
            var cx = activeObjs.reduce(function (s, p) { return s + tf.tx(p); }, 0) / activeObjs.length;
            var cy = activeObjs.reduce(function (s, p) { return s + tf.ty(p); }, 0) / activeObjs.length;
            var winScore   = polygons.filter(function (p) { return p.player === player; }).length;
            var loseScore  = polygons.filter(function (p) { return p.player !== player && p.player >= 0; }).length;
            var domination = winScore / Math.max(1, winScore + loseScore);
            var mainR      = Math.min(DW, DH) * (0.18 + domination * 0.22);
            var ringCount  = Math.min(3 + winScore, 7);
            for (var k = 0; k < ringCount; k++) {
              var frac  = 1 - (k / ringCount) * 0.88;
              var ringColor = k === ringCount - 1 ? darkColor : (k % 2 === 0 ? mainColor : creamColor);
              c.beginPath(); c.arc(cx, cy, mainR * frac, 0, Math.PI * 2);
              c.fillStyle = ringColor; c.fill();
            }
            c.beginPath(); c.arc(cx, cy, mainR * 0.07, 0, Math.PI * 2);
            c.fillStyle = creamColor; c.fill();
          }
        }
      }
    }

    // Рисуем каждое созвездие в свой canvas
    drawConstellation(ctxDL, leftPlayer,  degL, tfL);
    drawConstellation(ctxDR, rightPlayer, degR, tfR);
  }

  // ── Expose on window ─────────────────────────────────────────────────
  window.drawVictoryDuel = drawVictoryDuel;

})();
