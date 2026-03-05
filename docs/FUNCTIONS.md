# FUNCTIONS.md — Все JS-функции

Функции сгруппированы по категориям. Все определены в глобальном скопе `<script>` внутри `www/index.html`.

---

## 1. Утилиты / Инициализация

### `haptic(style = 'light')`
Вызывает тактильный отклик через Capacitor Haptics API.
- `style`: `'light'` | `'medium'` | `'heavy'`
- Безопасен вне Capacitor (try/catch)

### `showStep(id)`
Скрывает все `.start-step`, показывает шаг `#${id}`.
Управляет кнопкой `#start-back-btn`.

### `fadeTo(hideEl, showEl, duration=300, onShown=null)`
Универсальный переход между двумя DOM-элементами.
Fade out → display none → display flex → fade in.

### `resizeCanvas()`
Пересчитывает размер `#c` по `canvas-area.clientWidth` и высоте экрана минус панели.
- Обновляет `W`, `H`, `RADIUS`, `MIN_DIST`, `HIT_R`
- Вызывает `draw()` если игра активна
- Защита от рекурсии через `isResizing`

---

## 2. Геометрия / Граф

### `lineKey(a, b) → string`
Канонический ключ ребра: меньший индекс первым. Пример: `'3-7'`.

### `pointInPolygon(px, py, poly) → boolean`
Ray casting: точка внутри многоугольника.

### `polygonArea(path) → number`
Площадь через формулу Гаусса (shoelace). Используется для выбора наименьшей фигуры.

### `isInsideCaptured(idx) → boolean`
Проверяет, находится ли точка внутри уже захваченной области.

### `hasFreePointsInside(path) → boolean`
Есть ли хотя бы одна «свободная» точка внутри потенциального многоугольника.
Свободная = не вершина контура и не в захваченной области.

### `findPaths(src, dst, skipKey, maxDepth=25) → number[][]`
DFS по графу линий: все простые пути от `src` до `dst`.
- `skipKey` — ребро исключить (для гипотетической проверки хода)
- Лимит глубины = 25

---

## 3. Валидация ходов

### `properlyIntersects(p1x,p1y,p2x,p2y,p3x,p3y,p4x,p4y) → boolean`
Строгое пересечение двух отрезков (общие конечные точки не считаются).

### `segmentPassesThroughCapture(a, b) → boolean`
Проходит ли отрезок (a,b) через захваченную область.
Три теста: конечные точки, середина, пересечение рёбер полигона.

### `pointBlockingSegment(a, b) → number`
Индекс точки, лежащей на отрезке (a,b). `-1` если нет.

### `closesInvalidFigure(a, b) → boolean`
Все замыкаемые фигуры содержат свободные точки → ход запрещён.

### `segmentCrossesExistingLine(a, b) → boolean`
Пересекает ли новый отрезок уже нарисованные линии (кроме соседних).

### `validate(a, b) → {ok, reason?, blockingPoint?}`
Единая точка проверки хода. Применяет все правила по порядку.

---

## 4. Подсчёт очков

### `checkScore(newA, newB, player)`
После добавления ребра: ищет замкнутые фигуры, засчитывает очко за наименьшую.
Добавляет в `polygons[]`, `scoredKeys`. Вызывает `playSound('score')`, `haptic('medium')`.

---

## 5. ИИ (Звездочёт)

### `moveWouldScore(a, b) → boolean`
Даст ли ход (a,b) очко (временно добавляет ребро, ищет циклы, откатывает).

### `givesOpponentScore(a, b) → boolean`
Позволит ли соперник замкнуть фигуру в ответ на ход (a,b).

### `countHypotheticalOpponentScores(a, b) → number`
Количество возможных ответных очков соперника.

### `countPromisingPairs() → number`
Кол-во пар точек, где оба игрока могут замкнуть фигуру.

### `scoreEdge(i, j) → number`
Оценка хода (i,j): позитивная за очко, штрафная за опасность, бонус за угрозу.

### `stargazerMove()`
Основная функция ИИ. Случайный или стратегический ход в зависимости от `stargazerLevel` (1–5).
Стратегия: атаковать (moveWouldScore) → не отдавать (givesOpponentScore) → лучший по scoreEdge.

### `randomMove()`
Случайный допустимый ход. Fallback для ИИ.

---

## 6. Игровой цикл

### `startGame()`
Инициализирует новую игру:
- Генерирует `points[]` (случайно с min-dist), заполняет `_pointBirthT`
- Сбрасывает `lines`, `polygons`, `scores`, `winner`, `gameOver`
- Вычисляет `MARGIN`, вызывает `resizeCanvas()`
- Показывает `#game`, запускает `_startBirthAnim()`
- Скрывает `#home-screen`, при старте с главного экрана устанавливает `COUNT = _homeSelectedLength`

### `_pointBirthScale(i) → number`
Прогресс анимации появления точки i (0..1 за 200 мс).

### `_startBirthAnim()`
RAF-цикл появления точек. Блокирует клики (`_lineAnimating = true`) до завершения.

### `updateUI()`
Обновляет `#score1`, `#score2`, `#turn-display`, `#prob-bar-wrap`.
Вызывает `updateHints()`, `startProbBarAnim()`.

### `endGame()`
- Определяет `winner` (по `scores`, или -1 = ничья)
- Запускает `progressionUpdate()`
- Показывает `#victory-content` или `#canvas-area.lost`
- Для stargazer: `startTwinkleLoop()`
- Если победа в AI-режиме: через таймер показывает `#name-constellation`, скрывает `#victory-actions`

### `showError(msg)`
Показывает сообщение в `#error` (fade in, 1.5с, fade out).

### `goToMenu()`
Останавливает все RAF, скрывает `#game`, показывает `#home-screen`.
Вызывает `showHomeScreen()`.

---

## 7. Рендеринг (draw)

### `draw()`
Главная функция рисования. Вызывается из RAF или напрямую.
1. Очищает canvas
2. Рисует захваченные области (`polygons`)
3. Рисует линии (с glow для stargazer)
4. Рисует анимацию новой линии (`_lineAnim`)
5. Рисует preview-линию от selected
6. Рисует точки: `drawStarPoint()` для stargazer, или круги
7. Рисует блокирующие точки, победный экран, prob bar
8. Вызывает `drawTutorialOverlay()`, `drawHints()`, `drawProbBar()`

### `drawStarPoint(ctx, px, py, degree, isHov, isSel, isBlocking, boost=0)`
Рисует звезду на игровом canvas. 3 слоя: широкое свечение, лучи, яркое ядро.
- `degree` — кол-во линий от точки (влияет на яркость)
- `boost` — мультипликатор яркости (для мерцания)

### `drawStarPointTo(c, px, py, degree, isHov, isSel, isBlocking, boost=0)`
Аналог `drawStarPoint` для произвольного контекста (duel canvas, victory screen).

### `drawProbBar()`
Рисует полосу вероятности победы: для stargazer — скользящая светящаяся точка на линии, для остальных — двухцветная полоска.

### `drawTutorialOverlay()`
Рисует подсказки поверх canvas: pulse-кольцо вокруг точки, тултип с текстом и кнопкой «Понятно →».

### `drawHints()`
Рисует шиммер-подсветку рекомендуемых рёбер (stargazer). RAF-цикл через `_hintsRaf`.

---

## 8. Victory / специальные экраны

### `startWinEffect()`
Запускает частицы на `#particle-canvas` (`_winParticleRaf`), flash-эффект на `#win-flash`.
Содержит null-guard на `#particle-canvas`.

### `drawVictoryMinimal(ctx, W, H)`
Рисует экран победы для темы Minimal: S-кривые, точки, текст.

### `drawVictorySuprematist(ctx, W, H)`
Рисует экран победы для темы Suprematist: виниловые круги, прямоугольники.

### `drawVictoryChalk(ctx, W, H)`
Рисует экран победы для темы Chalk: спирали, текстура бумаги, радужные цвета.

### `drawVictoryDuel(ctx, W, H)`
Рисует два созвездия бок о бок (human vs human). Использует `#duel-wrap`.

### `drawConstellation(c, player, deg, tf)` *(вложена в drawVictoryDuel)*
Рисует созвездие одного игрока в указанный контекст с заданной трансформацией.

---

## 9. Анимации

### `startTwinkleLoop()`
RAF мерцания звёзд на экране победы (stargazer). Случайная звезда — fade up/down.

### `startGameTwinkleLoop()`
RAF мерцания во время игры. Останавливается при смене темы или конце игры.

### `startProbBarAnim()`
Плавно анимирует `_probBarDisplay` → `_probBarTarget` (lerp per frame).
Также обновляет `lastMoveAnimT` для подсветки последнего хода.

### `startChalkAnim()`
RAF прогрессивной отрисовки chalk-победы (0 → 1).

### `startRankUpCeremony(rankInfo)`
Полноэкранная анимация повышения ранга: overlay canvas, звезда ранга, текст, fade.

### `flyToSkyAnimation(onDone)`
Overlay canvas (position:fixed, z-index:9997). 1200 мс, 3 фазы:
1. Уменьшение (scale 1→0.3) + небольшое смещение
2. Уменьшение (0.3→0.05) + полёт к targetY=30
3. Исчезновение (fade out)
Искры расходятся вверх. По завершении — `onDone()` (фактическое сохранение).

---

## 10. Прогрессия / Достижения

### `loadProgress() → object`
Читает `playerProgress` из localStorage, мержит с defaults.

### `saveProgress(p)`
Записывает объект прогресса в `playerProgress`.

### `computeRank(rating) → {rank, subRank, title, name, nextThreshold, progress}`
Вычисляет ранг и подранг по рейтингу. 10 рангов × 3 подранга.

### `computeGamePoints({won, myScore, opponentScore, aiLevel, gameLength}) → number`
Формула очков: base (100/50/20) + efficiency bonus + difficulty bonus + margin bonus, × length multiplier.

### `progressionUpdate()`
Вызывается после `endGame()`. Обновляет gamesPlayed, gamesWon, streak, rating.
Проверяет повышение ранга → `_rankUpNewRank`. Вызывает `checkAchievements()`.

### `checkAchievements(p)`
Проверяет условия всех ачивок, добавляет новые в `p.achievementsUnlocked`.

### `renderProgressWidget()`
Обновляет `#rank-display` в нижней панели игры.

### `getFavouriteTheme(p) → string`
Находит тему с максимальным кол-вом партий.

### `rankToAiLevel() → number`
Конвертирует ранг игрока в уровень сложности ИИ (1–5).

---

## 11. Темы

### `applyTheme(name)`
Применяет тему: обновляет CSS custom properties, `COLOR`, `PREVIEW`, `FILL`.
Сохраняет в `localStorage.theme`. Запускает `startGameTwinkleLoop()` для stargazer.

### `drawGrainOverlay(ctx, W, H)`
Рисует плёночный шум поверх canvas (кешируется в `_grainCanvas`, обновляется каждые 3 кадра).

### `drawChalkPaperBg(ctx, W, H)` / `drawChalkSpiral(...)` / `drawChalkLine(...)` / `drawChalkDot(...)`
Вспомогательные функции рисования для темы Chalk.

### `drawRankEmblem(rank, cx, cy)` / `drawRankEmblemOnCtx(ctx, rank, cx, cy)`
Рисует эмблему ранга (уникальная форма-созвездие для каждого из 10 рангов).

---

## 12. Home Screen

### `showHomeScreen()`
Обновляет имя (`#home-player-name`), score (`#home-rating-pts`), запускает `_startHomeBgAnim()`.

### `_startHomeBgAnim()`
Запускает RAF-анимацию фонового созвездия на `#home-bg-canvas`.
Выбирает случайное из `saved_constellations`. Рисует с 3-pass glow + twinkle-анимацией.
Масштаб: `Math.min(pw, ph) * 0.54 / span` (сохраняет аспект на любом экране).

### `_stopHomeBgAnim()`
Останавливает RAF фона, обнуляет `_homeBgRaf`.

### `_drawLengthPreview(cv, pts)`
Рисует звёзды-точки заданной конфигурации на canvas 76×76. Используется в старом dropdown (legacy).

### `refreshHomeConstellations()`
⚠️ Legacy — `#home-cards` удалён из HTML. Содержит null-guard, не вызывает ошибки.

---

## 13. Journey Screen

### `openJourneyScreen()`
Скрывает `#sky-hub-screen`, показывает `#journey`, запускает RAF.

### `closeJourneyScreen()`
Останавливает RAF, скрывает `#journey`.

### `drawJourneyScreen()`
Рисует на `#journey-canvas`:
- Карточка игрока (имя, ранг, прогресс-бар)
- Сетка статистики (6 ячеек)
- Карта достижений (звёзды с пунктирными линиями)
- Тултип при hover

### `getAchStarPositions(JW, JH) → {x,y}[]`
Вычисляет позиции звёзд достижений на canvas.

---

## 14. Sky Hub Screen  *(новый)*

### `openSkyHub()`
Останавливает `_stopHomeBgAnim()`, скрывает `#home-screen`, показывает `#sky-hub-screen`.

### `closeSkyHub()`
Скрывает `#sky-hub-screen`, вызывает `showHomeScreen()`.

---

## 15. Sky Screen

### `openSkyScreen(mode='global')`
- Скрывает `#sky-hub-screen`, показывает `#sky-screen`
- Загружает данные из Supabase (`constellations` table, limit 100)
- Добавляет локальные созвездия из localStorage
- Запускает `_skyLoop()`

### `_skyClose()`
Останавливает RAF, скрывает `#sky-screen`, показывает `#sky-hub-screen`.

### `_skyLoop()`
RAF: вызывает `_skyDraw()` бесконечно пока screen открыт.

### `_skyDraw()`
Рисует на `#sky-canvas`: фоновые звёзды, созвездия в galaxy или map режиме.
- Galaxy: точка-звезда, размер = COUNT, имя при hover
- Map: миниатюра линий созвездия

### `_skyEnsureBg()`
Инициализирует 300 детерминированных фоновых звёзд.

### `_skyHash(key) → number`
Детерминированный PRNG для позиций фоновых звёзд.

### `_skyZoomTo(cx, cy, targetScale, duration)`
Плавный зум к точке (cx, cy) за `duration` мс.

---

## 16. Settings Screen

### `openSettingsScreen()`
Показывает `#settings-screen`, скрывает `#home-screen`.

### Кнопки `.s-theme-btn`
Применяют тему через `applyTheme(theme)`, обновляют active-класс.

---

## 17. Stub / Вспомогательные экраны

### `openStub(title)`
Показывает `#stub-screen` с заданным заголовком.

### `goToMenu()`
Универсальный возврат: останавливает RAF, скрывает все экраны, показывает `#home-screen`.

---

## 18. Звук *(заглушка)*

### `playSound(name)`
⚠️ Заглушка — в текущей версии не реализована. Вызывается при событиях (`'score'`, `'win'`).

---

## 19. Tutorial Screen

### `(function initTutorial())`
IIFE. Инициализирует интерактивный туториал:
- 4 точки, заранее заданные позиции
- Анимированные фазы (0–7) обучения
- `draw()`, `drawStar()`, `drawSeg()`, `startAILine()`, `showTutorial()`
- По завершении: `localStorage.setItem('tutorial_v4_seen','1')`, переход на `#home-screen`

### `(function initAuth())`
IIFE. Инициализирует экран авторизации.
- Apple/Google: TODO (заглушки логики)
- Skip: записывает `guestMode`, `userId`, вызывает `hideAuth()`
- `hideAuth()` — показывает tutorial или home в зависимости от `tutorial_v4_seen`
