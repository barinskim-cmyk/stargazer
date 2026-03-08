/* ═══════════════════════════════════════════════════════════════════════════
 *  Stargazer — Themes Engine
 *  Theme definitions, chalk drawing primitives, grain overlay, theme switching.
 *
 *  Reads from window: gameOver, points, draw(), startGameTwinkleLoop(),
 *                     COLOR, PREVIEW, FILL, _skyBgCacheRef
 *  Exposes on window: THEMES, T, activeTheme, applyTheme,
 *                     CHALK_RAINBOW, CHALK_FILL, drawChalkPaperBg,
 *                     drawChalkSpiral, drawChalkLine, drawChalkDot,
 *                     regenerateGrain, drawGrainOverlay, startChalkAnim,
 *                     _chalkPaperCache, _chalkAnimRaf, _chalkAnimProgress,
 *                     _grainCanvas, _grainFrameCount
 * ═══════════════════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  // ─────────────────────────────────────────────────────────────────────────
  // State Variables
  // ─────────────────────────────────────────────────────────────────────────

  var _chalkPaperCache = null;
  var _chalkAnimRaf = null;
  var _chalkAnimProgress = 0;
  var _grainCanvas = null;
  var _grainFrameCount = 0;

  // ─────────────────────────────────────────────────────────────────────────
  // Chalk Color Palettes
  // ─────────────────────────────────────────────────────────────────────────

  var CHALK_RAINBOW = ['#FF3B3B', '#FF8C00', '#FFD700', '#4CAF50', '#2196F3', '#9C27B0', '#FF69B4'];
  var CHALK_FILL = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF6FC8', '#C77DFF', '#FF9A3C'];

  // ─────────────────────────────────────────────────────────────────────────
  // Chalk Drawing Functions
  // ─────────────────────────────────────────────────────────────────────────

  function drawChalkPaperBg(ctx, W, H) {
    if (!_chalkPaperCache || _chalkPaperCache.width !== W || _chalkPaperCache.height !== H) {
      var oc = document.createElement('canvas');
      oc.width = W;
      oc.height = H;
      var oc2 = oc.getContext('2d');
      oc2.fillStyle = '#F9F8F6';
      oc2.fillRect(0, 0, W, H);
      for (var i = 0; i < 25000; i++) {
        oc2.fillStyle = 'rgba(180,160,120,' + (Math.random() * 0.06).toFixed(3) + ')';
        oc2.fillRect(Math.random() * W, Math.random() * H, 1, 1);
      }
      for (var i = 0; i < 3000; i++) {
        oc2.fillStyle = 'rgba(160,140,120,' + (Math.random() * 0.04).toFixed(3) + ')';
        oc2.fillRect(Math.random() * W, Math.random() * H, 2, 2);
      }
      oc2.strokeStyle = 'rgba(180,170,155,0.06)';
      oc2.lineWidth = 0.5;
      for (var i = 0; i < 200; i++) {
        var x = Math.random() * W;
        var y = Math.random() * H;
        var len = 15 + Math.random() * 25;
        var angle = (Math.random() - 0.5) * (Math.PI / 6);
        oc2.beginPath();
        oc2.moveTo(x, y);
        oc2.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
        oc2.stroke();
      }
      _chalkPaperCache = oc;
    }
    ctx.drawImage(_chalkPaperCache, 0, 0);
  }

  function drawChalkSpiral(ctx, cx, cy, maxR, color, degree) {
    var seed = (cx * 0.37 + cy * 0.19) % 1;
    var minTurns = 1.2;
    var maxTurns = 4.5;
    var maxDeg = 6;
    var turns = Math.min(maxTurns, minTurns + ((degree || 0) / maxDeg) * (maxTurns - minTurns));
    var r = maxR * (1 + (degree || 0) * 0.08);
    var steps = Math.round(40 + turns * 18);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.0;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.88;
    var pts = [];
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var angle = t * turns * Math.PI * 2;
      var breathe = Math.sin(t * 2.1 + seed * 6.28) * 0.14;
      var drift = Math.sin(t * 0.8 + seed * 3.14) * 0.07;
      var curR = t * r * (1 + breathe + drift);
      var driftX = Math.sin(t * 1.3 + seed * 5.1) * r * 0.06;
      var driftY = Math.cos(t * 1.1 + seed * 4.3) * r * 0.06;
      pts.push({ x: cx + driftX + curR * Math.cos(angle), y: cy + driftY + curR * Math.sin(angle) });
    }
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length - 1; i++) {
      var mx = (pts[i].x + pts[i + 1].x) / 2;
      var my = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    var last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.7;
    ctx.fill();
    ctx.restore();
  }

  function drawChalkLine(ctx, x1, y1, x2, y2, color) {
    var SEGS = 9;
    var dx = x2 - x1;
    var dy = y2 - y1;
    var seed = Math.abs(Math.sin(x1 * y2 * 0.017 + y1 * x2 * 0.013)) % 1;
    var pts = [[x1, y1]];
    for (var k = 1; k < SEGS; k++) {
      var t = k / SEGS;
      var j = 2.2 * 0.6;
      pts.push([
        x1 + dx * t + Math.sin(seed * 31.4 + k * 17.1) * j,
        y1 + dy * t + Math.cos(seed * 11.7 + k * 23.9) * j
      ]);
    }
    pts.push([x2, y2]);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var k = 1; k < pts.length; k++) {
      ctx.lineTo(pts[k][0], pts[k][1]);
    }
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 2.2;
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.filter = 'none';
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.filter = 'none';
    ctx.restore();
  }

  function drawChalkDot(ctx, x, y, r, color) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Grain Overlay Functions
  // ─────────────────────────────────────────────────────────────────────────

  function regenerateGrain() {
    if (!_grainCanvas) {
      _grainCanvas = document.createElement('canvas');
      _grainCanvas.width = 256;
      _grainCanvas.height = 256;
    }
    var gc = _grainCanvas.getContext('2d');
    gc.clearRect(0, 0, 256, 256);
    var count = Math.round(256 * 256 * 0.2);
    for (var i = 0; i < count; i++) {
      var x = Math.random() * 256;
      var y = Math.random() * 256;
      var alpha = Math.random() * 0.022;
      gc.fillStyle = 'rgba(255,255,255,' + alpha.toFixed(4) + ')';
      gc.fillRect(x, y, 1, 1);
    }
  }

  function drawGrainOverlay(ctx, W, H) {
    if (!_grainCanvas) {
      regenerateGrain();
    }
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (var x = 0; x < W; x += 256) {
      for (var y = 0; y < H; y += 256) {
        ctx.drawImage(_grainCanvas, x, y);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Chalk Animation Loop
  // ─────────────────────────────────────────────────────────────────────────

  function startChalkAnim() {
    if (_chalkAnimRaf) return;
    _chalkAnimProgress = 0;
    function loop() {
      if (!window.gameOver || activeTheme !== 'chalk') {
        _chalkAnimRaf = null;
        return;
      }
      _chalkAnimProgress = Math.min(_chalkAnimProgress + 0.018, 1);
      window.draw();
      if (_chalkAnimProgress < 1) {
        _chalkAnimRaf = requestAnimationFrame(loop);
      } else {
        _chalkAnimRaf = null;
      }
    }
    _chalkAnimRaf = requestAnimationFrame(loop);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Theme Definitions
  // ─────────────────────────────────────────────────────────────────────────

  var THEMES = {
    stargazer: {
      background: '#0b0b14',
      dots: 'rgba(255,255,255,0.95)',
      lines: 'rgba(255,240,210,0.88)',
      preview: 'rgba(248,247,245,0.22)',
      captured: 'rgba(255,235,200,0.10)',
      text: '#DEDEDE',
      textSecondary: '#777788',
      buttonBg: 'transparent',
      buttonText: 'rgba(255,245,210,0.95)',
      buttonBorder: 'rgba(255,245,210,0.55)',
      buttonGlow: 'rgba(255,245,210,0.18)',
      lenGlow: 'rgba(220,215,205,0.70)',
      accent: '#C0BDBA',
      overlay: 'rgba(11,11,20,0.7)',
      textHi: 'rgba(248,247,245,0.90)',
      textLo: 'rgba(248,247,245,0.42)',
      textMid: 'rgba(248,247,245,0.62)',
      panelBg: '#0b0b14',
      vignette: 0.45,
      grainOpacity: 0.06,
      cardBg: 'rgba(248,247,245,0.04)',
      cardBorder: 'rgba(248,247,245,0.09)',
      skyBg: '#060612',
      skyBgStar: true,
      skyGlow: true,
      skyDotOther: 'rgba(200,195,220,0.28)',
      skyDotMine: 'rgba(255,245,210,0.55)',
      skyDotHL: 'rgba(255,248,230,0.9)',
      skyLineRGB: '248,247,245',
      skyStarRGB: '255,245,210',
      skyLabelHL: 'rgba(255,248,235,1)',
      skyLabelMine: 'rgba(245,235,215,1)',
      skyLabelOther: 'rgba(220,215,200,1)'
    },
    minimal: {
      background: '#FFFFFF',
      dots: '#000000',
      lines: '#000000',
      preview: 'rgba(0,0,0,0.3)',
      captured: '#E0E0E0',
      text: '#1A1A1A',
      textSecondary: '#666666',
      buttonBg: '#FFFFFF',
      buttonText: '#1A1A1A',
      buttonBorder: '#1A1A1A',
      accent: '#1A1A1A',
      overlay: 'rgba(240,240,240,0.9)',
      textHi: 'rgba(0,0,0,0.88)',
      textLo: 'rgba(0,0,0,0.5)',
      textMid: 'rgba(0,0,0,0.65)',
      panelBg: '#FFFFFF',
      vignette: 0,
      grainOpacity: 0.02,
      cardBg: 'rgba(0,0,0,0.04)',
      cardBorder: 'rgba(0,0,0,0.10)',
      skyBg: '#FFFFFF',
      skyBgStar: false,
      skyGlow: false,
      skyDotOther: 'rgba(0,0,0,0.22)',
      skyDotMine: 'rgba(0,0,0,0.65)',
      skyDotHL: 'rgba(0,0,0,0.95)',
      skyLineRGB: '0,0,0',
      skyStarRGB: '0,0,0',
      skyLabelHL: 'rgba(0,0,0,1)',
      skyLabelMine: 'rgba(30,30,30,0.85)',
      skyLabelOther: 'rgba(80,80,80,0.6)'
    },
    suprematist: {
      background: '#F5F0E8',
      dots: '#1A1A1A',
      lines: '#1A1A1A',
      preview: 'rgba(26,26,26,0.4)',
      captured: 'rgba(204,34,0,0.3)',
      text: '#1A1A1A',
      textSecondary: '#666666',
      buttonBg: '#CC2200',
      buttonText: '#FFFFFF',
      buttonBorder: '#CC2200',
      accent: '#CC2200',
      overlay: 'rgba(245,240,232,0.9)',
      textHi: '#1A1A1A',
      textLo: '#CC2200',
      textMid: 'rgba(26,26,26,0.65)',
      panelBg: '#F5F0E8',
      vignette: 0.15,
      grainOpacity: 0.05,
      cardBg: 'rgba(26,26,26,0.04)',
      cardBorder: 'rgba(26,26,26,0.12)',
      skyBg: '#F5F0E8',
      skyBgStar: false,
      skyGlow: false,
      skyDotOther: 'rgba(26,26,26,0.30)',
      skyDotMine: 'rgba(204,34,0,0.65)',
      skyDotHL: 'rgba(204,34,0,1)',
      skyLineRGB: '26,26,26',
      skyStarRGB: '204,34,0',
      skyLabelHL: 'rgba(204,34,0,1)',
      skyLabelMine: 'rgba(204,34,0,0.85)',
      skyLabelOther: 'rgba(26,26,26,0.50)'
    },
    chalk: {
      background: '#F9F8F6',
      dots: '#E05A3A',
      lines: '#E05A3A',
      preview: 'rgba(224,90,58,0.4)',
      captured: 'rgba(224,90,58,0.15)',
      text: '#3A2A1A',
      textSecondary: 'rgba(58,42,26,0.6)',
      buttonBg: '#F0EDE8',
      buttonText: '#3A2A1A',
      buttonBorder: 'rgba(224,90,58,0.5)',
      accent: '#E05A3A',
      overlay: 'rgba(249,248,246,0.95)',
      textHi: '#3A2A1A',
      textLo: 'rgba(58,42,26,0.5)',
      textMid: 'rgba(58,42,26,0.7)',
      panelBg: '#F9F8F6',
      vignette: 0,
      grainOpacity: 0,
      cardBg: 'rgba(58,42,26,0.04)',
      cardBorder: 'rgba(224,90,58,0.18)',
      skyBg: '#F9F8F6',
      skyBgStar: false,
      skyGlow: false,
      skyDotOther: 'rgba(58,42,26,0.28)',
      skyDotMine: 'rgba(224,90,58,0.65)',
      skyDotHL: 'rgba(224,90,58,1)',
      skyLineRGB: '224,90,58',
      skyStarRGB: '224,90,58',
      skyLabelHL: 'rgba(224,90,58,1)',
      skyLabelMine: 'rgba(224,90,58,0.88)',
      skyLabelOther: 'rgba(58,42,26,0.52)'
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Active Theme Management
  // ─────────────────────────────────────────────────────────────────────────

  var activeTheme = localStorage.getItem('theme') || 'stargazer';

  function T() {
    return THEMES[activeTheme];
  }

  function applyTheme(name) {
    if (!THEMES[name]) return;
    activeTheme = name;
    localStorage.setItem('theme', name);
    var t = THEMES[name];
    window.COLOR = t.lines;
    window.PREVIEW = t.preview;
    window.FILL = t.captured;
    var root = document.documentElement;
    root.style.setProperty('--th-bg', t.background);
    root.style.setProperty('--th-panel-bg', t.panelBg);
    root.style.setProperty('--th-vignette', t.vignette);
    root.style.setProperty('--th-text', t.text);
    root.style.setProperty('--th-text2', t.textSecondary);
    root.style.setProperty('--th-btn-bg', t.buttonBg);
    root.style.setProperty('--th-btn-text', t.buttonText);
    root.style.setProperty('--th-btn-border', t.buttonBorder);
    root.style.setProperty('--th-accent', t.accent);
    root.style.setProperty('--th-btn-glow', t.buttonGlow || 'transparent');
    root.style.setProperty('--th-len-glow', t.lenGlow || 'transparent');
    root.style.setProperty('--th-font', t.font || "'Raleway', sans-serif");
    root.style.setProperty('--th-card-bg', t.cardBg || 'rgba(128,128,128,0.04)');
    root.style.setProperty('--th-card-border', t.cardBorder || 'rgba(128,128,128,0.10)');
    document.body.style.background = t.background;
    document.getElementById('start').style.background = t.background;
    document.getElementById('grain-overlay').style.opacity = t.grainOpacity;
    document.querySelectorAll('.theme-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.theme === name);
    });
    var _skyCanvasEl = document.getElementById('sky-canvas');
    if (_skyCanvasEl) {
      _skyCanvasEl.style.background = t.skyBg || t.background;
    }
    if (window._skyBgCacheRef) {
      window._skyBgCacheRef.clear();
    }
    if (name === 'stargazer' && !window.gameOver && window.points && window.points.length > 0) {
      window.startGameTwinkleLoop();
    }
    if (window.points && window.points.length > 0) {
      window.draw();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Expose on Window
  // ─────────────────────────────────────────────────────────────────────────

  window.CHALK_RAINBOW = CHALK_RAINBOW;
  window.CHALK_FILL = CHALK_FILL;
  window.drawChalkPaperBg = drawChalkPaperBg;
  window.drawChalkSpiral = drawChalkSpiral;
  window.drawChalkLine = drawChalkLine;
  window.drawChalkDot = drawChalkDot;
  window.regenerateGrain = regenerateGrain;
  window.drawGrainOverlay = drawGrainOverlay;
  window.startChalkAnim = startChalkAnim;
  window.THEMES = THEMES;
  window.T = T;
  window.applyTheme = applyTheme;

  Object.defineProperty(window, 'activeTheme', {
    get: function() { return activeTheme; },
    set: function(v) { activeTheme = v; },
    configurable: true
  });

  Object.defineProperty(window, '_chalkPaperCache', {
    get: function() { return _chalkPaperCache; },
    set: function(v) { _chalkPaperCache = v; },
    configurable: true
  });

  Object.defineProperty(window, '_chalkAnimRaf', {
    get: function() { return _chalkAnimRaf; },
    set: function(v) { _chalkAnimRaf = v; },
    configurable: true
  });

  Object.defineProperty(window, '_chalkAnimProgress', {
    get: function() { return _chalkAnimProgress; },
    set: function(v) { _chalkAnimProgress = v; },
    configurable: true
  });

  Object.defineProperty(window, '_grainCanvas', {
    get: function() { return _grainCanvas; },
    set: function(v) { _grainCanvas = v; },
    configurable: true
  });

  Object.defineProperty(window, '_grainFrameCount', {
    get: function() { return _grainFrameCount; },
    set: function(v) { _grainFrameCount = v; },
    configurable: true
  });

})();
