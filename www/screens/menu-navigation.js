/**
 * menu-navigation.js — Menu navigation, screen transitions, home cards
 *
 * goToMenu: master session reset — cancels all RAF, transitions to home.
 * fadeTo: universal fade transition between screens.
 * refreshHomeConstellations: renders mini constellation cards on home.
 *
 * Exports: window.goToMenu, window.fadeTo, window.refreshHomeConstellations
 * Dependencies: _twinkleRaf, _gameTwinkleRaf, _chalkAnimRaf, _hintsRaf,
 *               _rankUpRaf, _tutorialRaf, lastMoveAnimRaf, _lineAnimRaf,
 *               _winParticleRaf, _pointBirthRaf, _pointBirthT,
 *               _lineAnimating, _lineAnim,
 *               loadProgress(), computeRank(), _startHomeBgAnim(),
 *               drawMiniConstellation()
 * Load order: after progression.js, after star-renderer.js
 */
(function () {
  'use strict';

  /**
   * Главный сброс сессии: отменяет все активные RAF-анимации,
   * скрывает игровой экран, возвращает стартовый экран на первый шаг.
   */
  function goToMenu() {
    // Reset any scroll drift (iOS WKWebView can accumulate offset despite overflow:hidden)
    try { window.scrollTo(0, 0); } catch(e) {}
    [_twinkleRaf, _gameTwinkleRaf, _chalkAnimRaf,
     _hintsRaf, _rankUpRaf, _tutorialRaf, lastMoveAnimRaf, _lineAnimRaf, _winParticleRaf, _pointBirthRaf]
      .forEach(function (r) { if (r) cancelAnimationFrame(r); });
    _twinkleRaf = _gameTwinkleRaf = _chalkAnimRaf =
      _hintsRaf = _rankUpRaf = _tutorialRaf = lastMoveAnimRaf = _lineAnimRaf = _winParticleRaf = _pointBirthRaf = null;
    _pointBirthT = [];
    var _pcanvas = document.getElementById('particle-canvas');
    if (_pcanvas) _pcanvas.getContext('2d').clearRect(0, 0, _pcanvas.width, _pcanvas.height);
    var _flash = document.getElementById('win-flash');
    if (_flash) { _flash.style.transition = 'none'; _flash.style.opacity = '0'; }
    _lineAnimating = false; _lineAnim = null;
    var pbw = document.getElementById('prob-bar-wrap');
    if (pbw) pbw.classList.remove('active');
    var _p = loadProgress();
    var _info = computeRank(_p.rating);
    document.getElementById('home-player-name').textContent = localStorage.getItem('playerName') || '\u2014';
    document.getElementById('home-rating-pts').textContent  = 'score: ' + _p.rating + ' \u2726';
    document.getElementById('game').classList.remove('ui-hidden');
    document.getElementById('start').style.display = 'none';
    fadeTo(document.getElementById('game'), document.getElementById('home-screen'), 300, function () {
      _startHomeBgAnim();
      try { window.scrollTo(0, 0); } catch(e) {}
    });
  }

  /**
   * Universal screen transition: fade hideEl out, then fade showEl in.
   */
  function fadeTo(hideEl, showEl, duration, onShown) {
    if (duration === undefined) duration = 300;
    hideEl.style.transition = 'opacity ' + duration + 'ms';
    hideEl.style.opacity = '0';
    setTimeout(function () {
      hideEl.style.display = 'none';
      hideEl.style.opacity = '1';
      hideEl.style.transition = '';
      showEl.style.opacity = '0';
      showEl.style.display = 'flex';
      requestAnimationFrame(function () {
        showEl.style.transition = 'opacity ' + duration + 'ms';
        showEl.style.opacity = '1';
        if (onShown) onShown();
      });
    }, duration);
  }

  /** Render up to 3 most recent saved constellations into #home-cards. */
  function refreshHomeConstellations() {
    var cards = document.getElementById('home-cards');
    if (!cards) return;
    var hint  = document.querySelector('.home-recent-hint');
    var saved = [];
    try { saved = JSON.parse(localStorage.getItem('saved_constellations') || '[]'); } catch(e) {}
    cards.innerHTML = '';
    if (saved.length === 0) {
      for (var i = 0; i < 3; i++) {
        var c = document.createElement('div');
        c.className = 'home-card';
        c.innerHTML = '<span class="home-card-icon">\u2726</span>';
        cards.appendChild(c);
      }
      if (hint) hint.style.display = '';
      return;
    }
    if (hint) hint.style.display = 'none';
    var recent = saved.slice(0, 3);
    for (var i = 0; i < 3; i++) {
      var card = document.createElement('div');
      card.className = 'home-card';
      if (recent[i]) {
        var cv = document.createElement('canvas');
        cv.width = 240; cv.height = 240;
        cv.style.cssText = 'width:100%;height:100%;display:block;border-radius:11px;';
        drawMiniConstellation(cv, recent[i]);
        card.style.padding = '0';
        card.style.overflow = 'hidden';
        card.appendChild(cv);
      } else {
        card.innerHTML = '<span class="home-card-icon">\u2726</span>';
      }
      cards.appendChild(card);
    }
  }

  // ── Expose on window ─────────────────────────────────────────────────
  window.goToMenu                  = goToMenu;
  window.fadeTo                    = fadeTo;
  window.refreshHomeConstellations = refreshHomeConstellations;

})();
