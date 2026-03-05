# ARCHITECTURE.md — Созвездие / Stargazer

## Стек технологий

| Технология | Версия | Почему выбрана |
|---|---|---|
| HTML5 Canvas 2D | нативный | Полный контроль над рендерингом игровых элементов; не требует библиотек |
| Vanilla JS (ES2020) | нативный | Минимальный бандл, нет зависимостей сборки — критично для Capacitor |
| Capacitor | ^8.1.0 | Оборачивает web-приложение в нативный iOS-контейнер с доступом к Haptics API |
| Supabase JS | ^2 (CDN) | Хранилище публичных созвездий; простой REST/realtime через один SDK |
| Google Fonts (Raleway, Caveat) | CDN | Авторский почерк игры без встраивания шрифтов в бандл |

**Единственный файл приложения:** `www/index.html` (~7 860 строк)
Всё — CSS, HTML, JS — в одном файле. Это упрощает синхронизацию через `npx cap sync`.

---

## Структура папок

```
stargazer/
├── www/
│   └── index.html          # Всё приложение (CSS + HTML + JS)
├── ios/
│   └── App/
│       └── App/
│           └── public/     # Копия www/ после cap sync
├── docs/                   # Эта документация
├── package.json            # Зависимости: @capacitor/cli, @capacitor/core, @capacitor/ios
└── capacitor.config.json   # appId, webDir: www
```

---

## Схема экранов и навигации

```
                          ┌─────────────────┐
                          │  #auth-screen   │  (z-index: 20)
                          │  Первый запуск  │
                          └────────┬────────┘
                    Apple/Google/  │  Продолжить без входа
                          ┌────────▼────────┐
                          │ #tutorial-screen│  (z-index: 19)
                          │  Первая игра    │  только если !tutorial_v4_seen
                          └────────┬────────┘
                                   │ Завершение туториала
                          ┌────────▼────────┐
                          │  #home-screen   │  (z-index: 15)
                          │  Главное меню   │◄──────────────────────────────┐
                          └──┬──────────┬───┘                               │
              Играть ▼       │          │  Кнопка «Sky»                     │
                          ▼  │  ┌───────▼──────────────────────────────┐   │
                    ┌─────────┐ │  ┌──────────────────┐                │   │
                    │ #start  │ │  │ #sky-hub-screen   │  (z-index: 16) │   │
                    │(z:10)   │ │  │ Мои созвездия /   │                │   │
                    │ Выбор   │ │  │ Небо              │                │   │
                    │ режима  │ │  └───┬───────────┬───┘  ← back → home│   │
                    └────┬────┘ │      │           │                    │   │
          startGame()    │      │  ────▼────   ────▼─────               │   │
                    ┌────▼────┐ │  #journey   #sky-screen               │   │
                    │  #game  │ │  (z:11)     (z:16)                    │   │
                    │(z:нет)  │ │  Мои         Галактика                 │   │
                    │ Игровой │ │  созвездия   ← back → sky-hub         │   │
                    │  экран  │ │  ← back →                             │   │
                    └────┬────┘ │  sky-hub                              │   │
           endGame()     │      │                                        │   │
                    ┌────▼────┐ │  ────▼────                            │   │
                    │ Victory/│ │  #settings-screen (z:17)              │   │
                    │ Loss    │ │  ← back → home                        │   │
                    │ overlay │ └───────────────────────────────────────┘   │
                    └────┬────┘                                              │
           goToMenu()    └──────────────────────────────────────────────────┘
                    Победа → name-constellation → flyToSkyAnimation → home
```

---

## Поток данных: localStorage ↔ JS ↔ Supabase

```
┌─────────────────────────────────────────────────────────────┐
│                        localStorage                         │
│                                                             │
│  playerName            → имя игрока (строка)               │
│  userId                → 'null' для гостя, UUID для auth    │
│  guestMode             → 'true' если пропущен auth          │
│  theme                 → 'stargazer' | 'minimal' | ...      │
│  hintsEnabled          → '0' | '1'                          │
│  app_settings          → JSON: { sound, vibration,          │
│                           starGlow }                         │
│  tutorialDone          → '1' если сыграна первая игра       │
│  tutorial_v4_seen      → '1' если показан новый туториал    │
│  playerProgress        → JSON: { rating, rank, gamesPlayed, │
│                           gamesWon, streak, bestStreak,     │
│                           achievementsUnlocked, ... }        │
│  saved_constellations  → JSON: [{name, points, lines,       │
│                           polygons, winner, savedAt}, ...]  │
│  lastConstellationName → строка: последнее имя созвездия    │
└────────────┬───────────────────────────┬────────────────────┘
             │ read/write                │ read (saved_consts)
             ▼                           ▼
┌────────────────────────┐  ┌────────────────────────────────┐
│     JavaScript (SPA)   │  │     Supabase (PostgreSQL)      │
│                        │  │                                │
│ loadProgress()         │  │  table: constellations         │
│ saveProgress()         │  │  columns:                      │
│ showHomeScreen()       │  │    id         uuid PK          │
│ openJourneyScreen()    │  │    name       text             │
│ openSkyScreen()        │  │    data       jsonb            │
│ openSkyHub()           │  │      { points[], lines[],      │
│                        │  │        polygons[], winner }     │
│ name-const-save-btn    │  │    created_at timestamptz      │
│  → flyToSkyAnimation() │  │                                │
│  → sb.from('const...') │  │  SELECT (limit 100) on open    │
│      .insert(...)  ────┼─►│  INSERT on save                │
│                        │  │  REALTIME sub on open          │
└────────────────────────┘  └────────────────────────────────┘
```

---

## Все RAF-циклы и их назначение

| Переменная | Запускается | Останавливается | Назначение |
|---|---|---|---|
| `_pointBirthRaf` | `_startBirthAnim()` в `startGame()` | Когда все точки появились | Плавное появление точек при старте игры |
| `_lineAnimRaf` | `draw()` при `_lineAnim != null` | По завершении анимации | Анимация прорисовки новой линии (200 мс) |
| `lastMoveAnimRaf` | `startProbBarAnim()` | После полного затухания | Подсветка последнего хода |
| `_probBarRaf` | `startProbBarAnim()` | Когда display ≈ target | Плавная анимация полосы вероятности победы |
| `_tutorialRaf` | `drawTutorialOverlay()` | Tooltip исчез | Оверлей-подсказки поверх игры |
| `_hintsRaf` | `drawHints()` | `!_hintsOn \|\| gameOver` | Мерцающая подсветка лучших ходов (stargazer) |
| `_twinkleRaf` | `startTwinkleLoop()` | При смене темы / новой игре | Мерцание звёзд на экране победы (stargazer) |
| `_gameTwinkleRaf` | `startGameTwinkleLoop()` | `gameOver \|\| !stargazer` | Мерцание звёзд во время игры (stargazer) |
| `_chalkAnimRaf` | `startChalkAnim()` | `_chalkAnimProgress >= 1` | Анимация chalk-победы (рисование спиралей) |
| `_rankUpRaf` | `startRankUpCeremony()` | По завершении церемонии | Анимация повышения ранга на canvas |
| `_winParticleRaf` | `startWinEffect()` | Все частицы исчезли | Золотые частицы при захвате области |
| `_skyRaf` | `_skyLoop()` в `openSkyScreen()` | `_skyClose()` | Основной рендер-цикл галактики |
| `_skyAnimRaf` | Анимации зума/лёта | По завершении | Плавные переходы и лёт к созвездию |
| `_homeBgRaf` | `_startHomeBgAnim()` в `showHomeScreen()` | `_stopHomeBgAnim()` | Анимация фонового созвездия на главном экране |
| `_raf` (tutorial) | `initTutorial()` draw() | При скрытии tutorial-screen | Анимация интерактивного туториала |
| flyToSkyAnimation RAF | нажатие «Сохранить в небо» | 1200 мс / overlay.remove() | Улёт созвездия вверх перед сохранением |

---

## Секции JS-кода (в порядке появления в файле)

| Строки (прибл.) | Секция | Назначение |
|---|---|---|
| 1376 | Supabase | Инициализация клиента |
| 1381 | start screen | Логика экрана выбора режима (#start) |
| 1572 | canvas / constants | Canvas, DPR, константы RADIUS, MIN_DIST |
| 1590 | adaptive canvas resize | resizeCanvas(), обработчик orientationchange |
| 1710 | geometry | lineKey, pointInPolygon, polygonArea, isInsideCaptured |
| 1780 | graph | findPaths (DFS поиск циклов) |
| 1834 | validation | properlyIntersects, validate — правила хода |
| 1967 | scoring | checkScore, moveWouldScore, givesOpponentScore |
| 1994 | Звездочёт | AI: countPromisingPairs, chainScore, scoreMove, makeAIMove |
| 2205 | Web Audio | playSound — синтез звуков через AudioContext |
| 2268 | tutorial | Игровые подсказки-тултипы (первая игра) |
| 2430 | hints | computeHints, drawHints — shimmer-подсветка лучших ходов |
| 2593 | game over | isGameOver, endGame, finishEndGame |
| 2796 | ui | updateUI, showError |
| 2831 | draw | draw() — главный игровой рендер-цикл |
| 3394 | win-probability bar | drawProbBar, startProbBarAnim |
| 3552 | last move | animateLastMove, updateLastMoveBtn |
| 3603 | events | Обработчики mouse/touch/click на canvas |
| 3764 | themes | THEMES, T(), applyTheme |
| 4407 | Chalk theme | drawChalkPaperBg, drawChalkSpiral, drawVictoryChalk |
| 4694 | Film grain overlay | regenerateGrain, drawGrainOverlay |
| 4886 | progression | loadProgress, saveProgress, computeRank, progressionUpdate |
| 5153 | Home screen bg anim | _startHomeBgAnim, _stopHomeBgAnim, showHomeScreen |
| 5280 | rank-up ceremony | startRankUpCeremony, drawRankEmblem |
| 5388 | journey screen | openJourneyScreen, drawJourneyScreen, checkAchievements |
| 5545 | saved constellations | _loadSaved, _persistSaved, _renderJourneyGrid |
| 5599 | sky hub | openSkyHub, closeSkyHub |
| 5845 | sky screen | openSkyScreen, _skyDraw, _skyLoop, _skyClose |
| 6446 | In-game UI toggle | #ui-toggle-btn |
| 6453 | Home length picker | _HOME_LENGTHS, _homeSelectedLength, home-len-btn handlers |
| 6530 | Home screen buttons | ИГРАТЬ, Sky, Settings, stub |
| 6676 | Настройки | openSettingsScreen, _saveSettings, _applySettingsUI |
| 6719 | Constellation detail | openConstDetail, detail screen RAF |
| 7528 | Auth / Tutorial | initAuth, initTutorial |
