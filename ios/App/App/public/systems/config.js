/**
 * config.js — Application configuration
 *
 * Centralizes environment-specific settings (Supabase credentials, etc.)
 * so they are not hardcoded in index.html.
 *
 * Exports: window.APP_CONFIG
 * Dependencies: none
 * Load order: before Supabase SDK / before all other systems
 */
(function () {
  'use strict';
  window.APP_CONFIG = {
    SUPABASE_URL: 'https://kugqznwvdfgojofflbgi.supabase.co',
    SUPABASE_KEY: 'sb_publishable_c6myYVMYUvy0JreXsk0mCQ_AIzK8w4E'
  };
})();
