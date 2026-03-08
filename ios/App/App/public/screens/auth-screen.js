/**
 * auth-screen.js — Экран авторизации
 *
 * Включает: Supabase email auth (login/signup), guest mode, session restore,
 * Apple/Google placeholders, tab switching, toast notifications.
 *
 * Зависимости: sb (Supabase client), showHomeScreen(), t(), _proceedFromAuth (optional)
 * Экспортирует: initAuth запускается автоматически (IIFE)
 */
(function initAuth() {
  'use strict';

  var authScreen  = document.getElementById('auth-screen');
  var startScreen = document.getElementById('start');
  var mainBtns    = document.getElementById('auth-main-btns');
  var emailPanel  = document.getElementById('auth-email-panel');
  var emailInput  = document.getElementById('auth-field-email');
  var passInput   = document.getElementById('auth-field-pass');
  var errEl       = document.getElementById('auth-email-error');
  var okEl        = document.getElementById('auth-email-success');
  var submitBtn   = document.getElementById('auth-email-submit');
  var authTab     = 'login'; // 'login' | 'signup'

  function hideAuth() {
    authScreen.style.transition = 'opacity 300ms';
    authScreen.style.opacity = '0';
    setTimeout(function () {
      authScreen.style.display = 'none';
      authScreen.style.opacity = '1';
      authScreen.style.transition = '';
      if (typeof _resetZoom === 'function') _resetZoom();
      if (typeof _proceedFromAuth === 'function') {
        _proceedFromAuth();
      } else {
        showHomeScreen();
      }
    }, 300);
  }

  // ── Persistent login: restore Supabase session on every launch ──────────
  (function checkSession() {
    // Fast path: guest mode saved explicitly
    if (localStorage.getItem('guestMode') === 'true') return;

    sb.auth.getSession().then(function (result) {
      var session = result.data && result.data.session;
      if (session && session.user) {
        // Valid session found — restore userId and go straight to home
        var uid  = session.user.id;
        var name = (session.user.email || '').split('@')[0] || t('player_default');
        localStorage.setItem('userId',    uid);
        localStorage.setItem('guestMode', 'false');
        if (!localStorage.getItem('playerName')) {
          localStorage.setItem('playerName', name);
        }
        return; // auth screen stays hidden, app continues normally
      }

      // No valid session → show auth only if also no userId in localStorage
      if (!localStorage.getItem('userId')) {
        startScreen.style.display = 'none';
        authScreen.style.display  = 'flex';
        if (typeof _resetZoom === 'function') _resetZoom();
      }
    }).catch(function () {
      if (!localStorage.getItem('userId')) {
        startScreen.style.display = 'none';
        authScreen.style.display  = 'flex';
        if (typeof _resetZoom === 'function') _resetZoom();
      }
    });
  })();

  // Keep userId in sync when Supabase refreshes the token silently
  sb.auth.onAuthStateChange(function (event, session) {
    if (event === 'SIGNED_IN' && session) {
      localStorage.setItem('userId',    session.user.id);
      localStorage.setItem('guestMode', 'false');
    } else if (event === 'SIGNED_OUT') {
      localStorage.removeItem('userId');
    }
  });

  function _showComingSoon() {
    var txt = document.createElement('div');
    txt.textContent = window.t ? window.t('coming_soon') : 'Coming soon ✦';
    txt.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'background:rgba(22,20,17,0.95);color:rgba(248,247,245,0.9);' +
      'padding:14px 28px;border-radius:12px;font-size:15px;letter-spacing:2px;' +
      'border:1px solid rgba(225,223,220,0.25);z-index:9999;' +
      'animation:_comingSoonAnim 1.8s ease forwards;pointer-events:none;';
    if (!document.getElementById('_coming-soon-style')) {
      var s = document.createElement('style');
      s.id = '_coming-soon-style';
      s.textContent = '@keyframes _comingSoonAnim{' +
        '0%{opacity:0;transform:translate(-50%,-54%)}' +
        '20%{opacity:1;transform:translate(-50%,-50%)}' +
        '70%{opacity:1}' +
        '100%{opacity:0;transform:translate(-50%,-46%)}}';
      document.head.appendChild(s);
    }
    document.body.appendChild(txt);
    setTimeout(function () { txt.remove(); }, 1800);
  }

  // ── Apple / Google ──────────────────────────────────────────────────────
  document.getElementById('auth-apple').addEventListener('click', _showComingSoon);
  document.getElementById('auth-google').addEventListener('click', _showComingSoon);

  // ── Guest / skip ────────────────────────────────────────────────────────
  document.getElementById('auth-skip').addEventListener('click', function () {
    try {
      localStorage.setItem('guestMode', 'true');
      localStorage.setItem('userId', 'null');
    } catch (e) {}
    hideAuth();
  });

  // ── Email panel open / back ─────────────────────────────────────────────
  document.getElementById('auth-email-open').addEventListener('click', function () {
    mainBtns.style.display = 'none';
    emailPanel.style.display = 'flex';
    emailInput.focus();
  });

  document.getElementById('auth-email-back').addEventListener('click', function () {
    emailPanel.style.display = 'none';
    mainBtns.style.display = 'flex';
    errEl.textContent = '';
    okEl.textContent = '';
    emailInput.value = '';
    passInput.value = '';
  });

  // ── Tab switch (login ↔ signup) ─────────────────────────────────────────
  document.querySelectorAll('.auth-tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      authTab = btn.dataset.authTab;
      document.querySelectorAll('.auth-tab-btn').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      submitBtn.textContent = authTab === 'login' ? 'Войти' : 'Зарегистрироваться';
      passInput.autocomplete  = authTab === 'login' ? 'current-password' : 'new-password';
      errEl.textContent = '';
      okEl.textContent = '';
    });
  });

  // ── Submit ──────────────────────────────────────────────────────────────
  function doEmailAuth() {
    var email    = emailInput.value.trim();
    var password = passInput.value;
    errEl.textContent = '';
    okEl.textContent  = '';

    if (!email || !password) {
      errEl.textContent = t('auth_err_fill');
      return;
    }
    if (password.length < 6) {
      errEl.textContent = t('auth_err_short_pass');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '...';

    var promise;
    if (authTab === 'login') {
      promise = sb.auth.signInWithPassword({ email: email, password: password });
    } else {
      promise = sb.auth.signUp({ email: email, password: password });
    }

    promise.then(function (result) {
      if (result.error) throw result.error;
      var data = result.data;
      var user = data.user;

      // Signup without confirmed email — let user in anyway
      if (authTab !== 'login' && user && data.session === null) {
        var uid1  = user.id;
        var name1 = (user.email || '').split('@')[0] || t('player_default');
        try {
          localStorage.setItem('userId',    uid1);
          localStorage.setItem('guestMode', 'false');
          if (!localStorage.getItem('playerName')) localStorage.setItem('playerName', name1);
          var nameEl1 = document.getElementById('home-player-name');
          if (nameEl1) nameEl1.textContent = localStorage.getItem('playerName') || name1;
        } catch (e) {}
        hideAuth();
        // Reminder to confirm email
        setTimeout(function () {
          var toast = document.createElement('div');
          toast.textContent = t('auth_ok_confirm');
          Object.assign(toast.style, {
            position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(30,28,26,0.92)', color: 'rgba(248,247,245,0.75)',
            fontSize: '12px', padding: '10px 18px', borderRadius: '10px',
            zIndex: '999', textAlign: 'center', maxWidth: '260px', lineHeight: '1.4',
            pointerEvents: 'none', letterSpacing: '0.3px'
          });
          document.body.appendChild(toast);
          setTimeout(function () { toast.remove(); }, 4500);
        }, 600);
        return;
      }
      if (!user) throw new Error('signup_failed');

      // Successful login with active session
      var uid      = user.id;
      var rawEmail = user.email || '';
      var name     = rawEmail.split('@')[0] || t('player_default');
      try {
        localStorage.setItem('userId',    uid);
        localStorage.setItem('guestMode', 'false');
        if (!localStorage.getItem('playerName')) {
          localStorage.setItem('playerName', name);
        }
        var nameEl = document.getElementById('home-player-name');
        if (nameEl) nameEl.textContent = localStorage.getItem('playerName') || name;
      } catch (e) {}
      hideAuth();
    }).catch(function (err) {
      var msg = (err && err.message) || '';
      if (/invalid.*credentials|wrong.*password|Invalid login/i.test(msg)) {
        errEl.textContent = t('auth_err_invalid');
      } else if (/email.*not.*confirm|not.*confirm/i.test(msg)) {
        errEl.textContent = t('auth_err_not_confirmed');
      } else if (/already.*registered|User already/i.test(msg)) {
        errEl.textContent = t('auth_err_exists');
      } else if (/rate.?limit/i.test(msg)) {
        errEl.textContent = t('auth_err_rate');
      } else {
        errEl.textContent = t('auth_err_generic');
      }
      submitBtn.disabled = false;
      submitBtn.textContent = authTab === 'login' ? t('auth_submit_login') : t('auth_submit_signup');
    });
  }

  submitBtn.addEventListener('click', doEmailAuth);

  // Enter в полях формы — отправить
  [emailInput, passInput].forEach(function (el) {
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter') doEmailAuth(); });
  });

  // ── Exports ─────────────────────────────────────────────────────────────
  window.hideAuth = hideAuth;

})();
