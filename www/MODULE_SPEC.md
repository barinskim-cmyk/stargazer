# Stargazer Module Specification

Architecture reference for the modular structure of Stargazer (iOS Capacitor game).

**Date:** March 2026
**Total modules:** 21 (4 systems + 7 engines + 10 screens)
**index.html:** 4,247 lines (HTML/CSS + game core logic)
**Total extracted:** ~7,220 lines across 21 modules

---

## Architecture Overview

```
www/
  index.html              — HTML, CSS, canvas init, game loop, pointer handlers
  systems/                — Infrastructure (load first)
    config.js             — Supabase URL/key, environment config
    layout-config.js      — DPR, canvas sizing
    i18n.js               — Translations, language switching
    progression.js        — Ranks, achievements, save/load
  engines/                — Game logic & rendering (load second)
    star-renderer.js      — Star/emblem drawing, twinkle loops
    line-renderer.js      — Line birth animation
    themes.js             — Theme definitions, theme switching
    victory-renderer.js   — Victory screen constellation rendering
    game-engine.js        — Move validation, scoring, game state
    stargazer-ai.js       — AI opponent, hints, win probability
    sky-screen.js         — Sky (shared constellation sky)
  screens/                — UI screens (load third, after Supabase init)
    settings-screen.js    — Sound, vibration, themes, language
    profile-screen.js     — Player profile, avatar, leaderboard
    auth-screen.js        — Email auth, guest mode, session restore
    tutorial-screen.js    — Interactive 7-phase tutorial
    sky-hub-screen.js     — Navigation hub (Journey / Sky)
    achievements-screen.js— Achievement constellations, rank display
    journey-screen.js     — Saved constellations grid
    constellation-detail.js — Detail view, rename, delete, publish, share
    home-screen.js        — Home screen, bg animation, play button
```

---

## Script Load Order

```html
<!-- 1. Early init (inline) — haptic(), showToast(), _appSettings -->
<script> ... </script>

<!-- 2. Supabase SDK -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>

<!-- 3. Systems -->
<script src="systems/layout-config.js"></script>
<script src="systems/i18n.js"></script>
<script src="systems/progression.js"></script>
<script src="systems/config.js"></script>

<!-- 4. Engines -->
<script src="engines/star-renderer.js"></script>
<script src="engines/line-renderer.js"></script>
<script src="engines/themes.js"></script>
<script src="engines/victory-renderer.js"></script>
<script src="engines/game-engine.js"></script>
<script src="engines/stargazer-ai.js"></script>
<script src="engines/sky-screen.js"></script>

<!-- 5. Shared globals (inline, before screens) -->
<script>
  var sb = supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_KEY);
  var _proceedFromAuth = null;
</script>

<!-- 6. Screens -->
<script src="screens/settings-screen.js"></script>
<script src="screens/profile-screen.js"></script>
<script src="screens/auth-screen.js"></script>
<script src="screens/tutorial-screen.js"></script>
<script src="screens/sky-hub-screen.js"></script>
<script src="screens/achievements-screen.js"></script>
<script src="screens/journey-screen.js"></script>
<script src="screens/constellation-detail.js"></script>
<script src="screens/home-screen.js"></script>

<!-- 7. Main game script (inline) — canvas, draw(), startGame(), touch events -->
<script> ... </script>
```

---

## Module Pattern

All modules use the IIFE pattern with `window.*` exports:

```javascript
(function () {
  'use strict';
  // ... private code ...
  window.exportedFunction = exportedFunction;
})();
```

**Key rules:**
- `var` (not `let`/`const`) for any variable that must be cross-script accessible
- `function` declarations inside `<script>` blocks are global; `let`/`const` are NOT
- Arrow functions are fine inside IIFEs (strict mode compatible)
- No ES modules, no bundler — plain script tags
- Exports go on `window.*` for backward compatibility

---

## Module Details

### systems/config.js (17 lines)

Application configuration: Supabase credentials and environment settings.

| Export | Description |
|--------|-------------|
| `APP_CONFIG.SUPABASE_URL` | Supabase project URL |
| `APP_CONFIG.SUPABASE_KEY` | Supabase publishable anon key |

**Dependencies:** none
**Load-time side effects:** none

---

### systems/layout-config.js (189 lines)

Canvas sizing utilities and DPR management.

| Export | Description |
|--------|-------------|
| `LC.dpr()` | Current device pixel ratio |
| `LC.setupCanvas(cv, w, h)` | Size canvas with DPR + set transform. Returns ctx |
| `LC.sizeCanvas(cv, w, h)` | Size canvas physically only (no transform) |
| `LC.canvasW()` / `LC.canvasH()` | Main canvas CSS dimensions |

**Dependencies:** none
**Load-time side effects:** none

---

### systems/i18n.js (732 lines)

Internationalization: all UI strings in `en` and `ru`.

| Export | Description |
|--------|-------------|
| `t(key)` | Get translated string for current language |
| `_lang` | Current language code (`'en'` or `'ru'`) |
| `_applyLang()` | Apply language to all `[data-i18n]` elements |
| `_updateLangBtns()` | Sync language picker button states |
| `getRankName(rank)` | Localized rank name |
| `getAchI18n(achId)` | Localized achievement name + description |
| `_constName(n)` | Localized constellation name |
| `_refreshLevelNames()` | Update AI level display names |
| `STRINGS` | All string dictionaries |
| `LEVEL_NAMES` | AI level names array |
| `AI_LEVEL_I18N` | AI level i18n data |
| `RANK_NAMES_I18N` | Rank name i18n data |
| `ACHIEVEMENT_I18N` | Achievement i18n data |
| `CONSTELLATION_RU` | Russian constellation translations |

**Dependencies:** `_lang` (reads `localStorage`)
**Load-time side effects:** sets `_lang` from localStorage

---

### systems/progression.js (261 lines)

Rank/achievement system, save/load progress.

| Export | Description |
|--------|-------------|
| `RANKS` | Rank definitions array |
| `RANK_THRESHOLDS` | Rating thresholds per rank |
| `ACHIEVEMENTS` | Achievement definitions |
| `loadProgress()` | Load player progress from localStorage |
| `saveProgress(p)` | Save player progress |
| `computeRank(rating)` | Calculate rank info from rating |
| `computeGamePoints(...)` | Calculate points earned from a game |
| `progressionUpdate(...)` | Full post-game progression update |
| `checkAchievements(p)` | Check and award achievements |
| `getFavouriteTheme()` | Most-used theme |

**Dependencies:** none
**Load-time side effects:** none

---

### engines/star-renderer.js (424 lines)

Star drawing, twinkle animation, rank emblems, mini constellation renderer.

| Export | Description |
|--------|-------------|
| `drawStarPoint(px, py, ...)` | Draw star on main canvas |
| `drawStarPointTo(ctx, px, py, ...)` | Draw star on any canvas |
| `getTwinkleBoost(i)` | Get twinkle animation value for star i |
| `startTwinkleLoop()` | Start idle twinkle RAF loop |
| `startGameTwinkleLoop()` | Start in-game twinkle RAF loop |
| `drawRankEmblem(rank, x, y)` | Draw rank emblem on main canvas |
| `drawRankEmblemOnCtx(ctx, rank, x, y)` | Draw rank emblem on any canvas |
| `drawMiniConstellation(cv, data)` | Draw thumbnail constellation |
| `RANK_EMBLEMS` | Emblem definitions |

**Dependencies:** `LC`, `RADIUS`, `canvas`, `ctx`, `W`, `H`, `window._appSettings`
**Load-time side effects:** none

---

### engines/line-renderer.js (95 lines)

Line connection birth animation (scale-in effect).

| Export | Description |
|--------|-------------|
| `_pointBirthScale(i)` | Get birth animation scale for point i |
| `_startBirthAnim(ptIdx)` | Start birth animation for a point |
| `_startLineAnimLoop()` | Start line animation RAF loop |

**Dependencies:** `_lineAnimating`, `_lineAnim`, `_lineAnimRaf` (game state)
**Load-time side effects:** none

---

### engines/themes.js (466 lines)

Theme definitions (Stargazer, Minimal, Suprematist, Chalk) and switching logic.

| Export | Description |
|--------|-------------|
| `THEMES` | Theme definitions object |
| `activeTheme` | Current theme name |
| `applyTheme(name)` | Switch theme, update CSS vars, redraw |
| `CHALK_RAINBOW` / `CHALK_FILL` | Chalk theme colors |
| `drawChalkPaperBg(ctx, w, h)` | Draw chalk paper texture |
| `drawChalkSpiral(ctx, ...)` | Draw chalk spiral |
| `drawChalkLine(ctx, ...)` | Draw chalk-style line |
| `drawChalkDot(ctx, ...)` | Draw chalk-style dot |
| `regenerateGrain()` / `drawGrainOverlay(ctx)` | Film grain effect |
| `startChalkAnim()` | Start chalk animation RAF |

**Dependencies:** `LC`, `canvas`, `ctx`, `W`, `H`, `window.draw()`, `window._appSettings`, `window._skyBgCacheRef`
**Load-time side effects:** reads activeTheme from localStorage, applies CSS variables

---

### engines/victory-renderer.js (471 lines)

Post-game constellation rendering per theme.

| Export | Description |
|--------|-------------|
| `defaultDrawVictory(ctx, data)` | Stargazer theme victory |
| `drawVictoryMinimal(ctx, data)` | Minimal theme victory |
| `generateSupLayout(data)` | Suprematist layout generator |
| `drawVictorySuprematist(ctx, data)` | Suprematist theme victory |
| `drawVictoryChalk(ctx, data)` | Chalk theme victory |

**Dependencies:** `THEMES`, `activeTheme`, `drawStarPointTo`, `RADIUS`, `LC`, chalk drawing functions
**Load-time side effects:** none

---

### engines/game-engine.js (412 lines)

Core game logic: move validation, scoring, polygon detection, game-over check.

| Export | Description |
|--------|-------------|
| `lineKey(a, b)` | Canonical edge key string |
| `validate(a, b)` | Validate a move |
| `checkScore(a, b, player)` | Check if move scores |
| `moveWouldScore(a, b, player)` | Preview scoring |
| `isGameOver()` | Check if game is over |
| `resetGameState()` | Reset all game state |
| `resolveGame()` | Resolve final game result |
| `pointInPolygon(...)` | Point-in-polygon test |
| `polygonArea(...)` | Polygon area calculation |
| `findPaths(...)` | Find cycles in graph |
| ... | (+ several utility functions) |

**Dependencies:** `points`, `lines`, `polygons`, `scores`, `turn`, `COUNT` (game state)
**Load-time side effects:** none

---

### engines/stargazer-ai.js (358 lines)

AI opponent with difficulty scaling, move scoring, hints, win probability estimation.

| Export | Description |
|--------|-------------|
| `rankToAiLevel()` | Map player rank to AI difficulty |
| `scoreMove(a, b, player, level)` | Score a potential move |
| `makeAIMove()` | Execute AI turn |
| `computeHints()` | Calculate hint edges |
| `estimateWinProbability()` | Current win probability |
| `givesOpponentScore(a, b, pl)` | Check if move gives opponent score |
| `countPromisingPairs(pl)` | Count promising moves |
| `chainScore(a, b, pl)` / `opponentChainScore(a, b, pl)` | Chain scoring |

**Dependencies:** `points`, `lines`, `scores`, `turn`, `COUNT`, `stargazerLevel`, `validate`, `checkScore`, `moveWouldScore`, `isGameOver`
**Load-time side effects:** none

---

### engines/sky-screen.js (916 lines)

Shared sky: constellation browsing, realtime Supabase subscription, pan/zoom.

| Export | Description |
|--------|-------------|
| `openSkyScreen()` / `_skyClose()` | Open/close sky screen |
| `_skyGetUserId()` | Get current user ID |
| `_skyEnsureBg()` | Ensure background stars are generated |
| `_skyHash(str)` | Deterministic hash for positioning |
| `_SKY_WORLD` | Sky world size constant |
| `_skyBgCacheRef` | Background star cache (for theme changes) |
| `_skyShowOfflineUI()` / `_skyFindMine()` | Offline/filter helpers |

**Dependencies:** `sb`, `LC`, `THEMES`, `activeTheme`, `drawStarPointTo`, `RADIUS`, `t`, `REAL_CONSTELLATIONS`, `_constName`
**Load-time side effects:** none

---

### screens/settings-screen.js (110 lines)

Settings toggles: sound, vibration, star glow mode, theme picker, language picker.

| Export | Description |
|--------|-------------|
| `openSettingsScreen()` | Open settings overlay |
| `_saveSettings()` | Persist settings to localStorage |
| `_applySettingsUI()` | Sync UI toggles with current settings |
| `_updateLangBtns()` | Update language button states |

**Dependencies:** `window._appSettings`, `activeTheme`, `applyTheme()`, `_lang`, `_applyLang()`, `showHomeScreen()`
**Load-time side effects:** registers event listeners on settings DOM elements

---

### screens/profile-screen.js (289 lines)

Player profile: stats, name editing, avatar (emoji + photo), leaderboard rank.

| Export | Description |
|--------|-------------|
| `openProfileScreen()` | Open profile overlay |
| `closeProfileScreen()` | Close profile overlay |
| `_refreshProfileAvatar()` | Update avatar display |

**Dependencies:** `sb`, `loadProgress()`, `computeRank()`, `t()`, `_skyGetUserId()`, `showHomeScreen()`, `openAchievementsScreen()`, `closeAchievementsScreen()`
**Load-time side effects:** registers event listeners

---

### screens/auth-screen.js (252 lines)

Supabase email authentication, guest mode, session restore at startup.

| Export | Description |
|--------|-------------|
| `hideAuth()` | Hide auth screen |

**Dependencies:** `sb`, `showHomeScreen()`, `t()`, `_proceedFromAuth`
**Load-time side effects:** calls `sb.auth.getSession()` immediately; restores session or shows auth UI

---

### screens/tutorial-screen.js (312 lines)

Interactive 7-phase canvas tutorial with 4 stars and simulated AI opponent.

| Export | Description |
|--------|-------------|
| `showTutorial()` | Start tutorial |
| `_checkAndShowTutorial()` | Check if tutorial needed, show home if not |

**Dependencies:** `t()`, `showHomeScreen()`, `loadProgress()`, `_skyGetUserId()`, `sb`, `isAI`, `COUNT`, `startGame()`
**Load-time side effects:** sets `_proceedFromAuth = _checkAndShowTutorial`

---

### screens/sky-hub-screen.js (40 lines)

Navigation hub with buttons for Journey and Sky screens.

| Export | Description |
|--------|-------------|
| `openSkyHub()` | Open hub overlay |
| `closeSkyHub()` | Close hub, return to home |

**Dependencies:** `_stopHomeBgAnim()`, `showHomeScreen()`, `openJourneyScreen()`, `openSkyScreen()`
**Load-time side effects:** registers nav button click handlers

---

### screens/achievements-screen.js (263 lines)

Achievement constellation display with animated rank emblem.

| Export | Description |
|--------|-------------|
| `openAchievementsScreen()` | Open achievements overlay |
| `closeAchievementsScreen()` | Close achievements overlay |
| `ACH_CONSTELLATIONS` | Per-category star layout data |

**Dependencies:** `LC.sizeCanvas()`, `loadProgress()`, `computeRank()`, `ACHIEVEMENTS`, `drawStarPointTo()`, `drawRankEmblemOnCtx()`, `getRankName()`, `getAchI18n()`, `t()`, `RADIUS`
**Load-time side effects:** registers event listeners

---

### screens/journey-screen.js (113 lines)

Grid of saved constellation thumbnails with tap-to-detail navigation.

| Export | Description |
|--------|-------------|
| `openJourneyScreen(returnTo)` | Open journey grid |
| `closeJourneyScreen()` | Close with returnTo navigation |
| `_loadSaved()` | Load saved constellations from localStorage |
| `_persistSaved(arr)` | Save constellations to localStorage |
| `_constellationAddress(name)` | Generate sky address from name |
| `_renderJourneyGrid()` | Render/refresh the grid |

**Dependencies:** `t()`, `_skyHash()`, `_SKY_WORLD`, `openConstDetail()`, `drawMiniConstellation()`, `_startHomeBgAnim()`
**Load-time side effects:** none

---

### screens/constellation-detail.js (581 lines)

Detail view: canvas rendering with twinkle animation, rename, delete, publish to sky, share PNG.

| Export | Description |
|--------|-------------|
| `openConstDetail(item, idx)` | Open detail for saved constellation |
| `closeConstDetail()` | Close detail overlay |

**Dependencies:** `LC`, `RADIUS`, `drawStarPointTo()`, `THEMES`, `activeTheme`, `_skyGetUserId()`, `_skyEnsureBg()`, `_SKY_WORLD`, `_bgStars`, `_drawSkyStar()`, `_loadSaved()`, `_persistSaved()`, `_constellationAddress()`, `_renderJourneyGrid()`, `sb`, `t()`, `playSound()`, `haptic()`, `showToast()`
**Load-time side effects:** registers event listeners for back, delete, rename, publish, share buttons

---

### screens/home-screen.js (888 lines)

Home screen: background constellation animation with swipe transitions, play button, length picker, nav icons.

| Export | Description |
|--------|-------------|
| `showHomeScreen()` | Show home screen, populate player data |
| `_startHomeBgAnim()` | Start background constellation animation |
| `_stopHomeBgAnim()` | Stop background animation |
| `_constName(n)` | Localized constellation name (also in i18n.js) |
| `REAL_CONSTELLATIONS` | 88 IAU constellation data |
| `CONSTELLATION_RU` | Russian constellation translations |

**Dependencies:** `LC`, `drawStarPointTo()`, `RADIUS`, `loadProgress()`, `t()`, `openSettingsScreen()`, `openProfileScreen()`, `rankToAiLevel()`, `startGame()`, `_lang`, `COUNT`, `isAI`, `playerNames`, `stargazerLevel`
**Load-time side effects:** registers home screen button handlers, draws nav icons, builds length picker

---

## Remaining in index.html (4,228 lines)

Content that stays in index.html due to tight coupling with game canvas state:

| Section | Lines | Why not extracted |
|---------|-------|-------------------|
| HTML structure | ~1,930 | DOM elements for all screens |
| CSS styles | ~1,050 | All styling including media queries |
| Early init (haptic, toast, settings) | ~40 | Must run before everything |
| Start screen (showStep, mode picker) | ~80 | Coupled to game config vars |
| Canvas init + resizeCanvas | ~80 | Direct canvas/ctx manipulation |
| Sound system (playSound) | ~60 | Web Audio context |
| Game loop (draw, applyMove, touch) | ~580 | Core game state: points, lines, ctx |
| Tutorial overlay (in-game) | ~120 | Uses ctx, W, H directly |
| Hints system | ~70 | Game state + RAF |
| Win effect + endGame + finishEndGame | ~130 | Canvas + game state |
| Victory duel renderer | ~220 | ctx, W, H, points, lines |
| Rank-up ceremony | ~70 | ctx, W, H, drawRankEmblem |
| goToMenu | ~35 | Cancels all game RAFs |
| Save animations (_drawSkyStar, saveToSkyAnimation) | ~230 | canvas, points, lines |
| Victory button handlers + auto-save | ~90 | Game state |
| Auth/tutorial init calls | ~10 | Startup sequence |
| Offline queue system | ~80 | sb, queue sync |

### Recent refactoring (March 2026)

- **Touch DPR fix:** `touchstart` now uses CSS-space coordinates (same as click handler), fixing hover misalignment on Retina displays
- **Unified applyMove:** Click handler delegates to `applyMove()` instead of duplicating its logic. AI trigger (`setTimeout(makeAIMove, 800)`) moved into `applyMove()` — single source of truth for all move application (human + AI)
- **resetGameState():** `startGame()` calls `resetGameState()` from game-engine.js instead of manual 11-line duplicate reset
- **Dead code removed:** `drawProbBar()` (70 lines, never called), `_probBarRaf` (always null). Probability bar uses DOM element with CSS transition only

### Quality refactoring round 2 (March 2026)

- **Minimal UI CSS:** Replaced global `display: none !important` with scoped `body.minimal-ui` class — no more `!important`, elements only hidden when class is present
- **i18n cleanup:** Removed duplicate `LEVEL_NAMES` / `_refreshLevelNames()` from index.html (already provided by i18n.js)
- **Idempotent offline queue:** Each queued save gets a UUID `_idempotencyKey`; `_syncOfflineQueue()` now syncs per-item via `upsert(onConflict: 'idempotency_key')` — no duplicates on retry
- **RANKS/ACHIEVEMENTS cleanup:** Removed hardcoded Russian `name`/`label`/`desc` fields from progression.js — only `id`, `cat`, `threshold` remain; display names come from i18n.js
- **ResizeObserver:** Canvas resize uses `ResizeObserver` on `#canvas-area` (falls back to `window.resize` if unavailable), eliminating most `setTimeout(resizeCanvas)` hacks
- **Pointer Events:** Replaced separate `mousemove`/`touchstart`/`touchend` handlers with unified `pointermove`/`pointerleave`/`pointerup`
- **CSS/audio fixes:** Scoped `* { max-width }` to specific elements; fixed oscillator leak in `playSound()` for victory/twinkle types
- **Supabase RLS:** Documented required Row Level Security policies in config.js
- **Config extracted:** Supabase URL/key moved from inline `<script>` to `systems/config.js`

---

## Dependency Graph (simplified)

```
config ─────────────────────────────────────────┐
layout-config ──────────────────────────────────┤
i18n ───────────────────────────────────────────┤
progression ────────────────────────────────────┤
                                                ▼
star-renderer ← themes ← victory-renderer       │
line-renderer                                    │
game-engine ← stargazer-ai                       │
sky-screen                                       │
                                                 ▼
        ┌── settings-screen                      │
        ├── profile-screen                       │
        ├── auth-screen                          │
        ├── tutorial-screen ──┐                  │
        ├── sky-hub-screen    │                  │
        ├── achievements-screen                  │
        ├── journey-screen ───┤                  │
        ├── constellation-detail                 │
        └── home-screen ──────┘                  │
                                                 ▼
                                          index.html
                                       (game core loop)
```

---

## Cross-Module Communication

All inter-module communication happens through `window.*` globals. There is no event bus or pub/sub system.

**Pattern:** Module A calls `window.functionFromB()` directly. This works because all function calls happen from event handlers or animation frames (not at load time), by which point all scripts have loaded.

**Exception:** `auth-screen.js` calls `sb.auth.getSession()` at load time. This is why `var sb` must be declared in an earlier `<script>` block.

**Exception:** `tutorial-screen.js` assigns `_proceedFromAuth = _checkAndShowTutorial` at load time. This is why `var _proceedFromAuth` must be declared in an earlier `<script>` block.
