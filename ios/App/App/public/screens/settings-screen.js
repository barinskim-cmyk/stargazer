/**
 * settings-screen.js — Экран настроек
 *
 * Управляет:
 *  - Звук / вибрация (toggles)
 *  - Режим звёздного свечения (all / active)
 *  - Выбор темы
 *  - Выбор языка
 *
 * Зависимости: window._appSettings, activeTheme, applyTheme(), _lang, _applyLang()
 * Экспортирует: openSettingsScreen, _saveSettings, _applySettingsUI, _updateLangBtns
 */
(function () {
  'use strict';

  // ── Settings core ───────────────────────────────────────────────────────────
  // Настройки хранятся в localStorage под ключом 'app_settings' как JSON-строка.
  // При старте страницы объект читается в window._appSettings (до загрузки DOM),
  // чтобы haptic() и playSound() могли работать сразу.
  //
  // Экран настроек управляет тремя группами:
  //   1. Системные переключатели — звук и вибрация
  //   2. Режим звёздного свечения — все точки ('all') или только активные ('active')
  //   3. Выбор темы — stargazer / minimal / suprematist / chalk

  /** Сохраняет текущий window._appSettings в localStorage. */
  function _saveSettings() {
    localStorage.setItem('app_settings', JSON.stringify(window._appSettings));
  }

  /**
   * Синхронизирует состояние кнопок экрана настроек с window._appSettings и activeTheme.
   * Вызывается при открытии экрана и после каждого изменения настройки.
   */
  function _applySettingsUI() {
    document.getElementById('st-sound')    .classList.toggle('on', !!window._appSettings.sound);
    document.getElementById('st-vibration').classList.toggle('on', !!window._appSettings.vibration);
    document.getElementById('sg-all')   .classList.toggle('active', window._appSettings.starGlow !== 'active');
    document.getElementById('sg-active').classList.toggle('active', window._appSettings.starGlow === 'active');
    // Theme buttons
    document.querySelectorAll('.s-theme-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.theme === activeTheme);
    });
    // Language buttons
    _updateLangBtns();
  }

  /** Открывает экран настроек: обновляет UI до текущего состояния, затем показывает экран. */
  function openSettingsScreen() {
    _applySettingsUI();
    document.getElementById('settings-screen').style.display = 'flex';
    if (typeof _resetZoom === 'function') _resetZoom();
  }

  function _updateLangBtns() {
    document.querySelectorAll('.s-lang-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.lang === _lang);
    });
  }

  // ── Event listeners ─────────────────────────────────────────────────────────

  document.getElementById('settings-back-btn').addEventListener('click', function () {
    document.getElementById('settings-screen').style.display = 'none';
    showHomeScreen();
  });

  document.getElementById('st-sound').addEventListener('click', function () {
    window._appSettings.sound = !window._appSettings.sound;
    _saveSettings(); _applySettingsUI();
  });

  document.getElementById('st-vibration').addEventListener('click', function () {
    window._appSettings.vibration = !window._appSettings.vibration;
    _saveSettings(); _applySettingsUI();
  });

  document.querySelectorAll('.s-seg-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      window._appSettings.starGlow = btn.dataset.glow;
      _saveSettings(); _applySettingsUI();
    });
  });

  document.querySelectorAll('.s-theme-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyTheme(btn.dataset.theme);
      _applySettingsUI();
    });
  });

  // Language picker
  document.querySelectorAll('.s-lang-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      _lang = btn.dataset.lang;
      localStorage.setItem('lang', _lang);
      _applyLang();
      document.querySelectorAll('.s-lang-btn').forEach(function (b) {
        b.classList.toggle('active', b.dataset.lang === _lang);
      });
    });
  });

  // ── Exports ─────────────────────────────────────────────────────────────────
  window.openSettingsScreen = openSettingsScreen;
  window._saveSettings      = _saveSettings;
  window._applySettingsUI   = _applySettingsUI;
  window._updateLangBtns    = _updateLangBtns;

})();
