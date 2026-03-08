/**
 * achievements-screen.js — Экран достижений
 *
 * Per-category constellation layouts, animated canvases, rank emblem, tooltip.
 *
 * Зависимости: LC.dpr(), LC.sizeCanvas(), loadProgress(), computeRank(),
 *              ACHIEVEMENTS, drawStarPointTo(), drawRankEmblemOnCtx(),
 *              getRankName(), getAchI18n(), t(), RADIUS (global var)
 *
 * Экспортирует: openAchievementsScreen, closeAchievementsScreen, ACH_CONSTELLATIONS
 */
(function () {
  'use strict';

  // ── Per-category constellation layouts ──────────────────────────────────────
  // stars[i].achIdx → index into ACHIEVEMENTS array.
  // Positions are normalised [0,1]; canvas height is in CSS pixels.
  var ACH_CONSTELLATIONS = {
    win: {
      stars: [
        { x: 0.10, y: 0.72, achIdx: 0 },
        { x: 0.27, y: 0.28, achIdx: 1 },
        { x: 0.44, y: 0.72, achIdx: 2 },
        { x: 0.61, y: 0.28, achIdx: 3 },
        { x: 0.78, y: 0.72, achIdx: 4 },
        { x: 0.90, y: 0.35, achIdx: 5 },
      ],
      edges: [[0,1],[1,2],[2,3],[3,4],[4,5]],
      height: 160,
    },
    play: {
      stars: [
        { x: 0.25, y: 0.50, achIdx: 6 },
        { x: 0.75, y: 0.50, achIdx: 7 },
      ],
      edges: [[0,1]],
      height: 100,
    },
    sky: {
      stars: [
        { x: 0.50, y: 0.50, achIdx: 8 },
      ],
      edges: [],
      height: 100,
    },
    theme: {
      stars: [
        { x: 0.20, y: 0.70, achIdx: 9  },
        { x: 0.50, y: 0.20, achIdx: 10 },
        { x: 0.80, y: 0.70, achIdx: 11 },
      ],
      edges: [[0,1],[1,2]],
      height: 130,
    },
    rank: {
      stars: [
        { x: 0.18, y: 0.72, achIdx: 12 },
        { x: 0.50, y: 0.22, achIdx: 13 },
        { x: 0.82, y: 0.72, achIdx: 14 },
      ],
      edges: [[0,1],[1,2],[0,2]],
      height: 130,
    },
  };

  var _achEmblemRaf    = null;
  var _achConstellRaf  = null;
  var _achTooltipTimer = null;

  function openAchievementsScreen() {
    document.getElementById('achievements-screen').style.display = 'flex';
    if (typeof _resetZoom === 'function') _resetZoom();
    requestAnimationFrame(function () { _loadAchievementsUI(); });
  }

  function closeAchievementsScreen() {
    if (_achEmblemRaf)    { cancelAnimationFrame(_achEmblemRaf);   _achEmblemRaf   = null; }
    if (_achConstellRaf)  { cancelAnimationFrame(_achConstellRaf); _achConstellRaf = null; }
    if (_achTooltipTimer) { clearTimeout(_achTooltipTimer);        _achTooltipTimer = null; }
    document.getElementById('achievements-screen').style.display = 'none';
    if (typeof _resetZoom === 'function') _resetZoom();
  }

  function _loadAchievementsUI() {
    var p    = loadProgress();
    var info = computeRank(p.rating);

    // ── Rank emblem (animated canvas) ──
    var emblemCanvas = document.getElementById('ach-rank-emblem');
    if (emblemCanvas) {
      var ectx = emblemCanvas.getContext('2d');
      var CW = emblemCanvas.width, CH = emblemCanvas.height;
      if (_achEmblemRaf) { cancelAnimationFrame(_achEmblemRaf); _achEmblemRaf = null; }
      function _drawEmblem() {
        ectx.clearRect(0, 0, CW, CH);
        drawRankEmblemOnCtx(ectx, info.rank, CW / 2, CH / 2);
        _achEmblemRaf = requestAnimationFrame(_drawEmblem);
      }
      _drawEmblem();
    }

    // ── Rank info ──
    var _rName    = document.getElementById('ach-rank-name');
    var _rRating  = document.getElementById('ach-rank-rating');
    var _rBarFill = document.getElementById('ach-rank-bar-fill');
    var _rNext    = document.getElementById('ach-rank-next');
    var pct = Math.round((info.progress || 0) * 100);
    if (_rName)    _rName.textContent    = t('rank_prefix') + ' ' + info.rank + '  ·  ' + getRankName(info.rank);
    if (_rRating)  _rRating.textContent  = p.rating + ' ✦';
    if (_rBarFill) _rBarFill.style.width = pct + '%';
    if (_rNext)    _rNext.textContent    = info.nextThreshold !== null
        ? t('ach_until_next') + ' ' + (info.nextThreshold - p.rating) + ' ✦'
        : t('ach_max_rank');

    // ── Achievement constellations ──
    var unlocked = new Set((p.achievementsUnlocked || []).map(function (a) { return a.id; }));
    var unlockTs = new Map((p.achievementsUnlocked || []).map(function (a) { return [a.id, a.ts]; }));
    var scrollEl = document.getElementById('ach-scroll');
    var scrollW  = scrollEl ? scrollEl.clientWidth : window.innerWidth - 40;

    ['win', 'play', 'sky', 'theme', 'rank'].forEach(function (cat) {
      var canvas = document.getElementById('ach-canvas-' + cat);
      if (!canvas) return;
      var data = ACH_CONSTELLATIONS[cat];
      var cssW = canvas.offsetWidth || scrollW;
      var cssH = data.height;
      LC.sizeCanvas(canvas, cssW, cssH);

      // Replace previous click listener with fresh one
      var newCanvas = canvas.cloneNode(false);
      canvas.parentNode.replaceChild(newCanvas, canvas);
      newCanvas.addEventListener('click', function (e) {
        var rect  = newCanvas.getBoundingClientRect();
        var scale = newCanvas.width / rect.width;
        var cx    = (e.clientX - rect.left) * scale;
        var cy    = (e.clientY - rect.top)  * scale;
        var PAD   = newCanvas.width * 0.08;
        var mapXF = function (nx) { return PAD + nx * (newCanvas.width  - PAD * 2); };
        var mapYF = function (ny) { return PAD + ny * (newCanvas.height - PAD * 2); };
        var HIT   = newCanvas.width * 0.13;
        data.stars.forEach(function (star) {
          var sx = mapXF(star.x), sy = mapYF(star.y);
          if (Math.hypot(cx - sx, cy - sy) < HIT) {
            var ach = ACHIEVEMENTS[star.achIdx];
            var isU = unlocked.has(ach.id);
            var ts  = unlockTs.get(ach.id);
            var ai  = getAchI18n(ach.id);
            var date = ts ? ' · ' + t('ach_unlocked') + ' ' + new Date(ts).toLocaleDateString() : '';
            _showAchTooltip(ai.label.replace('\n', ' '), isU ? ai.desc + date : ai.desc, isU);
          }
        });
      });
    });

    _startAchConstellAnim(p);
  }

  /** Animated RAF loop that redraws all achievement constellation canvases. */
  function _startAchConstellAnim(p) {
    if (_achConstellRaf) { cancelAnimationFrame(_achConstellRaf); _achConstellRaf = null; }
    var unlocked = new Set((p.achievementsUnlocked || []).map(function (a) { return a.id; }));
    function frame() {
      var now = performance.now();
      ['win', 'play', 'sky', 'theme', 'rank'].forEach(function (cat) {
        var canvas = document.getElementById('ach-canvas-' + cat);
        if (canvas && canvas.width > 0) {
          _drawAchConstellCanvas(canvas, ACH_CONSTELLATIONS[cat], unlocked, now);
        }
      });
      _achConstellRaf = requestAnimationFrame(frame);
    }
    _achConstellRaf = requestAnimationFrame(frame);
  }

  /** Draw one achievement category constellation onto its canvas. */
  function _drawAchConstellCanvas(canvas, data, unlocked, now) {
    var CW  = canvas.width;
    var CH  = canvas.height;
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, CW, CH);

    // Faint decorative dust (static, seed-based)
    for (var d = 0; d < 18; d++) {
      var dx = Math.abs(Math.sin(d * 137.5 + 3)) * CW;
      var dy = Math.abs(Math.cos(d * 83.7  + 5)) * CH;
      ctx.globalAlpha = 0.03 + Math.abs(Math.sin(d * 211)) * 0.05;
      ctx.fillStyle = '#C0BDBA';
      ctx.beginPath(); ctx.arc(dx, dy, 0.7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    var PAD  = CW * 0.08;
    var mapX = function (nx) { return PAD + nx * (CW - PAD * 2); };
    var mapY = function (ny) { return PAD + ny * (CH - PAD * 2); };

    // Draw edges
    data.edges.forEach(function (edge) {
      var sa = data.stars[edge[0]], sb2 = data.stars[edge[1]];
      var aU = unlocked.has(ACHIEVEMENTS[sa.achIdx].id);
      var bU = unlocked.has(ACHIEVEMENTS[sb2.achIdx].id);
      var ax = mapX(sa.x), ay = mapY(sa.y);
      var bx = mapX(sb2.x), by = mapY(sb2.y);
      if (aU && bU) {
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
        ctx.strokeStyle = 'rgba(248,247,245,0.07)'; ctx.lineWidth = 9; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
        ctx.strokeStyle = 'rgba(248,247,245,0.18)'; ctx.lineWidth = 3.5; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
        ctx.strokeStyle = 'rgba(248,247,245,0.88)'; ctx.lineWidth = 1.2; ctx.stroke();
      } else {
        ctx.save();
        ctx.setLineDash([4, 7]);
        ctx.strokeStyle = 'rgba(248,247,245,0.10)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    });

    // Draw stars
    var _prevR = RADIUS;
    RADIUS = Math.max(3, Math.round(CW * 0.013));
    data.stars.forEach(function (star, i) {
      var ach = ACHIEVEMENTS[star.achIdx];
      var isU = unlocked.has(ach.id);
      var sx  = mapX(star.x), sy = mapY(star.y);
      if (isU) {
        var boost = 0.3 + 0.2 * Math.sin(now / 1200 + i * 1.7);
        drawStarPointTo(ctx, sx, sy, 4, false, false, false, boost);
      } else {
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#C0BDBA';
        ctx.beginPath(); ctx.arc(sx, sy, RADIUS * 0.9, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    });
    RADIUS = _prevR;
  }

  /** Show floating tooltip with achievement info, auto-hides after 3s. */
  function _showAchTooltip(name, desc, isUnlocked) {
    var tt      = document.getElementById('ach-tooltip');
    var name_el = document.getElementById('ach-tooltip-name');
    var desc_el = document.getElementById('ach-tooltip-desc');
    if (!tt || !name_el || !desc_el) return;
    name_el.textContent = (isUnlocked ? '✦ ' : '○ ') + name;
    desc_el.textContent = desc;
    tt.style.display = 'block';
    if (_achTooltipTimer) { clearTimeout(_achTooltipTimer); }
    _achTooltipTimer = setTimeout(function () {
      tt.style.display = 'none';
      _achTooltipTimer = null;
    }, 3000);
  }

  // ── Exports ─────────────────────────────────────────────────────────────────
  window.openAchievementsScreen  = openAchievementsScreen;
  window.closeAchievementsScreen = closeAchievementsScreen;
  window.ACH_CONSTELLATIONS      = ACH_CONSTELLATIONS;

})();
