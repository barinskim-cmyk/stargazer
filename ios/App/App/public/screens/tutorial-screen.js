/**
 * tutorial-screen.js — Экран обучения (туториал)
 *
 * Интерактивный canvas-туториал: 4 звезды, 7 фаз.
 * Показывается новым игрокам (rating === 0) после авторизации.
 *
 * Зависимости: t(), showHomeScreen(), loadProgress(), _skyGetUserId(), sb,
 *              isAI (var), COUNT (var), startGame()
 * Экспортирует: showTutorial, _checkAndShowTutorial
 */
(function () {
  'use strict';

  var screen  = document.getElementById('tutorial-screen');
  var tc      = document.getElementById('tutorial-canvas');
  var tcx     = tc.getContext('2d');
  var TW = tc.width, TH = tc.height;
  // Star positions: top-center, bottom-left, bottom-right, top-right
  var SP = [ {x:140,y:40}, {x:58,y:165}, {x:222,y:165}, {x:222,y:72} ];

  var titleEl = document.getElementById('tutorial-title');
  var descEl  = document.getElementById('tutorial-desc');
  var nextBtn = document.getElementById('tutorial-next-btn');
  var dotsEl  = document.getElementById('tutorial-dots');

  // ── state ──────────────────────────────────────────────────────────────────
  var phase = 0;
  var FADE = 650;
  var sAlpha = [0,0,0,0];
  var sStart = [-1,-1,-1,-1];
  var tLines = [];
  var tPolys = [];
  var sel = -1;
  var aiLine = null;
  var scoreAnim = null;
  var _raf = 0;

  // ── draw helpers ───────────────────────────────────────────────────────────
  function drawStar(p, a, pulse) {
    if (pulse) {
      var time = performance.now() / 1000;
      var rr = 11 + 3 * Math.sin(time * 3.5);
      tcx.beginPath(); tcx.arc(p.x, p.y, rr, 0, Math.PI * 2);
      tcx.strokeStyle = 'rgba(225,223,220,' + (0.45 + 0.2 * Math.sin(time * 3.5)) + ')';
      tcx.lineWidth = 1.5; tcx.stroke();
    }
    var g = tcx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 11);
    g.addColorStop(0, 'rgba(248,247,245,' + (a * 0.9) + ')');
    g.addColorStop(1, 'rgba(248,247,245,0)');
    tcx.fillStyle = g;
    tcx.beginPath(); tcx.arc(p.x, p.y, 11, 0, Math.PI * 2); tcx.fill();
    tcx.beginPath(); tcx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    tcx.fillStyle = 'rgba(255,255,255,' + a + ')'; tcx.fill();
  }

  function drawSeg(a, b, prog, owner) {
    var pa = SP[a], pb = SP[b];
    var ex = pa.x + (pb.x - pa.x) * prog, ey = pa.y + (pb.y - pa.y) * prog;
    tcx.save(); tcx.beginPath(); tcx.moveTo(pa.x, pa.y); tcx.lineTo(ex, ey);
    tcx.strokeStyle = owner ? 'rgba(225,223,220,0.65)' : 'rgba(248,247,245,0.65)';
    tcx.lineWidth = 1.5; tcx.stroke(); tcx.restore();
  }

  // ── main render loop ──────────────────────────────────────────────────────
  function draw() {
    var now = performance.now();
    tcx.clearRect(0, 0, TW, TH);

    for (var i = 0; i < 4; i++)
      if (sStart[i] >= 0) sAlpha[i] = Math.min(1, (now - sStart[i]) / FADE);

    var aiJustDone = false;
    if (aiLine && !aiLine.done) {
      aiLine.prog = Math.min(1, (now - aiLine.t0) / 850);
      if (aiLine.prog >= 1) { aiLine.done = true; aiJustDone = true; }
    }

    // polygon fills
    for (var pi = 0; pi < tPolys.length; pi++) {
      var poly = tPolys[pi];
      if (poly.alpha < 0.12) poly.alpha = Math.min(0.12, poly.alpha + 0.0025);
      tcx.beginPath(); tcx.moveTo(poly.pts[0].x, poly.pts[0].y);
      for (var j = 1; j < poly.pts.length; j++) tcx.lineTo(poly.pts[j].x, poly.pts[j].y);
      tcx.closePath(); tcx.fillStyle = 'rgba(225,223,220,' + poly.alpha + ')'; tcx.fill();
    }

    // dashed hint for next connection
    if ((phase === 3 && sAlpha[2] > 0.4) || phase === 6) {
      var ha = phase === 3 ? 0 : 0, hb = phase === 3 ? 2 : 3;
      tcx.save(); tcx.beginPath(); tcx.moveTo(SP[ha].x, SP[ha].y); tcx.lineTo(SP[hb].x, SP[hb].y);
      tcx.strokeStyle = 'rgba(248,247,245,0.18)'; tcx.lineWidth = 1.5;
      tcx.setLineDash([4, 6]); tcx.stroke(); tcx.restore();
    }

    for (var li = 0; li < tLines.length; li++) {
      var ln = tLines[li];
      drawSeg(ln.a, ln.b, 1, ln.owner);
    }
    if (aiLine) drawSeg(aiLine.a, aiLine.b, aiLine.prog, 1);

    // "+1" float
    if (scoreAnim) {
      var st = (now - scoreAnim.t0) / 1100;
      if (st < 1) {
        var sa = st < 0.35 ? st / 0.35 : 1 - (st - 0.35) / 0.65;
        tcx.font = '300 22px Raleway, sans-serif';
        tcx.fillStyle = 'rgba(248,247,245,' + (sa * 0.9) + ')';
        tcx.textAlign = 'center';
        tcx.fillText('+1', scoreAnim.x, scoreAnim.y - 14 * st);
      } else { scoreAnim = null; }
    }

    // stars
    var pulseArr = getPulse();
    for (var si = 0; si < 4; si++) {
      if (sAlpha[si] <= 0) continue;
      if (si === sel) {
        tcx.beginPath(); tcx.arc(SP[si].x, SP[si].y, 12, 0, Math.PI * 2);
        tcx.strokeStyle = 'rgba(248,247,245,0.65)'; tcx.lineWidth = 1.8; tcx.stroke();
      }
      drawStar(SP[si], sAlpha[si], pulseArr.indexOf(si) >= 0);
    }

    if (aiJustDone) afterAIDone();
    _raf = requestAnimationFrame(draw);
  }

  function getPulse() {
    if (phase === 1) return [0, 1];
    if (phase === 3) return sel >= 0 ? [sel === 0 ? 2 : 0] : [0, 2];
    if (phase === 6) return sel >= 0 ? [sel === 0 ? 3 : 0] : [0, 3];
    return [];
  }

  // ── phase logic ───────────────────────────────────────────────────────────
  function fadeTitle(text, sub, delay) {
    var go = function () {
      titleEl.style.opacity = '0';
      setTimeout(function () {
        titleEl.textContent = text;
        titleEl.style.opacity = '1';
        if (sub !== undefined) {
          descEl.style.opacity = '0';
          descEl.textContent = sub || '';
          if (sub) setTimeout(function () { descEl.style.opacity = '1'; }, 200);
        }
      }, 380);
    };
    delay ? setTimeout(go, delay) : go();
  }

  function appear(idx, after) {
    setTimeout(function () { sStart[idx] = performance.now(); }, after);
  }
  function startAILine(a, b, after) {
    setTimeout(function () { aiLine = {a: a, b: b, prog: 0, t0: performance.now(), done: false}; }, after);
  }

  function afterAIDone() {
    tLines.push({a: aiLine.a, b: aiLine.b, owner: 1});
    aiLine = null;
    if (phase === 2) {
      phase = 3; // line 1-2 done → user closes triangle
    } else if (phase === 5) {
      setTimeout(function () { fadeTitle('Ты можешь победить его'); phase = 6; }, 300);
    }
  }

  function onConnect(a, b) {
    sel = -1;
    tLines.push({a: a, b: b, owner: 0});
    if (phase === 1) {
      phase = 2;
      fadeTitle(t('tut_close'));
      appear(2, 350);
      startAILine(1, 2, 900);
    } else if (phase === 3) {
      tPolys.push({pts: [SP[0], SP[1], SP[2]], alpha: 0});
      scoreAnim = {x: 130, y: 100, t0: performance.now()};
      fadeTitle(t('tut_well_done'));
      phase = 4;
      appear(3, 900);
      setTimeout(function () {
        fadeTitle(t('tut_rival'));
        phase = 5;
        startAILine(2, 3, 500);
      }, 1900);
    } else if (phase === 6) {
      tPolys.push({pts: [SP[0], SP[2], SP[3]], alpha: 0});
      scoreAnim = {x: 196, y: 90, t0: performance.now()};
      fadeTitle(t('tut_congrats'), t('tut_congrats_sub'));
      phase = 7;
      setTimeout(function () {
        nextBtn.textContent = t('tut_play');
        nextBtn.style.display = '';
        nextBtn.style.opacity = '0';
        nextBtn.style.transition = 'opacity 0.5s ease';
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { nextBtn.style.opacity = '1'; });
        });
      }, 1400);
    }
  }

  // ── canvas input ──────────────────────────────────────────────────────────
  tc.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    if (phase !== 1 && phase !== 3 && phase !== 6) return;
    var r = tc.getBoundingClientRect();
    var cx = (e.clientX - r.left) * (TW / r.width);
    var cy = (e.clientY - r.top)  * (TH / r.height);
    var active = phase === 1 ? [0, 1] : phase === 3 ? [0, 2] : [0, 3];
    var hit = -1;
    for (var ai = 0; ai < active.length; ai++) {
      var idx = active[ai];
      if (sAlpha[idx] > 0.4 && Math.hypot(SP[idx].x - cx, SP[idx].y - cy) < 28) { hit = idx; break; }
    }
    if (hit < 0) { sel = -1; return; }
    if (sel < 0) { sel = hit; }
    else if (sel === hit) { sel = -1; }
    else { onConnect(Math.min(sel, hit), Math.max(sel, hit)); }
  });

  // ── "Играть!" ──────────────────────────────────────────────────────────────
  nextBtn.addEventListener('click', function () {
    if (phase < 7) return;
    try {
      localStorage.setItem('tutorial_v4_seen', '1');
      localStorage.setItem('tutorialDone', '1');
    } catch (e2) {}
    cancelAnimationFrame(_raf);
    screen.style.display = 'none';
    isAI = true;
    COUNT = 7;
    var saved = localStorage.getItem('playerName');
    if (saved) document.getElementById('name1').value = saved;
    startGame();
  });

  function showTutorial() {
    if (localStorage.getItem('tutorial_v4_seen')) {
      showHomeScreen(); return;
    }
    phase = 0; sAlpha = [0,0,0,0]; sStart = [-1,-1,-1,-1];
    tLines = []; tPolys = []; sel = -1; aiLine = null; scoreAnim = null;
    titleEl.textContent = t('tut_connect');
    titleEl.style.opacity = '1';
    descEl.textContent = ''; descEl.style.opacity = '0';
    dotsEl.style.display = 'none';
    nextBtn.style.display = 'none'; nextBtn.style.opacity = '0';
    document.getElementById('tutorial-content').style.opacity = '1';
    screen.style.display = 'flex';
    if (typeof _resetZoom === 'function') _resetZoom();
    if (_raf) cancelAnimationFrame(_raf);
    _raf = requestAnimationFrame(draw);
    setTimeout(function () {
      appear(0, 0);
      appear(1, 480);
      setTimeout(function () { phase = 1; }, 480 + FADE + 80);
    }, 500);
  }

  /**
   * Decide whether to show tutorial or go straight to home.
   * Tutorial is shown only for users whose rating is 0 in both localStorage
   * and Supabase (i.e. brand-new players). Existing players skip it.
   */
  function _checkAndShowTutorial() {
    // Already completed tutorial → home
    if (localStorage.getItem('tutorial_v4_seen')) { showHomeScreen(); return; }

    // Fast path: local rating > 0 → experienced player, skip tutorial
    var localRating = (loadProgress().rating) || 0;
    if (localRating > 0) {
      try { localStorage.setItem('tutorial_v4_seen', '1'); } catch (e) {}
      showHomeScreen();
      return;
    }

    // Fetch rating from Supabase for logged-in users
    var uid = _skyGetUserId();
    if (uid) {
      sb.from('profiles')
        .select('rating')
        .eq('user_id', uid)
        .maybeSingle()
        .then(function (result) {
          if (result.data && (result.data.rating || 0) > 0) {
            try { localStorage.setItem('tutorial_v4_seen', '1'); } catch (e) {}
            showHomeScreen();
            return;
          }
          // Rating is 0 (new player) → show tutorial
          showTutorial();
        })
        .catch(function () {
          showTutorial();
        });
    } else {
      // No uid — new player → show tutorial
      showTutorial();
    }
  }

  // Link auth → tutorial flow
  _proceedFromAuth = _checkAndShowTutorial;

  // ── Exports ─────────────────────────────────────────────────────────────────
  window.showTutorial            = showTutorial;
  window._checkAndShowTutorial   = _checkAndShowTutorial;

})();
