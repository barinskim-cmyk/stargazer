/**
 * progression.js — система рангов, прогрессии и достижений.
 *
 * Зависимости (глобальные):
 *   scores[], winner, isAI, activeTheme, stargazerLevel, COUNT,
 *   getRankName (i18n.js), renderProgressWidget (index.html)
 *
 * Экспортирует через window.*:
 *   RANKS, RANK_THRESHOLDS, ACHIEVEMENTS,
 *   loadProgress, saveProgress, computeRank, computeGamePoints,
 *   progressionUpdate, checkAchievements, getFavouriteTheme
 *
 * Мутабельное состояние (Object.defineProperty):
 *   lastRatingGain, _rankUpNewRank
 */
(function() {
  'use strict';

  // ── rank definitions ──────────────────────────────────────────────────────

  /** Rank definitions: 10 ranks with slow progression. */
  var RANKS = [
    { rank: 1,  threshold: 0,     name: 'Наблюдатель' },
    { rank: 2,  threshold: 500,   name: 'Картограф' },
    { rank: 3,  threshold: 1200,  name: 'Следопыт' },
    { rank: 4,  threshold: 2500,  name: 'Путешественник' },
    { rank: 5,  threshold: 4500,  name: 'Хранитель' },
    { rank: 6,  threshold: 7500,  name: 'Звездочёт' },
    { rank: 7,  threshold: 12000, name: 'Навигатор' },
    { rank: 8,  threshold: 18000, name: 'Астроном' },
    { rank: 9,  threshold: 26000, name: 'Страж Неба' },
    { rank: 10, threshold: 36000, name: 'Архитектор Созвездий' }
  ];

  var RANK_THRESHOLDS = RANKS.map(function(r) { return r.threshold; });

  // ── achievements ──────────────────────────────────────────────────────────

  var ACHIEVEMENTS = [
    // ── Победы ──────────────────────────────────────────────────────
    { id: 'first_win',    icon: '✦',  label: 'Первое\nсозвездие',    desc: 'Выиграй первую партию',                        cat: 'win'   },
    { id: 'win10',        icon: '⭐', label: 'Охотник',               desc: 'Одержи 10 побед',                              cat: 'win'   },
    { id: 'streak3',      icon: '💫', label: 'Три\nподряд',           desc: 'Выиграй 3 партии подряд',                      cat: 'win'   },
    { id: 'streak5',      icon: '☄️', label: 'Пять\nзвёзд',           desc: 'Выиграй 5 партий подряд',                      cat: 'win'   },
    { id: 'perfect',      icon: '🔭', label: 'Идеальная\nпартия',    desc: 'Победи, не дав сопернику ни одной линии',      cat: 'win'   },
    { id: 'long_win',     icon: '🌠', label: 'Долгий\nпуть',          desc: 'Победи в длинной партии (21 точка)',           cat: 'win'   },
    // ── Исследование ────────────────────────────────────────────────
    { id: 'games10',      icon: '🌙', label: 'Путник',                desc: 'Сыграй 10 партий',                             cat: 'play'  },
    { id: 'games50',      icon: '🌌', label: 'Странник',              desc: 'Сыграй 50 партий',                             cat: 'play'  },
    // ── Небо ────────────────────────────────────────────────────────
    { id: 'sky5',         icon: '🌟', label: 'Небесная\nколлекция',   desc: 'Сохрани 5 созвездий в своё небо',              cat: 'sky'   },
    // ── Темы ────────────────────────────────────────────────────────
    { id: 'stargazer5',   icon: '🌑', label: 'Ночной\nнаблюдатель',  desc: 'Сыграй 5 партий в теме Stargazer',             cat: 'theme' },
    { id: 'chalk10',      icon: '✏',  label: 'Мастер\nчернил',       desc: 'Сыграй 10 партий в теме Chalk',                cat: 'theme' },
    { id: 'suprematist5', icon: '◻',  label: 'Супрематист',           desc: 'Сыграй 5 партий в теме Suprematist',          cat: 'theme' },
    // ── Ранги ───────────────────────────────────────────────────────
    { id: 'rank3',        icon: '✦',  label: 'Следопыт',              desc: 'Достигни ранга Следопыт (ранг 3)',             cat: 'rank'  },
    { id: 'rank5',        icon: '✦',  label: 'Хранитель',             desc: 'Достигни ранга Хранитель (ранг 5)',            cat: 'rank'  },
    { id: 'legend',       icon: '👑', label: 'Архитектор\nСозвездий', desc: 'Достигни высшего ранга — Архитектор Созвездий', cat: 'rank'  },
  ];

  // ── mutable state ─────────────────────────────────────────────────────────

  var _lastRatingGain = 0;
  var _rankUpNewRank  = null;

  Object.defineProperty(window, 'lastRatingGain', {
    get: function() { return _lastRatingGain; },
    set: function(v) { _lastRatingGain = v; }
  });

  Object.defineProperty(window, '_rankUpNewRank', {
    get: function() { return _rankUpNewRank; },
    set: function(v) { _rankUpNewRank = v; }
  });

  // ── persistence ───────────────────────────────────────────────────────────

  /**
   * Load progress from localStorage, merging over defaults for any new fields.
   */
  function loadProgress() {
    var def = {
      rating: 0, rank: 1, gamesPlayed: 0, gamesWon: 0,
      gamesDraw: 0, bestScore: 0,
      streak: 0, bestStreak: 0,
      chalkGames: 0, stargazerGames: 0, suprematistGames: 0,
      perfectWins: 0, longWins: 0,
      achievementsUnlocked: []
    };
    try {
      var saved = localStorage.getItem('playerProgress');
      if (saved) return Object.assign(def, JSON.parse(saved));
    } catch (e) {}
    return def;
  }

  /** Save progress to localStorage. */
  function saveProgress(p) {
    try { localStorage.setItem('playerProgress', JSON.stringify(p)); } catch (e) {}
  }

  // ── rank computation ──────────────────────────────────────────────────────

  /**
   * Compute rank info from a rating value.
   * Returns { rank:1–10, subRank:1–3, title, name, nextThreshold, progress }.
   * subRank 3 = lowest division (III), 1 = highest (I).
   */
  function computeRank(rating) {
    var rank = 1;
    for (var i = RANKS.length - 1; i >= 0; i--) {
      if (rating >= RANKS[i].threshold) { rank = i + 1; break; }
    }
    var cur  = RANKS[rank - 1];
    var next = rank < RANKS.length ? RANKS[rank] : null;
    var min  = cur.threshold;
    var max  = next ? next.threshold : cur.threshold + 10000;
    var progress = Math.min(1, Math.max(0, (rating - min) / (max - min)));
    var subRank = progress < 1/3 ? 3 : progress < 2/3 ? 2 : 1;
    return {
      rank: rank, subRank: subRank,
      title: getRankName(rank) + ' ' + ['','I','II','III'][subRank],
      name:  getRankName(rank),
      nextThreshold: next ? next.threshold : null,
      progress: progress
    };
  }

  // ── game points ───────────────────────────────────────────────────────────

  /** Points formula for a completed game. */
  function computeGamePoints(opts) {
    var won = opts.won, myScore = opts.myScore, opponentScore = opts.opponentScore;
    var aiLevel = opts.aiLevel, gameLength = opts.gameLength;

    if (myScore === 0 && opponentScore === 0) return 0;
    var isDraw = !won && myScore === opponentScore;
    var isLoss = !won && !isDraw;

    // Поражение → штраф (отрицательный)
    if (isLoss) {
      var penalties = { short: -10, normal: -8, long: -5 };
      return penalties[gameLength] != null ? penalties[gameLength] : -8;
    }

    // Победа или ничья → формула
    var base           = won ? 100 : 50;
    var total          = myScore + opponentScore;
    var efficiency     = total > 0 ? myScore / total : 0.5;
    var efficiencyBonus  = Math.round(efficiency * 60);
    var difficultyBonus  = won ? (aiLevel - 1) * 25 : 0;
    var multipliers    = { short: 0.7, normal: 1.0, long: 1.4 };
    var lengthMultiplier = multipliers[gameLength] || 1.0;
    var margin         = Math.max(0, myScore - opponentScore);
    var marginBonus    = Math.min(40, margin * 8);
    var raw = (base + efficiencyBonus + difficultyBonus + marginBonus) * lengthMultiplier;
    return Math.ceil(raw / 10);
  }

  // ── progression update ────────────────────────────────────────────────────

  /**
   * Called after each game ends. Updates progression for AI games.
   * Sets _rankUpNewRank if the player's rank increased.
   */
  function progressionUpdate() {
    _lastRatingGain = 0;
    _rankUpNewRank = null;
    if (!isAI) return;
    var p = loadProgress();
    var oldRank = p.rank;
    p.gamesPlayed++;
    if (winner === 0) p.gamesWon++;
    else if (winner < 0) p.gamesDraw = (p.gamesDraw || 0) + 1;
    // Theme-specific game counts
    if      (activeTheme === 'chalk')       p.chalkGames++;
    else if (activeTheme === 'stargazer')   p.stargazerGames++;
    else if (activeTheme === 'suprematist') p.suprematistGames++;
    // Win streak
    if (winner === 0) {
      p.streak++;
      p.bestStreak = Math.max(p.bestStreak, p.streak);
    } else {
      p.streak = 0;
    }
    // Special win conditions
    if (winner === 0 && scores[1] === 0) p.perfectWins++;
    if (winner === 0 && COUNT === 21)    p.longWins++;
    var gameLength = COUNT === 7 ? 'short' : COUNT === 13 ? 'normal' : 'long';
    var pts = computeGamePoints({
      won: winner === 0,
      myScore: scores[0], opponentScore: scores[1],
      aiLevel: stargazerLevel, gameLength: gameLength
    });
    _lastRatingGain = pts;
    if (pts > 0) p.bestScore = Math.max(p.bestScore || 0, pts);
    p.rating = Math.max(0, p.rating + pts);
    var info = computeRank(p.rating);
    p.rank = info.rank;
    if (p.rank > oldRank) _rankUpNewRank = info;
    checkAchievements(p);
    saveProgress(p);
    renderProgressWidget();
  }

  // ── achievements ──────────────────────────────────────────────────────────

  /** Unlock newly-met achievements. Mutates p in-place. */
  function checkAchievements(p) {
    var now = Date.now();
    p.achievementsUnlocked = p.achievementsUnlocked || [];
    var unlocked = new Set(p.achievementsUnlocked.map(function(a) { return a.id; }));
    var savedCount = JSON.parse(localStorage.getItem('saved_constellations') || '[]').length;
    var checks = [
      ['first_win',    function() { return p.gamesWon >= 1; }],
      ['win10',        function() { return p.gamesWon >= 10; }],
      ['streak3',      function() { return (p.bestStreak || 0) >= 3; }],
      ['streak5',      function() { return (p.bestStreak || 0) >= 5; }],
      ['perfect',      function() { return (p.perfectWins || 0) >= 1; }],
      ['long_win',     function() { return (p.longWins || 0) >= 1; }],
      ['games10',      function() { return p.gamesPlayed >= 10; }],
      ['games50',      function() { return p.gamesPlayed >= 50; }],
      ['sky5',         function() { return savedCount >= 5; }],
      ['chalk10',      function() { return (p.chalkGames || 0) >= 10; }],
      ['stargazer5',   function() { return (p.stargazerGames || 0) >= 5; }],
      ['suprematist5', function() { return (p.suprematistGames || 0) >= 5; }],
      ['rank3',        function() { return p.rank >= 3; }],
      ['rank5',        function() { return p.rank >= 5; }],
      ['legend',       function() { return p.rank >= 10; }],
    ];
    checks.forEach(function(pair) {
      var id = pair[0], fn = pair[1];
      if (!unlocked.has(id) && fn()) p.achievementsUnlocked.push({ id: id, ts: now });
    });
  }

  /** Most-played theme display name from progress data. */
  function getFavouriteTheme(p) {
    var counts = { 'Stargazer': p.stargazerGames || 0, 'Chalk': p.chalkGames || 0, 'Suprematist': p.suprematistGames || 0 };
    var best = 'Stargazer', bestN = -1;
    Object.entries(counts).forEach(function(entry) {
      if (entry[1] > bestN) { best = entry[0]; bestN = entry[1]; }
    });
    return best;
  }

  // ── exports ───────────────────────────────────────────────────────────────

  window.RANKS                = RANKS;
  window.RANK_THRESHOLDS      = RANK_THRESHOLDS;
  window.ACHIEVEMENTS         = ACHIEVEMENTS;
  window.loadProgress         = loadProgress;
  window.saveProgress         = saveProgress;
  window.computeRank          = computeRank;
  window.computeGamePoints    = computeGamePoints;
  window.progressionUpdate    = progressionUpdate;
  window.checkAchievements    = checkAchievements;
  window.getFavouriteTheme    = getFavouriteTheme;

})();
