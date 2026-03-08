/**
 * stargazer-ai.js — логика Звездочёта (AI), подсказки и оценка вероятности.
 *
 * Зависимости (глобальные):
 *   points[], lines (Map), polygons[], scores[], scoredKeys (Set),
 *   currentPlayer, gameOver, winner, COUNT, isAI, stargazerLevel,
 *   lineKey, validate, moveWouldScore, findPaths, hasFreePointsInside,
 *   polygonArea, applyMove, endGame, loadProgress,
 *   _hintsOn, _hintEdges, activeTheme, ensureHintsLoop
 *
 * Экспортирует через window.*:
 *   rankToAiLevel, givesOpponentScore, countPromisingPairs, chainScore,
 *   opponentChainScore, scoreMove, makeAIMove, countOpponentScoring,
 *   computeHints, estimateWinProbability
 */
(function() {
  'use strict';

  // ── AI level ──────────────────────────────────────────────────────────────

  /**
   * Returns AI difficulty object based on player's rank + sub-rank.
   * 30 granular steps: rank 1-10 × subRank III/II/I.
   *   step = (rank-1)*3 + (4-subRank)  → 1..30
   *   smartProb = 0.07 + (step-1) * (0.93/29)  → ~7%..100%
   *   firstMoveSmart: only when step >= 25 (rank 9+)
   * Returns { rank, subRank, step, smartProb, firstMoveSmart }
   */
  function rankToAiLevel() {
    var p = loadProgress();
    var info = computeRank(p.rating);
    var rank = info.rank;
    var subRank = info.subRank; // 3=lowest, 1=highest
    if (p.gamesPlayed < 3) { rank = 1; subRank = 3; }
    var step = (rank - 1) * 3 + (4 - subRank); // 1..30
    var smartProb = 0.07 + (step - 1) * (0.93 / 29);
    return {
      rank: rank,
      subRank: subRank,
      step: step,
      smartProb: Math.min(1, smartProb),
      firstMoveSmart: step >= 25
    };
  }

  // ── AI evaluation helpers ─────────────────────────────────────────────────

  /**
   * Проверяет, получит ли соперник возможность замкнуть фигуру после хода (a, b).
   * Временно добавляет ребро и перебирает все допустимые ответные ходы соперника.
   * @param {number} a — индекс первой точки
   * @param {number} b — индекс второй точки
   * @returns {boolean} true, если хотя бы один ответный ход соперника даст очко
   */
  function givesOpponentScore(a, b) {
    var key = lineKey(a, b);
    lines.set(key, currentPlayer);
    var gives = false;
    for (var i = 0; i < COUNT; i++) {
      for (var j = i + 1; j < COUNT; j++) {
        if (validate(i, j).ok && moveWouldScore(i, j)) {
          gives = true; break;
        }
      }
      if (gives) break;
    }
    lines.delete(key);
    return gives;
  }

  /**
   * Подсчитывает число «перспективных» пар вершин — пар (u, v) без прямого ребра,
   * между которыми уже существует путь по текущим линиям, и этот путь при замыкании
   * образует допустимую фигуру (без свободных точек внутри).
   * Используется как метрика «близости к замыканию» для AI.
   * @returns {number} количество перспективных пар
   */
  function countPromisingPairs() {
    var count = 0;
    for (var u = 0; u < COUNT; u++) {
      for (var v = u + 1; v < COUNT; v++) {
        if (lines.has(lineKey(u, v))) continue;
        var paths = findPaths(u, v, null, 8); // AI lookahead: ограниченная глубина
        if (paths.length === 0) continue;
        var hasPromising = paths.some(function(path) {
          if (path.length < 3) return false;
          var pk = path.slice().sort(function(a, b) { return a - b; }).join(',');
          if (scoredKeys.has(pk)) return false;
          return !hasFreePointsInside(path);
        });
        if (hasPromising) count++;
      }
    }
    return count;
  }

  /**
   * Оценивает ход (a, b) по числу перспективных пар после его выполнения.
   * Больше перспективных пар = ход лучше строит цепочки к будущим фигурам.
   * @param {number} a — индекс первой точки
   * @param {number} b — индекс второй точки
   * @returns {number} количество перспективных пар после хода
   */
  function chainScore(a, b) {
    var key = lineKey(a, b);
    lines.set(key, currentPlayer);
    var score = countPromisingPairs();
    lines.delete(key);
    return score;
  }

  /**
   * Подсчитывает, сколько допустимых ходов соперника приведут к немедленному очку
   * после того, как Звездочёт сделает ход (a, b).
   * Чем меньше — тем меньше угроз оставляет этот ход.
   * @param {number} a — индекс первой точки
   * @param {number} b — индекс второй точки
   * @returns {number} количество потенциально опасных ответных ходов соперника
   */
  function opponentChainScore(a, b) {
    var key = lineKey(a, b);
    lines.set(key, currentPlayer);
    var count = 0;
    for (var i = 0; i < COUNT; i++)
      for (var j = i + 1; j < COUNT; j++)
        if (validate(i, j).ok && moveWouldScore(i, j)) count++;
    lines.delete(key);
    return count;
  }

  /**
   * Вычисляет суммарный балл хода (a, b) по системе штрафов и бонусов:
   *   +10  ход замыкает фигуру (очко для Звездочёта)
   *   -8   после хода соперник сможет замкнуть фигуру
   *   +5   ход увеличивает число перспективных цепочек (строит к фигуре)
   *   -3   после хода у соперника остаются готовые к замыканию ходы
   *   +1   базовый балл (нейтральный ход)
   * @param {number} a — индекс первой точки
   * @param {number} b — индекс второй точки
   * @returns {number} итоговый балл хода
   */
  function scoreMove(a, b) {
    var s = 1;
    if (moveWouldScore(a, b))                             s += 10;
    if (givesOpponentScore(a, b))                         s -=  8;
    if (chainScore(a, b) > countPromisingPairs())         s +=  5;
    if (opponentChainScore(a, b) > 0)                     s -=  3;
    return s;
  }

  // ── main AI move ──────────────────────────────────────────────────────────

  /**
   * Главная функция хода Звездочёта. Поведение зависит от stargazerLevel:
   *   stargazerLevel = { rank, subRank, step(1-30), smartProb(0.07-1.0), firstMoveSmart }
   *   Каждый ход: умная логика с вероятностью smartProb, иначе случайный ход.
   *   Первый ход случайный, если !firstMoveSmart (step < 25).
   *
   * Умная логика (приоритеты):
   *   1. Взять ход, замыкающий фигуру (немедленное очко).
   *   2. Избегать ходов, после которых соперник сможет замкнуть фигуру.
   *   3. Из оставшихся — максимальный chainScore; тай-брейкер через scoreMove.
   * При отсутствии допустимых ходов вызывает endGame().
   */
  function makeAIMove() {
    if (gameOver) return;
    if (_tutorialBlocked) { setTimeout(makeAIMove, 200); return; } // wait for tutorial dismiss

    var moves = [];
    for (var i = 0; i < COUNT; i++)
      for (var j = i + 1; j < COUNT; j++)
        if (validate(i, j).ok) moves.push([i, j]);
    if (moves.length === 0) { endGame(); return; }

    // Tutorial: never take scoring moves so the player always wins
    if (_tutorialMode) {
      var nonScoring = moves.filter(function(m) { return !moveWouldScore(m[0], m[1]); });
      var pool0 = nonScoring.length > 0 ? nonScoring : moves;
      var pick0 = pool0[Math.floor(Math.random() * pool0.length)];
      applyMove(pick0[0], pick0[1]); return;
    }

    var lvl = stargazerLevel; // { rank, subRank, step, smartProb, firstMoveSmart }
    var isFirstMove = lines.size === 0;

    /**
     * Выбирает случайный допустимый ход из массива moves и применяет его.
     */
    var randomMove = function() {
      var m = moves[Math.floor(Math.random() * moves.length)];
      applyMove(m[0], m[1]);
    };

    if (isFirstMove && !lvl.firstMoveSmart) {
      randomMove(); return;
    }

    if (Math.random() >= lvl.smartProb) {
      randomMove(); return;
    }

    // Умная логика ─────────────────────────────────────────────────────────

    // Priority 1: take a scoring move if available
    var scoring = moves.filter(function(m) { return moveWouldScore(m[0], m[1]); });
    if (scoring.length > 0) {
      var s = scoring[Math.floor(Math.random() * scoring.length)];
      applyMove(s[0], s[1]); return;
    }

    // Priority 2: avoid moves that hand the opponent a scoring move
    var safe = moves.filter(function(m) { return !givesOpponentScore(m[0], m[1]); });
    var pool = safe.length > 0 ? safe : moves;

    // Priority 3: prefer moves that extend our promising chains
    var scored = pool.map(function(m) { return { a: m[0], b: m[1], s: chainScore(m[0], m[1]) }; });
    var maxS = -Infinity;
    for (var si = 0; si < scored.length; si++) if (scored[si].s > maxS) maxS = scored[si].s;
    var best = scored.filter(function(x) { return x.s === maxS; });
    var sm = best.map(function(x) { return { a: x.a, b: x.b, s: scoreMove(x.a, x.b) }; });
    var maxSM = -Infinity;
    for (var smi = 0; smi < sm.length; smi++) if (sm[smi].s > maxSM) maxSM = sm[smi].s;
    var pick = sm.filter(function(x) { return x.s === maxSM; });
    var chosen = pick[Math.floor(Math.random() * pick.length)];
    applyMove(chosen.a, chosen.b);
  }

  // ── hints ─────────────────────────────────────────────────────────────────

  /**
   * Count how many scoring moves the opponent would have if we play (i, j).
   * Stops counting at 2 (used for the no-spoilers threshold).
   */
  function countOpponentScoring(i, j) {
    var k = lineKey(i, j);
    lines.set(k, currentPlayer);
    var opp = 1 - currentPlayer;
    var count = 0;
    for (var a = 0; a < COUNT; a++) {
      var done = false;
      for (var b = a + 1; b < COUNT; b++) {
        if (!validate(a, b).ok) continue;
        var ek = lineKey(a, b);
        lines.set(ek, opp);
        var ps = findPaths(a, b, ek, 6);
        lines.delete(ek);
        if (ps.some(function(p) {
          var pk = p.slice().sort(function(x, y) { return x - y; }).join(',');
          return !scoredKeys.has(pk) && !hasFreePointsInside(p);
        })) { if (++count >= 2) { done = true; break; } }
      }
      if (done) break;
    }
    lines.delete(k);
    return count;
  }

  /**
   * Recompute _hintEdges: top-5 promising edges for the current player.
   * Called after every move. Clears hints when it is the AI's turn.
   */
  function computeHints() {
    _hintEdges = [];
    if (!_hintsOn || gameOver || points.length === 0) return;
    if (isAI && currentPlayer === 1) return; // AI's turn — no hints

    // Total degree per point (all drawn edges)
    var degree = new Array(COUNT).fill(0);
    lines.forEach(function(_, key) {
      var parts = key.split('-').map(Number);
      degree[parts[0]]++; degree[parts[1]]++;
    });

    var candidates = [];
    for (var i = 0; i < COUNT; i++) {
      for (var j = i + 1; j < COUNT; j++) {
        if (!validate(i, j).ok) continue;

        // HIGH: closing a polygon of ≤ 5 sides for current player
        var value = null;
        var k = lineKey(i, j);
        lines.set(k, currentPlayer);
        var paths = findPaths(i, j, k, 8);
        lines.delete(k);
        var closing = paths.filter(function(p) {
          var pk = p.slice().sort(function(a, b) { return a - b; }).join(',');
          return !scoredKeys.has(pk) && !hasFreePointsInside(p) && p.length <= 5;
        });
        if (closing.length > 0) value = 'HIGH';

        // MEDIUM: extends an existing chain (≥ 2 shared drawn-edge endpoints)
        if (!value && degree[i] + degree[j] >= 2) value = 'MEDIUM';

        if (!value) continue;

        // No-spoilers: skip if opponent can score ≥ 2 times in response
        if (countOpponentScoring(i, j) >= 2) continue;

        candidates.push({ a: i, b: j, value: value });
      }
    }

    // HIGH first, then MEDIUM; keep top 5
    candidates.sort(function(x, y) {
      return (x.value === 'HIGH' ? 0 : 1) - (y.value === 'HIGH' ? 0 : 1);
    });
    _hintEdges = candidates.slice(0, 5);

    if (activeTheme === 'stargazer' && _hintEdges.length > 0) ensureHintsLoop();
  }

  // ── win probability ───────────────────────────────────────────────────────

  /**
   * Оценивает вероятность победы игрока 0 (0.0–1.0).
   * Четыре взвешенных компоненты → сигмоида.
   */
  function estimateWinProbability() {
    if (COUNT === 0 || points.length === 0) return 0.5;

    // Степени точек по каждому игроку
    var deg0 = new Array(COUNT).fill(0);
    var deg1 = new Array(COUNT).fill(0);
    var degT = new Array(COUNT).fill(0); // суммарная степень (оба игрока)
    lines.forEach(function(player, key) {
      var parts = key.split('-').map(Number);
      var a = parts[0], b = parts[1];
      degT[a]++; degT[b]++;
      if (player === 0) { deg0[a]++; deg0[b]++; }
      else              { deg1[a]++; deg1[b]++; }
    });

    // Компонента 1: разница очков (вес 0.4)
    var totalScore = scores[0] + scores[1];
    var maxPossible = Math.max(1, totalScore + 4);
    var c1 = ((scores[0] - scores[1]) / maxPossible) * 0.4;

    // Компонента 2: разница захваченных полигонов (вес 0.3)
    var polys0 = polygons.filter(function(p) { return p.player === 0; }).length;
    var polys1 = polygons.filter(function(p) { return p.player === 1; }).length;
    var totalPolys = Math.max(1, polys0 + polys1);
    var c2 = ((polys0 - polys1) / totalPolys) * 0.3;

    // Компонента 3: средняя длина цепи (вес 0.2)
    var avg0 = deg0.reduce(function(s, d) { return s + d; }, 0) / COUNT;
    var avg1 = deg1.reduce(function(s, d) { return s + d; }, 0) / COUNT;
    var c3 = ((avg0 - avg1) / 10) * 0.2;

    // Компонента 4: хаб-узлы — cascade risk (вес 0.1)
    var maxHubDeg = 6;
    var hubAdv = 0, hubCount = 0;
    for (var i = 0; i < COUNT; i++) {
      if (degT[i] >= 4) {
        hubAdv += (deg0[i] - deg1[i]) / maxHubDeg;
        hubCount++;
      }
    }
    var c4 = hubCount > 0 ? (hubAdv / hubCount) * 0.1 : 0;

    var raw = c1 + c2 + c3 + c4;
    return 1 / (1 + Math.exp(-6 * raw));
  }

  // ── exports ───────────────────────────────────────────────────────────────

  window.rankToAiLevel           = rankToAiLevel;
  window.givesOpponentScore      = givesOpponentScore;
  window.countPromisingPairs     = countPromisingPairs;
  window.chainScore              = chainScore;
  window.opponentChainScore      = opponentChainScore;
  window.scoreMove               = scoreMove;
  window.makeAIMove              = makeAIMove;
  window.countOpponentScoring    = countOpponentScoring;
  window.computeHints            = computeHints;
  window.estimateWinProbability  = estimateWinProbability;

})();
