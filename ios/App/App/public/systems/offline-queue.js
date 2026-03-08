/**
 * offline-queue.js — Offline save queue with idempotent sync
 *
 * Queues failed constellation saves in localStorage for later retry.
 * Each item gets a UUID idempotency key; sync uses Supabase upsert
 * to prevent duplicates on retry.
 *
 * Exports: window._uuid4, window._queueSkySave, window._updateQueueBadge,
 *          window._syncOfflineQueue, window._onNetworkChange
 * Dependencies: sb (Supabase client), t() (i18n), showToast(),
 *               _skyGetUserId() (sky-screen.js)
 * Load order: after Supabase init, after i18n.js, after sky-screen.js
 */
(function () {
  'use strict';

  /** Generate a simple UUID v4 for idempotency keys. */
  function _uuid4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  /** Add a failed sky save to the local queue for later sync. */
  function _queueSkySave(payload) {
    try {
      var q = JSON.parse(localStorage.getItem('sky_save_queue') || '[]');
      q.push(Object.assign({}, payload, { _ts: Date.now(), _idempotencyKey: _uuid4() }));
      localStorage.setItem('sky_save_queue', JSON.stringify(q));
      _updateQueueBadge();
    } catch(e) {}
  }

  /** Update the pending-sync badge count. */
  function _updateQueueBadge() {
    try {
      var badge = document.getElementById('offline-queue-badge');
      if (!badge) return;
      var q = JSON.parse(localStorage.getItem('sky_save_queue') || '[]');
      if (q.length > 0) {
        badge.textContent = q.length + ' ' + t('offline_queue');
        badge.style.display = 'block';
      } else {
        badge.style.display = 'none';
      }
    } catch(e) {}
  }

  /** Sync queued sky saves to Supabase one-by-one when back online. */
  function _syncOfflineQueue() {
    try {
      var q = JSON.parse(localStorage.getItem('sky_save_queue') || '[]');
      if (!q.length) return;
      var uid = _skyGetUserId();
      var remaining = [];
      var idx = 0;

      function syncNext() {
        if (idx >= q.length) {
          localStorage.setItem('sky_save_queue', JSON.stringify(remaining));
          _updateQueueBadge();
          if (remaining.length === 0) {
            showToast('\u2726 ' + t('victory_saved'));
          }
          return;
        }
        var item = q[idx++];
        var row = {
          name: item.name,
          data: item.data,
          user_id: uid || item.user_id,
          gx: item.gx || Math.random(),
          gy: item.gy || Math.random(),
          idempotency_key: item._idempotencyKey || _uuid4(),
        };
        sb.from('constellations')
          .upsert(row, { onConflict: 'idempotency_key' })
          .then(function (res) {
            if (res.error) remaining.push(item);
            syncNext();
          })
          .catch(function () {
            remaining.push(item);
            syncNext();
          });
      }
      syncNext();
    } catch(e) {}
  }

  /** Toggle the offline banner and react to network changes. */
  function _onNetworkChange(isOnline) {
    var banner = document.getElementById('offline-banner');
    if (banner) {
      banner.textContent = t('offline_banner');
      banner.classList.toggle('visible', !isOnline);
    }
    if (isOnline) {
      _syncOfflineQueue();
    }
  }

  // ── Initialization ──────────────────────────────────────────────────

  // Initialise banner text from current lang
  (function _initOfflineBanner() {
    var banner = document.getElementById('offline-banner');
    if (!banner) return;
    banner.textContent = t('offline_banner');
    if (!navigator.onLine) banner.classList.add('visible');
  })();

  // Show queue badge if there are pending saves
  _updateQueueBadge();

  // Listen for network changes
  window.addEventListener('online',  function () { _onNetworkChange(true); });
  window.addEventListener('offline', function () { _onNetworkChange(false); });

  // ── Expose on window ─────────────────────────────────────────────────
  window._uuid4              = _uuid4;
  window._queueSkySave       = _queueSkySave;
  window._updateQueueBadge   = _updateQueueBadge;
  window._syncOfflineQueue   = _syncOfflineQueue;
  window._onNetworkChange    = _onNetworkChange;

})();
