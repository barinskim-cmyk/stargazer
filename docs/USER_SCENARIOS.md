# USER_SCENARIOS.md — Пользовательские сценарии

---

## Сценарий 1: Первый запуск — регистрация по email

```
Открывает приложение
    │
    ├─ sb.auth.getSession() → нет сессии
    ├─ localStorage.userId == null
    │
    ▼
#auth-screen (z-index: 20)
    │
    ├─ Вводит email + пароль
    ├─ «Зарегистрироваться» → sb.auth.signUp() → sb.auth.signInWithPassword()
    │      └─ onAuthStateChange(SIGNED_IN) → userId = uuid, guestMode = 'false'
    │
    └─ hideAuth()
          │
          ├─ tutorial_v4_seen == null → показывает #tutorial-screen
          │
          ▼
  #tutorial-screen (z-index: 19)
      │ 4 шага с мини-игрой
      └─ «Начать игру»
            ├─ tutorial_v4_seen = '1'
            └─ showHomeScreen() → #home-screen
```

---

## Сценарий 2: Первый запуск — продолжить без входа (гость)

```
#auth-screen
    │
    └─ «Продолжить без входа»
          ├─ guestMode = 'true'
          ├─ userId = 'null'
          └─ hideAuth() → #tutorial-screen (если tutorial_v4_seen == null)

#tutorial-screen → startGame() с _tutorialMode=true (COUNT=4)
    │
    └─ endGame() туториальной игры
          ├─ _tutorialAutoSave = true
          ├─ tutorialDone = '1'
          └─ finishEndGame()
                │
                ├─ applyGuestMode() → кнопок нет, «Созвездие сохранено ✦»
                └─ _doTutorialAutoSave(winnerName)
                      ├─ Сохраняет созвездие в localStorage (без publishedAt)
                      └─ Переход на home через goToMenu()
```

---

## Сценарий 3: Гость — играет, сохраняет в мои созвездия

```
#home-screen
    │
    └─ «ИГРАТЬ» (13 точек, обычная)
          │
          ▼
    startGame()
          │
          ├─ Игровой процесс...
          └─ endGame() — победа
                │
                ├─ #victory-content (opacity 0→1)
                └─ #name-constellation через 1.6 с
                      │
                      ├─ applyGuestMode():
                      │     saveSkyBtn: display:none
                      │     saveLocBtn: display:'' ← «Сохранить в мои созвездия»
                      │
                      └─ Пользователь вводит имя → «Сохранить в мои созвездия»
                            ├─ localStorage.saved_constellations.unshift(constellation)
                            │     (без publishedAt → в общем небе НЕ появится)
                            ├─ «Созвездие сохранено ✦» (1.5 сек)
                            └─ goToMenu() → #home-screen

Ограничения гостя:
    ├─ Созвездия видны только локально (в #journey)
    ├─ В общем небе (#sky-screen) не публикуются
    └─ При переустановке приложения данные теряются
```

---

## Сценарий 4: Авторизованный — победа, сохранение в небо и локально

```
#home-screen
    │
    └─ «ИГРАТЬ» (21 точка, длинная)
          │
          ▼
    startGame()
          │
          ├─ progressionUpdate()
          │     ├─ computeGamePoints({won:true, ...}) → баллы / 10 (ceil)
          │     ├─ saveProgress()
          │     └─ если ранг вырос → startRankUpCeremony() → finishEndGame()
          │
          └─ finishEndGame() — победа
                │
                ├─ #name-constellation (через 1.6 сек)
                │     applyGuestMode():
                │       saveSkyBtn: display:''  ← «Сохранить в небо ✦»
                │       saveLocBtn: display:''  ← «Сохранить в мои созвездия»
                │
                ├─ Путь A: «Сохранить в небо ✦»
                │     ├─ constellation = { name, publishedAt, skyAddr, ... }
                │     ├─ localStorage.saved_constellations.unshift(constellation)
                │     ├─ sb.from('constellations').insert({name, data, user_id, gx, gy})
                │     └─ saveToSkyAnimation(name, onDone) → goToMenu()
                │
                └─ Путь Б: «Сохранить в мои созвездия»
                      ├─ constellation = { name, createdAt, skyAddr }  (без publishedAt)
                      ├─ localStorage.saved_constellations.unshift(constellation)
                      ├─ «Созвездие сохранено ✦» (1.5 сек)
                      └─ goToMenu() → #home-screen
```

---

## Сценарий 5: Просмотр общего неба

```
#home-screen → «Sky» → #sky-hub-screen → «Небо»
    │
    └─ openSkyScreen('global')
          ├─ _skyEnsurePreStars() → 3200 декоративных звёзд (если первый открыт)
          ├─ Supabase SELECT limit 100 → _skyData
          ├─ + localStorage.saved_constellations с publishedAt → помечаются isMine
          └─ _skyLoop() → рендер галактики

Жесты:
    ├─ Тап/клик — выбор созвездия (подсветка)
    ├─ Pinch — зум in/out
    ├─ Drag — перемещение
    └─ «+» / «−» — дискретный зум

Режимы:
    ├─ «Общее небо» — все созвездия из Supabase + локальные опубликованные
    └─ «Моё небо» — только свои (фильтр по _mySkyNames)

«Найти моё ✦»:
    └─ Ищет lastConstellationName → если нет → первое isMine
         └─ _skyZoomTo() + подсветка золотым (_skyHighlightId)

Закрытие: «←» → #sky-hub-screen
```

---

## Сценарий 6: Просмотр «Мои созвездия»

```
#sky-hub-screen → «Мои созвездия»
    │
    └─ openJourneyScreen('sky-hub-screen')
          ├─ _journeyReturnTo = 'sky-hub-screen'
          └─ drawJourneyScreen() → профиль, достижения, список созвездий

Тап на созвездии:
    └─ openConstDetail(item)
          ├─ Просмотр созвездия на canvas
          ├─ Переименование: tap на имени → nameInput → _commitDetailRename()
          │     ├─ Если publishedAt: sb.update().eq('name', oldName) (не upsert!)
          │     └─ localStorage обновляется
          └─ «← Назад» → closeConstDetail()

Закрытие: «←» → #sky-hub-screen (через _journeyReturnTo)
```

---

## Сценарий 7: Повторный запуск (persistent login)

```
Открывает приложение
    │
    ├─ (async checkSession())
    │     └─ sb.auth.getSession()
    │           ├─ сессия жива → userId = session.user.id, guestMode='false'
    │           │     → показывает #home-screen напрямую (auth НЕ показывается)
    │           └─ нет сессии, нет userId → показывает #auth-screen
    │
    └─ sb.auth.onAuthStateChange() → держит токен в синхронизации

Туториал не запускается если:
    ├─ localStorage.tutorialDone === '1'
    └─ loadProgress().rating > 0

#home-screen:
    ├─ Имя из localStorage.playerName
    ├─ Рейтинг из localStorage.playerProgress
    └─ Фоновое созвездие из localStorage.saved_constellations
```

---

## Сценарий 8: Выход из аккаунта

```
#settings-screen → «Выйти»
    │
    ├─ sb.auth.signOut()           ← удаляет токен из localStorage (sb-* ключи)
    ├─ localStorage.removeItem('userId')
    ├─ localStorage.removeItem('guestMode')
    └─ location.reload()
          └─ После перезагрузки → checkSession() → нет сессии → #auth-screen
```
