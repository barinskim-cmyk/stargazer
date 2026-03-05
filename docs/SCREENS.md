# SCREENS.md — Экраны приложения

Все экраны — это `<div>` с `position: fixed`, управляемые через `display: none/flex/block`.
Переходы выполняются функцией `fadeTo(hideEl, showEl)` или прямой установкой `display`.

---

## #auth-screen

**z-index:** 20
**Показывается:** при первом запуске — если в localStorage нет `userId`
**Скрывается:** после выбора метода входа
**Реализовано:** `(function initAuth())`

### Что показывает
- Логотип «СОЗВЕЗДИЕ»
- Кнопка «Войти через Apple» (`#auth-apple`)
- Кнопка «Войти через Google» (`#auth-google`)
- Ссылка «Продолжить без входа» (`#auth-skip`)

### Функции
| Действие | Функция / результат |
|---|---|
| Apple/Google auth | `hideAuth()` → показывает `#tutorial-screen` или `#home-screen` |
| «Без входа» | `localStorage.setItem('guestMode','true')`, `localStorage.setItem('userId','null')` → `hideAuth()` |

### Переменные состояния
- `localStorage.userId` — устанавливается при входе
- `localStorage.guestMode` — `'true'` для гостя

---

## #tutorial-screen

**z-index:** 19
**Показывается:** после `hideAuth()`, если `!localStorage.tutorial_v4_seen`
**Скрывается:** кнопка «Далее» на последнем шаге, или после первой реальной игры
**Реализовано:** `(function initTutorial())`

### Что показывает
- Интерактивная мини-игра на `#tutorial-canvas` (4 точки)
- 4 шага обучения с анимацией и текстом (`#tutorial-title`, `#tutorial-desc`)
- Прогресс-точки (`#tutorial-dots`)
- Кнопка «Далее» / «Начать игру» (`#tutorial-next-btn`)

### Функции
| Действие | Функция |
|---|---|
| RAF рендер | `draw()` (локальная внутри initTutorial) |
| Рисование точки | `drawStar(p, alpha, pulse)` |
| Рисование линии | `drawSeg(a, b, progress, owner)` |
| Ход ИИ | `startAILine(a, b, after)` |
| Переход шагов | `showTutorial()` — обновляет title/desc/dots |
| Финал | `localStorage.setItem('tutorial_v4_seen','1')`, показывает `#home-screen` |

### Переменные состояния
- `phase` (0–7) — текущий шаг туториала
- `sel` — выбранная точка (-1 = нет)
- `tLines` — нарисованные линии
- `tPolys` — захваченные области
- `sAlpha[4]` — альфа появления каждой из 4 точек
- `aiLine` — текущая анимация хода ИИ
- `scoreAnim` — анимация «+1»
- `_raf` — handle RAF

---

## #home-screen

**z-index:** 15
**Показывается:** после auth/tutorial и после `goToMenu()`
**Скрывается:** при нажатии «Играть» → `startGame()`; при нажатии «Sky» → `#sky-hub-screen`
**Реализовано:** `showHomeScreen()`, `_startHomeBgAnim()`, `_stopHomeBgAnim()`

### Что показывает
- Анимированное фоновое созвездие (`#home-bg-canvas`) — случайное из saved_constellations
- Иконка настроек (⚙-звезда, top-right, `#home-settings-icon`) → `openSettingsScreen()`
- Имя игрока (`#home-player-name`, редактируемое по клику)
- Рейтинг (`#home-rating-pts`, формат `score: N ✦`)
- Кнопка «Sky» (`#home-sky-nav-btn`) — квадратная плитка, открывает `#sky-hub-screen`
- Выбор длины партии: `короткая · обычная · длинная` (`.home-len-btn`, три кнопки в ряд)
- Кнопка «ИГРАТЬ» (`#home-play-btn`)

### Функции
| Действие | Функция |
|---|---|
| Открытие | `showHomeScreen()` — имя, рейтинг, запускает `_startHomeBgAnim()` |
| Фон | `_startHomeBgAnim()` / `_stopHomeBgAnim()` — RAF анимация созвездия |
| Клик на имени | Показывает `#home-name-input`, фокус |
| Blur имени | сохраняет в `localStorage.playerName` |
| «Sky» | `openSkyHub()` — переход на `#sky-hub-screen` |
| Выбор длины | `.home-len-btn` click — обновляет `_homeSelectedLength`, active-класс |
| «ИГРАТЬ» | `COUNT = _homeSelectedLength`, `startGame()` |
| Настройки | `openSettingsScreen()` |

### Переменные состояния
- `_homeSelectedLength` — 7 / 13 / 21, по умолчанию 13
- `_homeBgRaf`, `_homeBgData`, `_homeBgTwinkle` — RAF фона

---

## #sky-hub-screen  *(новый)*

**z-index:** 16
**Показывается:** `openSkyHub()` — при нажатии «Sky» на главном экране
**Скрывается:** `closeSkyHub()` — при нажатии «←»; при открытии подэкранов
**Реализовано:** `openSkyHub()`, `closeSkyHub()`

### Что показывает
- Кнопка «←» (`#sky-hub-back-btn`) → `closeSkyHub()` → `showHomeScreen()`
- Кнопка «Мои созвездия» (`#sky-hub-journey-btn`) → `openJourneyScreen()`
- Кнопка «Небо» (`#sky-hub-sky-btn`) → `openSkyScreen('global')`

### Навигация назад
- «Мои созвездия» ←  → возврат на `#sky-hub-screen`
- «Небо» ← → возврат на `#sky-hub-screen`

---

## #start

**z-index:** 10
**Показывается:** при нажатии «Играть» на home-screen (legacy — сейчас обходится)
**Скрывается:** после `startGame()` или `goToMenu()`
**Реализовано:** `showStep()`, event listeners на кнопки шагов

> ⚠️ В текущем UI главного экрана кнопка «ИГРАТЬ» вызывает `startGame()` напрямую,
> минуя `#start`. Экран `#start` остаётся для режима «С другом» и настройки имён.

### Что показывает
Мастер из 3 шагов:
1. `#game-mode-step` — «Против ИИ» / «С другом» + кнопка «Мой путь ✦»
2. `#game-length-step` (только ИИ) — 7 / 13 / 21 точек
3. `#name-step` — поля имён + кнопка «Начать»

Также: переключатель тем, галочка «Подсказки»

### Функции
| Действие | Функция |
|---|---|
| Смена шага | `showStep(id)` — скрывает все, показывает нужный |
| «Мой путь ✦» | `openJourneyScreen()` |
| «Начать» | `startGame()` |

### Переменные состояния
- `isAI` — устанавливается при выборе режима
- `COUNT` — 7 / 13 / 21
- `playerNames[0..1]` — из полей ввода

---

## #game

**z-index:** нет (layout, не fixed поверх)
**Показывается:** из `startGame()` — `display: flex`
**Скрывается:** `goToMenu()` — `display: none`
**Реализовано:** `startGame()`, `draw()`, `endGame()`, `updateUI()`

### Что показывает
- `#top-panel` — имена, счёт, `#turn-display`, `#hints-btn`, `#prob-bar-wrap`
- `#canvas-area` с `#c` (главный canvas) или `#duel-wrap` (экран победы 2 игрока)
- `#bottom-panel` — ранг, `#last-move-btn`, переключатель тем
- Кнопка `#ui-toggle-btn` — скрыть/показать панели
- Оверлеи: `#victory-content`, `#loss-content`, `#name-constellation`

### Функции
| Действие | Функция |
|---|---|
| Старт | `startGame()` — генерирует точки, сбрасывает состояние |
| Рендер | `draw()` — главный игровой loop |
| Клик/тач | canvas: выбор точки → `validate()` → `checkScore()` → `updateUI()` |
| Конец игры | `endGame()` — определяет победителя, запускает эффекты |
| Возврат | `goToMenu()` |
| Сохранение | `name-const-save-btn` → `flyToSkyAnimation()` → `sb.insert()` |

### Переменные состояния
- `points[]`, `lines` (Map), `polygons[]`, `scores[]`
- `currentPlayer`, `winner`, `gameOver`
- `hovered`, `selected`, `previewValidation`
- `_lineAnim`, `_tutorialMode`, `_hintsOn`
- `_probBarDisplay`, `_winProb`
- `activeTheme`

---

## #victory-content / #loss-content

Оверлеи внутри `#canvas-area`, управляются CSS-классами и opacity.

**#victory-content** (`opacity: 0 → 1` через transition):
- `#victory-title` — «Победа» / «Ничья»
- `#victory-sub` — счёт
- `#victory-rating` — `+N ✦` набранные очки
- `#victory-actions` — «Играть снова», «← В меню», «Сменить ранг» (скрывается при показе `#name-constellation`)
- `#name-constellation` — ввод имени + «Сохранить в небо ✦» + «Играть снова»

**#loss-content** (`display: none → flex` через CSS класс `.lost`):
- `#loss-title` — «Проигрыш»
- «Играть снова» / «Выход»

---

## #journey (Мои созвездия / Достижения)

**z-index:** 11
**Показывается:** `openJourneyScreen()` — из `#sky-hub-screen`
**Скрывается:** кнопка «←» → возврат на `#sky-hub-screen`
**Реализовано:** `openJourneyScreen()`, `drawJourneyScreen()`

### Что показывает
- Topbar с кнопкой «←» и заголовком «Мои созвездия»
- Canvas с профилем игрока: имя, ранг, прогресс-бар, статистика (6 ячеек), карта достижений
- Достижения как созвездие из точек-звёзд, тултип при касании

### Функции
| Действие | Функция |
|---|---|
| Открытие | `openJourneyScreen()` — загружает saved из localStorage, запускает RAF |
| Рендер | `drawJourneyScreen()` — рисует на `#journey-canvas` каждый frame |
| Закрытие | `closeJourneyScreen()` — останавливает RAF, скрывает экран |

---

## #sky-screen (Небо)

**z-index:** 16
**Показывается:** `openSkyScreen(mode)` — из `#sky-hub-screen`
**Скрывается:** кнопка «←» → возврат на `#sky-hub-screen`
**Реализовано:** `openSkyScreen()`, `_skyLoop()`, `_skyDraw()`

### Что показывает
- `#sky-canvas` — зумируемая/перетаскиваемая галактика с созвездиями
- Переключатель «Общее небо» / «Моё небо» (`#sky-mode-toggle`)
- Кнопка «Найти моё ✦» (`#sky-find-mine`)
- Кнопки «+» / «−» зума
- Статус-строка `#sky-status`

### Режимы отображения
- **Galaxy** — звёзды-точки с именами при hover, размер = кол-во точек
- **Map** — миниатюры созвездий с линиями в реальной форме

### Функции
| Действие | Функция |
|---|---|
| Открытие | `openSkyScreen(mode)` — загружает из Supabase + localStorage |
| RAF рендер | `_skyLoop()` → `_skyDraw()` |
| Зум | `_skyZoomTo(cx, cy, scale, duration)` |
| Поиск своего | кнопка → анимация лёта к своему созвездию |
| Смена режима | `.sky-mode-btn` → обновляет `_skyMode` |

---

## #settings-screen

**z-index:** 17
**Показывается:** `openSettingsScreen()` — из иконки ⚙ на главном экране
**Скрывается:** кнопка «←` (`#settings-back-btn`) → `showHomeScreen()`

### Что показывает
- Поле имени игрока
- Секция «Theme» — 4 кнопки: Stargazer / Minimal / Suprematist / Chalk
- Переключатель «Подсказки»
- Статистика

---

## #stub-screen

**z-index:** 16
**Показывается:** `openStub(title)` — для не реализованных разделов
**Скрывается:** кнопка «←»
**Контент:** «Скоро здесь появится что-то интересное ✦»
