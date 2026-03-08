/**
 * profile-screen.js — Экран профиля + Avatar Picker
 *
 * Включает: отображение статистики, редактирование имени, выбор аватара (emoji / фото),
 * лидерборд, кнопку логаут/логин.
 *
 * Зависимости: sb (Supabase), loadProgress(), computeRank(), t(),
 *              _skyGetUserId(), showHomeScreen(), openAchievementsScreen(), closeAchievementsScreen()
 *
 * Экспортирует: openProfileScreen, closeProfileScreen, _refreshProfileAvatar
 */
(function () {
  'use strict';

  // ── Profile Screen ──────────────────────────────────────────────────────────
  // Required Supabase table (run once in Supabase SQL editor):
  //   CREATE TABLE IF NOT EXISTS profiles (
  //     user_id TEXT PRIMARY KEY, username TEXT,
  //     rating INT DEFAULT 0, updated_at TIMESTAMPTZ DEFAULT NOW()
  //   );
  //   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  //   CREATE POLICY "read all" ON profiles FOR SELECT USING (true);
  //   CREATE POLICY "own write" ON profiles FOR INSERT WITH CHECK (true);
  //   CREATE POLICY "own update" ON profiles FOR UPDATE USING (true);
  // ────────────────────────────────────────────────────────────────────────────

  var _PROFILE_EMOJIS = [
    '✦','⭐','🌟','💫','🔭','🌙','☄️','🪐','🌌','🌠',
    '⚡','🎯','🦉','🦊','🐺','🦁','🐉','🌺','🌸','🌊',
    '🏔','🎪','🔮','🌻','🦋','🎨','🌈','🦚','🐬','🦄',
    '🏅','🎖','👑','🗝','⚔️','🛸','🌀','✨','🕊','🐙'
  ];

  /** Refresh avatar display from localStorage. */
  function _refreshProfileAvatar() {
    var type  = localStorage.getItem('avatarType')  || 'emoji';
    var value = localStorage.getItem('avatarValue') || '✦';
    var photo = document.getElementById('profile-avatar-photo');
    var emoji = document.getElementById('profile-avatar-emoji');
    if (type === 'photo' && value) {
      photo.src = value; photo.style.display = 'block'; emoji.style.display = 'none';
    } else {
      emoji.textContent = value; photo.style.display = 'none'; emoji.style.display = 'block';
    }
  }

  /** Populate all profile stats from localStorage. */
  function _loadProfileUI() {
    var p    = loadProgress();
    var name = localStorage.getItem('playerName') || '—';
    var info = computeRank(p.rating);

    // Name
    document.getElementById('profile-name-display').textContent = name;
    document.getElementById('profile-name-input').value = name;
    document.getElementById('profile-rank-display').textContent = info.title + ' · ' + p.rating + ' ✦';

    // Avatar
    _refreshProfileAvatar();

    // Stats numbers
    var constellations = (function () {
      try { return JSON.parse(localStorage.getItem('saved_constellations') || '[]').length; }
      catch (e) { return 0; }
    })();
    var losses = Math.max(0, (p.gamesPlayed || 0) - (p.gamesWon || 0) - (p.gamesDraw || 0));
    document.getElementById('pstat-score').textContent  = p.rating || 0;
    document.getElementById('pstat-best').textContent   = p.bestScore || 0;
    document.getElementById('pstat-games').textContent  = p.gamesPlayed || 0;
    document.getElementById('pstat-const').textContent  = constellations;
    document.getElementById('pstat-wins').textContent   = p.gamesWon || 0;
    document.getElementById('pstat-losses').textContent = losses;
    document.getElementById('pstat-draws').textContent  = p.gamesDraw || 0;

    // Logout / Login button label
    var uid = _skyGetUserId();
    var isGuest = !uid;
    document.getElementById('profile-logout-label').textContent = isGuest ? t('auth_submit_login') : t('profile_logout');
    document.getElementById('profile-logout-icon').textContent  = isGuest ? '→' : '↩';
  }

  /** Fetch leaderboard position from Supabase with offline fallback + cache. */
  function _fetchLeaderboardRank() {
    var rankEl = document.getElementById('profile-lb-rank');
    var infoEl = document.getElementById('profile-lb-info');
    var uid    = _skyGetUserId();
    var p      = loadProgress();
    var myRating = p.rating || 0;

    // Helper to show cached data
    function _showCached() {
      try {
        var cached = JSON.parse(localStorage.getItem('lb_cache') || 'null');
        if (cached) {
          var mins = Math.round((Date.now() - cached.ts) / 60000);
          var timeStr = mins < 1 ? '<1m' : mins < 60 ? mins + 'm' : Math.round(mins / 60) + 'h';
          rankEl.textContent = '#' + cached.rank;
          infoEl.textContent = t('lb_of') + ' ' + cached.total + ' ' + t('lb_players') + '\n' + t('lb_cached') + ' ' + timeStr + ' ago';
          infoEl.style.whiteSpace = 'pre-line';
          return true;
        }
      } catch (_) {}
      return false;
    }

    // If offline — show cache immediately
    if (!navigator.onLine) {
      if (!_showCached()) {
        rankEl.textContent = '#—';
        infoEl.textContent = t('lb_unavailable');
      }
      return;
    }

    // Try to upsert our profile first (so we appear in leaderboard)
    if (uid) {
      var name = localStorage.getItem('playerName') || t('player_default');
      sb.from('profiles').upsert({ user_id: uid, username: name, rating: myRating, updated_at: new Date().toISOString() }).then(function () {}).catch(function () {});
    }

    sb.from('profiles')
      .select('*', { count: 'exact', head: true })
      .gt('rating', myRating)
      .then(function (res1) {
        if (res1.error) throw res1.error;
        var above = res1.count || 0;
        return sb.from('profiles')
          .select('*', { count: 'exact', head: true })
          .then(function (res2) {
            if (res2.error) throw res2.error;
            var total = res2.count || 1;
            var rank = above + 1;
            var tot  = Math.max(rank, total);
            try { localStorage.setItem('lb_cache', JSON.stringify({ rank: rank, total: tot, ts: Date.now() })); } catch (_) {}
            rankEl.textContent = '#' + rank;
            infoEl.textContent = t('lb_of') + ' ' + tot + ' ' + t('lb_players') + '\nsupabase ✦';
            infoEl.style.whiteSpace = 'pre-line';
          });
      })
      .catch(function () {
        if (!_showCached()) {
          rankEl.textContent = '#—';
          infoEl.textContent = t('lb_unavailable');
        }
      });
  }

  /** Open the profile screen. */
  function openProfileScreen() {
    _loadProfileUI();
    document.getElementById('profile-lb-rank').textContent = '…';
    document.getElementById('profile-lb-info').textContent = t('profile_lb_loading');
    document.getElementById('profile-screen').style.display = 'flex';
    if (typeof _resetZoom === 'function') _resetZoom();
    _fetchLeaderboardRank();
  }

  /** Close the profile screen, returning to home. */
  function closeProfileScreen() {
    document.getElementById('profile-screen').style.display = 'none';
    showHomeScreen();
  }

  // ── Event listeners ─────────────────────────────────────────────────────────

  // Back button
  document.getElementById('profile-back-btn').addEventListener('click', closeProfileScreen);

  // Achievements button → open achievements screen, return to profile on back
  document.getElementById('profile-achievements-btn').addEventListener('click', function () {
    closeProfileScreen();
    openAchievementsScreen();
  });

  document.getElementById('ach-back-btn').addEventListener('click', function () {
    closeAchievementsScreen();
    openProfileScreen();
  });

  // Logout / Login
  document.getElementById('profile-logout-btn').addEventListener('click', function () {
    var uid = _skyGetUserId();
    if (!uid) {
      // Guest → show auth screen
      closeProfileScreen();
      document.getElementById('home-screen').style.display = 'none';
      document.getElementById('auth-screen').style.display = 'flex';
      if (typeof _resetZoom === 'function') _resetZoom();
    } else {
      // Authenticated → sign out (clear Supabase token + local state)
      sb.auth.signOut().catch(function () {});
      localStorage.removeItem('userId');
      localStorage.removeItem('guestMode');
      closeProfileScreen();
      document.getElementById('home-screen').style.display = 'none';
      document.getElementById('auth-screen').style.display = 'flex';
      if (typeof _resetZoom === 'function') _resetZoom();
    }
  });

  // ── Name editing inside profile ────────────────────────────────────────────
  var _profNameDisplay = document.getElementById('profile-name-display');
  var _profNameInput   = document.getElementById('profile-name-input');

  _profNameDisplay.addEventListener('click', function () {
    _profNameDisplay.style.display = 'none';
    _profNameInput.style.display   = 'block';
    _profNameInput.focus(); _profNameInput.select();
  });

  function _saveProfileName() {
    var val = _profNameInput.value.trim() || t('player_default');
    try { localStorage.setItem('playerName', val); } catch (e) {}
    _profNameDisplay.textContent    = val;
    document.getElementById('home-player-name').textContent = val;
    _profNameInput.style.display    = 'none';
    _profNameDisplay.style.display  = '';
  }

  _profNameInput.addEventListener('blur', _saveProfileName);
  _profNameInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter')  _profNameInput.blur();
    if (e.key === 'Escape') { _profNameInput.style.display = 'none'; _profNameDisplay.style.display = ''; }
  });

  // ── Avatar picker ─────────────────────────────────────────────────────────
  // Build emoji grid
  (function () {
    var grid = document.getElementById('avatar-emoji-grid');
    _PROFILE_EMOJIS.forEach(function (em) {
      var btn = document.createElement('button');
      btn.className = 'avatar-emoji-btn';
      btn.textContent = em;
      btn.addEventListener('click', function () {
        localStorage.setItem('avatarType', 'emoji');
        localStorage.setItem('avatarValue', em);
        _refreshProfileAvatar();
        closeAvatarPicker();
      });
      grid.appendChild(btn);
    });
  })();

  function openAvatarPicker() {
    // Mark currently selected emoji
    var curVal = localStorage.getItem('avatarValue') || '✦';
    document.querySelectorAll('.avatar-emoji-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.textContent === curVal);
    });
    document.getElementById('avatar-picker').style.display = 'flex';
  }

  function closeAvatarPicker() {
    document.getElementById('avatar-picker').style.display = 'none';
  }

  document.getElementById('profile-avatar-zone').addEventListener('click', openAvatarPicker);
  document.getElementById('avatar-picker-close').addEventListener('click', closeAvatarPicker);
  document.getElementById('avatar-picker-backdrop').addEventListener('click', closeAvatarPicker);

  // File upload
  var _avatarFileInput = document.getElementById('avatar-file-input');
  document.getElementById('avatar-upload-btn').addEventListener('click', function () {
    _avatarFileInput.click();
  });
  _avatarFileInput.addEventListener('change', function () {
    var file = _avatarFileInput.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        localStorage.setItem('avatarType', 'photo');
        localStorage.setItem('avatarValue', e.target.result);
      } catch (_) {
        // localStorage quota exceeded — silently skip
      }
      _refreshProfileAvatar();
      closeAvatarPicker();
      _avatarFileInput.value = '';
    };
    reader.readAsDataURL(file);
  });

  // ── Exports ─────────────────────────────────────────────────────────────────
  window.openProfileScreen      = openProfileScreen;
  window.closeProfileScreen     = closeProfileScreen;
  window._refreshProfileAvatar  = _refreshProfileAvatar;

})();
