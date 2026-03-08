/**
 * win-system.js — End-of-game logic: win effects, endGame, finishEndGame
 *
 * Handles the full end-of-game sequence: particle effects, score calculation,
 * winner determination, duel-mode display, victory screen animations.
 *
 * Exports: window.startWinEffect, window.endGame, window.finishEndGame,
 *          window.startProbBarAnim
 * Dependencies: W, H, _canvasDpr, ctx, _winParticleRaf,
 *               gameOver, winner, scores, selected, previewValidation,
 *               isAI, playerNames, lastRatingGain, _tutorialMode,
 *               _tutorialAutoSave, _tutorialRaf, _tutorialTooltip,
 *               _tutorialBlocked, _rankUpNewRank, _supLayout, activeTheme,
 *               _twinkleRaf, _gameTwinkleRaf, _chalkAnimRaf, _hintsRaf,
 *               _probBarDisplay, _probBarTarget,
 *               progressionUpdate(), generateSupLayout(), startRankUpCeremony(),
 *               startTwinkleLoop(), startChalkAnim(), draw(), playSound(),
 *               haptic(), t(), loadProgress(), applyGuestMode(),
 *               _doTutorialAutoSave()
 * Load order: after progression.js, after themes.js, after star-renderer.js
 */
(function () {
  'use strict';

  function startWinEffect() {
    // ── White flash ──
    var flash = document.getElementById('win-flash');
    flash.style.transition = 'none';
    flash.style.opacity = '0.6';
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      flash.style.transition = 'opacity 0.3s ease';
      flash.style.opacity = '0';
    }); });

    // ── Star particles ──
    var pc = document.getElementById('particle-canvas');
    if (!pc) return;
    pc.width  = Math.round(W * _canvasDpr);
    pc.height = Math.round(H * _canvasDpr);
    pc.style.width  = W + 'px';
    pc.style.height = H + 'px';
    var pctx = pc.getContext('2d');
    pctx.scale(_canvasDpr, _canvasDpr);
    var cx = W / 2, cy = H / 2;
    var startT = performance.now();
    if (_winParticleRaf) { cancelAnimationFrame(_winParticleRaf); _winParticleRaf = null; }

    var particles = [];
    for (var i = 0; i < 20; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 2 + Math.random() * 3;
      particles.push({ x: cx, y: cy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                       r: 2 + Math.random() * 2 });
    }

    (function loop() {
      var elapsed = performance.now() - startT;
      pctx.clearRect(0, 0, W, H);
      var alive = false;
      particles.forEach(function (p) {
        var t = elapsed / 800;
        if (t >= 1) return;
        alive = true;
        p.x += p.vx; p.y += p.vy;
        pctx.beginPath();
        pctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        pctx.fillStyle = 'rgba(225,223,220,' + (1 - t) + ')';
        pctx.fill();
      });
      if (alive) { _winParticleRaf = requestAnimationFrame(loop); }
      else { pctx.clearRect(0, 0, W, H); _winParticleRaf = null; }
    })();
  }

  function endGame() {
    gameOver = true;
    winner = scores[0] > scores[1] ? 0 : scores[1] > scores[0] ? 1 : -1; // -1 = draw
    // Бонусные очки: победитель +1 (= захваченные поля + 1), ничья — без бонуса
    if (winner >= 0) scores[winner] += 1;
    selected = -1; previewValidation = null;
    var _pbw = document.getElementById('prob-bar-wrap');
    if (_pbw) _pbw.classList.remove('active');
    progressionUpdate();
    // Вычисляем детерминированную компоновку suprematist один раз
    _supLayout = generateSupLayout();
    // Rank-up ceremony runs before normal victory screen (skip during tutorial)
    if (_rankUpNewRank && !_tutorialMode) {
      startRankUpCeremony(_rankUpNewRank);
    } else {
      finishEndGame();
    }
  }

  /**
   * Вторая половина завершения игры — показывает экран результата.
   * Вызывается либо сразу из endGame(), либо после ранг-ап церемонии.
   */
  function finishEndGame() {
    _rankUpNewRank = null;

    // Обновляем turn-display: Победа / Ничья / Проигрыш
    var td = document.getElementById('turn-display');
    if (td) {
      if (winner === -1)          td.textContent = t('turn_draw');
      else if (isAI && winner === 1) td.textContent = t('turn_loss');
      else                        td.textContent = t('turn_win');
    }

    // Проигрыш: останавливаем все анимации, очищаем canvas, показываем loss-экран
    if (isAI && winner === 1) {
      [_twinkleRaf, _gameTwinkleRaf, _chalkAnimRaf, _hintsRaf]
        .forEach(function (r) { if (r) cancelAnimationFrame(r); });
      _twinkleRaf = _gameTwinkleRaf = _chalkAnimRaf = _hintsRaf = null;
      ctx.setTransform(_canvasDpr, 0, 0, _canvasDpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      document.getElementById('loss-score-line').textContent = scores[0] + ' : ' + scores[1];
      document.getElementById('loss-names-line').textContent =
        (playerNames[0] || t('player_default')) + '  —  ' + (playerNames[1] || t('ai_name'));
      document.getElementById('canvas-area').classList.add('lost');
      return;
    }

    draw();
    if (winner >= 0) { startWinEffect(); playSound('victory'); haptic('heavy'); }
    var winName = winner >= 0 ? playerNames[winner] : null;
    document.getElementById('victory-title').textContent = winName ? t('turn_win') : t('turn_draw');
    document.getElementById('victory-sub').textContent   = scores[0] + ' : ' + scores[1];
    document.getElementById('victory-rating').textContent =
      (isAI && lastRatingGain > 0)
        ? '+' + lastRatingGain + ' ✦  ' + loadProgress().rating : '';
    // Tutorial: override victory sub-text and mark as done
    if (_tutorialMode) {
      localStorage.setItem('tutorialDone', '1');
      _tutorialMode = false;
      _tutorialAutoSave = true;
      if (_tutorialRaf) { cancelAnimationFrame(_tutorialRaf); _tutorialRaf = null; }
      _tutorialTooltip = null; _tutorialBlocked = false;
      document.getElementById('victory-sub').textContent = t('victory_first_const');
    }
    document.getElementById('canvas-area').classList.add('ended');

    // Duel-режим: переключаемся на два отдельных canvas
    var isDuel = !isAI;
    document.getElementById('canvas-area').classList.toggle('duel', isDuel);
    if (isDuel) {
      var lp = winner >= 0 ? winner   : 0;
      var rp = winner >= 0 ? 1-winner : 1;
      document.getElementById('duel-name-left').textContent  = t('duel_name_prefix') + ' ' + (playerNames[lp] || (t('player_default') + ' ' + (lp+1)));
      document.getElementById('duel-name-right').textContent = t('duel_name_prefix') + ' ' + (playerNames[rp] || (t('player_default') + ' ' + (rp+1)));
      var isDraw = winner < 0;
      document.getElementById('duel-sub-left').textContent  = isDraw ? (scores[lp] + ' ' + t('duel_pts')) : t('duel_won');
      document.getElementById('duel-sub-right').textContent = isDraw ? (scores[rp] + ' ' + t('duel_pts')) : t('duel_next_time');
      document.getElementById('victory-title').style.visibility = 'hidden';
      document.getElementById('victory-sub').style.visibility   = 'hidden';
    }
    // Запускаем мерцание звёзд на экране победы (только тема stargazer)
    if (activeTheme === 'stargazer') startTwinkleLoop();
    // Запускаем покадровую анимацию chalk-победы
    if (activeTheme === 'chalk') startChalkAnim();

    // Анимированная последовательность завершения игры
    var _fadeOverlay = document.getElementById('canvas-fade-overlay');
    var _vc = document.getElementById('victory-content');
    var _gameCanvas = document.getElementById('c');

    if (!winName) {
      // Ничья: затемнение + надпись "Ничья" + поле для сохранения
      requestAnimationFrame(function () { _fadeOverlay.style.opacity = '1'; });
      setTimeout(function () {
        _vc.style.opacity = '1';
        _vc.style.pointerEvents = 'auto';
      }, 800);
      setTimeout(function () {
        _fadeOverlay.style.opacity = '0';
        _gameCanvas.style.transform = 'scale(0.42) translateY(-12%)';
      }, 1200);
      setTimeout(function () {
        var _nc = document.getElementById('name-constellation');
        var _input = document.getElementById('name-const-input');
        _input.value = playerNames[0] || '';
        applyGuestMode();
        _nc.style.opacity = '1';
        _nc.style.pointerEvents = 'auto';
        document.getElementById('victory-actions').style.display = 'none';
        if (_tutorialAutoSave) { _doTutorialAutoSave(_input.value.trim() || 'Моё созвездие'); }
      }, 2000);
    } else {
      // Победа: затемнение + уменьшение → просветление → поле имени снизу
      requestAnimationFrame(function () {
        _fadeOverlay.style.opacity = '1';
        _gameCanvas.style.transform = 'scale(0.42) translateY(-12%)';
      });
      // Фаза 2: overlay исчезает, заголовок появляется
      setTimeout(function () {
        _fadeOverlay.style.opacity = '0';
        _vc.style.opacity = '1';
        _vc.style.pointerEvents = 'auto';
      }, 1000);
      // Фаза 3: появляется поле для имени под созвездием
      setTimeout(function () {
        var _nc = document.getElementById('name-constellation');
        var _input = document.getElementById('name-const-input');
        _input.value = winName;
        applyGuestMode();
        _nc.style.opacity = '1';
        _nc.style.pointerEvents = 'auto';
        document.getElementById('victory-actions').style.display = 'none';
        if (_tutorialAutoSave) { _doTutorialAutoSave(_input.value.trim() || 'Моё созвездие'); }
        else { _input.focus(); }
      }, 1600);
    }
  }

  /**
   * Обновляет позицию DOM-полосы вероятности (#prob-bar-fill).
   * Анимация выполняется через CSS transition (width 0.4s ease-out).
   */
  function startProbBarAnim() {
    _probBarDisplay = _probBarTarget;
    var fill = document.getElementById('prob-bar-fill');
    if (fill) fill.style.width = (_probBarTarget * 100).toFixed(1) + '%';
  }

  // ── Expose on window ─────────────────────────────────────────────────
  window.startWinEffect  = startWinEffect;
  window.endGame         = endGame;
  window.finishEndGame   = finishEndGame;
  window.startProbBarAnim = startProbBarAnim;

})();
