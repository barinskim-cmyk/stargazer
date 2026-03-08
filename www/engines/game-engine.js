/**
 * game-engine.js — чистая игровая логика (правила, валидация, подсчёт очков).
 *
 * Зависимости (глобальные):
 *   points[], lines (Map), polygons[], scores[], scoredKeys (Set),
 *   currentPlayer, gameOver, winner, COUNT, RADIUS, hovered, selected,
 *   previewValidation, lastMove, _isGameOverCache
 *
 * Экспортирует через window.*:
 *   lineKey, pointInPolygon, polygonArea, isInsideCaptured, hasFreePointsInside,
 *   findPaths, properlyIntersects, segmentPassesThroughCapture,
 *   pointBlockingSegment, closesInvalidFigure, segmentCrossesExistingLine,
 *   validate, checkScore, moveWouldScore, isGameOver, estimateRemainingMoves,
 *   resetGameState, resolveGame
 */
(function() {
  'use strict';

  // ── geometry ──────────────────────────────────────────────────────────────

  /**
   * Возвращает канонический строковый ключ для ребра (a, b).
   * Ключ одинаков для (a,b) и (b,a), что предотвращает дублирование линий.
   * @param {number} a — индекс первой точки
   * @param {number} b — индекс второй точки
   * @returns {string} например '3-7'
   */
  function lineKey(a, b) { return a < b ? `${a}-${b}` : `${b}-${a}`; }

  /**
   * Проверяет, находится ли точка (px, py) внутри многоугольника методом трассировки луча.
   * @param {number} px — x-координата точки
   * @param {number} py — y-координата точки
   * @param {{x:number,y:number}[]} poly — вершины многоугольника
   * @returns {boolean} true, если точка внутри
   */
  function pointInPolygon(px, py, poly) {
    if (!poly || poly.length < 3) return false;
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
      if (((yi > py) !== (yj > py)) && px < (xj - xi) * (py - yi) / (yj - yi) + xi)
        inside = !inside;
    }
    return inside;
  }

  /**
   * Вычисляет площадь многоугольника по формуле Гаусса (шнурка).
   * @param {number[]} path — массив индексов точек, образующих многоугольник
   * @returns {number} площадь в пикселях²
   */
  function polygonArea(path) {
    if (!path || path.some(i => !points[i])) return 0;
    let area = 0;
    for (let i = 0, j = path.length - 1; i < path.length; j = i++) {
      area += points[path[j]].x * points[path[i]].y;
      area -= points[path[i]].x * points[path[j]].y;
    }
    return Math.abs(area) / 2;
  }

  /**
   * Проверяет, находится ли точка с индексом idx внутри хотя бы одной
   * уже захваченной области. Используется чтобы не считать такие точки «свободными».
   * @param {number} idx — индекс проверяемой точки
   * @returns {boolean}
   */
  function isInsideCaptured(idx) {
    const { x, y } = points[idx];
    return polygons.some(({ path }) => pointInPolygon(x, y, path.map(i => points[i])));
  }

  /**
   * Проверяет, есть ли внутри потенциального многоугольника хотя бы одна «свободная» точка.
   * Свободная точка — не вершина контура и не находящаяся внутри уже захваченной области.
   * @param {number[]} path — массив индексов вершин замыкаемой фигуры
   * @returns {boolean} true, если есть хотя бы одна свободная точка внутри
   */
  function hasFreePointsInside(path) {
    const verts = new Set(path);
    const poly  = path.map(i => points[i]);
    return points.some((p, i) => {
      if (verts.has(i) || isInsideCaptured(i)) return false;
      return pointInPolygon(p.x, p.y, poly);
    });
  }

  // ── graph ─────────────────────────────────────────────────────────────────

  /**
   * Находит все простые пути между точками src и dst по существующим рёбрам графа.
   * Используется DFS с глубиной не более 25 вершин.
   *
   * Простой путь — путь без повторяющихся вершин, то есть без петель.
   * Нахождение ВСЕХ простых путей необходимо, потому что один ход может одновременно
   * замкнуть несколько разных фигур — функция возвращает их все, а checkScore выбирает
   * наименьшую по площади (которая достанется игроку за этот ход).
   *
   * Параметр skipKey позволяет вызвать findPaths «гипотетически»: проверить,
   * какие пути появились бы если бы ребро (a,b) уже существовало — для этого
   * вызывающий код сначала вставляет ребро в lines, затем передаёт его ключ
   * в skipKey, чтобы DFS строил граф без этого ребра и искал пути в обход него.
   * Это позволяет checkScore/moveWouldScore работать корректно.
   *
   * @param {number} src — индекс начальной точки
   * @param {number} dst — индекс конечной точки
   * @param {string|null} skipKey — ключ ребра, которое нужно исключить из графа
   *                                (используется при проверке гипотетических ходов)
   * @returns {number[][]} массив путей, каждый путь — массив индексов точек от src до dst
   */
  function findPaths(src, dst, skipKey, maxDepth) {
    if (maxDepth === undefined) maxDepth = 25;
    // Строим список смежности из текущих линий, исключая ребро skipKey
    const adj = Array.from({ length: COUNT }, () => []);
    lines.forEach(function(_, key) {
      if (key === skipKey) return;
      var parts = key.split('-').map(Number);
      var u = parts[0], v = parts[1];
      adj[u].push(v); adj[v].push(u);
    });

    var found = []; // накапливаем найденные пути
    var vis = new Set([src]); // множество посещённых вершин (предотвращает петли)

    // Рекурсивный DFS: идём вглубь графа, отслеживаем текущий путь
    (function dfs(node, path) {
      if (path.length > maxDepth) return; // защита от слишком длинных путей
      if (node === dst) {
        found.push(path.slice()); // нашли путь — сохраняем копию
        return;
      }
      for (var k = 0; k < adj[node].length; k++) {
        var nb = adj[node][k];
        if (!vis.has(nb)) {
          vis.add(nb); path.push(nb); // входим в вершину
          dfs(nb, path);
          path.pop(); vis.delete(nb); // выходим — бэктрекинг
        }
      }
    })(src, [src]); // начинаем с src, путь уже содержит стартовую вершину

    return found;
  }

  // ── validation ────────────────────────────────────────────────────────────

  /**
   * Проверяет строгое пересечение двух отрезков (p1–p2) и (p3–p4).
   * «Строгое» означает, что общая конечная точка не считается пересечением.
   * Использует знаки векторных произведений.
   * @param {number} p1x,p1y — начало первого отрезка
   * @param {number} p2x,p2y — конец первого отрезка
   * @param {number} p3x,p3y — начало второго отрезка
   * @param {number} p4x,p4y — конец второго отрезка
   * @returns {boolean} true, если отрезки пересекаются строго внутри
   */
  function properlyIntersects(p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y) {
    // 2D векторное произведение: знак говорит, по какую сторону от вектора лежит точка
    function cross(ax, ay, bx, by) { return ax * by - ay * bx; }
    // d1,d2 — по разные ли стороны отрезка p3-p4 лежат точки p1 и p2
    var d1 = cross(p4x - p3x, p4y - p3y, p1x - p3x, p1y - p3y);
    var d2 = cross(p4x - p3x, p4y - p3y, p2x - p3x, p2y - p3y);
    // d3,d4 — по разные ли стороны отрезка p1-p2 лежат точки p3 и p4
    var d3 = cross(p2x - p1x, p2y - p1y, p3x - p1x, p3y - p1y);
    var d4 = cross(p2x - p1x, p2y - p1y, p4x - p1x, p4y - p1y);
    // Пересечение строго внутри — оба условия должны выполняться одновременно
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
           ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
  }

  /**
   * Проверяет, проходит ли отрезок (a, b) через уже захваченную область.
   * Выполняет три теста: конечные точки внутри полигона, середина отрезка внутри,
   * строгое пересечение с рёбрами полигона.
   * @param {number} a — индекс первой точки отрезка
   * @param {number} b — индекс второй точки отрезка
   * @returns {boolean} true, если отрезок проходит через захваченную область
   */
  function segmentPassesThroughCapture(a, b) {
    var pa = points[a], pb = points[b];
    var mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2;
    for (var pi = 0; pi < polygons.length; pi++) {
      var path = polygons[pi].path;
      var poly = path.map(function(i) { return points[i]; });
      var ps   = new Set(path);
      if (!ps.has(a) && pointInPolygon(pa.x, pa.y, poly)) return true;
      if (!ps.has(b) && pointInPolygon(pb.x, pb.y, poly)) return true;
      if (pointInPolygon(mx, my, poly)) return true;
      var n = path.length;
      for (var i = 0; i < n; i++) {
        var j = (i + 1) % n;
        if (path[i] === a || path[i] === b || path[j] === a || path[j] === b) continue;
        if (properlyIntersects(pa.x, pa.y, pb.x, pb.y,
                               poly[i].x, poly[i].y, poly[j].x, poly[j].y)) return true;
      }
    }
    return false;
  }

  /**
   * Ищет точку, лежащую на отрезке (a, b) и тем самым блокирующую его проведение.
   * Проверяет расстояние от каждой точки до прямой и параметр t проекции.
   * @param {number} a — индекс начальной точки отрезка
   * @param {number} b — индекс конечной точки отрезка
   * @returns {number} индекс блокирующей точки или -1, если таковой нет
   */
  function pointBlockingSegment(a, b) {
    var ax = points[a].x, ay = points[a].y;
    var bx = points[b].x, by = points[b].y;
    var dx = bx - ax, dy = by - ay;
    var len2 = dx * dx + dy * dy, len = Math.sqrt(len2);
    for (var i = 0; i < COUNT; i++) {
      if (i === a || i === b) continue;
      var ex = points[i].x - ax, ey = points[i].y - ay;
      if (Math.abs(dx * ey - dy * ex) / len > RADIUS) continue;
      var t = (ex * dx + ey * dy) / len2;
      if (t > 0.02 && t < 0.98) return i;
    }
    return -1;
  }

  /**
   * Проверяет, замыкает ли добавление ребра (a, b) только недопустимые фигуры.
   * Недопустимая фигура — та, внутри которой есть свободные точки.
   * Если все замыкаемые пути содержат свободные точки — ход запрещён.
   * @param {number} a — индекс первой точки
   * @param {number} b — индекс второй точки
   * @returns {boolean} true, если ход запрещён по этому правилу
   */
  function closesInvalidFigure(a, b) {
    var paths = findPaths(a, b, null);
    if (paths.length === 0) return false;
    var unscored = paths.filter(function(path) {
      return !scoredKeys.has(path.slice().sort(function(x,y){return x-y;}).join(','));
    });
    if (unscored.length === 0) return false;
    return !unscored.some(function(path) { return !hasFreePointsInside(path); });
  }

  /**
   * Проверяет, пересекает ли новый отрезок (a, b) любую из уже нарисованных линий.
   * Игнорирует линии, у которых есть общая вершина с новым отрезком.
   * @param {number} a — индекс первой точки
   * @param {number} b — индекс второй точки
   * @returns {boolean} true, если пересечение найдено
   */
  function segmentCrossesExistingLine(a, b) {
    var pa = points[a], pb = points[b];
    for (var it = lines.keys(), entry = it.next(); !entry.done; entry = it.next()) {
      var key = entry.value;
      var parts = key.split('-').map(Number);
      var u = parts[0], v = parts[1];
      if (u === a || u === b || v === a || v === b) continue;
      if (properlyIntersects(pa.x, pa.y, pb.x, pb.y,
                             points[u].x, points[u].y, points[v].x, points[v].y)) return true;
    }
    return false;
  }

  /**
   * Единая точка валидации хода — последовательно применяет все правила.
   * Порядок проверок: уже нарисована → точка на отрезке → пересечение линий →
   * проход через захваченную область → замыкание недопустимой фигуры.
   * @param {number} a — индекс первой точки
   * @param {number} b — индекс второй точки
   * @returns {{ok: boolean, reason?: string, blockingPoint?: number}}
   */
  function validate(a, b) {
    if (lines.has(lineKey(a, b)))
      return { ok: false, reason: 'Эта линия уже проведена' };
    var bp = pointBlockingSegment(a, b);
    if (bp !== -1)
      return { ok: false, reason: 'Линия проходит через другую точку', blockingPoint: bp };
    if (segmentCrossesExistingLine(a, b))
      return { ok: false, reason: 'Линия пересекает существующую линию' };
    if (segmentPassesThroughCapture(a, b))
      return { ok: false, reason: 'Линия проходит через захваченную область' };
    if (closesInvalidFigure(a, b))
      return { ok: false, reason: 'Внутри фигуры есть свободные точки' };
    return { ok: true };
  }

  // ── scoring ───────────────────────────────────────────────────────────────

  /**
   * После добавления ребра (newA, newB) проверяет, замкнул ли игрок допустимую фигуру.
   * Если замкнул — засчитывает очко, отмечает минимальную по площади фигуру как захваченную.
   *
   * Чистая логика (мутирует scores, scoredKeys, polygons).
   * Звуковые/тактильные эффекты вызываются через глобальные playSound/haptic.
   *
   * @param {number} newA — индекс первой точки нового ребра
   * @param {number} newB — индекс второй точки нового ребра
   * @param {number} player — индекс игрока (0 или 1)
   */
  function checkScore(newA, newB, player) {
    var newKey = lineKey(newA, newB);
    var paths  = findPaths(newA, newB, newKey);
    var valid  = paths.filter(function(path) {
      var key = path.slice().sort(function(a, b) { return a - b; }).join(',');
      return !scoredKeys.has(key) && !hasFreePointsInside(path);
    });
    if (valid.length === 0) return;
    valid.sort(function(a, b) { return polygonArea(a) - polygonArea(b); });
    var best    = valid[0];
    var polyKey = best.slice().sort(function(a, b) { return a - b; }).join(',');
    scores[player]++;
    scoredKeys.add(polyKey);
    polygons.push({ path: best, player: player });
    playSound('score');
    haptic('medium');
  }

  /**
   * Проверяет, приведёт ли добавление ребра (a, b) к замыканию допустимой фигуры (очку).
   * Временно добавляет ребро в граф, ищет циклы, затем откатывает изменение.
   * @param {number} a — индекс первой точки
   * @param {number} b — индекс второй точки
   * @returns {boolean} true, если ход даст очко
   */
  function moveWouldScore(a, b) {
    var key = lineKey(a, b);
    lines.set(key, currentPlayer);
    var paths = findPaths(a, b, key);
    lines.delete(key);
    return paths.some(function(path) {
      var pk = path.slice().sort(function(x, y) { return x - y; }).join(',');
      return !scoredKeys.has(pk) && !hasFreePointsInside(path);
    });
  }

  // ── game over ─────────────────────────────────────────────────────────────

  /**
   * Проверяет, остались ли на поле допустимые ходы.
   * Перебирает все пары точек C(COUNT, 2) через validate().
   * @returns {boolean} true, если ни одного допустимого хода нет
   */
  function isGameOver() {
    if (_isGameOverCache !== null) return _isGameOverCache;
    for (var i = 0; i < COUNT; i++)
      for (var j = i + 1; j < COUNT; j++)
        if (validate(i, j).ok) { _isGameOverCache = false; return false; }
    _isGameOverCache = true;
    return true;
  }

  /** Count remaining valid moves on the board. */
  function estimateRemainingMoves() {
    var n = 0;
    for (var i = 0; i < COUNT; i++)
      for (var j = i + 1; j < COUNT; j++)
        if (validate(i, j).ok) n++;
    return n;
  }

  // ── state management ──────────────────────────────────────────────────────

  /**
   * Полный сброс игрового состояния перед новой партией.
   * Вызывается из startGame() — чистая логика без DOM.
   */
  function resetGameState() {
    points.length = 0;
    lines.clear();
    polygons.length = 0;
    scoredKeys.clear();
    scores[0] = 0; scores[1] = 0;
    currentPlayer = 0;
    gameOver = false; winner = -1;
    lastMove = null;
    previewValidation = null;
    hovered = -1; selected = -1;
    _isGameOverCache = null;
  }

  /**
   * Финализация игры — чистая логика без DOM/UI.
   * Устанавливает gameOver, определяет победителя, начисляет бонус.
   * Вызывается из endGame().
   */
  function resolveGame() {
    gameOver = true;
    winner = scores[0] > scores[1] ? 0 : scores[1] > scores[0] ? 1 : -1; // -1 = draw
    // Бонусные очки: победитель +1 (= захваченные поля + 1), ничья — без бонуса
    if (winner >= 0) scores[winner] += 1;
    selected = -1; previewValidation = null;
  }

  // ── exports ───────────────────────────────────────────────────────────────

  window.lineKey                    = lineKey;
  window.pointInPolygon             = pointInPolygon;
  window.polygonArea                = polygonArea;
  window.isInsideCaptured           = isInsideCaptured;
  window.hasFreePointsInside        = hasFreePointsInside;
  window.findPaths                  = findPaths;
  window.properlyIntersects         = properlyIntersects;
  window.segmentPassesThroughCapture = segmentPassesThroughCapture;
  window.pointBlockingSegment       = pointBlockingSegment;
  window.closesInvalidFigure        = closesInvalidFigure;
  window.segmentCrossesExistingLine = segmentCrossesExistingLine;
  window.validate                   = validate;
  window.checkScore                 = checkScore;
  window.moveWouldScore             = moveWouldScore;
  window.isGameOver                 = isGameOver;
  window.estimateRemainingMoves     = estimateRemainingMoves;
  window.resetGameState             = resetGameState;
  window.resolveGame                = resolveGame;

})();
