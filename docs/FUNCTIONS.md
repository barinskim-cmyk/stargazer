# FUNCTIONS.md — Все JS-функции

Функции определены в глобальном скопе `<script>` внутри `www/index.html`.

---

## 1. Утилиты / Инициализация

### `haptic(style = 'light')`
Вызывает тактильный отклик через Capacitor Haptics API.
- `style`: `'light'` | `'medium'` | `'heavy'`
- Безопасен вне Capacitor (try/catch)

### `showStep(id)`
Скрывает все `.start-step`, показывает шаг `#${id}`.

### `fadeTo(hideEl, showEl, duration=300, onShown=null)`
Универсальный переход между двумя DOM-элементами.
Fade out → `display:none` → `display:flex` → fade in.
После появления `showEl` вызывает `onShown()` через rAF.

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
Площадь через формулу Гаусса (shoelace).

### `isInsideCaptured(idx) → boolean`
Проверяет, находится ли точка внутри уже захваченной области.

### `hasFreePointsInside(path) → boolean`
Есть ли хотя бы одна «свободная» точка внутри потенциального многоугольника.

### `findPaths(src, dst, skipKey, maxDepth=25) → number[][]`
DFS по графу линий: все простые пути от `src` до `dst`.

---

## 3. Валидация ходов

### `properlyIntersects(p1x,p1y,p2x,p2y,p3x,p3y,p4x,p4y) → boolean`
Строгое пересечение двух отрезков.

### `segmentPassesThroughCapture(a, b) → boolean`
Проходит ли отрезок через захваченную область.

### `pointBlockingSegment(a, b) → number`
Индекс точки, лежащей на отрезке (a,b). `-1` если нет.

### `closesInvalidFigure(a, b) → boolean`
Все замыкаемые фигуры не имеют свободных точек внутри → ход запрещён.

### `segmentCrossesExistingLine(a, b) → boolean`
Пересекает ли новый отрезок уже нарисованные линии.

### `validate(a, b) → {ok, reason?, blockingPoint?}`
Единая точка проверки хода. Применяет все правила по порядку.

---

## 4. Подсчёт очков

### `checkScore(newA, newB, player)`
После добавления ребра: ищет замкнутые фигуры, засчитывает очко за наименьшую.

---

## 5. ИИ (Звездочёт)

### `moveWouldScore(a, b) → boolean`
Даст ли ход (a,b) очко.

### `givesOpponentScore(a, b) → boolean`
Позволит ли соперник замкнуть фигуру в ответ.

### `countHypotheticalOpponentScores(a, b) → number`
Количество возможных ответных очков соперника.

### `countPromisingPairs() → number`
Кол-во пар точек, где оба игрока могут замкнуть фигуру.

### `scoreEdge(i, j) → number`
Оценка хода (i,j): позитивная за очко, штрафная за опасность.

### `stargazerMove()`
Основная функция ИИ. Уровни 1–5: случайный или стратегический ход.

### `randomMove()`
Случайный допустимый ход. Fallback для ИИ.

---

## 6. Игровой цикл

### `startGame()`
Инициализирует новую игру: генерирует точки, сбрасывает состояние, показывает `#game`.
- Если `!tutorialDone && rating === 0` — включает `_tutorialMode = true`, `COUNT = 4`

### `updateUI()`
Обновляет `#score1`, `#score2`, `#turn-display`, `#prob-bar-wrap`.

### `endGame()`
Определяет победителя, запускает `progressionUpdate()`, `startTwinkleLoop()`, `finishEndGame()`.

### `finishEndGame()`
Анимированная последовательность завершения игры:
1. Затемнение canvas
2. Появление текста победы/ничьей
3. Появление `#name-constellation` с вызовом `applyGuestMode()`
4. Если `_tutorialAutoSave` → вызов `_doTutorialAutoSave(name)`

### `showError(msg)`
Показывает сообщение в `#error` на 2.5 сек.

### `goToMenu()`
Останавливает все RAF, скрывает `#game`, показывает `#home-screen` через `fadeTo()`.

---

## 7. Рендеринг

### `draw()`
Главная функция рисования. Очищает canvas, рисует все элементы, оверлеи, туториал.

### `drawStarPoint(ctx, px, py, degree, isHov, isSel, isBlocking, boost=0)`
Рисует звезду на игровом canvas. 3 слоя: широкое свечение, лучи, яркое ядро.

### `drawStarPointTo(c, px, py, degree, isHov, isSel, isBlocking, boost=0)`
Аналог для произвольного контекста (duel canvas, victory screen).

### `drawProbBar()`
Полоса вероятности победы: stargazer — скользящая точка, остальные — двухцветная полоска.

### `drawTutorialOverlay()`
Рисует pulse-кольцо вокруг точки и тултип с кнопкой «Понятно →».

### `drawHints()`
Shimmer-подсветка рекомендуемых рёбер (stargazer). RAF через `_hintsRaf`.

---

## 8. Victory / специальные экраны

### `startWinEffect()`
Золотые частицы на `#particle-canvas`, flash на `#win-flash`.

### `saveToSkyAnimation(name, onDone)`
Overlay canvas (position:fixed, z-index:9997). 1200 мс, 3 фазы — уменьшение + полёт вверх + исчезновение. По завершении вызывает `onDone()`.

---

## 9. Победный экран: сохранение

### `applyGuestMode()`
Настраивает кнопки в `#name-constellation` в зависимости от состояния авторизации:

| Ситуация | «В небо ✦» | «В мои созвездия» | «Сохранено ✦» |
|---|---|---|---|
| Авторизован | показана | показана | скрыта |
| Гость | скрыта | показана | скрыта |
| Туториал (`_tutorialAutoSave`) | скрыта | скрыта | показана |

### `_doTutorialAutoSave(name)`
Авто-сохраняет первое созвездие туториала в `saved_constellations` без `publishedAt`.
Сбрасывает `_tutorialAutoSave = false`. Не публикует в Supabase.

### `name-const-save-btn` обработчик (авторизован)
«Сохранить в небо ✦»:
1. Создаёт объект с `publishedAt` и `skyAddr`
2. Сохраняет в `localStorage.saved_constellations`
3. Параллельно вставляет в Supabase `constellations`
4. Запускает `saveToSkyAnimation(name, onDone)` → переход на home

### `name-const-local-save-btn` обработчик (все)
«Сохранить в мои созвездия»:
1. Создаёт объект БЕЗ `publishedAt` (созвездие не публично)
2. Сохраняет в `localStorage.saved_constellations`
3. Показывает «Созвездие сохранено ✦»
4. Через 1.5 сек → `goToMenu()`

---

## 10. Анимации

### `startTwinkleLoop()`
RAF мерцания звёзд на экране победы.

### `startGameTwinkleLoop()`
RAF мерцания во время игры (тема stargazer).

### `startProbBarAnim()`
Плавно анимирует `_probBarDisplay` → `_probBarTarget`.

### `startChalkAnim()`
RAF прогрессивной отрисовки chalk-победы.

### `startRankUpCeremony(rankInfo)`
Полноэкранная анимация повышения ранга.

---

## 11. Прогрессия / Достижения

### `loadProgress() → object`
Читает `playerProgress` из localStorage, мержит с defaults.

### `saveProgress(p)`
Записывает объект прогресса в localStorage.

### `computeRank(rating) → {rank, subRank, title, name, nextThreshold, progress}`
Вычисляет ранг и подранг по рейтингу. 10 рангов × 3 подранга.

### `computeGamePoints({won, myScore, opponentScore, aiLevel, gameLength}) → number`
Формула очков: base + efficiency bonus + difficulty bonus + margin bonus × length multiplier.
Результат делится на 10 и округляется вверх (`Math.ceil(total / 10)`).
За поражение — фиксированный вычет 10 очков рейтинга.

### `progressionUpdate()`
После `endGame()`: обновляет gamesPlayed, gamesWon, streak, rating.
Проверяет повышение ранга → `_rankUpNewRank`.

### `checkAchievements(p)`
Проверяет условия всех ачивок, добавляет новые в `p.achievementsUnlocked`.

### `rankToAiLevel() → number`
Конвертирует ранг игрока в уровень сложности ИИ (1–5).

---

## 12. Темы

### `applyTheme(name)`
Обновляет CSS custom properties, `COLOR`, `PREVIEW`, `FILL`. Сохраняет в localStorage.

### `drawGrainOverlay(ctx, W, H)`
Плёночный шум поверх canvas (кеш в `_grainCanvas`, ротация каждые 3 кадра).

### `drawChalkPaperBg / drawChalkSpiral / drawChalkLine / drawChalkDot`
Вспомогательные функции темы Chalk.

### `drawRankEmblem(rank, cx, cy)` / `drawRankEmblemOnCtx(ctx, rank, cx, cy)`
Эмблема-созвездие для каждого из 10 рангов.

---

## 13. Home Screen

### `showHomeScreen()`
Обновляет имя, score, запускает `_startHomeBgAnim()`, показывает `#home-screen`.

### `_startHomeBgAnim()`
RAF-анимация фонового созвездия на `#home-bg-canvas`. Случайное из `saved_constellations`.

### `_stopHomeBgAnim()`
Останавливает RAF фона.

---

## 14. Journey Screen

### `openJourneyScreen(returnTo)`
- `returnTo` (string) — ID экрана для возврата при закрытии (например `'sky-hub-screen'`)
- Защита от MouseEvent: `typeof returnTo === 'string'` (иначе дефолт `'sky-hub-screen'`)
- Скрывает экран-источник, показывает `#journey`, запускает RAF

### `closeJourneyScreen()`
Останавливает RAF, скрывает `#journey`, восстанавливает `_journeyReturnTo`.

### `drawJourneyScreen()`
Рисует на `#journey-canvas`: профиль игрока, статистика, карта достижений, тултип.

### `getAchStarPositions(JW, JH) → {x,y}[]`
Вычисляет позиции звёзд достижений на canvas.

---

## 15. Sky Hub Screen

### `openSkyHub()`
Останавливает `_stopHomeBgAnim()`, скрывает `#home-screen`, показывает `#sky-hub-screen`.

### `closeSkyHub()`
Скрывает `#sky-hub-screen`, вызывает `showHomeScreen()`.

---

## 16. Sky Screen

### `openSkyScreen(mode='global')`
- Скрывает `#sky-hub-screen`, показывает `#sky-screen`
- Загружает из Supabase + объединяет с localStorage
- Запускает `_skyEnsurePreStars()`, затем `_skyLoop()`

### `_skyEnsurePreStars()`
Генерирует 3200 случайных фоновых звёзд один раз. Три тира яркости/размера.
Сохраняет в `_skyBgPreStars`.

### `_skyClose()`
Останавливает RAF, скрывает `#sky-screen`, показывает `#sky-hub-screen`.

### `_skyLoop()` / `_skyDraw()`
RAF: рисует фоновые звёзды (только точки — без линий созвездий в galaxy view) и сами созвездия.

### `_skyZoomTo(cx, cy, targetScale, duration)`
Плавный зум к точке (cx, cy).

---

## 17. Settings Screen

### `openSettingsScreen()`
Показывает `#settings-screen`, скрывает `#home-screen`.
Кнопка «Выйти»: `sb.auth.signOut()` + очистка `userId`/`guestMode` + `location.reload()`.

---

## 18. Renamed / Переименование

### `_commitDetailRename()`
При переименовании созвездия:
1. Обновляет `arr[idx].name` в localStorage
2. Если `publishedAt` установлен → `sb.from('constellations').update({name, data}).eq('name', oldName).eq('user_id', uid)` (не upsert — чтобы не создавать дубликат)
3. Обновляет `skyAddr` если опубликовано

---

## 19. Auth / Tutorial

### `(async function checkSession())`
При старте: `sb.auth.getSession()` — если сессия жива, восстанавливает `userId` в localStorage без показа auth-screen.

### `sb.auth.onAuthStateChange()`
Слушает `SIGNED_IN` и `SIGNED_OUT` — синхронизирует `userId` и `guestMode` в localStorage.

### `(function initAuth())`
IIFE. Email/password вход + регистрация. При успехе: `hideAuth()`.
`hideAuth()` — показывает tutorial или home в зависимости от `tutorial_v4_seen`.

### `(function initTutorial())`
IIFE. Интерактивный туториал (4 точки, 4 шага). По завершении: `tutorial_v4_seen = '1'`, переход на home.

### `playSound(name)`
Синтез звуков через Web AudioContext. Поддерживает: `'score'`, `'win'`, `'twinkle'`, `'select'`.
