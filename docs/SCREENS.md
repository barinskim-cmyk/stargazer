# SCREENS.md — Экраны приложения

Все экраны — это `<div>` с `position: fixed`, управляемые через `display: none/flex/block`.
Переходы выполняются прямой установкой `display` или через `fadeTo(hideEl, showEl)`.

> **iOS 26:** `body { position: fixed; top:0; left:0; right:0; bottom:0 }` — блокирует layout строго в viewport, предотвращая автоматический content inset WKWebView.

---

## #auth-screen

**z-index:** 20
**Показывается:** при первом запуске — если в localStorage нет `userId` и нет живой Supabase-сессии
**Скрывается:** после успешного входа или выбора «Без входа»
**Реализовано:** `(function initAuth())`

### Что показывает
- Логотип «СОЗВЕЗДИЕ»
- Поле email + поле пароля
- Кнопка «Войти» (`#auth-login-btn`) — `sb.auth.signInWithPassword()`
- Кнопка «Зарегистрироваться» (`#auth-register-btn`) — `sb.auth.signUp()` + авто-вход
- Ссылка «Продолжить без входа» (`#auth-skip`)

### Функции
| Действие | Функция / результат |
|---|---|
| Вход / Регистрация | `hideAuth()` → показывает `#tutorial-screen` или `#home-screen` |
| «Без входа» | `localStorage.setItem('guestMode','true')` → `hideAuth()` |

### Переменные состояния
- `localStorage.userId` — UUID при входе
- `localStorage.guestMode` — `'true'` для гостя

### Persistent login (повторный запуск)
При запуске выполняется `(async function checkSession())`:
```
sb.auth.getSession()
  ├─ есть сессия → userId = session.user.id → home (auth не показывается)
  └─ нет сессии → если нет userId → показать auth-screen
```
`sb.auth.onAuthStateChange()` держит `userId` в localStorage в актуальном состоянии при обновлении токена.

---

## #tutorial-screen

**z-index:** 19
**Показывается:** после `hideAuth()`, если `!localStorage.tutorial_v4_seen`
**Скрывается:** кнопка «Начать игру» на последнем шаге
**Реализовано:** `(function initTutorial())`

### Что показывает
- Интерактивная мини-игра на `#tutorial-canvas` (4 точки)
- 4 шага обучения с анимацией (`#tutorial-title`, `#tutorial-desc`)
- Прогресс-точки (`#tutorial-dots`)
- Кнопка «Далее» / «Начать игру» (`#tutorial-next-btn`)

### Функции
| Действие | Функция |
|---|---|
| Переход шагов | `showTutorial()` — обновляет title/desc/dots |
| Финал | `localStorage.setItem('tutorial_v4_seen','1')`, показывает `#home-screen` |

---

## #home-screen

**z-index:** 15
**Показывается:** после auth/tutorial и после `goToMenu()`
**Скрывается:** при нажатии «ИГРАТЬ» → `startGame()`; при нажатии «Sky» → `#sky-hub-screen`
**Реализовано:** `showHomeScreen()`, `_startHomeBgAnim()`, `_stopHomeBgAnim()`

### Что показывает
- Анимированное фоновое созвездие (`#home-bg-canvas`)
- Иконка настроек ⚙ (top-right, `#home-settings-icon`) → `openSettingsScreen()`
- Имя игрока (`#home-player-name`, редактируемое по клику)
- Рейтинг (`#home-rating-pts`, формат `score: N ✦`)
- Кнопка «Sky» (`#home-sky-nav-btn`) → `openSkyHub()`
- Выбор длины партии: `короткая · обычная · длинная` (`.home-len-btn`)
- Кнопка «ИГРАТЬ» (`#home-play-btn`)

### Функции
| Действие | Функция |
|---|---|
| Открытие | `showHomeScreen()` — обновляет имя, рейтинг, запускает `_startHomeBgAnim()` |
| «Sky» | `openSkyHub()` |
| «ИГРАТЬ» | `COUNT = _homeSelectedLength`, `startGame()` |
| Настройки | `openSettingsScreen()` |

---

## #sky-hub-screen

**z-index:** 16
**Показывается:** `openSkyHub()` — при нажатии «Sky» на главном экране
**Скрывается:** `closeSkyHub()` — кнопка «←»; при открытии подэкранов
**Реализовано:** `openSkyHub()`, `closeSkyHub()`

### Что показывает
- Кнопка «←» (`#sky-hub-back-btn`) → `closeSkyHub()` → `showHomeScreen()`
- Кнопка «Мои созвездия» (`#sky-hub-journey-btn`) → `openJourneyScreen('sky-hub-screen')`
- Кнопка «Небо» (`#sky-hub-sky-btn`) → `openSkyScreen('global')`

### Навигация назад
- Journey ← → возврат на `#sky-hub-screen` (через `_journeyReturnTo = 'sky-hub-screen'`)
- Небо ← → возврат на `#sky-hub-screen`

---

## #start

**z-index:** 10
**Показывается:** при нажатии «Играть» (устаревший путь — сейчас `#home-screen` вызывает `startGame()` напрямую через AI-режим)
**Реализовано:** `showStep()`, event listeners на кнопки шагов

### Что показывает
Мастер из шагов:
1. `#game-mode-step` — «Против ИИ» / «С другом»
2. `#game-length-step` (только ИИ) — 7 / 13 / 21 точек
3. `#name-step` — поля имён + кнопка «Начать»

Также: переключатель тем, галочка «Подсказки».

### Туториал
Если `tutorialDone` не установлен и `rating === 0` — при нажатии «Против ИИ» запускается туториальный режим игры (`_tutorialMode = true`, `COUNT = 4`).

---

## #game

**z-index:** нет (layout, не fixed поверх)
**Показывается:** из `startGame()` — `display: flex`
**Скрывается:** `goToMenu()` — `display: none`

### Что показывает
- `#top-panel` — имена, счёт, `#turn-display`, `#hints-btn`, `#prob-bar-wrap`
- `#canvas-area` с `#c` (главный canvas) или `#duel-wrap` (победа 2p)
- `#bottom-panel` — ранг, `#last-move-btn`, переключатель тем
- `#ui-toggle-btn` — скрыть/показать панели

---

## #victory-content / #loss-content

Оверлеи внутри `#canvas-area`, управляются CSS-классами и opacity.

**#victory-content** (`opacity: 0 → 1` через transition):
- `#victory-title` — «Созвездие N» / «Ничья»
- `#victory-sub` — счёт или «победило!»
- `#victory-rating` — `+N ✦ Всего: M`
- `#victory-actions` — «Играть снова», «← В меню» (скрывается при показе `#name-constellation`)

---

## #name-constellation (оверлей победы)

Показывается после победы/ничьи в AI-режиме. Содержит:
- `#name-const-label` — «Дай имя своему созвездию»
- `#name-const-input` — поле ввода (предзаполнено именем победителя)
- `#name-const-actions` — блок кнопок:
  - `#name-const-save-btn` — «Сохранить в небо ✦» (авторизован; сохраняет в localStorage + Supabase с `publishedAt`)
  - `#name-const-local-save-btn` — «Сохранить в мои созвездия» (всегда; только localStorage без `publishedAt`)
  - `#name-const-guest` — «Войдите чтобы сохранить» (скрыт — legacy)
  - `#name-const-saved` — «Созвездие сохранено ✦» (показывается после сохранения или авто-сохранения)
  - `#name-const-again-btn` — «Играть снова»

### Видимость кнопок (управляется через `applyGuestMode()`):

| Ситуация | «В небо ✦» | «В мои созвездия» |
|---|---|---|
| Авторизован | ✓ видна | ✓ видна |
| Гость | ✗ скрыта | ✓ видна |
| Туториал (auto-save) | ✗ скрыта | ✗ скрыта |

При туториале: вместо кнопок показывается «Созвездие сохранено ✦», созвездие сохраняется автоматически через `_doTutorialAutoSave()`.

**#loss-content** (`display: none → flex` через CSS класс `.lost`):
- «Играть снова» / «Выход»

---

## #journey (Мои созвездия / Достижения)

**z-index:** 11
**Показывается:** `openJourneyScreen(returnTo)` — из `#sky-hub-screen` или из `#start`
**Скрывается:** кнопка «←» → возврат на экран, указанный в `_journeyReturnTo`
**Реализовано:** `openJourneyScreen(returnTo)`, `drawJourneyScreen()`

### Параметр `returnTo`
`openJourneyScreen` принимает строку — ID DOM-элемента для возврата (`'sky-hub-screen'`, `'start'` и т.д.). Если передан не-строковый аргумент (например, MouseEvent по ошибке), используется `'sky-hub-screen'` по умолчанию.

### Что показывает
- Topbar с кнопкой «←» и заголовком «Мои созвездия»
- Canvas с профилем: имя, ранг, прогресс-бар, статистика (6 ячеек), карта достижений

---

## #sky-screen (Небо)

**z-index:** 16
**Показывается:** `openSkyScreen(mode)` — из `#sky-hub-screen`
**Скрывается:** кнопка «←» → возврат на `#sky-hub-screen`

### Что показывает
- `#sky-canvas` — зумируемая/перетаскиваемая галактика с созвездиями
- Переключатель «Общее небо» / «Моё небо» (`#sky-mode-toggle`)
- Кнопка «Найти моё ✦» (`#sky-find-mine`)
- Кнопки «+» / «−» зума

### Декоративные звёзды
3200 случайных звёзд (`_skyBgPreStars`), генерируются один раз при первом открытии через `_skyEnsurePreStars()`. Три тира: мелкие/тусклые (80%), средние (16%), крупные/яркие (4%).

### LOD в sky view
Созвездия в galaxy view отображаются только точками (без линий) — это намеренно, линии видны только в map view при сильном зуме.

---

## #settings-screen

**z-index:** 17
**Показывается:** `openSettingsScreen()` — из иконки ⚙ на главном экране
**Скрывается:** кнопка «←» (`#settings-back-btn`) → `showHomeScreen()`

### Что показывает
- Поле имени игрока
- Секция «Theme» — 4 кнопки: Stargazer / Minimal / Suprematist / Chalk
- Переключатель «Подсказки»
- Статистика
- Кнопка «Выйти» → `sb.auth.signOut()` + очистка localStorage + перезагрузка

---

## #stub-screen

**z-index:** 16
**Показывается:** `openStub(title)` — для не реализованных разделов
**Скрывается:** кнопка «←»
**Контент:** «Скоро здесь появится что-то интересное ✦»
