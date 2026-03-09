/**
 * sky-screen.js — экран «Общее небо» / «Моё небо»: zoomable galaxy canvas,
 * Supabase-хранение, LOD-рендеринг созвездий, pan/zoom/pinch.
 *
 * Зависимости (глобальные):
 *   sb (Supabase), THEMES, activeTheme, REAL_CONSTELLATIONS, _constName, _lang,
 *   drawStarPoint, drawStarPointTo, RADIUS, loadProgress, _drawSkyStar,
 *   _getSavedConstellations, _setSavedConstellations
 *
 * Экспортирует через window.*:
 *   openSkyScreen, _skyClose, _skyShowOfflineUI, _skyFindMine, _skyBgCacheRef
 */
(function() {
  'use strict';

  // ── sky screen ("Общее небо") — zoomable galaxy canvas ──────────────────

  var _SKY_WORLD      = 100000; // 100k×100k world → ~300k user constellations capacity
  var _SKY_SMAX       = 3.0;
  var _SKY_THRESH_DOT = 0.15;  // ниже → heatmap-точки (LOD1)
  var _SKY_THRESH     = 0.50;  // выше → полное созвездие (LOD3), между → galaxy (LOD2)
  var _SKY_CELL       = 600;   // размер ячейки процедурных звёзд (масштабируется с миром)

  var _skyMode  = 'global'; // 'global' | 'personal'
  var _skyData  = null, _skyPos = [];
  var _skyScale = 0.22, _skyOffX = 0, _skyOffY = 0;
  var _skyRaf   = null, _skyOpen = false;
  var _skyCV    = null, _skyCX  = null;
  var _skyDrag  = null, _skyPinch = null;
  var _skyAnimRaf  = null;
  var _skyLoadTimer = null;
  var _bgStars  = null; // оставляем для rank-up анимации
  var _skyBgCache = new Map(); // "cx,cy" → stars[] LRU, max 200 cells
  window._skyBgCacheRef = _skyBgCache; // регистрируем для applyTheme (без TDZ)
  var _skyBgPreStars = null; // pre-generated fully random bg stars (replaces cell hash)
  var _skyRealPos   = null; // pre-placed IAU constellation objects
  var _mySkyNames = new Set(); // names of user's own saved constellations

  /**
   * Возвращает userId текущего игрока, или null если гость.
   * 'null' (строка) из localStorage трактуется как «гость».
   */
  function _skyGetUserId() {
    const uid = localStorage.getItem('userId');
    return (!uid || uid === 'null') ? null : uid;
  }
  var _skyHighlightId    = null; // name of highlighted constellation
  var _skyHighlightPulseT = 0;  // performance.now() when pulse started (0 = off)
  var _SKY_PULSE_DUR   = 2400; // 3 × 800ms
  var _skyChannel        = null; // Supabase Realtime channel

  function _skyHash(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h / 0x100000000;
  }

  // Палитра тёплых оттенков для фоновых звёзд
  var _BG_COLORS = [
    '255,252,245', // молочно-белый
    '255,245,220', // тёплый кремовый
    '255,230,190', // янтарный отблеск
    '240,235,255', // холодный белый (редкие)
    '255,255,255', // чистый белый
  ];

  function _skyEnsureBg() {
    if (_bgStars) return;
    // Позиции — Math.random() чтобы не было линейных артефактов хэша
    // 700 мелких + 80 средних + 20 крупных, все — простые точки
    _bgStars = [
      ...Array.from({ length: 700 }, (_, i) => ({
        x:   Math.random() * _SKY_WORLD,
        y:   Math.random() * _SKY_WORLD,
        r:   0.3 + _skyHash('bsr' + i) * 1.0,
        a:   0.06 + _skyHash('bsa' + i) * 0.28,
        col: _BG_COLORS[Math.floor(_skyHash('bsc' + i) * _BG_COLORS.length)],
      })),
      ...Array.from({ length: 80 }, (_, i) => ({
        x:   Math.random() * _SKY_WORLD,
        y:   Math.random() * _SKY_WORLD,
        r:   1.1 + _skyHash('bmr' + i) * 1.3,
        a:   0.14 + _skyHash('bma' + i) * 0.36,
        col: _BG_COLORS[Math.floor(_skyHash('bmc' + i) * _BG_COLORS.length)],
      })),
      ...Array.from({ length: 20 }, (_, i) => ({
        x:   Math.random() * _SKY_WORLD,
        y:   Math.random() * _SKY_WORLD,
        r:   2.0 + _skyHash('blr' + i) * 1.5,
        a:   0.30 + _skyHash('bla' + i) * 0.30,
        col: _BG_COLORS[Math.floor(_skyHash('blc' + i) * _BG_COLORS.length)],
      })),
    ];
  }

  /** Минимальный масштаб: мировой прямоугольник заполняет экран по наибольшей стороне,
   *  чтобы при максимальном уменьшении не были видны «края» неба. */
  function _skyMinScale() {
    if (!_skyCV) return 0.08;
    return Math.max(_skyCV.width, _skyCV.height) / _SKY_WORLD;
  }

  /** Зажимает offset чтобы мир не уходил за экран. */
  function _skyClampOffset() {
    if (!_skyCV) return;
    const W = _skyCV.width, H = _skyCV.height;
    const wW = _SKY_WORLD * _skyScale, wH = _SKY_WORLD * _skyScale;
    if (wW <= W) { _skyOffX = (W - wW) / 2; }
    else { _skyOffX = Math.min(0, Math.max(W - wW, _skyOffX)); }
    if (wH <= H) { _skyOffY = (H - wH) / 2; }
    else { _skyOffY = Math.min(0, Math.max(H - wH, _skyOffY)); }
  }

  /** Возвращает звёзды ячейки (cx, cy) из LRU-кэша.
   *  density=6 + MIN_DIST=120: звёзды не кластеризуются → нет «червяков». */
  function _skyGetCellStars(cx, cy) {
    const key = cx + ',' + cy;
    if (_skyBgCache.has(key)) {
      const s = _skyBgCache.get(key);
      _skyBgCache.delete(key); _skyBgCache.set(key, s);
      return s;
    }
    const MAX_STARS = 6;    // мало звёзд — случайные кластеры редки
    const MIN_DIST  = 120;  // мин. расстояние между звёздами в ячейке (world units)
    const stars = [];
    const placed = [];
    const candidates = MAX_STARS * 5; // пробуем больше кандидатов чем нужно
    for (let i = 0; i < candidates && stars.length < MAX_STARS; i++) {
      const sx = (cx + _skyHash(cx + '_' + cy + '_x' + i)) * _SKY_CELL;
      const sy = (cy + _skyHash(cx + '_' + cy + '_y' + i)) * _SKY_CELL;
      // Пропускаем если слишком близко к уже поставленной звезде
      if (placed.some(p => Math.hypot(p[0] - sx, p[1] - sy) < MIN_DIST)) continue;
      const tier = _skyHash(cx + '_' + cy + '_t' + i);
      const r = tier < 0.78 ? 0.4 + _skyHash(cx + '_' + cy + '_r' + i) * 0.7
              : tier < 0.95 ? 1.1 + _skyHash(cx + '_' + cy + '_r' + i) * 1.0
              :               2.0 + _skyHash(cx + '_' + cy + '_r' + i) * 1.0;
      const a = tier < 0.78 ? 0.06 + _skyHash(cx + '_' + cy + '_a' + i) * 0.20
              : tier < 0.95 ? 0.14 + _skyHash(cx + '_' + cy + '_a' + i) * 0.30
              :               0.28 + _skyHash(cx + '_' + cy + '_a' + i) * 0.28;
      stars.push({
        x: sx, y: sy, r, a,
        col: _BG_COLORS[Math.floor(_skyHash(cx + '_' + cy + '_c' + i) * _BG_COLORS.length)],
      });
      placed.push([sx, sy]);
    }
    if (_skyBgCache.size >= 200) _skyBgCache.delete(_skyBgCache.keys().next().value);
    _skyBgCache.set(key, stars);
    return stars;
  }

  function _skyW2S(wx, wy) {
    return { x: wx * _skyScale + _skyOffX, y: wy * _skyScale + _skyOffY };
  }

  function _skyClamp(s) { return Math.max(_skyMinScale(), Math.min(_SKY_SMAX, s)); }

  function _skyZoom(newS, cx, cy) {
    newS = _skyClamp(newS);
    const wx = (cx - _skyOffX) / _skyScale;
    const wy = (cy - _skyOffY) / _skyScale;
    _skyOffX = cx - wx * newS;
    _skyOffY = cy - wy * newS;
    _skyScale = newS;
  }

  function _skyItemToPos(item, fadeIn) {
    const margin = 3000; // scaled with world size
    const id = String(item.id || item.name || '');
    // Если сервер вернул gx/gy — используем их (0-1 → мировые координаты)
    const wx = (item.gx != null)
      ? item.gx * _SKY_WORLD
      : margin + _skyHash(id + '_x') * (_SKY_WORLD - 2 * margin);
    const wy = (item.gy != null)
      ? item.gy * _SKY_WORLD
      : margin + _skyHash(id + '_y') * (_SKY_WORLD - 2 * margin);
    return {
      id,
      name:       item.name || '—',
      wx, wy,
      hasCoord:   item.gx != null,
      c:          item.data || {},
      opacity:    fadeIn ? 0 : 1,
      fadeStartT: fadeIn ? performance.now() : 0,
    };
  }

  function _skyBuildPos(data) {
    // Collision avoidance убран: при мире 100k×100k и gx/gy от сервера
    // созвездия уже распределены органично; принудительное смещение
    // создаёт визуальную регулярность при малом числе объектов.
    _skyPos = data.map(item => _skyItemToPos(item, false));
  }

  function _skyDraw() {
    if (!_skyCX || !_skyOpen) return;
    const ctx = _skyCX;
    const W = _skyCV.width, H = _skyCV.height;
    const sk = THEMES[activeTheme] || THEMES.stargazer;

    ctx.fillStyle = sk.skyBg;
    ctx.fillRect(0, 0, W, H);

    // Culling bounds in world coords (generous pad for smooth pop-in)
    const pad = Math.max(300, 400 / _skyScale);
    const wL = (-_skyOffX) / _skyScale - pad,  wR = (W - _skyOffX) / _skyScale + pad;
    const wT = (-_skyOffY) / _skyScale - pad,  wB = (H - _skyOffY) / _skyScale + pad;

    // ── Фоновые звёзды: cell-based процедурная генерация ──────────────────
    // Рисуем только когда ячейка >= 8px на экране — иначе звёзды sub-pixel
    // и создают видимый регулярный паттерн сетки при max zoom-out.
    if (sk.skyBgStar && _SKY_CELL * _skyScale >= 8) {
      const cxL = Math.floor(wL / _SKY_CELL);
      const cxR = Math.ceil(wR  / _SKY_CELL);
      const cyT = Math.floor(wT / _SKY_CELL);
      const cyB = Math.ceil(wB  / _SKY_CELL);
      // При большом числе ячеек — ограничиваем 24×24 без stride (лучше качество)
      const nCx = cxR - cxL + 1, nCy = cyB - cyT + 1;
      if (nCx * nCy <= 576) { // 24×24
        ctx.save();
        ctx.filter = 'blur(0.7px)';
        for (let cx = cxL; cx <= cxR; cx++) {
          for (let cy = cyT; cy <= cyB; cy++) {
            const stars = _skyGetCellStars(cx, cy);
            for (let i = 0; i < stars.length; i++) {
              const s = stars[i];
              if (s.x < wL || s.x > wR || s.y < wT || s.y > wB) continue;
              const { x, y } = _skyW2S(s.x, s.y);
              const r = Math.max(0.5, Math.min(1.5, s.r * 0.55));
              ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(${s.col},${s.a})`; ctx.fill();
            }
          }
        }
        ctx.filter = 'none';
        ctx.restore();
      }
    }

    // Highlight state
    const _now = performance.now();
    let _hlElapsed = -1;
    if (_skyHighlightPulseT > 0) {
      _hlElapsed = _now - _skyHighlightPulseT;
      if (_hlElapsed >= _SKY_PULSE_DUR) {
        _skyHighlightPulseT = 0; _skyHighlightId = null; _hlElapsed = -1;
      }
    }

    // ── Real IAU constellations — permanent background layer ──────────────
    if (_skyRealPos) {
      const CREAL = 160; // display size in screen-px at scale 1
      // Slightly warm-white palette for IAU real constellations
      const IAU_GLOW = '205,218,255'; // soft blue-white glow (warmer)
      const IAU_CORE = '242,244,255'; // near-white core with slight warmth

      if (_skyScale < _SKY_THRESH_DOT) {
        // LOD1: glowing dot with subtle twinkle
        _skyRealPos.forEach((rc, ri) => {
          if (rc.wx < wL || rc.wx > wR || rc.wy < wT || rc.wy > wB) return;
          const { x, y } = _skyW2S(rc.wx, rc.wy);
          // Per-star twinkle offset so they don't all pulse together
          const twinkle = 0.5 + 0.5 * Math.sin(_now / 2800 + ri * 1.618);
          if (sk.skyGlow) {
            const glowA = 0.12 + 0.10 * twinkle;
            const g = ctx.createRadialGradient(x, y, 0, x, y, 5.5);
            g.addColorStop(0, `rgba(${IAU_GLOW},${glowA.toFixed(3)})`);
            g.addColorStop(1, `rgba(${IAU_GLOW},0)`);
            ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2);
            ctx.fillStyle = g; ctx.fill();
          }
          ctx.globalAlpha = 0.22 + 0.14 * twinkle;
          ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${IAU_CORE},1)`; ctx.fill();
          ctx.globalAlpha = 1;
        });
      } else if (_skyScale < _SKY_THRESH) {
        // LOD2: halo glow with subtle twinkle — mirrors user LOD2 structure
        _skyRealPos.forEach((rc, ri) => {
          if (rc.wx < wL || rc.wx > wR || rc.wy < wT || rc.wy > wB) return;
          const { x, y } = _skyW2S(rc.wx, rc.wy);
          const r = 1.2 + 5 * (_skyScale / _SKY_THRESH);
          const twinkle = 0.5 + 0.5 * Math.sin(_now / 3200 + ri * 1.618);
          if (sk.skyGlow) {
            const haloR  = r * 2.8;
            const haloA0 = (0.20 + 0.14 * twinkle).toFixed(3);
            const haloA1 = (0.04 + 0.04 * twinkle).toFixed(3);
            const g = ctx.createRadialGradient(x, y, 0, x, y, haloR);
            g.addColorStop(0,   `rgba(${IAU_GLOW},${haloA0})`);
            g.addColorStop(0.4, `rgba(${IAU_GLOW},${haloA1})`);
            g.addColorStop(1,   'rgba(10,6,30,0)');
            ctx.beginPath(); ctx.arc(x, y, haloR, 0, Math.PI * 2);
            ctx.fillStyle = g; ctx.fill();
          }
          const coreA = (0.78 + 0.18 * twinkle).toFixed(3);
          const coreR = Math.max(0.9, r * 0.30);
          ctx.beginPath(); ctx.arc(x, y, coreR, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${IAU_CORE},${coreA})`; ctx.fill();
        });
      } else {
        // LOD3: drawStarPointToCol — same multi-layer glow as user constellations, cool white
        _skyRealPos.forEach((rc, ri) => {
          if (rc.wx < wL || rc.wx > wR || rc.wy < wT || rc.wy > wB) return;
          const { x: cx, y: cy } = _skyW2S(rc.wx, rc.wy);
          const sz  = CREAL * _skyScale;
          const mpx = pt => cx + (pt.x - 0.5) * sz;
          const mpy = pt => cy + (pt.y - 0.5) * sz;

          const deg = new Array(rc.pts.length).fill(0);
          rc.lns.forEach(([a, b]) => { deg[a]++; deg[b]++; });

          // Линии — только когда созвездие достаточно крупное (>= 180px)
          if (sz >= 180) {
            ctx.save();
            ctx.globalAlpha = 0.22;
            ctx.lineCap     = 'round';
            ctx.shadowBlur  = 4;
            ctx.shadowColor = 'rgba(180,205,255,0.55)';
            ctx.beginPath();
            rc.lns.forEach(([a, b]) => {
              ctx.moveTo(mpx(rc.pts[a]), mpy(rc.pts[a]));
              ctx.lineTo(mpx(rc.pts[b]), mpy(rc.pts[b]));
            });
            ctx.strokeStyle = 'rgba(205,220,255,0.85)';
            ctx.lineWidth   = Math.max(0.5, 0.9 * _skyScale);
            ctx.stroke();
            ctx.restore();
          }

          // Звёзды через drawStarPointToCol — полное свечение + лучи, холодные цвета
          ctx.globalAlpha = 0.55;
          const _prevR = RADIUS;
          RADIUS = Math.max(1, Math.round(sz * 0.013));
          rc.pts.forEach((pt, i) => {
            if (deg[i] === 0) return;
            // Лёгкий twinkle boost, у каждой звезды свой фазовый сдвиг
            const tBoost = 0.04 * (0.5 + 0.5 * Math.sin(_now / 2500 + ri * 1.618 + i * 0.97));
            drawStarPointToCol(ctx, mpx(pt), mpy(pt), Math.max(deg[i], 1),
                               false, false, false, tBoost, IAU_GLOW, IAU_CORE);
          });
          ctx.filter = 'none';
          RADIUS = _prevR;
          ctx.globalAlpha = 1;

          // Название
          if (sz >= 120) {
            const fs = Math.max(8, Math.min(12, 8.5 * _skyScale));
            ctx.save();
            ctx.globalAlpha  = 0.35;
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'top';
            ctx.font         = `300 ${fs}px -apple-system, "SF Pro Text", sans-serif`;
            ctx.fillStyle    = sk.skyGlow ? 'rgba(210,224,255,1)' : 'rgba(70,70,140,1)';
            ctx.fillText(rc.n.toUpperCase(), cx, cy + sz * 0.5 + fs * 0.8);
            ctx.restore();
          }
        });
      }
    }

    // ── LOD 1: Heatmap точки (очень маленький масштаб) ────────────────────
    if (_skyScale < _SKY_THRESH_DOT) {
      _skyPos.forEach(p => {
        if (p.wx < wL || p.wx > wR || p.wy < wT || p.wy > wB) return;
        const { x, y } = _skyW2S(p.wx, p.wy);
        const isHL   = _skyHighlightId && p.name === _skyHighlightId;
        const isMine = !isHL && (_skyMode === 'personal' || p.id.startsWith('local_') || _mySkyNames.has(p.name));
        ctx.beginPath(); ctx.arc(x, y, isHL ? 3 : 2, 0, Math.PI * 2);
        ctx.fillStyle = isHL ? sk.skyDotHL : isMine ? sk.skyDotMine : sk.skyDotOther;
        ctx.fill();
      });

    // ── LOD 2: Galaxy glow / simple dots ──────────────────────────────────
    } else if (_skyScale < _SKY_THRESH) {
      _skyPos.forEach(p => {
        if (p.wx < wL || p.wx > wR || p.wy < wT || p.wy > wB) return;
        if (p.opacity < 1 && p.fadeStartT > 0)
          p.opacity = Math.min(1, (_now - p.fadeStartT) / 1000);
        ctx.globalAlpha = p.opacity;
        const { x, y } = _skyW2S(p.wx, p.wy);
        const r = 1.2 + 5 * (_skyScale / _SKY_THRESH);
        const isHL   = _skyHighlightId && p.name === _skyHighlightId;
        const isMine = !isHL && (_skyMode === 'personal' || p.id.startsWith('local_') || _mySkyNames.has(p.name));
        const blinkMult = (isHL && _hlElapsed >= 0)
          ? 0.55 + 0.45 * Math.abs(Math.sin(_hlElapsed / 370 * Math.PI)) : 1;

        if (sk.skyGlow) {
          // Stargazer: glowing halos — use custom color if set
          const _pCol = window.starColorById && p.c && p.c.color ? starColorById(p.c.color) : null;
          const haloR = r * (isHL ? 5 : 2.2);
          const g = ctx.createRadialGradient(x, y, 0, x, y, haloR);
          if (isHL) {
            g.addColorStop(0,   `rgba(255,252,242,${blinkMult.toFixed(3)})`);
            g.addColorStop(0.35,`rgba(230,218,200,${(0.38*blinkMult).toFixed(3)})`);
            g.addColorStop(1,   'rgba(10,6,30,0)');
          } else if (_pCol && _pCol.id !== 'gold') {
            g.addColorStop(0,   `rgba(${_pCol.glowColor},${isMine ? 0.42 : 0.28})`);
            g.addColorStop(0.4, `rgba(${_pCol.glowColor},${isMine ? 0.10 : 0.06})`);
            g.addColorStop(1,   'rgba(10,6,30,0)');
          } else if (isMine) {
            g.addColorStop(0,   'rgba(255,245,220,0.42)');
            g.addColorStop(0.4, 'rgba(220,210,185,0.10)');
            g.addColorStop(1,   'rgba(10,6,30,0)');
          } else {
            g.addColorStop(0,   'rgba(255,255,255,0.28)');
            g.addColorStop(0.4, 'rgba(200,200,220,0.06)');
            g.addColorStop(1,   'rgba(10,6,30,0)');
          }
          ctx.beginPath(); ctx.arc(x, y, haloR, 0, Math.PI * 2);
          ctx.fillStyle = g; ctx.fill();
          const coreR = isHL ? Math.max(1.2, r * 0.55) : Math.max(0.8, r * 0.28);
          ctx.beginPath(); ctx.arc(x, y, coreR, 0, Math.PI * 2);
          ctx.fillStyle = isHL
            ? `rgba(255,252,245,${(0.72 + 0.28*blinkMult).toFixed(3)})`
            : (_pCol && _pCol.id !== 'gold')
              ? `rgba(${_pCol.coreColor},${isMine ? 0.90 : 0.78})`
              : isMine ? 'rgba(255,248,230,0.88)' : 'rgba(240,240,255,0.78)';
          ctx.fill();
        } else {
          // Светлые темы: чёткие точки
          const dotR = isHL ? Math.max(2.5, r * 0.6) : Math.max(1.4, r * 0.35);
          ctx.beginPath(); ctx.arc(x, y, dotR, 0, Math.PI * 2);
          ctx.fillStyle = isHL ? sk.skyDotHL : isMine ? sk.skyDotMine : sk.skyDotOther;
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      });

    // ── LOD 3: Полное созвездие ────────────────────────────────────────────
    } else {
      const CSIZE = 90;
      _skyPos.forEach(p => {
        if (p.wx < wL || p.wx > wR || p.wy < wT || p.wy > wB) return;
        if (p.opacity < 1 && p.fadeStartT > 0)
          p.opacity = Math.min(1, (_now - p.fadeStartT) / 1000);

        const { x: cx, y: cy } = _skyW2S(p.wx, p.wy);
        const pts = p.c.points || [];
        const lns = p.c.lines  || [];
        const sz  = CSIZE * _skyScale;
        const wp  = (p.c.winner >= 0) ? p.c.winner : 0;
        const isHL   = _skyHighlightId && p.name === _skyHighlightId;
        const isMine = !isHL && (_skyMode === 'personal' || p.id.startsWith('local_') || _mySkyNames.has(p.name));

        const deg = new Array(pts.length).fill(0);
        lns.forEach(([key, pl]) => {
          if (pl !== wp) return;
          const [a, b] = key.split('-').map(Number);
          if (a < pts.length && b < pts.length) { deg[a]++; deg[b]++; }
        });

        const mpx = pt => cx + (pt.x - 0.5) * sz;
        const mpy = pt => cy + (pt.y - 0.5) * sz;
        const aScale = isHL ? 1.0 : isMine ? 0.80 : 0.50;
        ctx.globalAlpha = p.opacity * aScale;

        // Only dots — no connecting lines in sky view
        if (sk.skyGlow) {
          const _pCol3 = window.starColorById && p.c && p.c.color ? starColorById(p.c.color) : null;
          const _prevR = RADIUS;
          RADIUS = Math.max(1, Math.round(sz * 0.013));
          const hlBlink = isHL && _hlElapsed >= 0
            ? 0.3 + 0.4 * Math.abs(Math.sin(_hlElapsed / 300 * Math.PI)) : 0;
          const boost = isHL ? 0.4 + hlBlink : isMine ? 0.3 : 0.1;
          pts.forEach((pt, i) => {
            if (deg[i] === 0) return;
            if (_pCol3 && _pCol3.id !== 'gold') {
              drawStarPointToCol(ctx, mpx(pt), mpy(pt), Math.max(deg[i], 2),
                                 false, false, false, boost, _pCol3.glowColor, _pCol3.coreColor);
            } else {
              drawStarPointTo(ctx, mpx(pt), mpy(pt), Math.max(deg[i], 2), false, false, false, boost);
            }
          });
          ctx.filter = 'none'; RADIUS = _prevR;
        } else {
          // Светлые темы: только точки
          const sr = sk.skyStarRGB;
          const dotR = Math.max(1.5, sz * 0.022);
          const hlBlink = isHL && _hlElapsed >= 0
            ? 0.3 + 0.4 * Math.abs(Math.sin(_hlElapsed / 300 * Math.PI)) : 0;
          const blinkA = isHL ? (0.65 + 0.35 * hlBlink) : isMine ? 0.85 : 0.65;
          pts.forEach((pt, i) => {
            if (deg[i] === 0) return;
            ctx.beginPath();
            ctx.arc(mpx(pt), mpy(pt), dotR * Math.min(deg[i], 3) * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${sr},${blinkA})`; ctx.fill();
          });
        }

        // Подпись
        if (_skyScale > 0.65) {
          ctx.globalAlpha = p.opacity * (isHL ? 0.92 : isMine ? 0.60 : 0.38);
          const fs = Math.min(13, 9 * _skyScale);
          ctx.font = isHL ? `500 ${fs}px sans-serif` : `300 ${fs}px sans-serif`;
          ctx.fillStyle = isHL ? sk.skyLabelHL : isMine ? sk.skyLabelMine : sk.skyLabelOther;
          ctx.textAlign = 'center';
          ctx.fillText(p.name, cx, cy + sz / 2 + fs + 4);
          ctx.textAlign = 'left';
        }
        ctx.globalAlpha = 1;
      });
    }
  }

  // ── DEBUG: scale overlay (временно для диагностики артефактов) ──────────
  function _skyDrawDebug() {
    if (!_skyCX) return;
    const ctx = _skyCX;
    const W = _skyCV.width;
    const label = 'scale: ' + _skyScale.toFixed(4);
    ctx.save();
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(W - 150, 8, 142, 22);
    ctx.fillStyle = 'rgba(255,220,80,1)';
    ctx.fillText(label, W - 10, 12);
    ctx.restore();
  }

  function _skyLoop() { if (!_skyOpen) { _skyRaf = null; return; } _skyDraw(); _skyDrawDebug(); _skyRaf = requestAnimationFrame(_skyLoop); }

  /**
   * Debounced viewport query — подгружает созвездия в текущем viewport.
   * Вызывается из обработчиков pan/zoom.
   */
  function _skyBboxLoad() {
    if (!_skyCV || !_skyOpen || _skyMode !== 'global') return;
    clearTimeout(_skyLoadTimer);
    _skyLoadTimer = setTimeout(async () => {
      if (!navigator.onLine) return;
      const W = _skyCV.width, H = _skyCV.height;
      const wL = (-_skyOffX) / _skyScale;
      const wT = (-_skyOffY) / _skyScale;
      const wR = (W - _skyOffX) / _skyScale;
      const wB = (H - _skyOffY) / _skyScale;
      // Нормализуем в [0,1] — gx/gy хранятся как доли _SKY_WORLD
      const x0 = Math.max(0, wL / _SKY_WORLD);
      const y0 = Math.max(0, wT / _SKY_WORLD);
      const x1 = Math.min(1, wR / _SKY_WORLD);
      const y1 = Math.min(1, wB / _SKY_WORLD);
      // Пропускаем если viewport вне мира или охватывает >70% мира (zoom слишком далеко —
      // bbox-запрос будет почти полным скан таблицы; лучше показать seed-данные)
      if (x0 >= x1 || y0 >= y1 || (x1 - x0) > 0.70) return;
      const { data, error } = await sb.from('constellations')
        .select('id, name, data, user_id, gx, gy, created_at')
        .gte('gx', x0).lte('gx', x1)
        .gte('gy', y0).lte('gy', y1)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error || !data || !data.length) return;
      const seen = new Set(_skyData ? _skyData.map(d => d.id) : []);
      const fresh = data.filter(d => !seen.has(d.id));
      if (!fresh.length) return;
      _skyData = [...(_skyData || []), ...fresh];
      const uid = _skyGetUserId();
      if (uid) fresh.forEach(d => { if (d.user_id === uid) _mySkyNames.add(d.name); });
      _skyBuildPos(_skyData);
    }, 150);
  }

  function _skyFlyToHighlight() {
    if (!_skyHighlightId || !_skyPos.length || !_skyCV) return;
    const t = _skyPos.find(p => p.name === _skyHighlightId);
    if (!t) return;
    const W = _skyCV.width, H = _skyCV.height;
    const ts = 1.2;
    const tx = W / 2 - t.wx * ts, ty = H / 2 - t.wy * ts;
    const s0 = _skyScale, x0 = _skyOffX, y0 = _skyOffY;
    const dur = 700, t0 = performance.now();
    if (_skyAnimRaf) cancelAnimationFrame(_skyAnimRaf);
    function step(now) {
      const e = 1 - Math.pow(1 - Math.min(1, (now - t0) / dur), 3);
      _skyScale = s0 + (ts - s0) * e;
      _skyOffX  = x0 + (tx - x0) * e;
      _skyOffY  = y0 + (ty - y0) * e;
      if (e < 1) { _skyAnimRaf = requestAnimationFrame(step); return; }
      _skyAnimRaf = null;
      _skyHighlightPulseT = performance.now(); // start 3-pulse sequence
    }
    _skyAnimRaf = requestAnimationFrame(step);
  }

  function _skyApplyModeUI() {
    document.querySelectorAll('.sky-mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === _skyMode);
    });
  }

  async function _skyLoadPersonal() {
    const st  = document.getElementById('sky-status');
    const uid = _skyGetUserId();

    // Authenticated users: load from Supabase filtered by user_id
    if (uid) {
      st.textContent = t('sky_loading'); st.style.display = 'block';
      const { data, error } = await sb.from('constellations')
        .select('id, name, data, gx, gy, created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });
      st.style.display = 'none';
      if (!error && data && data.length) {
        _skyData = data;
        _skyBuildPos(data);
        if (_skyHighlightId) _skyFlyToHighlight();
        return;
      }
      // Supabase returned nothing or error → fall through to localStorage
    }

    // Guests or Supabase fallback: use localStorage
    let saved = [];
    try { saved = JSON.parse(localStorage.getItem('saved_constellations') || '[]'); } catch(e) {}
    if (!saved.length) {
      st.textContent = t('sky_save_first'); st.style.display = 'block';
      _skyData = []; _skyPos = [];
      return;
    }
    st.style.display = 'none';
    // Normalise to same shape as Supabase rows
    const rows = saved.map((item, i) => ({ id: 'local_' + i, name: item.name || '—', data: item }));
    _skyData = rows;
    _skyBuildPos(rows);
    if (_skyHighlightId) _skyFlyToHighlight();
  }

  /**
   * Показывает сообщение «Нет соединения» с кнопкой «Повторить» в #sky-status.
   * @param {function} retryFn — вызывается при нажатии на кнопку
   */
  function _skyShowOfflineUI(retryFn) {
    const st = document.getElementById('sky-status');
    st.style.pointerEvents = 'auto';
    st.innerHTML = t('sky_offline') + '<br><button id="sky-retry-btn">' + t('sky_retry') + '</button>';
    st.style.display = 'block';
    document.getElementById('sky-retry-btn').addEventListener('click', retryFn);
  }

  /**
   * Загружает глобальное небо из Supabase.
   *
   * Стратегия (оптимизировано для мира 100k×100k):
   *  1. Загружает 60 последних созвездий как «затравку» — пользователь сразу что-то видит.
   *  2. Подписывается на realtime INSERT.
   *  3. Запускает _skyBboxLoad() с небольшой задержкой — он подгрузит созвездия
   *     в текущем viewport по мере zoom/pan.
   *
   * Глобальный limit(100) убран: при большом числе пользователей
   * весь датасет не грузится никогда — только viewport через bbox.
   */
  async function _skyReloadGlobal() {
    const st = document.getElementById('sky-status');
    st.innerHTML = '';
    st.style.pointerEvents = 'none';
    st.textContent = t('sky_loading'); st.style.display = 'block';

    // NOTE: navigator.onLine is unreliable in iOS WKWebView — skip pre-check,
    // attempt the request directly; timeout handles real connectivity issues.

    let result;
    try {
      const fetchPromise = sb.from('constellations')
        .select('id, name, data, user_id, gx, gy, created_at')
        .order('created_at', { ascending: false })
        .limit(60); // seed: last 60 constellations anywhere in the world
      const timeoutPromise = new Promise((_, rej) =>
        setTimeout(() => rej(new Error('timeout')), 12000)
      );
      result = await Promise.race([fetchPromise, timeoutPromise]);
    } catch(e) {
      _skyShowOfflineUI(_skyReloadGlobal);
      return;
    }

    const { data, error } = result;
    st.style.display = 'none';

    if (error) {
      console.error('Supabase error:', error);
      _skyShowOfflineUI(_skyReloadGlobal);
      return;
    }
    if (!data || !data.length) {
      st.textContent = t('sky_be_first'); st.style.display = 'block';
      _skySubscribe();
      return;
    }
    _skyData = data;
    const uid = _skyGetUserId();
    if (uid) data.forEach(d => { if (d.user_id === uid) _mySkyNames.add(d.name); });
    _skyBuildPos(data);
    if (_skyHighlightId) _skyFlyToHighlight();
    _skySubscribe();
    // Запускаем bbox-загрузку после того как layout устоится (150 мс → 500 мс)
    setTimeout(_skyBboxLoad, 500);
  }

  /** No-op: replaced by cell-based bg rendering which scales to any world size. */
  function _skyEnsurePreStars() { /* cell-based rendering used instead */ }

  /** Place all 88 IAU constellations randomly (but deterministically) across the sky world.
   *  Uses hash-seeded Poisson-style placement: each constellation tries up to 60 candidate
   *  positions and picks the first that is at least MIN_DIST away from all already-placed ones.
   *  This gives an organic scatter with no visible grid or sector pattern. */
  function _skyEnsureRealConstellations() {
    if (_skyRealPos) return;
    const margin  = 3000; // scaled with world size
    const W       = _SKY_WORLD - 2 * margin;
    const MIN_DIST = 4000; // world-units min gap between constellation centers

    const placed = [];
    _skyRealPos = REAL_CONSTELLATIONS.map((rc, i) => {
      let wx, wy, ok, attempt = 0;
      do {
        wx = margin + _skyHash('rcx' + i + '_a' + attempt) * W;
        wy = margin + _skyHash('rcy' + i + '_a' + attempt) * W;
        ok = placed.every(p => Math.hypot(p.wx - wx, p.wy - wy) >= MIN_DIST);
        attempt++;
      } while (!ok && attempt < 80);
      if (!ok) { // fallback: первый кандидат
        wx = margin + _skyHash('rcx' + i + '_a0') * W;
        wy = margin + _skyHash('rcy' + i + '_a0') * W;
      }
      placed.push({ wx, wy });
      return { n: rc.n, pts: rc.pts, lns: rc.lns, wx, wy };
    });
  }

  async function openSkyScreen(mode = 'global') {
    _skyMode = mode;
    _skyOpen = true;
    _skyData = null; _skyPos = [];  // reset on each open so mode switch reloads
    try {
      const saved = JSON.parse(localStorage.getItem('saved_constellations') || '[]');
      _mySkyNames = new Set(saved.map(s => s.name));
    } catch(e) { _mySkyNames = new Set(); }
    _skyEnsureBg();                 // для rank-up анимаций
    _skyEnsureRealConstellations(); // place IAU constellations (cell-based bg stars need no init)
    document.getElementById('sky-hub-screen').style.display = 'none';
    const _skyScreenEl = document.getElementById('sky-screen');
    _skyScreenEl.style.display = 'flex';
    if (typeof _resetZoom === 'function') _resetZoom();
    _skyCV = document.getElementById('sky-canvas');
    // Measure from the screen element (position:fixed; inset:0) — more reliable than
    // measuring the canvas itself (position:absolute; inset:0 can return default 300px
    // before layout settles in iOS WKWebView)
    const _skyCVW = _skyScreenEl.clientWidth  || _skyScreenEl.offsetWidth  || window.innerWidth;
    const _skyCVH = _skyScreenEl.clientHeight || _skyScreenEl.offsetHeight || window.innerHeight;
    _skyCV.width  = _skyCVW;
    _skyCV.height = _skyCVH;
    // Remove explicit CSS size so inset:0 stays in control
    _skyCV.style.width  = '';
    _skyCV.style.height = '';
    _skyCX = _skyCV.getContext('2d');
    _skyCV.style.background = (THEMES[activeTheme] || THEMES.stargazer).skyBg;
    _skyScale = Math.max(0.22, _skyMinScale()); // мир заполняет экран
    _skyOffX  = _skyCV.width  / 2 - _SKY_WORLD / 2 * _skyScale;
    _skyOffY  = _skyCV.height / 2 - _SKY_WORLD / 2 * _skyScale;
    _skyClampOffset();
    if (_skyRaf) cancelAnimationFrame(_skyRaf);
    _skyLoop();
    _skyApplyModeUI();

    if (_skyMode === 'personal') { _skyLoadPersonal(); return; }
    _skyReloadGlobal();
  }

  function _skySubscribe() {
    if (_skyChannel) { sb.removeChannel(_skyChannel); _skyChannel = null; }
    _skyChannel = sb.channel('sky')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'constellations' },
        (payload) => {
          if (!_skyData) _skyData = [];
          _skyData.unshift(payload.new);
          _skyPos.unshift(_skyItemToPos(payload.new, true));
        }
      )
      .subscribe();
  }

  function _skyClose() {
    _skyOpen = false;
    if (_skyRaf)     { cancelAnimationFrame(_skyRaf);     _skyRaf     = null; }
    if (_skyAnimRaf) { cancelAnimationFrame(_skyAnimRaf); _skyAnimRaf = null; }
    if (_skyChannel) { sb.removeChannel(_skyChannel);     _skyChannel = null; }
    document.getElementById('sky-screen').style.display = 'none';
    document.getElementById('sky-hub-screen').style.display = 'flex';
    if (typeof _resetZoom === 'function') _resetZoom();
  }

  var _skyMineIdx = -1; // текущий индекс в цикле по своим созвездиям

  function _skyGetMineList() {
    const lastName = localStorage.getItem('lastConstellationName');
    const mine = _skyPos.filter(p => _mySkyNames.has(p.name) || p.id.startsWith('local_'));
    // Последнее сохранённое — первым в списке
    if (lastName) {
      const li = mine.findIndex(p => p.name === lastName);
      if (li > 0) { const [it] = mine.splice(li, 1); mine.unshift(it); }
    }
    return mine;
  }

  function _skyFlyCto(t) {
    if (!t || !_skyCV) return;
    _skyHighlightId = t.name;
    _skyHighlightPulseT = performance.now();
    const W = _skyCV.width, H = _skyCV.height;
    const ts = 1.2;
    const tx = W / 2 - t.wx * ts, ty = H / 2 - t.wy * ts;
    const s0 = _skyScale, x0 = _skyOffX, y0 = _skyOffY;
    const dur = 700, t0 = performance.now();
    if (_skyAnimRaf) cancelAnimationFrame(_skyAnimRaf);
    function _animStep(now) {
      const e = 1 - Math.pow(1 - Math.min(1, (now - t0) / dur), 3);
      _skyScale = s0 + (ts - s0) * e;
      _skyOffX  = x0 + (tx - x0) * e;
      _skyOffY  = y0 + (ty - y0) * e;
      if (e < 1) _skyAnimRaf = requestAnimationFrame(_animStep);
    }
    _skyAnimRaf = requestAnimationFrame(_animStep);
    // Обновляем счётчик в кнопке
    const mine = _skyGetMineList();
    const idx  = mine.indexOf(t);
    const nav  = document.getElementById('sky-mine-counter');
    if (nav) nav.textContent = mine.length > 1 ? `${idx + 1} / ${mine.length}` : '';
  }

  function _skyFindMine(dir = 1) {
    if (!_skyPos.length || !_skyCV) return;
    const mine = _skyGetMineList();
    if (!mine.length) {
      const st = document.getElementById('sky-status');
      if (st) { st.textContent = t('sky_no_mine'); st.style.display = 'block'; }
      return;
    }
    _skyMineIdx = (_skyMineIdx + dir + mine.length) % mine.length;
    _skyFlyCto(mine[_skyMineIdx]);
  }

  // UI buttons
  document.getElementById('sky-back-btn').addEventListener('click', _skyClose);
  document.getElementById('sky-zoom-in').addEventListener('click', () => {
    _skyZoom(_skyScale * 1.4, (_skyCV?.width || window.innerWidth) / 2, (_skyCV?.height || window.innerHeight) / 2);
  });
  document.getElementById('sky-zoom-out').addEventListener('click', () => {
    _skyZoom(_skyScale / 1.4, (_skyCV?.width || window.innerWidth) / 2, (_skyCV?.height || window.innerHeight) / 2);
  });
  document.getElementById('sky-find-mine').addEventListener('click', () => _skyFindMine(1));
  document.getElementById('sky-mine-prev').addEventListener('click',  () => _skyFindMine(-1));
  document.getElementById('sky-mine-next').addEventListener('click',  () => _skyFindMine(1));

  // Mode toggle
  document.querySelectorAll('.sky-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      if (mode === _skyMode) return;
      _skyMode = mode;
      _skyApplyModeUI();
      if (_skyChannel) { sb.removeChannel(_skyChannel); _skyChannel = null; }
      _skyHighlightId = null; _skyHighlightPulseT = 0;
      if (mode === 'personal') {
        _skyLoadPersonal();
      } else {
        // reload global using shared loader (handles offline/timeout gracefully)
        _skyData = null; _skyPos = [];
        _skyReloadGlobal();
      }
    });
  });

  // Mouse drag & wheel
  const _skyEl = document.getElementById('sky-canvas');
  _skyEl.addEventListener('mousedown', e => {
    _skyDrag = { x: e.clientX, y: e.clientY, ox: _skyOffX, oy: _skyOffY };
  });
  window.addEventListener('mousemove', e => {
    if (!_skyDrag || !_skyOpen) return;
    _skyOffX = _skyDrag.ox + (e.clientX - _skyDrag.x);
    _skyOffY = _skyDrag.oy + (e.clientY - _skyDrag.y);
    _skyClampOffset();
    _skyDrag.ox = _skyOffX; _skyDrag.oy = _skyOffY;
    _skyDrag.x  = e.clientX; _skyDrag.y  = e.clientY;
    _skyBboxLoad();
  });
  window.addEventListener('mouseup', () => { _skyDrag = null; });
  _skyEl.addEventListener('wheel', e => {
    if (!_skyOpen) return;
    e.preventDefault();
    _skyZoom(_skyScale * (e.deltaY < 0 ? 1.12 : 1 / 1.12), e.clientX, e.clientY);
    _skyClampOffset();
    _skyBboxLoad();
  }, { passive: false });

  // Touch pan + pinch
  _skyEl.addEventListener('touchstart', e => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const t = e.touches[0];
      _skyDrag = { x: t.clientX, y: t.clientY, ox: _skyOffX, oy: _skyOffY };
      _skyPinch = null;
    } else if (e.touches.length >= 2) {
      _skyDrag = null;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      _skyPinch = {
        d: Math.hypot(dx, dy),
        mx: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        my: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        s0: _skyScale, ox: _skyOffX, oy: _skyOffY,
      };
    }
  }, { passive: false });

  _skyEl.addEventListener('touchmove', e => {
    e.preventDefault();
    if (!_skyOpen) return;
    if (e.touches.length === 1 && _skyDrag) {
      const t = e.touches[0];
      _skyOffX = _skyDrag.ox + (t.clientX - _skyDrag.x);
      _skyOffY = _skyDrag.oy + (t.clientY - _skyDrag.y);
      _skyClampOffset();
      _skyDrag.ox = _skyOffX; _skyDrag.oy = _skyOffY;
      _skyDrag.x  = t.clientX; _skyDrag.y  = t.clientY;
      _skyBboxLoad();
    } else if (e.touches.length >= 2 && _skyPinch) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const nd = Math.hypot(dx, dy);
      const ns = _skyClamp(_skyPinch.s0 * (nd / _skyPinch.d));
      const wx = (_skyPinch.mx - _skyPinch.ox) / _skyPinch.s0;
      const wy = (_skyPinch.my - _skyPinch.oy) / _skyPinch.s0;
      _skyOffX = _skyPinch.mx - wx * ns;
      _skyOffY = _skyPinch.my - wy * ns;
      _skyScale = ns;
      _skyClampOffset();
      _skyBboxLoad();
    }
  }, { passive: false });

  _skyEl.addEventListener('touchend', e => {
    if (e.touches.length === 0) { _skyDrag = null; _skyPinch = null; }
    else if (e.touches.length === 1) {
      _skyPinch = null;
      const t = e.touches[0];
      _skyDrag = { x: t.clientX, y: t.clientY, ox: _skyOffX, oy: _skyOffY };
    }
  }, { passive: false });

  // ── exports ───────────────────────────────────────────────────────────────
  window.openSkyScreen       = openSkyScreen;
  window._skyClose           = _skyClose;
  window._skyShowOfflineUI   = _skyShowOfflineUI;
  window._skyFindMine        = _skyFindMine;
  window._skyBgCacheRef      = _skyBgCache;
  window._skyGetUserId       = _skyGetUserId;
  window._skyEnsureBg        = _skyEnsureBg;
  window._skyHash            = _skyHash;
  window._SKY_WORLD          = _SKY_WORLD;
  // _bgStars инициализируется как null, заполняется при _skyEnsureBg() —
  // нужен getter чтобы index.html видел актуальное значение
  Object.defineProperty(window, '_bgStars', {
    get: function() { return _bgStars; },
    configurable: true
  });
})();
