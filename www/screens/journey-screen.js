/**
 * journey-screen.js — Экран «Мои созвездия»
 *
 * Grid of saved constellation thumbnails. Tap opens detail screen.
 * Includes load/persist helpers and constellation address generator.
 *
 * Зависимости: t(), _skyHash(), _SKY_WORLD, openConstDetail(),
 *              drawMiniConstellation(), _startHomeBgAnim()
 * Экспортирует: openJourneyScreen, closeJourneyScreen,
 *              _loadSaved, _persistSaved, _constellationAddress, _renderJourneyGrid
 */
(function () {
  'use strict';

  // ── Helpers: load/persist saved constellations ──────────────────────────────
  function _loadSaved() {
    try { return JSON.parse(localStorage.getItem('saved_constellations') || '[]'); } catch (e) { return []; }
  }
  function _persistSaved(arr) {
    localStorage.setItem('saved_constellations', JSON.stringify(arr));
  }

  // Generate deterministic "nebula address" for a constellation name
  function _constellationAddress(name) {
    var ADJ  = ['Тёмная','Северная','Малая','Дальняя','Тихая','Древняя','Туманная','Холодная','Тонкая','Звёздная'];
    var NOUN = ['Зари','Крыла','Тени','Пути','Звезды','Вуали','Кольца','Завесы','Дуги','Паутины'];
    var h    = function (k) { return _skyHash(name + k); };
    var adj  = ADJ [Math.floor(h('_na') * ADJ.length)];
    var noun = NOUN[Math.floor(h('_nn') * NOUN.length)];
    var margin = 200;
    var wx   = margin + h('_x') * (_SKY_WORLD - 2 * margin);
    var wy   = margin + h('_y') * (_SKY_WORLD - 2 * margin);
    var coord = (wx * 33.33 + 10000).toFixed(0) + '.' + (wy * 33.33).toFixed(2).replace('.','');
    return t('nebula') + ' ' + adj + ' ' + noun + '  ' + coord;
  }

  /** Render the journey grid — thumbnail + name only, tap opens detail screen. */
  function _renderJourneyGrid() {
    var grid = document.getElementById('journey-grid');
    if (!grid) return;
    grid.innerHTML = '';
    var saved = _loadSaved();
    if (saved.length === 0) {
      grid.innerHTML = '<div class="journey-empty">' + t('journey_empty') + '</div>';
      return;
    }
    saved.forEach(function (item, idx) {
      var card = document.createElement('div');
      card.className = 'saved-card';
      card.addEventListener('click', function () { openConstDetail(item, idx); });

      var thumb = document.createElement('canvas');
      thumb.width = 240; thumb.height = 240;
      drawMiniConstellation(thumb, item);

      var info = document.createElement('div');
      info.className = 'saved-card-info';
      var nameEl = document.createElement('div');
      nameEl.className = 'saved-card-name';
      nameEl.textContent = item.name || t('name_untitled');
      info.appendChild(nameEl);

      card.appendChild(thumb);
      card.appendChild(info);
      grid.appendChild(card);
    });
  }

  // ── Navigation state ────────────────────────────────────────────────────────
  var _journeyReturnTo = 'sky-hub-screen';

  /** Open the "Мои созвездия" screen and populate from localStorage.
   *  @param {string} [returnTo='sky-hub-screen'] — element id to restore on back */
  function openJourneyScreen(returnTo) {
    _journeyReturnTo = (typeof returnTo === 'string' ? returnTo : null) || 'sky-hub-screen';
    _renderJourneyGrid();
    var fromEl = document.getElementById(_journeyReturnTo);
    if (fromEl) fromEl.style.display = 'none';
    if (_journeyReturnTo !== 'sky-hub-screen') {
      var sh = document.getElementById('sky-hub-screen');
      if (sh) sh.style.display = 'none';
    }
    document.getElementById('journey').style.display = 'flex';
    try { window.scrollTo(0, 0); } catch (e) {}
  }

  /** Close the journey screen. */
  function closeJourneyScreen() {
    document.getElementById('journey').style.display = 'none';
    try { window.scrollTo(0, 0); } catch (e) {}
  }

  // ── Event listeners ─────────────────────────────────────────────────────────
  document.getElementById('journey-btn').addEventListener('click', function () {
    openJourneyScreen('start');
  });

  document.getElementById('journey-back-btn').addEventListener('click', function () {
    closeJourneyScreen();
    var returnEl = document.getElementById(_journeyReturnTo);
    if (returnEl) returnEl.style.display = 'flex';
    if (_journeyReturnTo === 'home-screen') _startHomeBgAnim();
  });

  // ── Exports ─────────────────────────────────────────────────────────────────
  window.openJourneyScreen      = openJourneyScreen;
  window.closeJourneyScreen     = closeJourneyScreen;
  window._loadSaved             = _loadSaved;
  window._persistSaved          = _persistSaved;
  window._constellationAddress  = _constellationAddress;
  window._renderJourneyGrid     = _renderJourneyGrid;

})();
