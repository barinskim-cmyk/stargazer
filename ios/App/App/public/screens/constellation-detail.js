/**
 * constellation-detail.js — Экран детального просмотра созвездия
 *
 * Включает: canvas-отрисовка созвездия с twinkle-анимацией,
 * переименование, удаление, публикация в небо (с анимацией),
 * генерация share-картинки (PNG).
 *
 * Зависимости: LC, RADIUS, drawStarPointTo(), THEMES, activeTheme,
 *              _skyGetUserId(), _skyEnsureBg(), _SKY_WORLD, _bgStars,
 *              _drawSkyStar(), _loadSaved(), _persistSaved(),
 *              _constellationAddress(), _renderJourneyGrid(),
 *              sb, t(), playSound(), haptic(), showToast()
 * Экспортирует: openConstDetail, closeConstDetail
 */
(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────────
  var _detailRaf     = null;
  var _detailTwinkle = null;   // {idx, startMs, duration, waitUntil}
  var _detailItem    = null;
  var _detailIdx     = -1;

  // ── Twinkle helper ─────────────────────────────────────────────────────────
  function _detailPickTwinkle() {
    if (!_detailItem) return;
    var pts = _detailItem.points || [];
    var lns = _detailItem.lines  || [];
    var wp  = _detailItem.winner >= 0 ? _detailItem.winner : 0;
    var deg = new Array(pts.length).fill(0);
    lns.forEach(function (entry) {
      var key = entry[0], pl = entry[1];
      if (pl !== wp) return;
      var ab = key.split('-').map(Number);
      if (ab[0] < pts.length && ab[1] < pts.length) { deg[ab[0]]++; deg[ab[1]]++; }
    });
    var cands = pts.map(function (_, i) { return i; }).filter(function (i) { return deg[i] > 0; });
    if (!cands.length) return;
    var idx = cands[Math.floor(Math.random() * cands.length)];
    var dur = 900 + Math.random() * 500;
    _detailTwinkle = { idx: idx, startMs: performance.now(), duration: dur,
                       waitUntil: performance.now() + dur + 1000 + Math.random() * 2500 };
  }

  // ── Draw constellation on detail canvas ────────────────────────────────────
  function _drawDetailConst() {
    var cv = document.getElementById('const-detail-canvas');
    if (!cv || !_detailItem) return;
    var dpr = LC.dpr();
    var ctx = cv.getContext('2d');
    var CW = cv.width / dpr;
    var CH = cv.height / dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = '#060612'; ctx.fillRect(0, 0, CW, CH);

    // Faint bg stars
    for (var i = 0; i < 90; i++) {
      var sx = Math.abs(Math.sin(i * 127.3 + 3)) * CW;
      var sy = Math.abs(Math.cos(i * 73.9  + 5)) * CH;
      var sr = 0.3 + Math.abs(Math.sin(i * 211)) * 0.6;
      var sa = 0.04 + 0.10 * Math.abs(Math.sin(performance.now() / 3200 + i * 0.53));
      ctx.globalAlpha = sa;
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.fill();
    }
    ctx.globalAlpha = 1;

    var item = _detailItem;
    var pts  = item.points || [];
    var lns  = item.lines  || [];
    var wp   = item.winner >= 0 ? item.winner : 0;

    var deg = new Array(pts.length).fill(0);
    lns.forEach(function (entry) {
      var key = entry[0], pl = entry[1];
      if (pl !== wp) return;
      var ab = key.split('-').map(Number);
      if (ab[0] < pts.length && ab[1] < pts.length) { deg[ab[0]]++; deg[ab[1]]++; }
    });

    var active = pts.filter(function (_, i) { return deg[i] > 0; });
    if (!active.length) return;

    var PAD  = 52;
    var minX = Math.min.apply(null, active.map(function (p) { return p.x; }));
    var maxX = Math.max.apply(null, active.map(function (p) { return p.x; }));
    var minY = Math.min.apply(null, active.map(function (p) { return p.y; }));
    var maxY = Math.max.apply(null, active.map(function (p) { return p.y; }));
    var srcW = (maxX - minX) || 0.1;
    var srcH = (maxY - minY) || 0.1;
    var scl  = Math.min((CW - PAD * 2) / srcW, (CH - PAD * 2) / srcH);
    var ofX  = PAD + ((CW - PAD * 2) - srcW * scl) / 2;
    var ofY  = PAD + ((CH - PAD * 2) - srcH * scl) / 2;
    var tx = function (p) { return (p.x - minX) * scl + ofX; };
    var ty = function (p) { return (p.y - minY) * scl + ofY; };

    // Glowing lines
    lns.forEach(function (entry) {
      var key = entry[0], pl = entry[1];
      if (pl !== wp) return;
      var ab = key.split('-').map(Number);
      if (!pts[ab[0]] || !pts[ab[1]]) return;
      var ax = tx(pts[ab[0]]), ay = ty(pts[ab[0]]), bx = tx(pts[ab[1]]), by = ty(pts[ab[1]]);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.shadowBlur  = 3;
      ctx.shadowColor = 'rgba(248,247,245,0.90)';
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
      ctx.strokeStyle = 'rgba(248,247,245,0.88)'; ctx.lineWidth = 1.3; ctx.stroke();
      ctx.restore();
    });

    // Stars
    var _prevR = RADIUS;
    RADIUS = Math.round(Math.min(CW, CH) * 0.022);
    pts.forEach(function (p, i) {
      if (deg[i] === 0) return;
      var boost = 0;
      if (_detailTwinkle && _detailTwinkle.idx === i) {
        var t2 = Math.min((performance.now() - _detailTwinkle.startMs) / _detailTwinkle.duration, 1);
        var env = t2 < 0.3 ? t2 / 0.3 : (1 - t2) / 0.7;
        boost = Math.sin(env * Math.PI * 0.5);
      }
      drawStarPointTo(ctx, tx(p), ty(p), Math.max(deg[i], 2), false, false, false, 0.7 + boost * 0.9);
    });
    RADIUS = _prevR;
  }

  function _startDetailAnim() {
    if (_detailRaf) { cancelAnimationFrame(_detailRaf); _detailRaf = null; }
    _detailTwinkle = null;
    _detailPickTwinkle();
    function frame() {
      if (!_detailTwinkle || performance.now() >= _detailTwinkle.waitUntil) _detailPickTwinkle();
      _drawDetailConst();
      _detailRaf = requestAnimationFrame(frame);
    }
    _detailRaf = requestAnimationFrame(frame);
  }

  // ── Open / Close ───────────────────────────────────────────────────────────
  function openConstDetail(item, idx) {
    _detailItem = item; _detailIdx = idx;
    var wrap = document.getElementById('const-detail-canvas-wrap');
    var cv   = document.getElementById('const-detail-canvas');
    requestAnimationFrame(function () {
      LC.setupCanvas(cv, wrap.offsetWidth, wrap.offsetHeight);
      _startDetailAnim();
    });
    // Name
    document.getElementById('const-detail-name-text').textContent = item.name || '—';
    document.getElementById('const-detail-name-text').style.display = 'block';
    document.getElementById('const-detail-name-input').style.display  = 'none';
    // Address (if published)
    var addrEl = document.getElementById('const-detail-addr');
    addrEl.textContent = item.publishedAt ? (item.skyAddr || _constellationAddress(item.name)) : '';
    // Publish btn
    var pb = document.getElementById('const-detail-publish-btn');
    if (item.publishedAt) {
      pb.textContent = t('const_published'); pb.classList.add('published'); pb.disabled = true;
    } else {
      pb.textContent = t('const_detail_sky'); pb.classList.remove('published'); pb.disabled = false;
    }
    // Reset delete confirm state
    document.getElementById('const-detail-confirm-bar').style.display = 'none';
    document.getElementById('const-detail-bottombar').style.display   = 'flex';
    document.getElementById('const-detail-screen').style.display = 'flex';
    try { window.scrollTo(0, 0); } catch(e) {}
  }

  function closeConstDetail() {
    if (_detailRaf) { cancelAnimationFrame(_detailRaf); _detailRaf = null; }
    document.getElementById('const-detail-screen').style.display = 'none';
    try { window.scrollTo(0, 0); } catch(e) {}
  }

  document.getElementById('const-detail-back-btn').addEventListener('click', closeConstDetail);

  // ── Delete constellation ───────────────────────────────────────────────────
  function _showDeleteConfirm() {
    document.getElementById('const-detail-bottombar').style.display    = 'none';
    document.getElementById('const-detail-confirm-bar').style.display  = 'flex';
  }
  function _hideDeleteConfirm() {
    document.getElementById('const-detail-confirm-bar').style.display  = 'none';
    document.getElementById('const-detail-bottombar').style.display    = 'flex';
  }
  function _confirmDeleteConstellation() {
    if (_detailIdx < 0) return;
    var arr = _loadSaved();
    arr.splice(_detailIdx, 1);
    _persistSaved(arr);
    closeConstDetail();
    _renderJourneyGrid();
  }

  document.getElementById('const-detail-delete-btn').addEventListener('click', _showDeleteConfirm);
  document.getElementById('const-detail-confirm-no').addEventListener('click',  _hideDeleteConfirm);
  document.getElementById('const-detail-confirm-yes').addEventListener('click', _confirmDeleteConstellation);

  // ── Rename ─────────────────────────────────────────────────────────────────
  function _startDetailRename() {
    var nameText  = document.getElementById('const-detail-name-text');
    var nameInput = document.getElementById('const-detail-name-input');
    nameInput.value = _detailItem.name || '';
    nameText.style.display  = 'none';
    nameInput.style.display = 'block';
    nameInput.focus(); nameInput.select();
  }
  function _commitDetailRename() {
    var nameText  = document.getElementById('const-detail-name-text');
    var nameInput = document.getElementById('const-detail-name-input');
    var newName   = nameInput.value.trim() || _detailItem.name;
    if (newName !== _detailItem.name) {
      var oldName = _detailItem.name;
      var arr = _loadSaved();
      arr[_detailIdx].name = newName;
      if (arr[_detailIdx].publishedAt) {
        arr[_detailIdx].skyAddr = _constellationAddress(newName);
        var uid = _skyGetUserId();
        sb.from('constellations')
          .update({ name: newName, data: arr[_detailIdx] })
          .eq('name', oldName)
          .eq('user_id', uid)
          .catch(function () {});
      }
      _persistSaved(arr);
      _detailItem = arr[_detailIdx];
      localStorage.setItem('lastConstellationName', newName);
      _renderJourneyGrid();
    }
    nameText.textContent    = _detailItem.name;
    nameText.style.display  = 'block';
    nameInput.style.display = 'none';
  }
  document.getElementById('const-detail-name-text').addEventListener('click',  _startDetailRename);
  document.getElementById('const-detail-name-input').addEventListener('blur',  _commitDetailRename);
  document.getElementById('const-detail-name-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') document.getElementById('const-detail-name-input').blur();
  });

  // ── Publish to sky — with animation ────────────────────────────────────────
  function _detailPublishAnimation(item, onDone) {
    var dpr = LC.dpr();

    var ov = document.getElementById('sky-anim-overlay');
    var VW = document.documentElement.clientWidth  || window.innerWidth;
    var VH = document.documentElement.clientHeight || window.innerHeight;
    LC.setupCanvas(ov, VW, VH);
    ov.style.display = 'block';
    var oc = ov.getContext('2d');

    // Theme colors
    var _pt = THEMES[activeTheme] || THEMES.stargazer;
    var _pBg      = _pt.skyBg      || '#060612';
    var _pStarRGB = _pt.skyStarRGB || '255,245,210';
    var _pHaloRGB = _pt.skyBgStar  ? '255,200,120' : _pStarRGB;
    var _pLabel   = _pt.skyLabelHL || 'rgba(255,248,235,1)';
    var _pHasBgStars = !!_pt.skyBgStar;

    // Compute star screen positions from detail canvas + fit transform
    var cv   = document.getElementById('const-detail-canvas');
    var rect = cv.getBoundingClientRect();
    var SW = rect.width, SH = rect.height;

    var pts = item.points || [];
    var lns = item.lines  || [];
    var wp  = (item.winner >= 0) ? item.winner : 0;

    var deg = new Array(pts.length).fill(0);
    lns.forEach(function (entry) {
      var key = entry[0], pl = entry[1];
      if (pl !== wp) return;
      var ab = key.split('-').map(Number);
      if (ab[0] < pts.length && ab[1] < pts.length) { deg[ab[0]]++; deg[ab[1]]++; }
    });
    var active = pts.filter(function (_, i) { return deg[i] > 0; });
    if (!active.length) { ov.style.display = 'none'; ov.style.width = ''; ov.style.height = ''; onDone(); return; }

    var PAD  = Math.round(Math.min(SW, SH) * 0.14);
    var minX = Math.min.apply(null, active.map(function (p) { return p.x; }));
    var maxX = Math.max.apply(null, active.map(function (p) { return p.x; }));
    var minY = Math.min.apply(null, active.map(function (p) { return p.y; }));
    var maxY = Math.max.apply(null, active.map(function (p) { return p.y; }));
    var srcW = (maxX - minX) || 0.1;
    var srcH = (maxY - minY) || 0.1;
    var scl  = Math.min((SW - PAD * 2) / srcW, (SH - PAD * 2) / srcH);
    var ofX  = PAD + ((SW - PAD * 2) - srcW * scl) / 2;
    var ofY  = PAD + ((SH - PAD * 2) - srcH * scl) / 2;

    var snapPts = pts.map(function (p) {
      return {
        sx: rect.left + (p.x - minX) * scl + ofX,
        sy: rect.top  + (p.y - minY) * scl + ofY
      };
    });

    // Target: screen center
    var tX = VW / 2, tY = VH / 2;
    var skyS = 0.22;
    var skyOX = VW / 2 - _SKY_WORLD / 2 * skyS;
    var skyOY = VH / 2 - _SKY_WORLD / 2 * skyS;
    _skyEnsureBg();

    function _drawBgStar(c, sx, sy, r, alpha, mA) {
      var fa = alpha * mA; if (fa <= 0.003) return;
      var coreR = Math.max(0.5, r * 1.2), haloR = Math.max(1.5, r * 6);
      var hg = c.createRadialGradient(sx, sy, 0, sx, sy, haloR);
      hg.addColorStop(0,    'rgba(' + _pHaloRGB + ',' + Math.min(0.72, fa * 0.55).toFixed(3) + ')');
      hg.addColorStop(0.28, 'rgba(' + _pHaloRGB + ',' + (fa * 0.14).toFixed(3) + ')');
      hg.addColorStop(1,    'rgba(' + _pHaloRGB + ',0)');
      c.fillStyle = hg; c.beginPath(); c.arc(sx, sy, haloR, 0, Math.PI*2); c.fill();
      var cg = c.createRadialGradient(sx, sy, 0, sx, sy, coreR);
      cg.addColorStop(0,    'rgba(' + _pStarRGB + ',' + Math.min(0.95, fa * 0.95).toFixed(3) + ')');
      cg.addColorStop(0.35, 'rgba(' + _pStarRGB + ',' + (fa * 0.55).toFixed(3) + ')');
      cg.addColorStop(0.75, 'rgba(' + _pStarRGB + ',' + (fa * 0.12).toFixed(3) + ')');
      cg.addColorStop(1,    'rgba(' + _pStarRGB + ',0)');
      c.fillStyle = cg; c.beginPath(); c.arc(sx, sy, coreR, 0, Math.PI*2); c.fill();
    }

    var T_SKY = 400, T_SHRINK = 1600, T_BLINK = 1000, T_TEXT = 400, T_HOLD = 1000, T_FADE = 600;
    var TOTAL = T_SHRINK + T_BLINK + T_TEXT + T_HOLD + T_FADE;
    var startT = performance.now();

    function frame() {
      var elapsed = performance.now() - startT;
      var done    = elapsed >= TOTAL;
      oc.clearRect(0, 0, VW, VH);

      var fadeStart = T_SHRINK + T_BLINK + T_TEXT + T_HOLD;
      var masterA   = elapsed >= fadeStart ? Math.max(0, 1 - (elapsed - fadeStart) / T_FADE) : 1;

      // Background (theme-aware)
      var bgA = Math.min(1, elapsed / T_SKY) * masterA;
      oc.globalAlpha = bgA;
      oc.fillStyle = _pBg; oc.fillRect(0, 0, VW, VH);
      oc.globalAlpha = 1;
      if (_pHasBgStars) {
        _bgStars.forEach(function (s) {
          var sx2 = s.x * skyS + skyOX, sy2 = s.y * skyS + skyOY;
          if (sx2 < -10 || sx2 > VW + 10 || sy2 < -10 || sy2 > VH + 10) return;
          _drawBgStar(oc, sx2, sy2, Math.max(0.4, s.r * skyS * 5), s.a, bgA);
        });
      }

      // Phase 1: stars fly to center
      if (elapsed < T_SHRINK) {
        var t = elapsed / T_SHRINK;
        function eoc(x) { return 1 - Math.pow(1 - x, 3); }
        snapPts.forEach(function (p, i) {
          var stagger = snapPts.length > 1 ? 0.12 / snapPts.length : 0;
          var delay   = i * stagger;
          var tStar   = Math.max(0, Math.min(1, (t - delay) / (1 - delay)));
          var ease    = eoc(tStar);
          var dx = tX - p.sx, dy = tY - p.sy;
          var ang = Math.atan2(dy, dx);
          var sign = (i % 2 === 0 ? 1 : -1);
          var arcH = (10 + (i * 13) % 28);
          var arc  = sign * arcH * Math.sin(tStar * Math.PI);
          var px = p.sx + dx * ease + (-Math.sin(ang)) * arc;
          var py = p.sy + dy * ease + ( Math.cos(ang)) * arc;
          var starA = Math.max(0, 1 - tStar * 1.15) * masterA;
          var coreR2 = Math.max(0.3, 4 * (1 - ease * 0.84));
          if (starA < 0.01) return;
          var haloR2 = coreR2 * 5.5;
          var hg = oc.createRadialGradient(px, py, 0, px, py, haloR2);
          hg.addColorStop(0,    'rgba(' + _pHaloRGB + ',' + (starA * 0.48).toFixed(3) + ')');
          hg.addColorStop(0.35, 'rgba(' + _pHaloRGB + ',' + (starA * 0.10).toFixed(3) + ')');
          hg.addColorStop(1,    'rgba(' + _pHaloRGB + ',0)');
          oc.fillStyle = hg; oc.beginPath(); oc.arc(px, py, haloR2, 0, Math.PI*2); oc.fill();
          var cg = oc.createRadialGradient(px, py, 0, px, py, coreR2);
          cg.addColorStop(0,    'rgba(' + _pStarRGB + ',' + (starA * 0.95).toFixed(3) + ')');
          cg.addColorStop(0.45, 'rgba(' + _pStarRGB + ',' + (starA * 0.40).toFixed(3) + ')');
          cg.addColorStop(1,    'rgba(' + _pStarRGB + ',0)');
          oc.fillStyle = cg; oc.beginPath(); oc.arc(px, py, coreR2, 0, Math.PI*2); oc.fill();
        });
        var tLate = Math.max(0, (t - 0.6) / 0.4);
        _drawSkyStar(oc, tX, tY, tLate * masterA, 2.5, tLate > 0.3, _pStarRGB);
      }

      // Phase 2: blink
      if (elapsed >= T_SHRINK && elapsed < T_SHRINK + T_BLINK) {
        var blink = 0.45 + 0.55 * Math.abs(Math.sin((elapsed - T_SHRINK) / T_BLINK * Math.PI * 4));
        _drawSkyStar(oc, tX, tY, blink * masterA, 2.5, true, _pStarRGB);
      }

      // Phase 3-4: star + text
      if (elapsed >= T_SHRINK + T_BLINK) {
        _drawSkyStar(oc, tX, tY, masterA, 2.5, true, _pStarRGB);
        var textA = Math.min(1, (elapsed - T_SHRINK - T_BLINK) / T_TEXT) * masterA;
        if (textA > 0.01) {
          oc.save(); oc.globalAlpha = textA;
          oc.font = '500 15px "Raleway", sans-serif';
          oc.textAlign = 'center';
          oc.shadowColor = 'rgba(' + _pStarRGB + ',0.40)'; oc.shadowBlur = 14;
          oc.fillStyle = _pLabel;
          oc.fillText('Опубликовано в небо ✦', tX, tY + 50);
          oc.restore();
        }
      }

      if (!done) requestAnimationFrame(frame);
      else {
        ov.style.display = 'none';
        ov.style.width = '';
        ov.style.height = '';
        try { window.scrollTo(0, 0); } catch(e) {}
        onDone();
      }
    }
    requestAnimationFrame(frame);
  }

  // ── Publish button handler ─────────────────────────────────────────────────
  document.getElementById('const-detail-publish-btn').addEventListener('click', function () {
    if (!_detailItem || _detailItem.publishedAt) return;
    var pb = document.getElementById('const-detail-publish-btn');
    pb.textContent = '...'; pb.disabled = true;

    // Save data immediately (in parallel with animation)
    var arr = _loadSaved();
    arr[_detailIdx].publishedAt = new Date().toISOString();
    arr[_detailIdx].skyAddr = _constellationAddress(_detailItem.name);
    _persistSaved(arr);
    _detailItem = arr[_detailIdx];
    playSound('twinkle');
    haptic('medium');
    sb.from('constellations').insert({
      name: _detailItem.name, data: arr[_detailIdx],
      user_id: _skyGetUserId(), gx: Math.random(), gy: Math.random()
    }).catch(function () {});

    // Play animation, then update UI
    _detailPublishAnimation(_detailItem, function () {
      pb.textContent = t('const_published'); pb.classList.add('published'); pb.disabled = true;
      document.getElementById('const-detail-addr').textContent = _detailItem.skyAddr;
      _renderJourneyGrid();
    });
  });

  // ── Share — builds standalone PNG ──────────────────────────────────────────
  function _makeShareCanvas(item) {
    var W = 600, H = 720;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');

    // Dark starfield background
    ctx.fillStyle = '#060612';
    ctx.fillRect(0, 0, W, H);

    // Faint bg stars (deterministic)
    for (var i = 0; i < 90; i++) {
      var sx = Math.abs(Math.sin(i * 127.3 + 3.7)) * W;
      var sy = Math.abs(Math.cos(i * 73.9  + 1.1)) * H;
      ctx.globalAlpha = 0.03 + Math.abs(Math.sin(i * 211.7)) * 0.09;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(sx, sy, 0.5 + (i % 3) * 0.25, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Constellation
    var pts = item.points || [];
    var lns = item.lines  || [];
    var wp  = (item.winner >= 0) ? item.winner : 0;

    var deg = new Array(pts.length).fill(0);
    lns.forEach(function (entry) {
      var key = entry[0], pl = entry[1];
      if (pl !== wp) return;
      var ab = key.split('-').map(Number);
      if (ab[0] < pts.length && ab[1] < pts.length) { deg[ab[0]]++; deg[ab[1]]++; }
    });

    var active = pts.filter(function (_, i) { return deg[i] > 0; });
    if (active.length) {
      var ZONE_H = H - 160;
      var PAD    = 70;
      var minX = Math.min.apply(null, active.map(function (p) { return p.x; }));
      var maxX = Math.max.apply(null, active.map(function (p) { return p.x; }));
      var minY = Math.min.apply(null, active.map(function (p) { return p.y; }));
      var maxY = Math.max.apply(null, active.map(function (p) { return p.y; }));
      var srcW = (maxX - minX) || 0.1;
      var srcH = (maxY - minY) || 0.1;
      var scl  = Math.min((W - PAD * 2) / srcW, (ZONE_H - PAD * 2) / srcH);
      var ofX  = (W - srcW * scl) / 2;
      var ofY  = PAD + (ZONE_H - PAD * 2 - srcH * scl) / 2;
      var mx = function (p) { return (p.x - minX) * scl + ofX; };
      var my = function (p) { return (p.y - minY) * scl + ofY; };

      // 3-pass glowing lines
      lns.forEach(function (entry) {
        var key = entry[0], pl = entry[1];
        if (pl !== wp) return;
        var ab = key.split('-').map(Number);
        if (!pts[ab[0]] || !pts[ab[1]]) return;
        var ax = mx(pts[ab[0]]), ay = my(pts[ab[0]]);
        var bx = mx(pts[ab[1]]), by = my(pts[ab[1]]);
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
        ctx.strokeStyle = 'rgba(248,247,245,0.07)'; ctx.lineWidth = 22; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
        ctx.strokeStyle = 'rgba(248,247,245,0.18)'; ctx.lineWidth = 9;  ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
        ctx.strokeStyle = 'rgba(248,247,245,0.88)'; ctx.lineWidth = 2.5; ctx.stroke();
      });

      // Stars
      var _prevR = RADIUS;
      RADIUS = Math.round(W * 0.015);
      pts.forEach(function (p, i) {
        if (deg[i] === 0) return;
        drawStarPointTo(ctx, mx(p), my(p), Math.max(deg[i], 2), false, false, false, 0.6);
      });
      RADIUS = _prevR;
    }

    // Separator line
    ctx.strokeStyle = 'rgba(255,245,210,0.10)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(48, H - 128); ctx.lineTo(W - 48, H - 128); ctx.stroke();

    // Constellation name
    var name = item.name || '—';
    ctx.font = '300 36px -apple-system, "SF Pro Display", "Helvetica Neue", sans-serif';
    ctx.fillStyle = 'rgba(255,245,210,0.92)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(name, W / 2, H - 84);

    // Address (if published)
    var addr = item.skyAddr || (item.publishedAt ? _constellationAddress(item.name) : '');
    if (addr) {
      ctx.font = '300 15px -apple-system, "SF Pro Display", "Helvetica Neue", sans-serif';
      ctx.fillStyle = 'rgba(255,245,210,0.30)';
      ctx.fillText(addr, W / 2, H - 46);
    }

    // Stargazer watermark
    ctx.font = '200 13px -apple-system, "SF Pro Display", "Helvetica Neue", sans-serif';
    ctx.fillStyle = 'rgba(255,245,210,0.16)';
    ctx.fillText('✦  Stargazer', W / 2, H - 18);

    return cv;
  }

  // ── Share button handler ───────────────────────────────────────────────────
  document.getElementById('const-detail-share-btn').addEventListener('click', function () {
    if (!_detailItem) return;
    var btn = document.getElementById('const-detail-share-btn');
    btn.disabled = true;

    var shareCv = _makeShareCanvas(_detailItem);
    shareCv.toBlob(function (blob) {
      var fname = (_detailItem.name || 'constellation').replace(/[^\w\u0400-\u04FF ]/g, '_') + '.png';
      var file = new File([blob], fname, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: _detailItem.name })
          .catch(function (e) { if (e.name !== 'AbortError') showToast(t('toast_share_fail')); })
          .then(function () { btn.disabled = false; });
      } else if (navigator.clipboard && navigator.clipboard.write) {
        navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          .then(function () { showToast(t('toast_copied')); })
          .catch(function () { showToast(t('toast_share_fail')); })
          .then(function () { btn.disabled = false; });
      } else {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = fname; a.click();
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
        btn.disabled = false;
      }
    }, 'image/png');
  });

  // ── Exports ────────────────────────────────────────────────────────────────
  window.openConstDetail  = openConstDetail;
  window.closeConstDetail = closeConstDetail;

})();
