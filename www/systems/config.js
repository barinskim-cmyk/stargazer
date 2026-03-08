/**
 * config.js — Application configuration
 *
 * Centralizes environment-specific settings (Supabase credentials, etc.)
 * so they are not hardcoded in index.html.
 *
 * Exports: window.APP_CONFIG
 * Dependencies: none
 * Load order: before Supabase SDK / before all other systems
 *
 * ── Supabase RLS requirements ──────────────────────────────────────────
 * The key below is a PUBLISHABLE (anon) key — safe for client-side code.
 * All data protection MUST be enforced by Row Level Security (RLS) on
 * the Supabase side. Required policies:
 *
 * TABLE: constellations
 *   - SELECT: allow all (public sky is viewable by anyone)
 *   - INSERT: allow where auth.uid() = user_id
 *   - UPDATE: allow where auth.uid() = user_id
 *   - DELETE: deny (constellations are immutable once published)
 *   - UNIQUE constraint on idempotency_key (for upsert dedup)
 *
 * TABLE: profiles
 *   - SELECT: allow all (public leaderboard)
 *   - INSERT: allow where auth.uid() = user_id
 *   - UPDATE: allow where auth.uid() = user_id
 *   - DELETE: deny
 */
(function () {
  'use strict';
  window.APP_CONFIG = {
    SUPABASE_URL: 'https://kugqznwvdfgojofflbgi.supabase.co',
    SUPABASE_KEY: 'sb_publishable_c6myYVMYUvy0JreXsk0mCQ_AIzK8w4E'
  };
})();
