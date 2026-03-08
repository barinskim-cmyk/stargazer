/**
 * victory-handlers.js — Victory screen button handlers and save logic
 *
 * Registers event listeners for save-to-sky, save-local, play-again,
 * go-to-menu, hints toggle, rank change, and UI toggle buttons.
 * Also contains applyGuestMode and _doTutorialAutoSave.
 *
 * Exports: window.applyGuestMode, window._doTutorialAutoSave
 * Dependencies: points, lines, polygons, W, H, winner, _tutorialAutoSave,
 *               _hintsOn, _hintEdges, _hintsRaf,
 *               t(), playSound(), haptic(), goToMenu(), startGame(),
 *               saveToSkyAnimation(), renderProgressWidget(),
 *               computeHints(), draw(), showStep(), resizeCanvas(),
 *               loadProgress(), saveProgress(), _constellationAddress(),
 *               _skyGetUserId(), _queueSkySave(), sb,
 *               RANKS, RANK_THRESHOLDS
 * Load order: AFTER inline script (registers event listeners)
 */
(function () {
  'use strict';

  /**
   * Настраивает кнопки победного экрана в зависимости от состояния авторизации.
   */
  function applyGuestMode() {
    var isGuest    = localStorage.getItem('guestMode') === 'true';
    var saveSkyBtn = document.getElementById('name-const-save-btn');
    var saveLocBtn = document.getElementById('name-const-local-save-btn');
    var guestDiv   = document.getElementById('name-const-guest');
    var savedDiv   = document.getElementById('name-const-saved');
    guestDiv.style.display = 'none';
    if (_tutorialAutoSave) {
      saveSkyBtn.style.display = 'none';
      saveLocBtn.style.display = 'none';
      savedDiv.style.display   = '';
    } else if (isGuest) {
      saveSkyBtn.style.display = 'none';
      saveLocBtn.style.display = '';
      savedDiv.style.display   = 'none';
    } else {
      saveSkyBtn.style.display = '';
      saveLocBtn.style.display = '';
      savedDiv.style.display   = 'none';
    }
  }

  /** Авто-сохраняет первое созвездие туториала в localStorage. */
  function _doTutorialAutoSave(name) {
    if (!_tutorialAutoSave) return;
    _tutorialAutoSave = false;
    var constellation = {
      name: name,
      points:    points.map(function (p) { return { x: p.x / W, y: p.y / H }; }),
      lines:     Array.from(lines.entries()),
      polygons:  polygons.map(function (pg) { return { path: pg.path, player: pg.player }; }),
      winner:    winner,
      createdAt: new Date().toISOString(),
      skyAddr:   _constellationAddress(name),
    };
    try {
      var existing = JSON.parse(localStorage.getItem('saved_constellations') || '[]');
      existing.unshift(constellation);
      localStorage.setItem('saved_constellations', JSON.stringify(existing));
      localStorage.setItem('lastConstellationName', name);
    } catch(e) {}
    playSound('twinkle');
    haptic('medium');
  }

  // ── In-game UI toggle ─────────────────────────────────────────────────
  document.getElementById('ui-toggle-btn').addEventListener('click', function () {
    document.getElementById('game').classList.toggle('ui-hidden');
    if (typeof ResizeObserver === 'undefined') {
      requestAnimationFrame(function() { setTimeout(resizeCanvas, 80); });
    }
  });

  // ← Меню (in-game top panel)
  document.getElementById('back-to-menu-btn').addEventListener('click', goToMenu);
  document.getElementById('loss-play-again-btn').addEventListener('click', startGame);
  document.getElementById('loss-to-menu-btn').addEventListener('click', goToMenu);

  // Кнопка «Играть снова»
  document.getElementById('play-again-btn').addEventListener('click', startGame);

  document.getElementById('start-back-btn').addEventListener('click', function () { showStep('game-mode-step'); });

  // «Сохранить в небо ✦»
  document.getElementById('name-const-save-btn').addEventListener('click', function () {
    var nameInput = document.getElementById('name-const-input');
    var name = nameInput.value.trim() || t('name_untitled');
    var constellation = {
      name: name,
      points:    points.map(function (p) { return { x: p.x / W, y: p.y / H }; }),
      lines:     Array.from(lines.entries()),
      polygons:  polygons.map(function (pg) { return { path: pg.path, player: pg.player }; }),
      winner:    winner,
      createdAt:   new Date().toISOString(),
      publishedAt: new Date().toISOString(),
      skyAddr:     _constellationAddress(name),
    };
    var saveBtn = document.getElementById('name-const-save-btn');
    saveBtn.disabled = true;

    try {
      var key = 'saved_constellations';
      var existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.unshift(constellation);
      localStorage.setItem(key, JSON.stringify(existing));
      localStorage.setItem('lastConstellationName', name);
    } catch(e) {}

    var _sbPayload = {
      name: name,
      data: constellation,
      user_id: _skyGetUserId(),
      gx: Math.random(),
      gy: Math.random(),
    };
    var supabasePromise;
    if (!navigator.onLine) {
      _queueSkySave(_sbPayload);
      supabasePromise = Promise.resolve();
    } else {
      supabasePromise = sb.from('constellations').insert(_sbPayload)
        .then(function (res) { if (res.error) _queueSkySave(_sbPayload); })
        .catch(function () { _queueSkySave(_sbPayload); });
    }
    playSound('twinkle');
    haptic('heavy');

    saveToSkyAnimation(name, function () {
      supabasePromise.then(function () {
        saveBtn.style.display = 'none';
        saveBtn.disabled = false;
        goToMenu();
      });
    });
  });

  document.getElementById('name-const-again-btn').addEventListener('click', startGame);

  // Кнопка «← В меню» на экране победы
  document.getElementById('to-menu-btn').addEventListener('click', goToMenu);

  // Кнопка «Сменить ранг»
  document.getElementById('change-rank-btn').addEventListener('click', function () {
    var p = loadProgress();
    p.rank = p.rank >= RANKS.length ? 1 : p.rank + 1;
    p.rating = RANK_THRESHOLDS[p.rank - 1];
    saveProgress(p);
    renderProgressWidget();
  });

  // 💡 hints toggle (in-game top panel)
  document.getElementById('hints-btn').addEventListener('click', function () {
    _hintsOn = !_hintsOn;
    localStorage.setItem('hintsEnabled', _hintsOn ? '1' : '0');
    document.getElementById('hints-btn').classList.toggle('active', _hintsOn);
    var cb = document.getElementById('hints-checkbox');
    if (cb) cb.checked = _hintsOn;
    if (_hintsOn) { computeHints(); }
    else {
      _hintEdges = [];
      if (_hintsRaf) { cancelAnimationFrame(_hintsRaf); _hintsRaf = null; }
    }
    draw();
  });

  // 💡 hints checkbox on start screen
  (function() {
    var cb = document.getElementById('hints-checkbox');
    cb.checked = localStorage.getItem('hintsEnabled') === '1';
    cb.addEventListener('change', function () {
      localStorage.setItem('hintsEnabled', cb.checked ? '1' : '0');
      _hintsOn = cb.checked;
    });
  })();

  // Сохранить в мои созвездия (только localStorage)
  document.getElementById('name-const-local-save-btn').addEventListener('click', function () {
    var nameInput = document.getElementById('name-const-input');
    var name = nameInput.value.trim() || t('name_untitled');
    var constellation = {
      name: name,
      points:    points.map(function (p) { return { x: p.x / W, y: p.y / H }; }),
      lines:     Array.from(lines.entries()),
      polygons:  polygons.map(function (pg) { return { path: pg.path, player: pg.player }; }),
      winner:    winner,
      createdAt: new Date().toISOString(),
      skyAddr:   _constellationAddress(name),
    };
    try {
      var existing = JSON.parse(localStorage.getItem('saved_constellations') || '[]');
      existing.unshift(constellation);
      localStorage.setItem('saved_constellations', JSON.stringify(existing));
      localStorage.setItem('lastConstellationName', name);
    } catch(e) {}
    playSound('twinkle');
    haptic('medium');
    var btn = document.getElementById('name-const-local-save-btn');
    btn.style.display = 'none';
    document.getElementById('name-const-saved').style.display = '';
    setTimeout(function () { goToMenu(); }, 1500);
  });

  // ── Expose on window ─────────────────────────────────────────────────
  window.applyGuestMode       = applyGuestMode;
  window._doTutorialAutoSave  = _doTutorialAutoSave;

})();
