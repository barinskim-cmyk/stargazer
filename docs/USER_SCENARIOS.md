# USER_SCENARIOS.md — Пользовательские сценарии

---

## Сценарий 1: Первый запуск (новый пользователь)

```
Открывает приложение
    │
    ├─ localStorage.userId == null
    │
    ▼
#auth-screen (z-index: 20)
    │
    ├─ «Войти через Apple»  → показывает тост «Скоро!» (не реализовано)
    ├─ «Войти через Google» → показывает тост «Скоро!» (не реализовано)
    └─ «Продолжить без входа»
              │
              ├─ localStorage.guestMode = 'true'
              ├─ localStorage.userId = 'null'
              └─ hideAuth()
                    │
                    ├─ tutorial_v4_seen == null → показывает #tutorial-screen
                    │
                    ▼
          #tutorial-screen (z-index: 19)
              │
              ├─ Фаза 1: 2 точки появляются → «Нажми на любую точку»
              ├─ Фаза 2: Игрок выбирает точку → «Теперь нажми другую»
              ├─ Фаза 3: Линия нарисована → «ИИ делает ход» (анимация)
              ├─ Фаза 4-6: Замыкание фигуры → «Ты захватил область! +1»
              └─ «Начать игру» на последнем шаге
                    │
                    ├─ localStorage.tutorial_v4_seen = '1'
                    ├─ localStorage.tutorialDone = '1'
                    └─ показывает #home-screen
```

---

## Сценарий 2: Гость — играет, не сохраняет

```
#home-screen
    │
    └─ «Играть»
          │
          ▼
#start (z-index: 10)
    │
    ├─ «Против ИИ» → #game-length-step
    │      └─ «Обычная» (13 точек)
    │
    ▼
startGame()
    │
    ├─ Генерируются 13 точек
    ├─ Появление точек (birth animation, 200 мс)
    ├─ Игра: клики → validate() → checkScore() → draw()
    │
    ├─ ИИ ходит через setTimeout (800 мс задержка + _lineAnim)
    │
    └─ endGame() когда нет допустимых ходов
          │
          ├─ Победа: #victory-content появляется (opacity transition)
          │      ├─ «Играть снова» → startGame()
          │      └─ «← В меню» → goToMenu() → #home-screen
          │
          └─ Проигрыш: #canvas-area.lost
                 ├─ «Играть снова» → startGame()
                 ├─ «Сохранить созвездие» (только если есть линии)
                 └─ «Выход» → goToMenu()

Созвездие в режиме гостя:
    - Кнопка «Сохранить в небо ✦» показывается, сохранение идёт в localStorage
    - В Supabase запись НЕ делается (нет userId)
    - Локальный прогресс (рейтинг) сохраняется в playerProgress
    - При переустановке приложения данные теряются
```

---

## Сценарий 3: Зарегистрированный — играет, побеждает, сохраняет, смотрит в небе

```
#home-screen (имя настроено, ранг виден)
    │
    └─ «Играть» → #start → startGame() (21 точка, «длинная»)
          │
          ├─ Игровой процесс...
          │
          └─ endGame() — победа
                │
                ├─ progressionUpdate()
                │      ├─ +140–250 рейтинговых очков
                │      ├─ saveProgress()
                │      └─ если ранг вырос → startRankUpCeremony()
                │
                ├─ #victory-content видим
                └─ #name-constellation появляется (только AI, победа)
                      │
                      ├─ Пользователь вводит «Лебедь»
                      │
                      └─ «Сохранить в небо ✦»
                            │
                            ├─ Кнопка disabled
                            ├─ flyToSkyAnimation(onDone) — 1200 мс
                            │      └─ Созвездие уменьшается и улетает вверх
                            │
                            └─ onDone():
                                  ├─ Сохранение в localStorage.saved_constellations
                                  ├─ localStorage.lastConstellationName = 'Лебедь'
                                  ├─ sb.from('constellations').insert({name, data})
                                  │      └─ Ошибка Supabase → показывает сообщение пользователю
                                  └─ Показывает «Созвездие сохранено ✦»

Просмотр в небе:
    │
    └─ goToMenu() → #home-screen
          │
          ├─ refreshHomeConstellations() — «Лебедь» виден в карточках
          │
          └─ «Общее небо» (нижняя навигация)
                │
                └─ openSkyScreen('global')
                      │
                      ├─ Загрузка из Supabase (до 100 созвездий)
                      ├─ + локальные из localStorage (помечены isMine)
                      │
                      ├─ Galaxy view: «Лебедь» отображается молочно-белым (isMine)
                      │
                      └─ «Найти моё ✦»
                            └─ _skyFindMine() → ищет lastConstellationName,
                                  затем первое isMine (не первое в списке)
                                  └─ плавный лёт + подсветка золотым (_skyHighlightId)
```

---

## Сценарий 4: Просмотр общего неба — зум, поиск

```
#sky-screen открыт

Жесты:
    ├─ Одиночный тач/клик — выбор/подсветка созвездия
    ├─ Pinch (два пальца) — зум in/out
    ├─ Drag — перемещение по галактике
    └─ Кнопки «+» / «−» — дискретный зум

Режимы:
    ├─ «Общее небо» — все созвездия (до 100 из Supabase + локальные)
    └─ «Моё небо» — только свои (фильтр по _mySkyNames)

Цвета точек/линий:
    ├─ Чужие — молочно-белый rgba(248,247,245,0.40)
    ├─ Свои  — тёплый молочный rgba(255,245,228,0.75)
    └─ Подсвеченное — золотой #FFD700

«Найти моё ✦»:
    ├─ Ищет по lastConstellationName (последнее сохранённое)
    ├─ Если не найдено: ищет первое isMine в _skyPos
    ├─ Если найдено: _skyZoomTo() + устанавливает _skyHighlightId
    └─ Если не найдено: st.textContent = 'Твоих созвездий нет ✦'

Закрытие:
    └─ «←» → _skyRaf отменяется, display: none
```

---

## Сценарий 5: Повторный запуск (есть аккаунт / был гостем)

```
Открывает приложение
    │
    ├─ localStorage.userId != null (гость или auth)
    │
    └─ initAuth() — экран auth не показывается
          │
          ├─ tutorial_v4_seen == '1' → показывает #home-screen напрямую
          │
          └─ tutorial_v4_seen == null → показывает #tutorial-screen (ещё раз)

#home-screen:
    ├─ Имя из localStorage.playerName
    ├─ Ранг из localStorage.playerProgress
    ├─ Карточки из localStorage.saved_constellations (до 3 последних)
    └─ Продолжает играть с накопленным прогрессом

Примечание о гостях и созвездиях:
    ├─ Локальные созвездия (id.startsWith('local_')) → видны в sky как свои
    ├─ Созвездия в Supabase — публичные, без привязки к userId
    └─ ⚠️ При переустановке приложения localStorage теряется → прогресс сбрасывается
           Решение: реализовать Apple/Google Sign In (TODO) для привязки прогресса к аккаунту
```
