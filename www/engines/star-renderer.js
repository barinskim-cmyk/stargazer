/* ═══════════════════════════════════════════════════════════════════════════
 *  Stargazer — Star Renderer
 *  Drawing stars (glow + rays + core), twinkle animations, rank emblems,
 *  and mini-constellation thumbnails.
 *
 *  Reads from window: RADIUS, points, lines, winner, gameOver, activeTheme,
 *                     ctx, draw(), window._appSettings
 *  Exposes on window: drawStarPoint, drawStarPointTo, startTwinkleLoop,
 *                     startGameTwinkleLoop, drawRankEmblem, drawRankEmblemOnCtx,
 *                     drawMiniConstellation, RANK_EMBLEMS,
 *                     _twinkleRaf, _twinkleState, _gameTwinkleRaf, _gameTwinkleState
 * ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Twinkle state ─────────────────────────────────────────────────────
  let _twinkleRaf       = null;
  let _twinkleState     = null; // {idx, startMs, duration, waitUntil}
  let _gameTwinkleRaf   = null;
  let _gameTwinkleState = null; // {idx, startMs, duration, waitUntil}

  // ── Core star implementation ──────────────────────────────────────────

  function _drawStarImpl(c, px, py, degree, isHov, isSel, isBlocking, boost, glowFull) {
    c.save();
    const BASE = RADIUS + 3;
    const deg  = Math.min(degree, 8);
    const coreR = BASE * (1 + deg * 0.20);
    const glowR = coreR * (isHov || isSel ? 5.5 : 3.5);

    const glowAlpha = isBlocking ? 0.72 :
                      isSel      ? 0.68 :
                      isHov      ? 0.55 :
                      deg >= 7   ? 0.34 :
                      deg >= 6   ? 0.28 :
                      deg >= 5   ? 0.22 :
                      deg >= 4   ? 0.16 :
                      deg >= 3   ? 0.11 :
                      deg >= 2   ? 0.06 :
                      deg >= 1   ? 0.03 : 0.01;

    const boostedAlpha = Math.min(glowAlpha + boost * 0.40, 0.95);
    const boostedGlowR = glowR  * (1 + boost * 0.25);
    const boostedCoreR = coreR  * (1 + boost * 0.20);

    const spikeScale = deg === 0 ? 0.00 :
                       deg === 1 ? 0.12 :
                       deg === 2 ? 0.28 :
                       deg === 3 ? 0.44 :
                       deg === 4 ? 0.58 :
                       deg === 5 ? 0.72 :
                       deg === 6 ? 0.84 :
                       deg === 7 ? 0.93 : 1.00;

    const glowColor = isBlocking ? '255,70,70' : '255,200,120';
    const haloR = boostedGlowR * 1.8 * (0.3 + spikeScale * 0.7);
    const a = boostedAlpha;

    if (glowFull) {
      // ── Layer 1: circular halo ──────────────────────────────────────
      c.save();
      c.shadowBlur  = Math.max(8, haloR * 0.22);
      c.shadowColor = 'rgba(' + glowColor + ',' + (a * 0.28).toFixed(3) + ')';
      const circleGrad = c.createRadialGradient(px, py, 0, px, py, haloR);
      circleGrad.addColorStop(0,    'rgba(' + glowColor + ',' + Math.min(a * 0.55, 0.92).toFixed(3) + ')');
      circleGrad.addColorStop(0.12, 'rgba(' + glowColor + ',' + (a * 0.42).toFixed(3) + ')');
      circleGrad.addColorStop(0.28, 'rgba(' + glowColor + ',' + (a * 0.22).toFixed(3) + ')');
      circleGrad.addColorStop(0.50, 'rgba(' + glowColor + ',' + (a * 0.09).toFixed(3) + ')');
      circleGrad.addColorStop(0.75, 'rgba(' + glowColor + ',' + (a * 0.03).toFixed(3) + ')');
      circleGrad.addColorStop(1,    'rgba(' + glowColor + ',0)');
      c.beginPath(); c.arc(px, py, haloR, 0, Math.PI * 2);
      c.fillStyle = circleGrad; c.fill();
      c.restore();

      // ── Layer 2: spike rays ─────────────────────────────────────────
      if (degree > 0) {
        const spikeLen = boostedGlowR * 0.93 * spikeScale;
        const spikePasses = [
          { base: boostedCoreR * 1.1,  alpha: boostedAlpha * 0.12, sblur: Math.max(10, spikeLen * 0.40) },
          { base: boostedCoreR * 0.55, alpha: boostedAlpha * 0.28, sblur: Math.max(7,  spikeLen * 0.28) },
          { base: boostedCoreR * 0.22, alpha: boostedAlpha * 0.70, sblur: Math.max(4,  spikeLen * 0.16) },
        ];
        spikePasses.forEach(function (pass) {
          c.save();
          c.shadowBlur  = pass.sblur;
          c.shadowColor = 'rgba(' + glowColor + ',' + Math.min(pass.alpha * 1.2, 0.95).toFixed(3) + ')';
          [0, Math.PI / 2, Math.PI, Math.PI * 3 / 2].forEach(function (angle) {
            var ex = Math.cos(angle), ey = Math.sin(angle);
            var nx = -ey, ny = ex;
            c.beginPath();
            c.moveTo(px + nx * pass.base, py + ny * pass.base);
            c.lineTo(px + ex * spikeLen, py + ey * spikeLen);
            c.lineTo(px - nx * pass.base, py - ny * pass.base);
            c.closePath();
            var sg = c.createLinearGradient(px, py, px + ex * spikeLen, py + ey * spikeLen);
            sg.addColorStop(0,    'rgba(' + glowColor + ',' + (pass.alpha * 0.30).toFixed(3) + ')');
            sg.addColorStop(0.18, 'rgba(' + glowColor + ',' + (pass.alpha * 0.85).toFixed(3) + ')');
            sg.addColorStop(0.45, 'rgba(' + glowColor + ',' + (pass.alpha * 0.28).toFixed(3) + ')');
            sg.addColorStop(0.75, 'rgba(' + glowColor + ',' + (pass.alpha * 0.06).toFixed(3) + ')');
            sg.addColorStop(1,    'rgba(' + glowColor + ',0)');
            c.fillStyle = sg; c.fill();
          });
          c.restore();
        });
      }
    }

    // ── Layer 3: bright core ────────────────────────────────────────────
    c.save();
    c.shadowBlur  = Math.max(6, boostedCoreR * 0.7);
    c.shadowColor = 'rgba(' + (isBlocking ? '255,110,110' : '255,230,170') + ',0.70)';
    var coreColor = isBlocking ? '255,110,110' : '255,245,210';
    var coreGrad = c.createRadialGradient(px, py, 0, px, py, boostedCoreR);
    coreGrad.addColorStop(0,    'rgba(' + coreColor + ',0.95)');
    coreGrad.addColorStop(0.25, 'rgba(' + coreColor + ',0.80)');
    coreGrad.addColorStop(0.55, 'rgba(' + coreColor + ',0.35)');
    coreGrad.addColorStop(0.80, 'rgba(' + coreColor + ',0.08)');
    coreGrad.addColorStop(1,    'rgba(' + coreColor + ',0)');
    c.beginPath(); c.arc(px, py, boostedCoreR, 0, Math.PI * 2);
    c.fillStyle = coreGrad; c.fill();
    c.restore();

    c.restore();
  }

  // ── Public wrappers ───────────────────────────────────────────────────

  function drawStarPoint(ctx, px, py, degree, isHov, isSel, isBlocking, boost) {
    if (boost === undefined) boost = 0;
    var glowFull = window._appSettings.starGlow !== 'active' || isHov || isSel;
    _drawStarImpl(ctx, px, py, degree, isHov, isSel, isBlocking, boost, glowFull);
  }

  function drawStarPointTo(c, px, py, degree, isHov, isSel, isBlocking, boost) {
    if (boost === undefined) boost = 0;
    _drawStarImpl(c, px, py, degree, isHov, isSel, isBlocking, boost, true);
  }

  // ── Twinkle: victory screen ───────────────────────────────────────────

  function startTwinkleLoop() {
    if (_twinkleRaf) return;

    function pickNext() {
      var candidates = [];
      if (winner < 0) return;
      var deg = new Array(points.length).fill(0);
      lines.forEach(function (player, key) {
        if (player !== winner) return;
        var ab = key.split('-').map(Number);
        deg[ab[0]]++; deg[ab[1]]++;
      });
      points.forEach(function (_, i) { if (deg[i] > 0) candidates.push(i); });
      if (candidates.length === 0) return;
      var idx = candidates[Math.floor(Math.random() * candidates.length)];
      var duration = 900 + Math.random() * 500;
      var waitUntil = performance.now() + duration + 1000 + Math.random() * 2500;
      _twinkleState = { idx: idx, startMs: performance.now(), duration: duration, waitUntil: waitUntil };
    }

    function loop() {
      if (!gameOver) { _twinkleRaf = null; _twinkleState = null; return; }
      var now = performance.now();
      if (!_twinkleState || now >= _twinkleState.waitUntil) pickNext();
      draw();
      _twinkleRaf = requestAnimationFrame(loop);
    }

    pickNext();
    _twinkleRaf = requestAnimationFrame(loop);
  }

  // ── Twinkle: active gameplay ──────────────────────────────────────────

  function startGameTwinkleLoop() {
    if (_gameTwinkleRaf) return;

    function pickNext() {
      if (points.length === 0) return;
      var idx = Math.floor(Math.random() * points.length);
      var duration  = 500 + Math.random() * 600;
      var waitUntil = performance.now() + duration + 800 + Math.random() * 2500;
      _gameTwinkleState = { idx: idx, startMs: performance.now(), duration: duration, waitUntil: waitUntil };
    }

    function loop() {
      if (gameOver || activeTheme !== 'stargazer') {
        _gameTwinkleRaf = null;
        _gameTwinkleState = null;
        return;
      }
      var now = performance.now();
      if (!_gameTwinkleState || now >= _gameTwinkleState.waitUntil) pickNext();
      draw();
      _gameTwinkleRaf = requestAnimationFrame(loop);
    }

    pickNext();
    _gameTwinkleRaf = requestAnimationFrame(loop);
  }

  // ── Rank emblems data ─────────────────────────────────────────────────

  var RANK_EMBLEMS = [
    { // Rank 1 — Наблюдатель: triangle
      pts: [{x:0,y:-32},{x:28,y:18},{x:-28,y:18}],
      edges: [[0,1],[1,2],[2,0]]
    },
    { // Rank 2 — Картограф: cross
      pts: [{x:0,y:-34},{x:34,y:0},{x:0,y:34},{x:-34,y:0},{x:0,y:0}],
      edges: [[0,4],[1,4],[2,4],[3,4]]
    },
    { // Rank 3 — Следопыт: big dipper
      pts: [{x:-34,y:-8},{x:-14,y:-18},{x:6,y:-13},{x:26,y:-18},{x:34,y:6},{x:14,y:14},{x:-4,y:20}],
      edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6]]
    },
    { // Rank 4 — Путешественник: Orion-like
      pts: [
        {x:-18,y:2},{x:0,y:2},{x:18,y:2},
        {x:-28,y:-16},{x:28,y:-16},
        {x:-10,y:-32},{x:10,y:-32},
        {x:-22,y:22},{x:22,y:22}
      ],
      edges: [[0,1],[1,2],[0,3],[2,4],[3,5],[4,6],[5,6],[0,7],[2,8],[7,8]]
    },
    { // Rank 5 — Хранитель: Scorpio
      pts: [
        {x:-28,y:-26},{x:-14,y:-16},{x:0,y:-20},
        {x:14,y:-16},{x:28,y:-26},
        {x:0,y:-6},{x:0,y:8},{x:0,y:20},
        {x:10,y:28},{x:20,y:34},{x:14,y:38},{x:22,y:36}
      ],
      edges: [[0,1],[1,2],[2,3],[3,4],[2,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11]]
    },
    { // Rank 6 — Звездочёт: Cassiopeia (W shape)
      pts: [
        {x:-34,y:-10},{x:-18,y:16},{x:0,y:-4},
        {x:18,y:16},{x:34,y:-10}
      ],
      edges: [[0,1],[1,2],[2,3],[3,4]]
    },
    { // Rank 7 — Навигатор: Southern Cross + pointer stars
      pts: [
        {x:0,y:-34},{x:0,y:34},{x:-26,y:0},{x:26,y:0},
        {x:-30,y:-22},{x:-20,y:-32}
      ],
      edges: [[0,1],[2,3],[0,2],[0,3],[4,5]]
    },
    { // Rank 8 — Астроном: double triangle (Star of David-like)
      pts: [
        {x:0,y:-34},{x:30,y:16},{x:-30,y:16},
        {x:0,y:34},{x:30,y:-16},{x:-30,y:-16}
      ],
      edges: [[0,1],[1,2],[2,0],[3,4],[4,5],[5,3]]
    },
    { // Rank 9 — Страж Неба: Cygnus (Northern Cross)
      pts: [
        {x:0,y:-34},{x:0,y:10},{x:0,y:34},
        {x:-30,y:-8},{x:30,y:-8},
        {x:-14,y:-26},{x:14,y:-26}
      ],
      edges: [[0,1],[1,2],[3,4],[0,5],[0,6],[5,6]]
    },
    { // Rank 10 — Архитектор Созвездий: pentagon + inner star
      pts: [
        {x:0,y:-34},{x:32,y:-10},{x:20,y:28},{x:-20,y:28},{x:-32,y:-10},
        {x:0,y:-14},{x:13,y:4},{x:8,y:18},{x:-8,y:18},{x:-13,y:4}
      ],
      edges: [[0,1],[1,2],[2,3],[3,4],[4,0],[5,7],[7,9],[9,6],[6,8],[8,5],[0,5],[1,6],[2,7],[3,8],[4,9]]
    }
  ];

  // ── Rank emblem drawing ───────────────────────────────────────────────

  function drawRankEmblem(rank, cx, cy) {
    var emblem = RANK_EMBLEMS[rank - 1];
    if (!emblem) return;
    var now = performance.now();
    ctx.save();
    ctx.strokeStyle = '#C0BDBA';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.55;
    emblem.edges.forEach(function (e) {
      ctx.beginPath();
      ctx.moveTo(cx + emblem.pts[e[0]].x, cy + emblem.pts[e[0]].y);
      ctx.lineTo(cx + emblem.pts[e[1]].x, cy + emblem.pts[e[1]].y);
      ctx.stroke();
    });
    emblem.pts.forEach(function (p, i) {
      var twinkle = 0.5 + 0.5 * Math.sin(now / 750 + i * 1.37);
      ctx.globalAlpha = 0.65 + twinkle * 0.35;
      ctx.fillStyle = '#C0BDBA';
      ctx.beginPath();
      ctx.arc(cx + p.x, cy + p.y, 3 + twinkle * 2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawRankEmblemOnCtx(tctx, rank, cx, cy) {
    var emblem = RANK_EMBLEMS[rank - 1];
    if (!emblem) return;
    var now = performance.now();
    tctx.save();
    tctx.strokeStyle = '#C0BDBA'; tctx.lineWidth = 1.5; tctx.globalAlpha = 0.55;
    emblem.edges.forEach(function (e) {
      tctx.beginPath();
      tctx.moveTo(cx + emblem.pts[e[0]].x, cy + emblem.pts[e[0]].y);
      tctx.lineTo(cx + emblem.pts[e[1]].x, cy + emblem.pts[e[1]].y);
      tctx.stroke();
    });
    emblem.pts.forEach(function (pt, i) {
      var twinkle = 0.5 + 0.5 * Math.sin(now / 750 + i * 1.37);
      tctx.globalAlpha = 0.65 + twinkle * 0.35;
      tctx.fillStyle = '#C0BDBA';
      tctx.beginPath(); tctx.arc(cx + pt.x, cy + pt.y, 3 + twinkle * 2, 0, Math.PI * 2); tctx.fill();
    });
    tctx.restore();
  }

  // ── Mini constellation thumbnail ──────────────────────────────────────

  function drawMiniConstellation(canvas, data) {
    var S   = canvas.width;
    var mctx = canvas.getContext('2d');
    mctx.fillStyle = '#060612';
    mctx.fillRect(0, 0, S, S);

    var pts = data.points || [];
    var lns = data.lines  || [];
    var wp  = (data.winner >= 0) ? data.winner : 0;

    var deg = new Array(pts.length).fill(0);
    lns.forEach(function (entry) {
      var key = entry[0], pl = entry[1];
      if (pl !== wp) return;
      var ab = key.split('-').map(Number);
      if (ab[0] < pts.length && ab[1] < pts.length) { deg[ab[0]]++; deg[ab[1]]++; }
    });

    var active = pts.filter(function (_, i) { return deg[i] > 0; });
    if (!active.length) return;

    var PAD  = Math.round(S * 0.14);
    var minX = Math.min.apply(null, active.map(function (p) { return p.x; }));
    var maxX = Math.max.apply(null, active.map(function (p) { return p.x; }));
    var minY = Math.min.apply(null, active.map(function (p) { return p.y; }));
    var maxY = Math.max.apply(null, active.map(function (p) { return p.y; }));
    var srcW = (maxX - minX) || 0.1;
    var srcH = (maxY - minY) || 0.1;
    var scl  = Math.min((S - PAD * 2) / srcW, (S - PAD * 2) / srcH);
    var ofX  = PAD + ((S - PAD * 2) - srcW * scl) / 2;
    var ofY  = PAD + ((S - PAD * 2) - srcH * scl) / 2;
    var tx = function (p) { return (p.x - minX) * scl + ofX; };
    var ty = function (p) { return (p.y - minY) * scl + ofY; };

    // Faint background stars
    for (var i = 0; i < 28; i++) {
      var sx = Math.abs(Math.sin(i * 127.3 + 3)) * S;
      var sy = Math.abs(Math.cos(i * 73.9  + 5)) * S;
      mctx.globalAlpha = 0.04 + Math.abs(Math.sin(i * 211)) * 0.07;
      mctx.beginPath(); mctx.arc(sx, sy, 0.6, 0, Math.PI * 2);
      mctx.fillStyle = '#fff'; mctx.fill();
    }
    mctx.globalAlpha = 1;

    // Glowing lines
    lns.forEach(function (entry) {
      var key = entry[0], pl = entry[1];
      if (pl !== wp) return;
      var ab = key.split('-').map(Number);
      if (!pts[ab[0]] || !pts[ab[1]]) return;
      var ax = tx(pts[ab[0]]), ay = ty(pts[ab[0]]);
      var bx = tx(pts[ab[1]]), by = ty(pts[ab[1]]);
      mctx.beginPath(); mctx.moveTo(ax, ay); mctx.lineTo(bx, by);
      mctx.strokeStyle = 'rgba(248,247,245,0.07)'; mctx.lineWidth = 9; mctx.stroke();
      mctx.beginPath(); mctx.moveTo(ax, ay); mctx.lineTo(bx, by);
      mctx.strokeStyle = 'rgba(248,247,245,0.18)'; mctx.lineWidth = 3.5; mctx.stroke();
      mctx.beginPath(); mctx.moveTo(ax, ay); mctx.lineTo(bx, by);
      mctx.strokeStyle = 'rgba(248,247,245,0.88)'; mctx.lineWidth = 1.2; mctx.stroke();
    });

    // Stars with glow
    var _prevR = RADIUS;
    RADIUS = Math.round(S * 0.013);
    pts.forEach(function (p, i) {
      if (deg[i] === 0) return;
      drawStarPointTo(mctx, tx(p), ty(p), Math.max(deg[i], 2), false, false, false, 0.5);
    });
    RADIUS = _prevR;
  }

  // ── Twinkle boost for draw() ─────────────────────────────────────────

  function getTwinkleBoost(i) {
    function calcBoost(state) {
      if (!state || state.idx !== i) return 0;
      var t = Math.min((performance.now() - state.startMs) / state.duration, 1);
      var env = t < 0.3 ? t / 0.3 : (1 - t) / 0.7;
      return Math.sin(env * Math.PI * 0.5);
    }
    return Math.max(calcBoost(_twinkleState), calcBoost(_gameTwinkleState));
  }

  // ── Expose on window ──────────────────────────────────────────────────

  window.getTwinkleBoost        = getTwinkleBoost;
  window.drawStarPoint          = drawStarPoint;
  window.drawStarPointTo        = drawStarPointTo;
  window.startTwinkleLoop       = startTwinkleLoop;
  window.startGameTwinkleLoop   = startGameTwinkleLoop;
  window.drawRankEmblem         = drawRankEmblem;
  window.drawRankEmblemOnCtx    = drawRankEmblemOnCtx;
  window.drawMiniConstellation  = drawMiniConstellation;
  window.RANK_EMBLEMS           = RANK_EMBLEMS;

  // Expose twinkle state so draw() can read boost values
  Object.defineProperty(window, '_twinkleRaf',       { get: function () { return _twinkleRaf; },       set: function (v) { _twinkleRaf = v; }, configurable: true });
  Object.defineProperty(window, '_twinkleState',     { get: function () { return _twinkleState; },     set: function (v) { _twinkleState = v; }, configurable: true });
  Object.defineProperty(window, '_gameTwinkleRaf',   { get: function () { return _gameTwinkleRaf; },   set: function (v) { _gameTwinkleRaf = v; }, configurable: true });
  Object.defineProperty(window, '_gameTwinkleState', { get: function () { return _gameTwinkleState; }, set: function (v) { _gameTwinkleState = v; }, configurable: true });

})();
