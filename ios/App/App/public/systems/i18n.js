/* ═══════════════════════════════════════════════════════════════════════════
 *  Stargazer — i18n module
 *  All user-visible strings, translated rank / achievement / AI-level names,
 *  constellation name dictionary, and DOM-patching helpers.
 *
 *  Public API (on window):
 *    t(key)              — return translated string (fallback → EN → key)
 *    getRankName(n)      — translated rank name (1-based)
 *    getAchI18n(id)      — { label, desc } for achievement id
 *    _applyLang()        — patch all data-i18n DOM nodes + dynamic text
 *    _constName(n)       — localized constellation name
 *    _refreshLevelNames()— refresh LEVEL_NAMES from current lang
 *
 *    window._lang        — current language code (read/write)
 *    window.LEVEL_NAMES  — array of AI level display names
 *    window.STRINGS      — all string dictionaries (if needed externally)
 * ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Current language ────────────────────────────────────────────────────
  let _lang = localStorage.getItem('lang') || 'en';

  // ── UI strings (5 languages × ~95 keys) ─────────────────────────────────
  const STRINGS = {
    en: {
      app_title:'CONSTELLATION', auth_apple:'Sign in with Apple', auth_google:'Sign in with Google',
      auth_email:'✉ Sign in with Email', auth_skip:'Continue without signing in',
      auth_tab_login:'sign in', auth_tab_signup:'register',
      auth_placeholder_email:'email', auth_placeholder_pass:'password',
      auth_submit_login:'Sign In', auth_submit_signup:'Register', auth_back:'← back',
      auth_err_empty:'Please fill in email and password',
      auth_err_wrong:'Incorrect email or password',
      auth_ok_signup:'Check your email — we sent a confirmation link ✦',
      auth_err_exists:'Account already exists — try signing in',
      tut_connect:'Connect these two stars', tut_close:'Close the constellation!',
      tut_well_done:'Well done! ✦', tut_rival:'Your rival will also collect stars',
      tut_you_can_win:'You can beat them', tut_congrats:'Congratulations! ✦',
      tut_congrats_sub:'Collect stars and beat your opponent', tut_play:'Play!',
      tut_first_star:'You placed your first star ✦\nConnect them with lines to catch a constellation',
      tut_caught:'Constellation caught! ✦\nA closed shape scores a point',
      tut_final:'Final push — whoever has more constellations wins ✦',
      stub_coming:'Something interesting<br>is coming here soon ✦',
      settings_title:'Settings', settings_sound_section:'Sound & Feedback',
      settings_sound_title:'Sound', settings_sound_sub:'Sound effects',
      settings_vib_title:'Vibration', settings_vib_sub:'Haptic feedback',
      settings_game_section:'Game', settings_glow_title:'Star glow',
      settings_glow_sub:'How bright the points shine',
      settings_glow_all:'All', settings_glow_active:'Active',
      settings_theme_section:'Theme', settings_lang_section:'Language',
      profile_title:'Profile', profile_avatar_hint:'Tap to change',
      profile_name_placeholder:'Enter name', profile_stats_title:'Statistics',
      profile_stat_score:'Total score', profile_stat_best:'Best result',
      profile_stat_games:'Total games', profile_stat_const:'Constellations in sky',
      profile_wins:'Wins', profile_losses:'Losses', profile_draws:'Draws',
      profile_leaderboard:'Leaderboard', profile_lb_loading:'loading…',
      profile_achievements_btn:'✦ Achievements', profile_logout:'Sign Out',
      tutorial_next:'Next',
      avatar_title:'Choose symbol', avatar_upload:'Upload photo', avatar_cancel:'Cancel',
      sky_global:'Global Sky', sky_personal:'My Sky', sky_find:'Find Mine ✦',
      sky_loading:'Loading ✦', sky_save_first:'Save your first constellation ✦',
      sky_offline:'No connection ✦', sky_retry:'Retry',
      sky_be_first:'Be the first to save a constellation ✦',
      skyhub_my:'My Constellations', skyhub_sky:'Sky',
      ach_title:'My Journey', ach_cat_win:'Victories', ach_cat_play:'Exploration',
      ach_cat_sky:'Sky', ach_cat_theme:'Themes', ach_cat_rank:'Ranks',
      ach_until_next:'until next rank:', ach_max_rank:'Maximum rank ✦',
      journey_title:'My Constellations',
      journey_empty:'Win a game and save<br>your first constellation ✦',
      const_detail_hint:'tap to give me a new name ✦',
      const_detail_share:'Share', const_detail_sky:'To Sky ✦',
      turn_display:'Turn:', turn_draw:'Draw', turn_loss:'Defeat',
      hints_label:'Hints 💡', last_move:'Last Move',
      start_title:'STARGAZER',
      start_how_to_play:'HOW TO PLAY', vs_ai:'Play', vs_ai_sub:'vs AI',
      vs_human:'With a Friend', vs_human_sub:'2 players',
      journey_btn:'My Journey ✦', start_back:'← Start',
      choose_length:'CHOOSE GAME LENGTH',
      len_short:'Short', len_short_sub:'7 points',
      len_normal:'Normal', len_normal_sub:'13 points',
      len_long:'Long', len_long_sub:'21 points',
      choose_map:'CHOOSE MAP',
      map_ladle:'Ladle', map_ladle_sub:'7 points',
      map_zodiac:'Zodiac', map_zodiac_sub:'13 points',
      map_galaxy:'Galaxy', map_galaxy_sub:'21 points',
      name_placeholder1:'Your name', name_placeholder2:"Player 2's name",
      start_btn:'Start',
      home_short:'short', home_normal:'normal', home_long:'long', home_play:'Play',
      victory_sub_win:'won!', victory_first_const:"Your first constellation — it's yours forever ✦",
      victory_name_label:'Name your constellation', victory_name_placeholder:'Name',
      victory_save_sky:'Save to Sky ✦', victory_save_local:'Save to My Constellations',
      victory_guest:'Sign in to save', victory_saved:'Constellation saved ✦',
      victory_play_again:'Play Again', victory_to_menu:'← Menu',
      victory_change_rank:'Change Rank',
      loss_title:'Defeat', loss_play_again:'Play Again', loss_exit:'Exit',
      duel_name_prefix:'Constellation', duel_won:'won!', duel_next_time:'next time!', duel_pts:'points',
      ai_thinking:'AI is thinking…', ai_name:'Stargazer',
      player_default:'Player', player_1:'Player 1', player_2:'Player 2',
      rank_prefix:'Rank', rank_next:'until next rank:',
      stat_games_played:'Games played', stat_wins:'Wins', stat_win_pct:'Win %',
      stat_best_streak:'Best streak', stat_fav_theme:'Favourite theme', stat_ai_level:'AI level',
      toast_copied:'Image copied ✦', toast_share_fail:'Could not share',
      name_untitled:'Untitled', delete_confirm_yes:'Delete ✕',
      offline_banner:'No connection',
      lb_of:'of', lb_players:'players', lb_cached:'last updated', lb_unavailable:'rating unavailable',
      offline_saved_local:'Saved locally — will sync when online ✦',
      offline_queue:'pending sync',
      turn_win:'Victory', sky_no_mine:'No constellations ✦',
      const_published:'✦ Published', ach_unlocked:'Unlocked',
      nebula:'Nebula', coming_soon:'Coming soon ✦',
      auth_err_fill:'Please fill in email and password',
      auth_err_short_pass:'Password must be at least 6 characters',
      auth_err_invalid:'Invalid email or password',
      auth_err_not_confirmed:'Please confirm your email to sign in',
      auth_err_rate:'Too many attempts, please wait a moment',
      auth_err_generic:'Something went wrong',
      auth_ok_confirm:'Check your email — we sent a confirmation link ✦',
    },
    ru: {
      app_title:'СОЗВЕЗДИЕ', auth_apple:'Войти через Apple', auth_google:'Войти через Google',
      auth_email:'✉ Войти по почте', auth_skip:'Продолжить без входа',
      auth_tab_login:'войти', auth_tab_signup:'регистрация',
      auth_placeholder_email:'почта', auth_placeholder_pass:'пароль',
      auth_submit_login:'Войти', auth_submit_signup:'Зарегистрироваться', auth_back:'← назад',
      auth_err_empty:'Заполните почту и пароль',
      auth_err_wrong:'Неверная почта или пароль',
      auth_ok_signup:'Проверьте почту — отправили ссылку для подтверждения ✦',
      auth_err_exists:'Аккаунт уже существует — попробуйте войти',
      tut_connect:'Соедини эти две звезды', tut_close:'Замкни созвездие!',
      tut_well_done:'Молодец! ✦', tut_rival:'Соперник тоже будет собирать звёзды',
      tut_you_can_win:'Ты можешь победить его', tut_congrats:'Поздравляю! ✦',
      tut_congrats_sub:'Собирай звёзды и выигрывай у соперника', tut_play:'Играть!',
      tut_first_star:'Ты поставила первую звезду ✦\nСоединяй их линиями, чтобы поймать созвездие',
      tut_caught:'Созвездие поймано! ✦\nЗамкнутая фигура приносит очко',
      tut_final:'Финальный рывок — у кого больше созвездий, тот и победил ✦',
      stub_coming:'Скоро здесь появится<br>что-то интересное ✦',
      settings_title:'Настройки', settings_sound_section:'Звук и отклик',
      settings_sound_title:'Звук', settings_sound_sub:'Звуковые эффекты',
      settings_vib_title:'Вибрация', settings_vib_sub:'Тактильный отклик',
      settings_game_section:'Игра', settings_glow_title:'Свечение звёзд',
      settings_glow_sub:'Насколько светятся точки',
      settings_glow_all:'Все', settings_glow_active:'Активная',
      settings_theme_section:'Тема', settings_lang_section:'Язык',
      profile_title:'Профиль', profile_avatar_hint:'Нажмите чтобы сменить',
      profile_name_placeholder:'Введите имя', profile_stats_title:'Статистика',
      profile_stat_score:'Суммарный счёт', profile_stat_best:'Лучший результат',
      profile_stat_games:'Всего игр', profile_stat_const:'Созвездий в небе',
      profile_wins:'Победы', profile_losses:'Пораж.', profile_draws:'Ничьи',
      profile_leaderboard:'Место в рейтинге', profile_lb_loading:'загрузка…',
      profile_achievements_btn:'✦ Достижения', profile_logout:'Выйти',
      tutorial_next:'Далее',
      avatar_title:'Выбрать символ', avatar_upload:'Загрузить фото', avatar_cancel:'Отмена',
      sky_global:'Общее небо', sky_personal:'Моё небо', sky_find:'Найти моё ✦',
      sky_loading:'Загрузка ✦', sky_save_first:'Сохрани своё первое созвездие ✦',
      sky_offline:'Нет соединения ✦', sky_retry:'Повторить',
      sky_be_first:'Будь первым кто сохранит созвездие ✦',
      skyhub_my:'Мои созвездия', skyhub_sky:'Небо',
      ach_title:'Мой путь', ach_cat_win:'Победы', ach_cat_play:'Исследование',
      ach_cat_sky:'Небо', ach_cat_theme:'Темы', ach_cat_rank:'Ранги',
      ach_until_next:'до следующего ранга:', ach_max_rank:'Максимальный ранг ✦',
      journey_title:'Мои созвездия',
      journey_empty:'Победи в игре и сохрани<br>своё первое созвездие ✦',
      const_detail_hint:'нажми, чтобы дать мне новое имя ✦',
      const_detail_share:'Поделиться', const_detail_sky:'В небо ✦',
      turn_display:'Ход:', turn_draw:'Ничья', turn_loss:'Проигрыш',
      hints_label:'Подсказки 💡', last_move:'Последний ход',
      start_title:'СОЗВЕЗДИЕ',
      start_how_to_play:'КАК ИГРАТЬ', vs_ai:'Играть', vs_ai_sub:'против ИИ',
      vs_human:'С другом', vs_human_sub:'2 игрока',
      journey_btn:'Мой путь ✦', start_back:'← Начало',
      choose_length:'ВЫБЕРИ ДЛИНУ ПАРТИИ',
      len_short:'Короткая', len_short_sub:'7 точек',
      len_normal:'Обычная', len_normal_sub:'13 точек',
      len_long:'Длинная', len_long_sub:'21 точка',
      choose_map:'ВЫБЕРИТЕ КАРТУ',
      map_ladle:'Ковш', map_ladle_sub:'7 точек',
      map_zodiac:'Зодиак', map_zodiac_sub:'13 точек',
      map_galaxy:'Галактика', map_galaxy_sub:'21 точка',
      name_placeholder1:'Ваше имя', name_placeholder2:'Имя игрока 2',
      start_btn:'Начать',
      home_short:'короткая', home_normal:'обычная', home_long:'длинная', home_play:'Играть',
      victory_sub_win:'победило!', victory_first_const:'Первое созвездие — оно теперь твоё навсегда ✦',
      victory_name_label:'Дай имя своему созвездию', victory_name_placeholder:'Название',
      victory_save_sky:'Сохранить в небо ✦', victory_save_local:'Сохранить в мои созвездия',
      victory_guest:'Войдите чтобы сохранить', victory_saved:'Созвездие сохранено ✦',
      victory_play_again:'Играть снова', victory_to_menu:'← В меню',
      victory_change_rank:'Сменить ранг',
      loss_title:'Проигрыш', loss_play_again:'Играть снова', loss_exit:'Выход',
      duel_name_prefix:'Созвездие', duel_won:'победило!', duel_next_time:'в другой раз!', duel_pts:'очков',
      ai_thinking:'Звездочёт ходит…', ai_name:'Звездочёт',
      player_default:'Игрок', player_1:'Игрок 1', player_2:'Игрок 2',
      rank_prefix:'Ранг', rank_next:'до следующего ранга:',
      stat_games_played:'Партий сыграно', stat_wins:'Побед', stat_win_pct:'% побед',
      stat_best_streak:'Лучшая серия', stat_fav_theme:'Любимая тема', stat_ai_level:'Уровень ИИ',
      toast_copied:'Картинка скопирована ✦', toast_share_fail:'Не удалось поделиться',
      name_untitled:'Без названия', delete_confirm_yes:'Удалить ✕',
      offline_banner:'Нет соединения',
      lb_of:'из', lb_players:'игроков', lb_cached:'обновлено', lb_unavailable:'рейтинг недоступен',
      offline_saved_local:'Сохранено локально — синхронизируем при подключении ✦',
      offline_queue:'ожидает синхронизации',
      turn_win:'Победа', sky_no_mine:'Твоих созвездий нет ✦',
      const_published:'✦ Опубликовано', ach_unlocked:'Открыто',
      nebula:'Туманность', coming_soon:'Скоро ✦',
      auth_err_fill:'Заполните почту и пароль',
      auth_err_short_pass:'Пароль — минимум 6 символов',
      auth_err_invalid:'Неверная почта или пароль',
      auth_err_not_confirmed:'Подтвердите почту чтобы войти',
      auth_err_rate:'Слишком много попыток, подождите немного',
      auth_err_generic:'Что-то пошло не так',
      auth_ok_confirm:'Проверьте почту — отправили ссылку для подтверждения ✦',
    },
    es: {
      app_title:'CONSTELACIÓN', auth_apple:'Continuar con Apple', auth_google:'Continuar con Google',
      auth_email:'✉ Entrar con email', auth_skip:'Continuar sin cuenta',
      auth_tab_login:'entrar', auth_tab_signup:'registro',
      auth_placeholder_email:'correo', auth_placeholder_pass:'contraseña',
      auth_submit_login:'Entrar', auth_submit_signup:'Registrarse', auth_back:'← volver',
      auth_err_empty:'Completa el correo y la contraseña',
      auth_err_wrong:'Correo o contraseña incorrectos',
      auth_ok_signup:'Revisa tu correo — te enviamos un enlace de confirmación ✦',
      auth_err_exists:'La cuenta ya existe — intenta iniciar sesión',
      tut_connect:'Conecta estas dos estrellas', tut_close:'¡Cierra la constelación!',
      tut_well_done:'¡Bien hecho! ✦', tut_rival:'Tu rival también recolectará estrellas',
      tut_you_can_win:'Puedes vencerle', tut_congrats:'¡Felicitaciones! ✦',
      tut_congrats_sub:'Recolecta estrellas y vence a tu oponente', tut_play:'¡Jugar!',
      tut_first_star:'Colocaste tu primera estrella ✦\nConéctalas con líneas para atrapar una constelación',
      tut_caught:'¡Constelación atrapada! ✦\nUna figura cerrada da un punto',
      tut_final:'Recta final — quien tenga más constelaciones gana ✦',
      stub_coming:'Algo interesante<br>llegará aquí pronto ✦',
      settings_title:'Ajustes', settings_sound_section:'Sonido y respuesta',
      settings_sound_title:'Sonido', settings_sound_sub:'Efectos de sonido',
      settings_vib_title:'Vibración', settings_vib_sub:'Respuesta háptica',
      settings_game_section:'Juego', settings_glow_title:'Brillo de estrellas',
      settings_glow_sub:'Qué tan brillantes son los puntos',
      settings_glow_all:'Todas', settings_glow_active:'Activa',
      settings_theme_section:'Tema', settings_lang_section:'Idioma',
      profile_title:'Perfil', profile_avatar_hint:'Toca para cambiar',
      profile_name_placeholder:'Introduce nombre', profile_stats_title:'Estadísticas',
      profile_stat_score:'Puntuación total', profile_stat_best:'Mejor resultado',
      profile_stat_games:'Partidas totales', profile_stat_const:'Constelaciones en el cielo',
      profile_wins:'Victorias', profile_losses:'Derrotas', profile_draws:'Empates',
      profile_leaderboard:'Clasificación', profile_lb_loading:'cargando…',
      profile_achievements_btn:'✦ Logros', profile_logout:'Cerrar sesión',
      tutorial_next:'Siguiente',
      avatar_title:'Elige símbolo', avatar_upload:'Subir foto', avatar_cancel:'Cancelar',
      sky_global:'Cielo global', sky_personal:'Mi cielo', sky_find:'Encontrar el mío ✦',
      sky_loading:'Cargando ✦', sky_save_first:'Guarda tu primera constelación ✦',
      sky_offline:'Sin conexión ✦', sky_retry:'Reintentar',
      sky_be_first:'Sé el primero en guardar una constelación ✦',
      skyhub_my:'Mis constelaciones', skyhub_sky:'Cielo',
      ach_title:'Mi camino', ach_cat_win:'Victorias', ach_cat_play:'Exploración',
      ach_cat_sky:'Cielo', ach_cat_theme:'Temas', ach_cat_rank:'Rangos',
      ach_until_next:'hasta el siguiente rango:', ach_max_rank:'Rango máximo ✦',
      journey_title:'Mis constelaciones',
      journey_empty:'Gana una partida y guarda<br>tu primera constelación ✦',
      const_detail_hint:'toca para darme un nuevo nombre ✦',
      const_detail_share:'Compartir', const_detail_sky:'Al cielo ✦',
      turn_display:'Turno:', turn_draw:'Empate', turn_loss:'Derrota',
      hints_label:'Pistas 💡', last_move:'Último movimiento',
      start_title:'STARGAZER',
      start_how_to_play:'CÓMO JUGAR', vs_ai:'Jugar', vs_ai_sub:'vs IA',
      vs_human:'Con amigo', vs_human_sub:'2 jugadores',
      journey_btn:'Mi camino ✦', start_back:'← Inicio',
      choose_length:'ELIGE DURACIÓN',
      len_short:'Corta', len_short_sub:'7 puntos',
      len_normal:'Normal', len_normal_sub:'13 puntos',
      len_long:'Larga', len_long_sub:'21 puntos',
      choose_map:'ELIGE MAPA',
      map_ladle:'Cazo', map_ladle_sub:'7 puntos',
      map_zodiac:'Zodíaco', map_zodiac_sub:'13 puntos',
      map_galaxy:'Galaxia', map_galaxy_sub:'21 puntos',
      name_placeholder1:'Tu nombre', name_placeholder2:'Nombre del jugador 2',
      start_btn:'Empezar',
      home_short:'corta', home_normal:'normal', home_long:'larga', home_play:'Jugar',
      victory_sub_win:'¡ganó!', victory_first_const:'Tu primera constelación — es tuya para siempre ✦',
      victory_name_label:'Nombra tu constelación', victory_name_placeholder:'Nombre',
      victory_save_sky:'Guardar en el cielo ✦', victory_save_local:'Guardar en mis constelaciones',
      victory_guest:'Inicia sesión para guardar', victory_saved:'Constelación guardada ✦',
      victory_play_again:'Jugar de nuevo', victory_to_menu:'← Menú',
      victory_change_rank:'Cambiar rango',
      loss_title:'Derrota', loss_play_again:'Jugar de nuevo', loss_exit:'Salir',
      duel_name_prefix:'Constelación', duel_won:'¡ganó!', duel_next_time:'¡la próxima vez!', duel_pts:'puntos',
      ai_thinking:'La IA está pensando…', ai_name:'Stargazer',
      player_default:'Jugador', player_1:'Jugador 1', player_2:'Jugador 2',
      rank_prefix:'Rango', rank_next:'hasta el siguiente rango:',
      stat_games_played:'Partidas jugadas', stat_wins:'Victorias', stat_win_pct:'% victorias',
      stat_best_streak:'Mejor racha', stat_fav_theme:'Tema favorito', stat_ai_level:'Nivel IA',
      toast_copied:'Imagen copiada ✦', toast_share_fail:'No se pudo compartir',
      name_untitled:'Sin título', delete_confirm_yes:'Eliminar ✕',
      offline_banner:'Sin conexión',
      lb_of:'de', lb_players:'jugadores', lb_cached:'actualizado', lb_unavailable:'clasificación no disponible',
      offline_saved_local:'Guardado localmente — se sincronizará al conectarse ✦',
      offline_queue:'pendiente de sincronización',
      turn_win:'Victoria', sky_no_mine:'Sin constelaciones ✦',
      const_published:'✦ Publicado', ach_unlocked:'Desbloqueado',
      nebula:'Nebulosa', coming_soon:'Próximamente ✦',
      auth_err_fill:'Por favor completa el correo y la contraseña',
      auth_err_short_pass:'La contraseña debe tener al menos 6 caracteres',
      auth_err_invalid:'Correo o contraseña incorrectos',
      auth_err_not_confirmed:'Confirma tu correo para iniciar sesión',
      auth_err_rate:'Demasiados intentos, espera un poco',
      auth_err_generic:'Algo salió mal',
      auth_ok_confirm:'Revisa tu correo — enviamos un enlace de confirmación ✦',
    },
    zh: {
      app_title:'星座', auth_apple:'通过Apple登录', auth_google:'通过Google登录',
      auth_email:'✉ 邮箱登录', auth_skip:'无需登录继续',
      auth_tab_login:'登录', auth_tab_signup:'注册',
      auth_placeholder_email:'邮箱', auth_placeholder_pass:'密码',
      auth_submit_login:'登录', auth_submit_signup:'注册', auth_back:'← 返回',
      auth_err_empty:'请填写邮箱和密码', auth_err_wrong:'邮箱或密码错误',
      auth_ok_signup:'请查收邮件 — 我们发送了确认链接 ✦',
      auth_err_exists:'账户已存在 — 请尝试登录',
      tut_connect:'连接这两颗星', tut_close:'闭合星座！',
      tut_well_done:'做得好！✦', tut_rival:'你的对手也会收集星星',
      tut_you_can_win:'你可以打败他', tut_congrats:'恭喜！✦',
      tut_congrats_sub:'收集星星并打败对手', tut_play:'开始游戏！',
      tut_first_star:'你放置了第一颗星 ✦\n用线条连接它们来捕捉星座',
      tut_caught:'星座已捕捉！✦\n闭合的图形得一分',
      tut_final:'最后冲刺 — 星座最多者获胜 ✦',
      stub_coming:'精彩内容<br>即将到来 ✦',
      settings_title:'设置', settings_sound_section:'声音与反馈',
      settings_sound_title:'声音', settings_sound_sub:'音效',
      settings_vib_title:'振动', settings_vib_sub:'触觉反馈',
      settings_game_section:'游戏', settings_glow_title:'星星发光',
      settings_glow_sub:'点的亮度',
      settings_glow_all:'全部', settings_glow_active:'活跃',
      settings_theme_section:'主题', settings_lang_section:'语言',
      profile_title:'个人资料', profile_avatar_hint:'点击更换',
      profile_name_placeholder:'输入名称', profile_stats_title:'统计',
      profile_stat_score:'总分', profile_stat_best:'最佳成绩',
      profile_stat_games:'总游戏数', profile_stat_const:'天空中的星座',
      profile_wins:'胜利', profile_losses:'失败', profile_draws:'平局',
      profile_leaderboard:'排行榜', profile_lb_loading:'加载中…',
      profile_achievements_btn:'✦ 成就', profile_logout:'退出登录',
      tutorial_next:'下一步',
      avatar_title:'选择符号', avatar_upload:'上传照片', avatar_cancel:'取消',
      sky_global:'公共天空', sky_personal:'我的天空', sky_find:'找到我的 ✦',
      sky_loading:'加载中 ✦', sky_save_first:'保存你的第一个星座 ✦',
      sky_offline:'无连接 ✦', sky_retry:'重试',
      sky_be_first:'成为第一个保存星座的人 ✦',
      skyhub_my:'我的星座', skyhub_sky:'天空',
      ach_title:'我的旅程', ach_cat_win:'胜利', ach_cat_play:'探索',
      ach_cat_sky:'天空', ach_cat_theme:'主题', ach_cat_rank:'等级',
      ach_until_next:'距下一等级：', ach_max_rank:'最高等级 ✦',
      journey_title:'我的星座',
      journey_empty:'赢得游戏并保存<br>你的第一个星座 ✦',
      const_detail_hint:'点击给我一个新名字 ✦',
      const_detail_share:'分享', const_detail_sky:'上传天空 ✦',
      turn_display:'回合：', turn_draw:'平局', turn_loss:'失败',
      hints_label:'提示 💡', last_move:'最后一步',
      start_title:'STARGAZER',
      start_how_to_play:'如何游戏', vs_ai:'游戏', vs_ai_sub:'对战AI',
      vs_human:'与朋友', vs_human_sub:'2人游戏',
      journey_btn:'我的旅程 ✦', start_back:'← 开始',
      choose_length:'选择游戏长度',
      len_short:'短局', len_short_sub:'7点',
      len_normal:'普通', len_normal_sub:'13点',
      len_long:'长局', len_long_sub:'21点',
      choose_map:'选择地图',
      map_ladle:'勺子', map_ladle_sub:'7点',
      map_zodiac:'黄道', map_zodiac_sub:'13点',
      map_galaxy:'银河', map_galaxy_sub:'21点',
      name_placeholder1:'你的名字', name_placeholder2:'玩家2的名字',
      start_btn:'开始',
      home_short:'短局', home_normal:'普通', home_long:'长局', home_play:'游戏',
      victory_sub_win:'胜利！', victory_first_const:'你的第一个星座 — 它永远属于你 ✦',
      victory_name_label:'为你的星座命名', victory_name_placeholder:'名称',
      victory_save_sky:'保存到天空 ✦', victory_save_local:'保存到我的星座',
      victory_guest:'登录以保存', victory_saved:'星座已保存 ✦',
      victory_play_again:'再玩一次', victory_to_menu:'← 菜单',
      victory_change_rank:'更换等级',
      loss_title:'失败', loss_play_again:'再玩一次', loss_exit:'退出',
      duel_name_prefix:'星座', duel_won:'胜利！', duel_next_time:'下次再来！', duel_pts:'分',
      ai_thinking:'AI思考中…', ai_name:'Stargazer',
      player_default:'玩家', player_1:'玩家1', player_2:'玩家2',
      rank_prefix:'等级', rank_next:'距下一等级：',
      stat_games_played:'游戏场数', stat_wins:'胜利', stat_win_pct:'胜率',
      stat_best_streak:'最佳连胜', stat_fav_theme:'最爱主题', stat_ai_level:'AI等级',
      toast_copied:'图片已复制 ✦', toast_share_fail:'分享失败',
      name_untitled:'无标题', delete_confirm_yes:'删除 ✕',
      offline_banner:'无连接',
      lb_of:'共', lb_players:'玩家', lb_cached:'更新于', lb_unavailable:'排名不可用',
      offline_saved_local:'已本地保存 — 连接后将同步 ✦',
      offline_queue:'等待同步',
      turn_win:'胜利', sky_no_mine:'无星座 ✦',
      const_published:'✦ 已发布', ach_unlocked:'已解锁',
      nebula:'星云', coming_soon:'即将推出 ✦',
      auth_err_fill:'请填写邮箱和密码',
      auth_err_short_pass:'密码至少需要6个字符',
      auth_err_invalid:'邮箱或密码错误',
      auth_err_not_confirmed:'请先确认您的邮箱',
      auth_err_exists:'账号已存在 — 请尝试登录',
      auth_err_rate:'尝试次数过多，请稍等',
      auth_err_generic:'出现问题',
      auth_ok_confirm:'请检查您的邮箱 — 我们已发送确认链接 ✦',
    },
    pt: {
      app_title:'CONSTELAÇÃO', auth_apple:'Entrar com Apple', auth_google:'Entrar com Google',
      auth_email:'✉ Entrar com email', auth_skip:'Continuar sem conta',
      auth_tab_login:'entrar', auth_tab_signup:'cadastro',
      auth_placeholder_email:'e-mail', auth_placeholder_pass:'senha',
      auth_submit_login:'Entrar', auth_submit_signup:'Cadastrar', auth_back:'← voltar',
      auth_err_empty:'Preencha o e-mail e a senha', auth_err_wrong:'E-mail ou senha incorretos',
      auth_ok_signup:'Verifique seu e-mail — enviamos um link de confirmação ✦',
      auth_err_exists:'Conta já existe — tente fazer login',
      tut_connect:'Conecte essas duas estrelas', tut_close:'Feche a constelação!',
      tut_well_done:'Muito bem! ✦', tut_rival:'Seu rival também vai coletar estrelas',
      tut_you_can_win:'Você pode vencê-lo', tut_congrats:'Parabéns! ✦',
      tut_congrats_sub:'Colete estrelas e vença seu oponente', tut_play:'Jogar!',
      tut_first_star:'Você colocou sua primeira estrela ✦\nConecte-as com linhas para capturar uma constelação',
      tut_caught:'Constelação capturada! ✦\nUma figura fechada vale um ponto',
      tut_final:'Reta final — quem tiver mais constelações vence ✦',
      stub_coming:'Algo interessante<br>chegará em breve ✦',
      settings_title:'Configurações', settings_sound_section:'Som e resposta',
      settings_sound_title:'Som', settings_sound_sub:'Efeitos sonoros',
      settings_vib_title:'Vibração', settings_vib_sub:'Retorno háptico',
      settings_game_section:'Jogo', settings_glow_title:'Brilho das estrelas',
      settings_glow_sub:'Quão brilhantes são os pontos',
      settings_glow_all:'Todas', settings_glow_active:'Ativa',
      settings_theme_section:'Tema', settings_lang_section:'Idioma',
      profile_title:'Perfil', profile_avatar_hint:'Toque para alterar',
      profile_name_placeholder:'Digite o nome', profile_stats_title:'Estatísticas',
      profile_stat_score:'Pontuação total', profile_stat_best:'Melhor resultado',
      profile_stat_games:'Total de partidas', profile_stat_const:'Constelações no céu',
      profile_wins:'Vitórias', profile_losses:'Derrotas', profile_draws:'Empates',
      profile_leaderboard:'Classificação', profile_lb_loading:'carregando…',
      profile_achievements_btn:'✦ Conquistas', profile_logout:'Sair',
      tutorial_next:'Próximo',
      avatar_title:'Escolher símbolo', avatar_upload:'Enviar foto', avatar_cancel:'Cancelar',
      sky_global:'Céu global', sky_personal:'Meu céu', sky_find:'Encontrar o meu ✦',
      sky_loading:'Carregando ✦', sky_save_first:'Salve sua primeira constelação ✦',
      sky_offline:'Sem conexão ✦', sky_retry:'Tentar novamente',
      sky_be_first:'Seja o primeiro a salvar uma constelação ✦',
      skyhub_my:'Minhas constelações', skyhub_sky:'Céu',
      ach_title:'Minha jornada', ach_cat_win:'Vitórias', ach_cat_play:'Exploração',
      ach_cat_sky:'Céu', ach_cat_theme:'Temas', ach_cat_rank:'Postos',
      ach_until_next:'para o próximo posto:', ach_max_rank:'Posto máximo ✦',
      journey_title:'Minhas constelações',
      journey_empty:'Vença uma partida e salve<br>sua primeira constelação ✦',
      const_detail_hint:'toque para me dar um novo nome ✦',
      const_detail_share:'Compartilhar', const_detail_sky:'Para o céu ✦',
      turn_display:'Vez:', turn_draw:'Empate', turn_loss:'Derrota',
      hints_label:'Dicas 💡', last_move:'Último movimento',
      start_title:'STARGAZER',
      start_how_to_play:'COMO JOGAR', vs_ai:'Jogar', vs_ai_sub:'vs IA',
      vs_human:'Com amigo', vs_human_sub:'2 jogadores',
      journey_btn:'Minha jornada ✦', start_back:'← Início',
      choose_length:'ESCOLHA A DURAÇÃO',
      len_short:'Curta', len_short_sub:'7 pontos',
      len_normal:'Normal', len_normal_sub:'13 pontos',
      len_long:'Longa', len_long_sub:'21 pontos',
      choose_map:'ESCOLHA O MAPA',
      map_ladle:'Concha', map_ladle_sub:'7 pontos',
      map_zodiac:'Zodíaco', map_zodiac_sub:'13 pontos',
      map_galaxy:'Galáxia', map_galaxy_sub:'21 pontos',
      name_placeholder1:'Seu nome', name_placeholder2:'Nome do jogador 2',
      start_btn:'Começar',
      home_short:'curta', home_normal:'normal', home_long:'longa', home_play:'Jogar',
      victory_sub_win:'venceu!', victory_first_const:'Sua primeira constelação — é sua para sempre ✦',
      victory_name_label:'Nomeie sua constelação', victory_name_placeholder:'Nome',
      victory_save_sky:'Salvar no céu ✦', victory_save_local:'Salvar nas minhas constelações',
      victory_guest:'Entre para salvar', victory_saved:'Constelação salva ✦',
      victory_play_again:'Jogar novamente', victory_to_menu:'← Menu',
      victory_change_rank:'Mudar posto',
      loss_title:'Derrota', loss_play_again:'Jogar novamente', loss_exit:'Sair',
      duel_name_prefix:'Constelação', duel_won:'venceu!', duel_next_time:'na próxima!', duel_pts:'pontos',
      ai_thinking:'IA está pensando…', ai_name:'Stargazer',
      player_default:'Jogador', player_1:'Jogador 1', player_2:'Jogador 2',
      rank_prefix:'Posto', rank_next:'para o próximo posto:',
      stat_games_played:'Partidas jogadas', stat_wins:'Vitórias', stat_win_pct:'% vitórias',
      stat_best_streak:'Melhor sequência', stat_fav_theme:'Tema favorito', stat_ai_level:'Nível IA',
      toast_copied:'Imagem copiada ✦', toast_share_fail:'Não foi possível compartilhar',
      name_untitled:'Sem título', delete_confirm_yes:'Excluir ✕',
      offline_banner:'Sem conexão',
      lb_of:'de', lb_players:'jogadores', lb_cached:'atualizado', lb_unavailable:'classificação indisponível',
      offline_saved_local:'Salvo localmente — sincronizará ao conectar ✦',
      offline_queue:'aguardando sincronização',
      turn_win:'Vitória', sky_no_mine:'Sem constelações ✦',
      const_published:'✦ Publicado', ach_unlocked:'Desbloqueado',
      nebula:'Nebulosa', coming_soon:'Em breve ✦',
      auth_err_fill:'Por favor preencha email e senha',
      auth_err_short_pass:'A senha deve ter pelo menos 6 caracteres',
      auth_err_invalid:'Email ou senha incorretos',
      auth_err_not_confirmed:'Confirme seu email para entrar',
      auth_err_exists:'Conta já existe — tente fazer login',
      auth_err_rate:'Muitas tentativas, aguarde um momento',
      auth_err_generic:'Algo deu errado',
      auth_ok_confirm:'Verifique seu email — enviamos um link de confirmação ✦',
    },
  };

  // ── Rank names ──────────────────────────────────────────────────────────
  const RANK_NAMES_I18N = {
    en: ['Observer','Cartographer','Tracker','Traveler','Keeper','Stargazer','Navigator','Astronomer','Sky Guardian','Constellation Architect'],
    ru: ['Наблюдатель','Картограф','Следопыт','Путешественник','Хранитель','Звездочёт','Навигатор','Астроном','Страж Неба','Архитектор Созвездий'],
    es: ['Observador','Cartógrafo','Rastreador','Viajero','Guardián','Stargazer','Navegante','Astrónomo','Guardián del Cielo','Arquitecto de Constelaciones'],
    zh: ['观察者','制图师','追踪者','旅行者','守护者','观星者','航海家','天文学家','天空守卫','星座建筑师'],
    pt: ['Observador','Cartógrafo','Rastreador','Viajante','Guardião','Stargazer','Navegante','Astrônomo','Guardião do Céu','Arquiteto das Constelações'],
  };

  // ── Achievement i18n ────────────────────────────────────────────────────
  const ACHIEVEMENT_I18N = {
    en: {
      first_win:{label:'First\nConstellation',desc:'Win your first game'},
      win10:{label:'Hunter',desc:'Achieve 10 wins'},
      streak3:{label:'Three\nin a Row',desc:'Win 3 games in a row'},
      streak5:{label:'Five\nStars',desc:'Win 5 games in a row'},
      perfect:{label:'Perfect\nGame',desc:"Win without your opponent getting any lines"},
      long_win:{label:'Long\nJourney',desc:'Win a long game (21 points)'},
      games10:{label:'Wanderer',desc:'Play 10 games'},
      games50:{label:'Traveler',desc:'Play 50 games'},
      sky5:{label:'Sky\nCollection',desc:'Save 5 constellations to your sky'},
      stargazer5:{label:'Night\nObserver',desc:'Play 5 games in Stargazer theme'},
      chalk10:{label:'Ink\nMaster',desc:'Play 10 games in Chalk theme'},
      suprematist5:{label:'Suprematist',desc:'Play 5 games in Suprematist theme'},
      rank3:{label:'Tracker',desc:'Reach Tracker rank (rank 3)'},
      rank5:{label:'Keeper',desc:'Reach Keeper rank (rank 5)'},
      legend:{label:'Constellation\nArchitect',desc:'Reach the highest rank — Constellation Architect'},
    },
    ru: {
      first_win:{label:'Первое\nсозвездие',desc:'Выиграй первую партию'},
      win10:{label:'Охотник',desc:'Одержи 10 побед'},
      streak3:{label:'Три\nподряд',desc:'Выиграй 3 партии подряд'},
      streak5:{label:'Пять\nзвёзд',desc:'Выиграй 5 партий подряд'},
      perfect:{label:'Идеальная\nпартия',desc:'Победи, не дав сопернику ни одной линии'},
      long_win:{label:'Долгий\nпуть',desc:'Победи в длинной партии (21 точка)'},
      games10:{label:'Путник',desc:'Сыграй 10 партий'},
      games50:{label:'Странник',desc:'Сыграй 50 партий'},
      sky5:{label:'Небесная\nколлекция',desc:'Сохрани 5 созвездий в своё небо'},
      stargazer5:{label:'Ночной\nнаблюдатель',desc:'Сыграй 5 партий в теме Stargazer'},
      chalk10:{label:'Мастер\nчернил',desc:'Сыграй 10 партий в теме Chalk'},
      suprematist5:{label:'Супрематист',desc:'Сыграй 5 партий в теме Suprematist'},
      rank3:{label:'Следопыт',desc:'Достигни ранга Следопыт (ранг 3)'},
      rank5:{label:'Хранитель',desc:'Достигни ранга Хранитель (ранг 5)'},
      legend:{label:'Архитектор\nСозвездий',desc:'Достигни высшего ранга — Архитектор Созвездий'},
    },
    es: {
      first_win:{label:'Primera\nConstelación',desc:'Gana tu primera partida'},
      win10:{label:'Cazador',desc:'Logra 10 victorias'},
      streak3:{label:'Tres\nseguidas',desc:'Gana 3 partidas seguidas'},
      streak5:{label:'Cinco\nestrellas',desc:'Gana 5 partidas seguidas'},
      perfect:{label:'Partida\nperfecta',desc:'Gana sin que el rival consiga líneas'},
      long_win:{label:'Largo\ncamino',desc:'Gana una partida larga (21 puntos)'},
      games10:{label:'Caminante',desc:'Juega 10 partidas'},
      games50:{label:'Viajero',desc:'Juega 50 partidas'},
      sky5:{label:'Colección\nceleste',desc:'Guarda 5 constelaciones en tu cielo'},
      stargazer5:{label:'Observador\nnocturno',desc:'Juega 5 partidas en tema Stargazer'},
      chalk10:{label:'Maestro\ntinta',desc:'Juega 10 partidas en tema Chalk'},
      suprematist5:{label:'Suprematista',desc:'Juega 5 partidas en tema Suprematist'},
      rank3:{label:'Rastreador',desc:'Alcanza el rango Rastreador (rango 3)'},
      rank5:{label:'Guardián',desc:'Alcanza el rango Guardián (rango 5)'},
      legend:{label:'Arquitecto de\nConstelaciones',desc:'Alcanza el rango más alto — Arquitecto de Constelaciones'},
    },
    zh: {
      first_win:{label:'第一个\n星座',desc:'赢得第一局'},
      win10:{label:'猎手',desc:'赢得10场胜利'},
      streak3:{label:'三连胜',desc:'连续赢得3场'},
      streak5:{label:'五星',desc:'连续赢得5场'},
      perfect:{label:'完美\n对局',desc:'赢得一局而对手未得任何线段'},
      long_win:{label:'漫长\n旅途',desc:'赢得长局（21点）'},
      games10:{label:'漫游者',desc:'进行10场游戏'},
      games50:{label:'旅行者',desc:'进行50场游戏'},
      sky5:{label:'天空\n收藏',desc:'在天空保存5个星座'},
      stargazer5:{label:'夜晚\n观察者',desc:'在Stargazer主题玩5局'},
      chalk10:{label:'墨水\n大师',desc:'在Chalk主题玩10局'},
      suprematist5:{label:'至上主义者',desc:'在Suprematist主题玩5局'},
      rank3:{label:'追踪者',desc:'达到追踪者等级（等级3）'},
      rank5:{label:'守护者',desc:'达到守护者等级（等级5）'},
      legend:{label:'星座\n建筑师',desc:'达到最高等级 — 星座建筑师'},
    },
    pt: {
      first_win:{label:'Primeira\nConstelação',desc:'Vença sua primeira partida'},
      win10:{label:'Caçador',desc:'Conquiste 10 vitórias'},
      streak3:{label:'Três\nseguidas',desc:'Vença 3 partidas seguidas'},
      streak5:{label:'Cinco\nestrelas',desc:'Vença 5 partidas seguidas'},
      perfect:{label:'Partida\nperfeita',desc:'Vença sem o rival conseguir linhas'},
      long_win:{label:'Longa\njornada',desc:'Vença uma partida longa (21 pontos)'},
      games10:{label:'Caminhante',desc:'Jogue 10 partidas'},
      games50:{label:'Viajante',desc:'Jogue 50 partidas'},
      sky5:{label:'Coleção\nceleste',desc:'Salve 5 constelações no seu céu'},
      stargazer5:{label:'Observador\nnoturno',desc:'Jogue 5 partidas no tema Stargazer'},
      chalk10:{label:'Mestre\ntinta',desc:'Jogue 10 partidas no tema Chalk'},
      suprematist5:{label:'Suprematista',desc:'Jogue 5 partidas no tema Suprematist'},
      rank3:{label:'Rastreador',desc:'Alcance o posto Rastreador (posto 3)'},
      rank5:{label:'Guardião',desc:'Alcance o posto Guardião (posto 5)'},
      legend:{label:'Arquiteto de\nConstelações',desc:'Alcance o posto mais alto — Arquiteto das Constelações'},
    },
  };

  // ── AI level names (10 ranks, matching player ranks) ────────────────────
  const AI_LEVEL_I18N = {
    en: ['Observer','Cartographer','Tracker','Traveler','Keeper','Stargazer','Navigator','Astronomer','Sky Guardian','Constellation Architect'],
    ru: ['Наблюдатель','Картограф','Следопыт','Путешественник','Хранитель','Звездочёт','Навигатор','Астроном','Страж Неба','Архитектор Созвездий'],
    es: ['Observador','Cartógrafo','Rastreador','Viajero','Guardián','Stargazer','Navegante','Astrónomo','Guardián del Cielo','Arquitecto de Constelaciones'],
    zh: ['观察者','制图师','追踪者','旅行者','守护者','观星者','航海家','天文学家','天空守卫','星座建筑师'],
    pt: ['Observador','Cartógrafo','Rastreador','Viajante','Guardião','Stargazer','Navegante','Astrônomo','Guardião do Céu','Arquiteto das Constelações'],
  };

  // ── Constellation name dictionary (EN → RU) ────────────────────────────
  const CONSTELLATION_RU = {
    'Andromeda':'Андромеда','Antlia':'Насос','Apus':'Райская Птица',
    'Aquarius':'Водолей','Aquila':'Орёл','Ara':'Жертвенник',
    'Aries':'Овен','Auriga':'Возничий','Boötes':'Волопас',
    'Caelum':'Резец','Camelopardalis':'Жираф','Cancer':'Рак',
    'Canes Venatici':'Гончие Псы','Canis Major':'Большой Пёс','Canis Minor':'Малый Пёс',
    'Capricornus':'Козерог','Carina':'Киль','Cassiopeia':'Кассиопея',
    'Centaurus':'Центавр','Cepheus':'Цефей','Cetus':'Кит',
    'Chamaeleon':'Хамелеон','Circinus':'Циркуль','Columba':'Голубь',
    'Coma Berenices':'Волосы Вероники','Corona Australis':'Южная Корона','Corona Borealis':'Северная Корона',
    'Corvus':'Ворон','Crater':'Чаша','Crux':'Южный Крест',
    'Cygnus':'Лебедь','Delphinus':'Дельфин','Dorado':'Золотая Рыба',
    'Draco':'Дракон','Equuleus':'Малый Конь','Eridanus':'Эридан',
    'Fornax':'Печь','Gemini':'Близнецы','Grus':'Журавль',
    'Hercules':'Геркулес','Horologium':'Часы','Hydra':'Гидра',
    'Hydrus':'Малая Гидра','Indus':'Индеец','Lacerta':'Ящерица',
    'Leo':'Лев','Leo Minor':'Малый Лев','Lepus':'Заяц',
    'Libra':'Весы','Lupus':'Волк','Lynx':'Рысь',
    'Lyra':'Лира','Mensa':'Столовая Гора','Microscopium':'Микроскоп',
    'Monoceros':'Единорог','Musca':'Муха','Norma':'Угольник',
    'Octans':'Октант','Ophiuchus':'Змееносец','Orion':'Орион',
    'Pavo':'Павлин','Pegasus':'Пегас','Perseus':'Персей',
    'Phoenix':'Феникс','Pictor':'Живописец','Pisces':'Рыбы',
    'Piscis Austrinus':'Южная Рыба','Puppis':'Корма','Pyxis':'Компас',
    'Reticulum':'Сетка','Sagitta':'Стрела','Sagittarius':'Стрелец',
    'Scorpius':'Скорпион','Sculptor':'Скульптор','Scutum':'Щит',
    'Serpens':'Змея','Sextans':'Секстант','Taurus':'Телец',
    'Telescopium':'Телескоп','Triangulum':'Треугольник','Triangulum Australe':'Южный Треугольник',
    'Tucana':'Тукан','Ursa Major':'Большая Медведица','Ursa Minor':'Малая Медведица',
    'Vela':'Паруса','Virgo':'Дева','Volans':'Летучая Рыба','Vulpecula':'Лисичка'
  };

  // ── Core functions ──────────────────────────────────────────────────────

  /** Return translated string by key, falling back to English → key. */
  function t(key) {
    return (STRINGS[_lang] && STRINGS[_lang][key]) || STRINGS.en[key] || key;
  }

  /** Return translated rank name for rank number (1-based). */
  function getRankName(rankNum) {
    const names = RANK_NAMES_I18N[_lang] || RANK_NAMES_I18N.en;
    return names[rankNum - 1] || (RANK_NAMES_I18N.en[rankNum - 1]) || String(rankNum);
  }

  /** Return translated achievement i18n data {label, desc} for achievement id. */
  function getAchI18n(id) {
    return (ACHIEVEMENT_I18N[_lang] && ACHIEVEMENT_I18N[_lang][id])
        || ACHIEVEMENT_I18N.en[id]
        || { label: id, desc: '' };
  }

  /** Return the localized constellation name (Russian if lang=ru, else original). */
  function _constName(n) {
    if (_lang === 'ru' && CONSTELLATION_RU[n]) return CONSTELLATION_RU[n];
    return n;
  }

  /** Refresh global LEVEL_NAMES from current language. */
  function _refreshLevelNames() {
    window.LEVEL_NAMES = AI_LEVEL_I18N[_lang] || AI_LEVEL_I18N.en;
  }

  /**
   * Apply the current language to all DOM elements with data-i18n / data-i18n-html /
   * data-i18n-placeholder attributes, and update all dynamic JS-driven text.
   * Call once on startup and whenever _lang changes.
   */
  function _applyLang() {
    // Static elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      el.innerHTML = t(el.dataset.i18nHtml);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    // Dynamic: auth submit button depends on active tab
    const activeTab = document.querySelector('.auth-tab-btn.active');
    const authSubmit = document.getElementById('auth-email-submit');
    if (activeTab && authSubmit) {
      authSubmit.textContent = activeTab.dataset.authTab === 'login'
        ? t('auth_submit_login') : t('auth_submit_signup');
    }
    // Dynamic: turn display (keep player name if shown)
    const td = document.getElementById('turn-display');
    if (td && td.dataset.turnPlayer) {
      td.textContent = t('turn_display') + ' ' + td.dataset.turnPlayer;
    }
    // Dynamic: LEVEL_NAMES used elsewhere — refresh via global
    _refreshLevelNames();
    // Dynamic: AI player name — update display if currently playing vs AI
    if (typeof isAI !== 'undefined' && isAI && typeof playerNames !== 'undefined') {
      playerNames[1] = t('ai_name');
      const pn2 = document.getElementById('pname2');
      if (pn2) pn2.textContent = t('ai_name');
    }
    // Dynamic: offline banner text
    const _ob = document.getElementById('offline-banner');
    if (_ob) _ob.textContent = t('offline_banner');
    // Dynamic: queue badge text
    if (typeof _updateQueueBadge === 'function') _updateQueueBadge();
  }

  // ── Expose on window (global backward-compat) ──────────────────────────

  // Language state: use Object.defineProperty so code that reads/writes
  // window._lang actually reads/writes our local _lang variable.
  Object.defineProperty(window, '_lang', {
    get: function () { return _lang; },
    set: function (v) { _lang = v; },
    configurable: true,
  });

  window.STRINGS          = STRINGS;
  window.LEVEL_NAMES      = AI_LEVEL_I18N[_lang] || AI_LEVEL_I18N.en;
  window.AI_LEVEL_I18N    = AI_LEVEL_I18N;
  window.RANK_NAMES_I18N  = RANK_NAMES_I18N;
  window.ACHIEVEMENT_I18N = ACHIEVEMENT_I18N;
  window.CONSTELLATION_RU = CONSTELLATION_RU;

  window.t                  = t;
  window.getRankName        = getRankName;
  window.getAchI18n         = getAchI18n;
  window._applyLang         = _applyLang;
  window._constName         = _constName;
  window._refreshLevelNames = _refreshLevelNames;

})();
