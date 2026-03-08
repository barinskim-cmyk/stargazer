/**
 * canvas-input.js — Canvas pointer/click event handlers
 *
 * Registers pointermove, pointerleave, click on the game canvas.
 * Handles hover preview, point selection, move validation, tutorial
 * intercepts, and AI move triggering.
 *
 * Dependencies: canvas, _evXY(), HIT_R, points, hovered, selected,
 *               previewValidation, gameOver, _lineAnimating, _tutorialBlocked,
 *               _tutorialBtnRect, _tutorialMode, _tutorialStep,
 *               _tutorialPulseIdx, _tutorialPulseStart, W, H,
 *               validate(), draw(), showError(), clearError(),
 *               showTutorialTooltip(), startDismissTutorial(),
 *               applyMove(), t()
 * Load order: after game-engine.js, after tutorial-overlay.js
 *             (registers listeners — runs on DOMContentLoaded-like timing)
 */
(function () {
  'use strict';

  /**
   * Unified pointer handler: replaces separate mousemove + touchstart.
   * Pointer Events work for both mouse (hover) and touch (finger down/move).
   * Finds nearest point within HIT_R, updates preview validation and redraws.
   */
  canvas.addEventListener('pointermove', function (e) {
    if (gameOver) return;
    var coords = _evXY(e, canvas);
    var mx = coords[0], my = coords[1];
    var prev = hovered;
    hovered = points.findIndex(function (p) { return Math.hypot(p.x - mx, p.y - my) <= HIT_R; });
    if (hovered !== prev) {
      previewValidation = (selected !== -1 && hovered !== -1 && hovered !== selected)
        ? validate(selected, hovered) : null;
      draw();
    }
  });

  /** Pointer leaves canvas — clear hover preview. */
  canvas.addEventListener('pointerleave', function () {
    if (gameOver) return;
    hovered = -1; previewValidation = null; draw();
  });

  // No pointerup→click bridge needed: with touch-action:none on canvas,
  // the browser fires a native click after tap without the 300ms delay.

  /**
   * Обработчик клика по canvas — основная логика ввода хода игрока.
   *
   * Состояния selected:
   *   -1 → нет выбранной точки; первый клик устанавливает selected
   *   ≥0 → точка выбрана; второй клик применяет ход или снимает выделение
   *
   * После успешного хода:
   *   — проверяется конец игры (isGameOver)
   *   — если режим AI и сейчас ход Звездочёта — запускается makeAIMove с задержкой 800мс
   */
  canvas.addEventListener('click', function (e) {
    if (gameOver || _lineAnimating) return;

    // Tutorial: intercept all clicks while a tooltip is showing
    if (_tutorialBlocked) {
      if (_tutorialBtnRect) {
        var btnCoords = _evXY(e, canvas);
        var btn = _tutorialBtnRect;
        if (btnCoords[0] >= btn.x && btnCoords[0] <= btn.x + btn.w &&
            btnCoords[1] >= btn.y && btnCoords[1] <= btn.y + btn.h)
          startDismissTutorial();
      }
      return;
    }

    var coords = _evXY(e, canvas);
    var mx = coords[0], my = coords[1];
    // Ищем точку под курсором
    var i = points.findIndex(function (p) { return Math.hypot(p.x - mx, p.y - my) <= HIT_R; });

    if (i === -1) {
      // Клик в пустоту — снимаем выделение
      selected = -1; previewValidation = null; draw(); return;
    }

    if (selected === -1) {
      // Первый клик: выбираем точку
      selected = i; clearError();
      // Tutorial moment 1: first point ever selected
      if (_tutorialMode && _tutorialStep === 0) {
        _tutorialStep = 1;
        _tutorialPulseIdx = i;
        _tutorialPulseStart = performance.now();
        var px = points[i].x, py = points[i].y;
        var tx = (px + 30 + 300 > W) ? px - 330 : px + 30;
        var ty = (py - 90 < 10) ? py + 20 : py - 90;
        showTutorialTooltip(
          t('tut_first_star'),
          tx, ty
        );
      }
    } else if (selected === i) {
      // Повторный клик по той же точке: отменяем выбор
      selected = -1; previewValidation = null;
    } else {
      // Второй клик по другой точке: пытаемся сделать ход
      var v = validate(selected, i);
      if (!v.ok) {
        showError(v.reason);
      } else {
        // Ход валиден — применяем через единственный путь applyMove
        var _sa = selected, _sb = i;
        clearError(); selected = -1; previewValidation = null;
        applyMove(_sa, _sb);
      }
    }
    draw();
  });

})();
