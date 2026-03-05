# ARCHITECTURE.md — Созвездие / Stargazer

## Стек технологий

| Технология | Версия | Почему выбрана |
|---|---|---|
| HTML5 Canvas 2D | нативный | Полный контроль над рендерингом игровых элементов; не требует библиотек |
| Vanilla JS (ES2020) | нативный | Минимальный бандл, нет зависимостей сборки — критично для Capacitor |
| Capacitor | ^8.1.0 | Оборачивает web-приложение в нативный iOS-контейнер с доступом к Haptics API |
| Supabase JS | ^2 (CDN) | Email-авторизация + хранилище публичных созвездий; REST/realtime через один SDK |
| Google Fonts (Raleway, Caveat) | CDN | Авторский почерк игры без встраивания шрифтов в бандл |

**Единственный файл приложения:** `www/index.html` (~9 500 строк)
Всё — CSS, HTML, JS — в одном файле. После правок файл копируется вручную в `ios/App/App/public/index.html`.

---

## Структура папок

```
stargazer/
├── www/
│   └── index.html          # Всё приложение (CSS + HTML + JS)
├── ios/
│   └── App/
│       └── App/
│           └── public/     # Копия www/ (ручная: cp www/index.html ios/App/App/public/)
├── docs/                   # Эта документация
├── package.json            # Зависимости: @capacitor/cli, @capacitor/core, @capacitor/ios
└── capacitor.config.json   # appId, webDir: www, contentInset: "never"
```

---

## iOS 26 — фикс layout shift

WKWebView в iOS 26 добавляет автоматические content insets, из-за чего весь UI смещается влево/вниз. Решение двухуровневое:

**`capacitor.config.json`:**
```json
{
  "ios": {
    "contentInset": "never",
    "scrollEnabled": false
  }
}
```

**CSS в `index.html`:**
```css
html { width: 100%; height: 100%; overflow: hidden; overscroll-behavior: none; }
body {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  width: 100%; height: 100%;
  overflow: hidden; overscroll-behavior: none;
}
```

`position: fixed` на `body` блокирует layout строго в viewport на всех экранах.

---

## Схема экранов и навигации

```
                      ┌─────────────────┐
                      │  #auth-screen   │  (z-index: 20)
                      │  Email / Гость  │
                      └────────┬────────┘
                               │  hideAuth()
               ┌───────────────┼───────────────────┐
               │ tutorial_v4_seen == null           │ tutorial_v4_seen == '1'
               ▼                                    ▼
    ┌──────────────────┐               ┌────────────────────┐
    │ #tutorial-screen │  (z-index:19) │   #home-screen     │
    │  Первая игра     │               │  (z-index: 15)     │
    └────────┬─────────┘               └──┬──────────────┬──┘
             │ tutorialDone='1'           │              │
             └───────────────────────────┘   «Sky» ─────▼
                                         ┌───────────────────────┐
        ┌────────────────────────────────┤  #sky-hub-screen      │ (z:16)
        │                               │  Мои созвездия / Небо │
        │  «Играть»                     └──────┬──────────┬──────┘
        ▼                                      │          │
  ┌──────────┐   startGame()            ┌──────▼──┐  ┌───▼──────┐
  │  #start  │ ─────────────────►       │ #journey│  │#sky-screen│
  │  (z:10)  │                  │       │ (z:11)  │  │  (z:16)  │
  └──────────┘                  ▼       │ ← back →│  │ ← back → │
                             ┌──────┐   │sky-hub  │  │ sky-hub  │
                             │#game │   └─────────┘  └──────────┘
                             └──┬───┘
                    endGame()   │
                             ┌──▼───────────┐
                             │ #name-const  │ Победа (AI-режим):
                             │ (overlay)    │  авторизован → «В небо ✦»
                             └──┬───────────┘  гость → «В мои созвездия»
                    goToMenu()  │              туториал → авто-сохранение
                                ▼
                          #home-screen
```

**z-index иерархия:**
| Экран | z-index |
|---|---|
| `#journey` | 11 |
| `#home-screen` | 15 |
| `#sky-hub-screen`, `#sky-screen`, `#stub-screen` | 16 |
| `#settings-screen` | 17 |
| `#profile-screen` | 18 |
| `#tutorial-screen`, `#const-detail` | 19 |
| `#auth-screen`, `#achievements-screen` | 20 |

**Навигация «назад»:** каждая функция закрытия экрана явно вызывает `showHomeScreen()` или восстанавливает нужный экран. `_journeyReturnTo` хранит строку-ID экрана, с которого открылся journey.

---

## Авторизация и сессии

```
Запуск приложения
  ├─ localStorage.guestMode === 'true' → пропустить, показать home
  └─ sb.auth.getSession()
       ├─ есть живая сессия → userId = session.user.id → home
       └─ нет сессии → если нет userId → показать #auth-screen

#auth-screen:
  ├─ Email + пароль (новый) → sb.auth.signUp() → sb.auth.signInWithPassword()
  ├─ Email + пароль (существующий) → sb.auth.signInWithPassword()
  └─ «Продолжить без входа» → guestMode='true', userId='null'

sb.auth.onAuthStateChange():
  ├─ SIGNED_IN → userId = session.user.id, guestMode='false'
  └─ SIGNED_OUT → localStorage.removeItem('userId')

Выход:
  └─ sb.auth.signOut() + очистка userId/guestMode в localStorage
```

---

## Поток данных: localStorage ↔ JS ↔ Supabase

```
┌────────────────────────────────────────────────────────────┐
│                        localStorage                        │
│                                                            │
│  userId                → UUID (auth) | 'null' (гость)     │
│  guestMode             → 'true' | 'false'                  │
│  playerName            → имя игрока                        │
│  theme                 → 'stargazer' | 'minimal' | ...     │
│  hintsEnabled          → '0' | '1'                         │
│  app_settings          → JSON: { sound, vibration,         │
│                           starGlow }                        │
│  tutorialDone          → '1' (первая игра сыграна)         │
│  tutorial_v4_seen      → '1' (экран туториала показан)     │
│  playerProgress        → JSON: { rating, rank, gamesPlayed,│
│                           gamesWon, streak, ... }           │
│  saved_constellations  → JSON: [{name, points, lines,      │
│                           polygons, winner, createdAt,     │
│                           publishedAt?, skyAddr}, ...]     │
│  lastConstellationName → строка: последнее имя созвездия   │
│  avatarType            → 'emoji' | 'letter'                │
│  avatarValue           → строка аватара                    │
└────────────┬──────────────────────────────┬───────────────┘
             │ read/write                   │ read (saved_consts)
             ▼                              ▼
┌────────────────────────┐  ┌─────────────────────────────────┐
│     JavaScript (SPA)   │  │     Supabase (PostgreSQL)       │
│                        │  │                                 │
│ loadProgress()         │  │  Auth: sb.auth.*                │
│ saveProgress()         │  │                                 │
│ showHomeScreen()       │  │  table: constellations          │
│ openJourneyScreen(r)   │  │  columns:                       │
│ openSkyScreen()        │  │    id         uuid PK           │
│ openSkyHub()           │  │    name       text              │
│                        │  │    data       jsonb             │
│ name-const-save-btn    │  │      { points[], lines[],       │
│  (авторизован)         │  │        polygons[], winner,      │
│  → saveToSkyAnimation  │  │        createdAt, publishedAt,  │
│  → sb.insert()     ───┼─►│        skyAddr }                │
│                        │  │    user_id    uuid (nullable)   │
│ name-const-local-btn   │  │    gx, gy     float (позиция)  │
│  (гость) → localStorage│  │    created_at timestamptz       │
│                        │  │                                 │
│                        │  │  SELECT limit 100 на открытии  │
│                        │  │  INSERT при сохранении в небо  │
│                        │  │  UPDATE при переименовании      │
│                        │  │  REALTIME sub на открытии       │
└────────────────────────┘  └─────────────────────────────────┘
```

**Схема одного элемента `saved_constellations`:**
```json
{
  "name": "Лебедь",
  "points": [{"x": 0.12, "y": 0.34}],
  "lines": [["0-2", 0], ["2-5", 1]],
  "polygons": [{"path": [0,2,5], "player": 0}],
  "winner": 0,
  "createdAt": "2025-01-15T10:30:00.000Z",
  "publishedAt": "2025-01-15T10:30:00.000Z",  // только если опубликовано в небо
  "skyAddr": "лебедь"                          // нормализованный slug для поиска
}
```

---

## Victory Screen — поток сохранения

```
finishEndGame()
  └─ applyGuestMode()
       ├─ _tutorialAutoSave == true
       │     → скрыть обе кнопки, показать «Созвездие сохранено ✦»
       │     → _doTutorialAutoSave(name) → localStorage (без publishedAt)
       │
       ├─ guestMode == 'true'
       │     → показать «Сохранить в мои созвездия»
       │     → handler: localStorage только (без publishedAt, без Supabase)
       │
       └─ авторизован
             → показать «Сохранить в небо ✦»
             → handler: localStorage (с publishedAt) + Supabase INSERT
             → saveToSkyAnimation(name, onDone)
```

---

## Все RAF-циклы и их назначение

| Переменная | Запускается | Останавливается | Назначение |
|---|---|---|---|
| `_pointBirthRaf` | `_startBirthAnim()` в `startGame()` | Когда все точки появились | Плавное появление точек при старте |
| `_lineAnimRaf` | `draw()` при `_lineAnim != null` | По завершении анимации | Анимация прорисовки новой линии (200 мс) |
| `lastMoveAnimRaf` | `startProbBarAnim()` | После полного затухания | Подсветка последнего хода |
| `_probBarRaf` | `startProbBarAnim()` | Когда display ≈ target | Анимация полосы вероятности победы |
| `_tutorialRaf` | `drawTutorialOverlay()` | Tooltip исчез | Оверлей-подсказки поверх игры |
| `_hintsRaf` | `drawHints()` | `!_hintsOn \|\| gameOver` | Мерцающая подсветка лучших ходов |
| `_twinkleRaf` | `startTwinkleLoop()` | При смене темы / новой игре | Мерцание звёзд на экране победы |
| `_gameTwinkleRaf` | `startGameTwinkleLoop()` | `gameOver \|\| !stargazer` | Мерцание звёзд во время игры |
| `_chalkAnimRaf` | `startChalkAnim()` | `_chalkAnimProgress >= 1` | Анимация chalk-победы |
| `_rankUpRaf` | `startRankUpCeremony()` | По завершении церемонии | Анимация повышения ранга |
| `_winParticleRaf` | `startWinEffect()` | Все частицы исчезли | Золотые частицы при захвате области |
| `_skyRaf` | `_skyLoop()` в `openSkyScreen()` | `_skyClose()` | Основной рендер-цикл галактики |
| `_skyAnimRaf` | Анимации зума/лёта | По завершении | Плавные переходы в небе |
| `_homeBgRaf` | `_startHomeBgAnim()` | `_stopHomeBgAnim()` | Анимация фонового созвездия на главном экране |
| `_raf` (tutorial) | `initTutorial()` draw() | При скрытии tutorial-screen | Анимация интерактивного туториала |
| `_journeyRaf` | `openJourneyScreen()` | `closeJourneyScreen()` | Рендер экрана «Мои созвездия» |
| saveToSkyAnimation RAF | нажатие «Сохранить в небо» | 1200 мс | Улёт созвездия вверх перед сохранением |

---

## Секции JS-кода (в порядке появления в файле)

| Строки (прибл.) | Секция | Назначение |
|---|---|---|
| 1376 | Supabase init | Инициализация клиента, checkSession (async), onAuthStateChange |
| 1420 | start screen | Логика экрана выбора режима (#start) |
| 1610 | canvas / constants | Canvas, DPR, константы RADIUS, MIN_DIST |
| 1630 | adaptive canvas resize | resizeCanvas(), обработчик orientationchange |
| 1750 | geometry | lineKey, pointInPolygon, polygonArea, isInsideCaptured |
| 1820 | graph | findPaths (DFS поиск циклов) |
| 1870 | validation | properlyIntersects, validate — правила хода |
| 2010 | scoring | checkScore, moveWouldScore, givesOpponentScore |
| 2035 | Звездочёт | AI: countPromisingPairs, chainScore, scoreMove, stargazerMove |
| 2215 | Web Audio | playSound — синтез звуков через AudioContext |
| 2310 | tutorial | Игровые подсказки-тултипы (первая игра) |
| 2480 | hints | computeHints, drawHints — shimmer-подсветка лучших ходов |
| 2640 | game over | isGameOver, endGame, finishEndGame |
| 2850 | ui | updateUI, showError |
| 2880 | draw | draw() — главный игровой рендер-цикл |
| 3450 | win-probability bar | drawProbBar, startProbBarAnim |
| 3600 | last move | animateLastMove, updateLastMoveBtn |
| 3655 | events | Обработчики mouse/touch/click на canvas |
| 3820 | themes | THEMES, T(), applyTheme |
| 4460 | Chalk theme | drawChalkPaperBg, drawChalkSpiral, drawVictoryChalk |
| 4750 | Film grain overlay | regenerateGrain, drawGrainOverlay |
| 4950 | progression | loadProgress, saveProgress, computeRank, progressionUpdate |
| 5210 | Home screen bg anim | _startHomeBgAnim, _stopHomeBgAnim, showHomeScreen |
| 5340 | rank-up ceremony | startRankUpCeremony, drawRankEmblem |
| 5450 | journey screen | openJourneyScreen(returnTo), drawJourneyScreen, checkAchievements |
| 5610 | saved constellations | _loadSaved, _persistSaved, _renderJourneyGrid |
| 5660 | sky hub | openSkyHub, closeSkyHub |
| 5910 | sky screen | openSkyScreen, _skyEnsurePreStars, _skyDraw, _skyLoop, _skyClose |
| 6510 | In-game UI toggle | #ui-toggle-btn |
| 6520 | Home length picker | _HOME_LENGTHS, home-len-btn handlers |
| 6600 | Home screen buttons | ИГРАТЬ, Sky, Settings |
| 6740 | Настройки | openSettingsScreen, _saveSettings, _applySettingsUI |
| 6790 | Constellation detail | openConstDetail, _commitDetailRename |
| 8650 | name-const-save-btn | Сохранение в небо (авторизован) |
| 8740 | applyGuestMode | Управление кнопками победного экрана |
| 8770 | _doTutorialAutoSave | Авто-сохранение первого созвездия |
| 8793 | name-const-local-save-btn | Сохранение в мои созвездия (гость) |
| 8820 | Auth / Tutorial screens | initAuth, initTutorial |
