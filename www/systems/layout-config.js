/**
 * layout-config.js — Единый модуль масштабирования и охранных полей
 *
 * Единственный источник правды для:
 *  - DPR (device pixel ratio)
 *  - Safe-area insets (env())
 *  - Стандартных отступов (padding tiers)
 *  - Canvas DPR-setup helper
 *  - Пропорциональных размеров (RADIUS / HIT_R / MIN_DIST)
 *  - Viewport constraints (MAX_W, MAX_H)
 *
 * Экспортирует: window.LC  (Layout Config)
 *
 * Зависимости: нет (загружается первым)
 */
(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. DPR — единственный источник
  // ═══════════════════════════════════════════════════════════════════════════
  var _dpr = window.devicePixelRatio || 1;

  /** Текущий DPR (обновляется при resize) */
  function dpr() { return _dpr; }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Стандартные отступы (padding tiers)
  //    Значения = max из всех экранов, чтобы не прописывать отдельно
  // ═══════════════════════════════════════════════════════════════════════════
  var PAD_S  = 8;    // small   — max(4, 8)
  var PAD_M  = 20;   // medium  — max(12, 14, 16, 20)
  var PAD_L  = 32;   // large   — max(28, 32)
  var PAD_XL = 72;   // extra   — max(40, 48, 56, 72) — заголовки с учётом notch

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Viewport constraints
  // ═══════════════════════════════════════════════════════════════════════════
  var MAX_W = 430;
  var MAX_H = 932;

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Safe-area insets — чтение через computed CSS
  // ═══════════════════════════════════════════════════════════════════════════
  var _safe = { top: 0, bottom: 34, left: 0, right: 0 };

  /**
   * Читает текущие safe-area insets из env().
   * Возвращает {top, bottom, left, right} в px.
   */
  function readSafeAreas() {
    try {
      var el = document.createElement('div');
      el.style.cssText =
        'position:fixed;top:0;left:0;pointer-events:none;visibility:hidden;' +
        'padding-top:env(safe-area-inset-top,0px);' +
        'padding-bottom:env(safe-area-inset-bottom,34px);' +
        'padding-left:env(safe-area-inset-left,0px);' +
        'padding-right:env(safe-area-inset-right,0px);';
      document.body.appendChild(el);
      var cs = getComputedStyle(el);
      _safe = {
        top:    parseFloat(cs.paddingTop)    || 0,
        bottom: parseFloat(cs.paddingBottom) || 34,
        left:   parseFloat(cs.paddingLeft)   || 0,
        right:  parseFloat(cs.paddingRight)  || 0
      };
      document.body.removeChild(el);
    } catch (e) { /* keep previous values */ }
    return _safe;
  }

  /** Возвращает кэш safe-area (без пересчёта) */
  function safeAreas() { return _safe; }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. CSS Custom Properties на :root
  // ═══════════════════════════════════════════════════════════════════════════
  function applyCSS() {
    var s = document.documentElement.style;
    s.setProperty('--lc-dpr',      _dpr);
    s.setProperty('--lc-safe-top',    _safe.top    + 'px');
    s.setProperty('--lc-safe-bottom', _safe.bottom + 'px');
    s.setProperty('--lc-safe-left',   _safe.left   + 'px');
    s.setProperty('--lc-safe-right',  _safe.right  + 'px');
    s.setProperty('--lc-pad-s',  PAD_S  + 'px');
    s.setProperty('--lc-pad-m',  PAD_M  + 'px');
    s.setProperty('--lc-pad-l',  PAD_L  + 'px');
    s.setProperty('--lc-pad-xl', PAD_XL + 'px');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. Canvas helper — единая точка DPR-настройки
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Настраивает canvas для Retina: физ. размеры = css × DPR, ctx масштаб.
   * @param {HTMLCanvasElement} el
   * @param {number} cssW — ширина в CSS-пикселях
   * @param {number} cssH — высота в CSS-пикселях
   * @returns {CanvasRenderingContext2D} ctx с установленным масштабом
   */
  function setupCanvas(el, cssW, cssH) {
    el.width  = Math.round(cssW * _dpr);
    el.height = Math.round(cssH * _dpr);
    el.style.width  = cssW + 'px';
    el.style.height = cssH + 'px';
    var ctx = el.getContext('2d');
    ctx.setTransform(_dpr, 0, 0, _dpr, 0, 0);
    return ctx;
  }

  /**
   * Устанавливает только физ. размеры canvas (без transform и без style).
   * Для случаев, когда код сам управляет ctx.scale/setTransform.
   */
  function sizeCanvas(el, cssW, cssH) {
    el.width  = Math.round(cssW * _dpr);
    el.height = Math.round(cssH * _dpr);
    el.style.width  = cssW + 'px';
    el.style.height = cssH + 'px';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. Пропорциональные размеры (BASE = min(W, H))
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Вычисляет RADIUS, HIT_R, MIN_DIST по базовому размеру.
   * @param {number} base — Math.min(W, H)
   * @returns {{radius:number, hitR:number, minDist:number}}
   */
  function proportional(base) {
    var r = Math.round(base * 0.013);
    var hitR = Math.max(22, Math.round(r * 3.5));
    return {
      radius:  r,
      hitR:    hitR,
      minDist: Math.max(50, hitR * 2 + 6)
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. Resize / orientation — обновляем DPR + safe areas + CSS vars
  // ═══════════════════════════════════════════════════════════════════════════
  function _onResize() {
    _dpr = window.devicePixelRatio || 1;
    readSafeAreas();
    applyCSS();
  }

  window.addEventListener('resize', _onResize);
  window.addEventListener('orientationchange', function () {
    setTimeout(_onResize, 120);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Init: read safe areas + apply CSS vars on load
  // ═══════════════════════════════════════════════════════════════════════════
  if (document.body) {
    readSafeAreas();
    applyCSS();
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      readSafeAreas();
      applyCSS();
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Exports
  // ═══════════════════════════════════════════════════════════════════════════
  window.LC = {
    dpr:            dpr,
    safeAreas:      safeAreas,
    readSafeAreas:  readSafeAreas,
    setupCanvas:    setupCanvas,
    sizeCanvas:     sizeCanvas,
    proportional:   proportional,
    applyCSS:       applyCSS,
    PAD_S:  PAD_S,
    PAD_M:  PAD_M,
    PAD_L:  PAD_L,
    PAD_XL: PAD_XL,
    MAX_W:  MAX_W,
    MAX_H:  MAX_H
  };

})();
