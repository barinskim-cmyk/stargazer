/**
 * sky-hub-screen.js — Экран «Небо» (hub)
 *
 * Навигационный экран с кнопками: Мои созвездия, Небо.
 *
 * Зависимости: _stopHomeBgAnim(), showHomeScreen(),
 *              openJourneyScreen(), openSkyScreen()
 * Экспортирует: openSkyHub, closeSkyHub
 */
(function () {
  'use strict';

  function openSkyHub() {
    _stopHomeBgAnim();
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('sky-hub-screen').style.display = 'flex';
    try { window.scrollTo(0, 0); } catch (e) {}
  }

  /** Закрывает sky-hub, возвращает на главный экран (запускает фоновую анимацию). */
  function closeSkyHub() {
    document.getElementById('sky-hub-screen').style.display = 'none';
    showHomeScreen();
  }

  // ── Event listeners ─────────────────────────────────────────────────────────
  document.getElementById('home-sky-nav-btn').addEventListener('click', openSkyHub);
  document.getElementById('sky-hub-back-btn').addEventListener('click', closeSkyHub);
  document.getElementById('sky-hub-journey-btn').addEventListener('click', function () {
    openJourneyScreen('sky-hub-screen');
  });
  document.getElementById('sky-hub-sky-btn').addEventListener('click', function () {
    openSkyScreen('global');
  });

  // ── Exports ─────────────────────────────────────────────────────────────────
  window.openSkyHub  = openSkyHub;
  window.closeSkyHub = closeSkyHub;

})();
