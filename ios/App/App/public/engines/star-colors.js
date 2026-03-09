/* ═══════════════════════════════════════════════════════════════════════════
 *  Stargazer — Star Color Palettes
 *
 *  Defines color presets for constellation star glow.
 *  Each preset carries the RGB strings used by drawStarPointToCol().
 *
 *  Exposes on window:
 *    STAR_COLORS       — ordered array of color preset objects
 *    starColorById(id) — returns preset by id (falls back to 'gold')
 * ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // Each entry:
  //   id        — saved in constellation data as c.color
  //   labelKey  — i18n key (or plain label fallback)
  //   dot       — CSS hex for the UI swatch circle
  //   glowColor — RGB string for outer halo (used in drawStarPointToCol)
  //   coreColor — RGB string for bright core
  var STAR_COLORS = [
    {
      id: 'gold',
      labelKey: 'color_gold',
      label: 'Gold',
      dot: '#FFD170',
      glowColor: '255,200,120',
      coreColor: '255,245,210'
    },
    {
      id: 'white',
      labelKey: 'color_white',
      label: 'White',
      dot: '#E6EAFF',
      glowColor: '215,225,255',
      coreColor: '245,246,255'
    },
    {
      id: 'blue',
      labelKey: 'color_blue',
      label: 'Blue',
      dot: '#85BBFF',
      glowColor: '130,185,255',
      coreColor: '210,232,255'
    },
    {
      id: 'rose',
      labelKey: 'color_rose',
      label: 'Rose',
      dot: '#FFB0CC',
      glowColor: '255,155,185',
      coreColor: '255,210,225'
    },
    {
      id: 'purple',
      labelKey: 'color_purple',
      label: 'Purple',
      dot: '#C8A0FF',
      glowColor: '185,130,255',
      coreColor: '230,210,255'
    }
  ];

  function starColorById(id) {
    for (var i = 0; i < STAR_COLORS.length; i++) {
      if (STAR_COLORS[i].id === id) return STAR_COLORS[i];
    }
    return STAR_COLORS[0]; // fallback to gold
  }

  window.STAR_COLORS    = STAR_COLORS;
  window.starColorById  = starColorById;

})();
