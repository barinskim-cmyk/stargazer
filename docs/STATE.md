# STATE.md — Глобальное состояние

---

## Глобальные переменные JS

### Supabase

| Переменная | Тип | Описание |
|---|---|---|
| `SUPABASE_URL` | string | URL проекта Supabase |
| `SUPABASE_KEY` | string | Публичный (publishable) anon-ключ |
| `sb` | SupabaseClient | Клиент, созданный через `createClient()` |

---

### Игровое поле

| Переменная | Тип | Описание |
|---|---|---|
| `canvas` | HTMLCanvasElement | Главный игровой canvas `#c` |
| `ctx` | CanvasRenderingContext2D | Контекст главного canvas |
| `ctxDL`, `ctxDR` | CanvasRenderingContext2D | Контексты duel-canvas'ов (victory 2p) |
| `DW`, `DH` | 900, 700 | Фиксированные размеры duel canvas |
| `W`, `H` | number | Текущие размеры главного canvas (обновляются в resizeCanvas) |
| `RADIUS` | number | Радиус точки, ≈ BASE*0.013 |
| `MIN_DIST` | number | Минимальное расстояние между точками, ≈ BASE*0.038 |
| `isResizing` | boolean | Защита от рекурсии в resizeCanvas() |

---

### Состояние текущей партии

| Переменная | Тип | Описание |
|---|---|---|
| `points` | `{x,y}[]` | Все точки на поле (заполняется в startGame) |
| `lines` | `Map<string, number>` | Нарисованные рёбра: ключ → индекс игрока |
| `polygons` | `{path: number[], player: number}[]` | Захваченные области |
| `scoredKeys` | `Set<string>` | Ключи уже засчитанных многоугольников |
| `scores` | `[number, number]` | Очки игроков [p0, p1] |
| `currentPlayer` | 0 \| 1 | Чья очередь ходить |
| `winner` | number | -1 = не определён, 0 = p0, 1 = p1 |
| `gameOver` | boolean | Игра завершена |
| `COUNT` | number | Кол-во точек на поле (7/13/21) |
| `isAI` | boolean | Режим: true = vs AI, false = 2 игрока |
| `playerNames` | `string[2]` | Имена игроков |
| `stargazerLevel` | number | Уровень сложности ИИ (1–5, зависит от ранга) |

---

### Состояние ввода / UI

| Переменная | Тип | Описание |
|---|---|---|
| `hovered` | number | Индекс точки под курсором (-1 = нет) |
| `selected` | number | Индекс первой выбранной точки (-1 = нет) |
| `previewValidation` | object\|null | Результат validate() для текущего preview |
| `lastMove` | `{a,b}`\|null | Последнее сделанное ребро |
| `lastRatingGain` | number | Очки рейтинга за последнюю игру |

---

### Анимации и RAF

| Переменная | Тип | Назначение |
|---|---|---|
| `_lineAnim` | `{a,b,player,startT}`\|null | Текущая анимация прорисовки линии |
| `_lineAnimRaf` | number\|null | RAF handle |
| `_lineAnimating` | boolean | Блокировка ввода во время анимации |
| `_pointBirthT` | number[] | Timestamps появления каждой точки |
| `_pointBirthRaf` | number\|null | RAF handle birth animation |
| `_twinkleRaf` | number\|null | RAF мерцания (victory, stargazer) |
| `_twinkleState` | object\|null | `{idx, startMs, duration, waitUntil}` |
| `_gameTwinkleRaf` | number\|null | RAF мерцания во время игры |
| `_gameTwinkleState` | object\|null | Аналог _twinkleState |
| `lastMoveAnimRaf` | number\|null | RAF подсветки последнего хода |
| `lastMoveAnimT` | number | Прогресс 0..1 анимации последнего хода |
| `_probBarRaf` | number\|null | RAF анимации полосы вероятности |
| `_probBarDisplay` | number | Текущее отображаемое значение полосы (0..1) |
| `_probBarTarget` | number | Целевое значение полосы |
| `_winProb` | number | Оценочная вероятность победы p0 (0..1) |
| `_chalkAnimRaf` | number\|null | RAF chalk-victory |
| `_chalkAnimProgress` | number | Прогресс 0..1 chalk-анимации |
| `_rankUpRaf` | number\|null | RAF церемонии повышения ранга |
| `_rankUpActive` | boolean | Церемония активна |
| `_rankUpNewRank` | object\|null | Информация о новом ранге |
| `_winParticleRaf` | number\|null | RAF золотых частиц |

---

### Туториал (в игре)

| Переменная | Тип | Описание |
|---|---|---|
| `_tutorialMode` | boolean | Активен ли игровой туториал (первая игра) |
| `_tutorialStep` | number | Шаг: 0–3 (triggered moments) |
| `_tutorialTooltip` | object\|null | `{text, x, y, startMs, fadingOut}` |
| `_tutorialBlocked` | boolean | Ввод заблокирован пока виден тултип |
| `_tutorialBtnRect` | `{x,y,w,h}`\|null | Координаты кнопки «Понятно» |
| `_tutorialPulseIdx` | number | Индекс пульсирующей точки (-1 = нет) |
| `_tutorialPolygonSeen` | boolean | Замыкание фигуры уже видели |
| `_tutorialRaf` | number\|null | RAF тултип-оверлея |

---

### Подсказки (hints)

| Переменная | Тип | Описание |
|---|---|---|
| `_hintsOn` | boolean | Подсказки включены |
| `_hintEdges` | `{a,b,value}[]` | Топ-5 рекомендуемых рёбер для текущего игрока |
| `_hintsRaf` | number\|null | RAF shimmer-подсветки |

---

### Кэши и оффскрин

| Переменная | Тип | Описание |
|---|---|---|
| `_grainCanvas` | HTMLCanvasElement\|null | Кэш плёночного зерна (256×256) |
| `_grainFrameCount` | number | Счётчик кадров для ротации зерна |
| `_chalkPaperCache` | HTMLCanvasElement\|null | Кэш текстуры бумаги (chalk) |
| `_supLayout` | object\|null | Детерминированная компоновка suprematist-победы |
| `_isGameOverCache` | boolean\|null | Кэш результата checkAllMovesDone() |

---

### Темы

| Переменная | Тип | Описание |
|---|---|---|
| `activeTheme` | string | Текущая тема: `'stargazer'` \| `'minimal'` \| `'suprematist'` \| `'chalk'` |
| `COLOR` | string | Цвет линий (из THEMES[active].lines) |
| `PREVIEW` | string | Цвет preview-линии |
| `FILL` | string | Цвет заливки захваченных областей |
| `THEMES` | object | Объект всех тем (см. ниже) |

#### THEMES.stargazer (основная)
| Поле | Значение | Назначение |
|---|---|---|
| `background` | `#0b0b14` | Фон canvas |
| `dots` | `rgba(255,255,255,0.95)` | Цвет точек (нестарgazer-рендер) |
| `lines` | `rgba(255,240,210,0.88)` | Цвет линий → COLOR |
| `preview` | `rgba(240,224,195,0.22)` | Цвет preview → PREVIEW |
| `captured` | `rgba(255,235,200,0.10)` | Цвет заливки → FILL |
| `buttonText` | `#F0E4C8` | CSS var --th-btn-text |
| `buttonBorder` | `rgba(210,185,140,0.5)` | CSS var --th-btn-border |
| `buttonGlow` | `rgba(205,175,130,0.40)` | CSS var --th-btn-glow |
| `accent` | `#C09358` | CSS var --th-accent |
| `textHi/textLo/textMid` | milky rgba | Canvas-текст (legacy) |
| `vignette` | 0.45 | Непрозрачность виньетки |

---

### Home Screen

| Переменная | Тип | Описание |
|---|---|---|
| `_homeSelectedLength` | 7 \| 13 \| 21 | Выбранная длина партии; по умолчанию 13 |
| `_homeBgRaf` | number\|null | RAF фоновой анимации созвездия |
| `_homeBgData` | object\|null | Данные созвездия для фоновой анимации |
| `_homeBgTwinkle` | object\|null | Состояние мерцания фоновых звёзд |

---

### Sky Hub Screen

Промежуточный экран-хаб между #home-screen и подэкранами (#journey, #sky-screen).
Не имеет собственных RAF-циклов — управляется только show/hide через display.

---

### Sky Screen

| Переменная | Тип | Описание |
|---|---|---|
| `_skyData` | object[]\|null | Все загруженные созвездия `{id, name, data}` из Supabase |
| `_skyMode` | string | `'global'` \| `'personal'` |
| `_skyHighlightId` | string\|null | Имя подсвеченного созвездия |
| `_skyHighlightPulseT` | number | performance.now() начала пульсации (0 = выкл) |
| `_skyOffX`, `_skyOffY` | number | Смещение viewport галактики в мировых координатах |
| `_skyScale` | number | Текущий масштаб (0.08..3.0) |
| `_skyRaf` | number\|null | RAF основного рендера |
| `_skyAnimRaf` | number\|null | RAF анимаций (зум/лёт) |
| `_skyChannel` | object\|null | Supabase Realtime channel (отписка при закрытии) |
| `_bgStars` | object[] | ~800 фоновых звёзд `{x, y, r, a, col}` |
| `_SKY_WORLD` | 3000 | Размер виртуального мира галактики (px) |
| `_mySkyNames` | Set\<string\> | Имена созвездий текущего игрока |
| `_skyDrag` | object\|null | Состояние перетаскивания `{startX, startY, ox, oy}` |
| `_skyPinch` | object\|null | Состояние pinch-зума `{dist, scale}` |
| `_skyOpen` | boolean | Флаг: sky-screen сейчас открыт (останавливает RAF при false) |

---

### Journey Screen

| Переменная | Тип | Описание |
|---|---|---|
| `_journeyRaf` | number\|null | RAF рендера экрана |
| `_journeyTooltip` | `{idx}`\|null | Индекс ачивки с тултипом |
| `_journeyJustOpened` | number | performance.now() при открытии (для pulse) |

---

### Settings Screen

Нет собственных переменных состояния. Настройки хранятся в `localStorage.app_settings`
и читаются через `window._appSettings` (объект, инициализированный до загрузки DOM).

| Ключ в `app_settings` | Тип | Описание |
|---|---|---|
| `sound` | boolean | Включены ли звуки (Web Audio) |
| `vibration` | boolean | Включена ли вибрация (Capacitor Haptics) |
| `starGlow` | `'all'` \| `'active'` | Режим звёздного свечения: все точки или только активные |

---

## localStorage — все ключи

| Ключ | Тип значения | Описание |
|---|---|---|
| `userId` | string | UUID пользователя, `'null'` для гостя |
| `guestMode` | `'true'` | Установлен если пропущен auth |
| `playerName` | string | Отображаемое имя игрока |
| `theme` | `'stargazer'` \| `'minimal'` \| `'suprematist'` \| `'chalk'` | Активная тема |
| `hintsEnabled` | `'0'` \| `'1'` | Включены ли подсказки |
| `app_settings` | JSON string | `{ sound, vibration, starGlow }` — системные настройки |
| `tutorialDone` | `'1'` | Первая игра завершена (старый флаг) |
| `tutorial_v4_seen` | `'1'` | Новый туториал v4 показан |
| `playerProgress` | JSON string | Объект прогресса (см. ниже) |
| `saved_constellations` | JSON string | Массив сохранённых созвездий |
| `lastConstellationName` | string | Имя последнего сохранённого созвездия |

#### Схема `playerProgress`
```json
{
  "rating": 0,
  "rank": 1,
  "gamesPlayed": 0,
  "gamesWon": 0,
  "streak": 0,
  "bestStreak": 0,
  "chalkGames": 0,
  "stargazerGames": 0,
  "suprematistGames": 0,
  "perfectWins": 0,
  "longWins": 0,
  "achievementsUnlocked": []
}
```

#### Схема одного элемента `saved_constellations`
```json
{
  "name": "Лебедь",
  "points": [{"x": 0.12, "y": 0.34}, ...],
  "lines": [["0-2", 0], ["2-5", 1], ...],
  "polygons": [{"path": [0,2,5], "player": 0}],
  "winner": 0,
  "savedAt": "2025-01-15T10:30:00.000Z"
}
```
Координаты points нормализованы: x/W, y/H (0..1).

---

## Supabase — таблицы и схема

### Таблица `constellations`

| Колонка | Тип | Описание |
|---|---|---|
| `id` | uuid | Primary key (auto) |
| `name` | text | Название созвездия (введённое игроком) |
| `data` | jsonb | Полные данные игры |
| `created_at` | timestamptz | Время сохранения |

#### Схема `data` (jsonb)
```json
{
  "points":   [{"x": 0.12, "y": 0.34}],
  "lines":    [["0-2", 0], ["2-5", 1]],
  "polygons": [{"path": [0,2,5], "player": 0}],
  "winner":   0
}
```

### Запросы

| Операция | Когда | Код |
|---|---|---|
| SELECT | `openSkyScreen()` | `sb.from('constellations').select('id,name,data,created_at').order('created_at', {ascending:false}).limit(100)` |
| INSERT | После `flyToSkyAnimation()` | `sb.from('constellations').insert({name, data: constellation})` |

### Примечание о безопасности
Используется публичный (anon) ключ. Row Level Security (RLS) не настроен явно в коде. Все созвездия публичные, без привязки к userId в Supabase.

---

## CSS Custom Properties (тема)

Устанавливаются через `applyTheme()` → `root.style.setProperty(...)`:

| Переменная | Назначение |
|---|---|
| `--th-bg` | Фон страницы и game-экрана |
| `--th-panel-bg` | Фон top/bottom panel |
| `--th-text` | Основной цвет текста |
| `--th-text2` | Вторичный/приглушённый текст |
| `--th-btn-bg` | Фон кнопок |
| `--th-btn-text` | Цвет текста кнопок |
| `--th-btn-border` | Граница кнопок |
| `--th-accent` | Акцент (focus-ring, .active) |
| `--th-btn-glow` | Свечение кнопок (box-shadow) |
| `--th-vignette` | Непрозрачность виньетки (0–1) |
| `--th-font` | Шрифт интерфейса |
