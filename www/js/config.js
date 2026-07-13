// ── CONFIG ────────────────────────────────────────────────────────────────
const CONFIG = {
  // ── GAME ──────────────────────────────────────────────────────────────────
  strokeMode:      'forward',    // 'forward'|'reverse'|'random'|'dual-alt'|'dual-pair'|'all'
  canvasEffect:    'none',      // 'none' | 'rotate' | 'zoom-in' | 'zoom-out'
  drawTime:        15,           // seconds for stroke animation
  guessTime:       25,           // seconds to guess
  showHint:        false,        // reveal first letter when hintTime seconds remain
  hintTime:        10,           // seconds remaining when first hint appears
  hint2Time:       5,            // seconds remaining when second letter reveals

  // ── THEME ─────────────────────────────────────────────────────────────────
  theme:           'dark',       // 'light' | 'dark' | 'sepia' | 'ocean' | 'forest'

  // ── VISUALS ───────────────────────────────────────────────────────────────
  strokeWidth:     3,            // canvas + SVG stroke width in pixels
  frameStyle:      'classic',    // 'none' | 'simple' | 'classic'
  brokenTilt:      'alternate',  // 'left' | 'right' | 'alternate' | 'random'
  canvasMin:       180,          // minimum canvas size in px
  canvasMax:       380,          // maximum canvas size in px

  // ── BEHAVIOUR ─────────────────────────────────────────────────────────────
  autoNextDelay:   0,            // auto-advance after result in seconds (0 = off)
  maxWrongGuesses: 0,            // skip after N wrong guesses (0 = unlimited)
  seed:            20250513,     // shuffle seed — same value = same order for all users
  showMillis:      false,        // show centiseconds (SS.cc) in timer

  // ── DAILY PUZZLE ──────────────────────────────────────────────────────────
  startDate:       '2026-07-01', // day-0 date (YYYY-MM-DD)
  gamesPerDay:     1,            // drawings per day

  // ── SUGGESTIONS ───────────────────────────────────────────────────────────
  showThread:      true,         // show hanging threads
  showNail:        true,         // show nail head
  showSwing:       true,         // animate frame swing
  showSuggestions: true,         // show word suggestions while typing
  suggMinLen:      3,            // min chars typed before showing suggestions
  suggCount:       3,            // max suggestion chips to show

  // ── LEVEL MAP ─────────────────────────────────────────────────────────────
  mapThemeColor:   true,        // true = solid theme color bg instead of gradient
  mapNodeColor:    'theme',     // 'theme' = game theme color, 'section' = per-category color, '#hex' = fixed
  mapShowDoodles:  true,         // show background doodle art on level map
  mapDoodleAnim:   false,        // animate (float) doodles on level map

  // ── SOUNDS ────────────────────────────────────────────────────────────────
  sounds:          'full',      // 'off' | 'minimal' | 'full'

  // ── MIC ───────────────────────────────────────────────────────────────────
  mic:             true,        // false = hide mic feature entirely
};

// ── THEME NODE COLORS ─────────────────────────────────────────────────────
const THEME_NODE_COLORS = {
  light:  '#ff6d00',
  dark:   '#7c4dff',
  sepia:  '#bf8040',
  ocean:  '#00e5ff',
  forest: '#00e676',
};

// ── THEME PATH COLORS ─────────────────────────────────────────────────────
const THEME_PATH_COLORS = {
  light:  '#b75a0a', // dirt road
  dark:   '#6a5a8a', // dark stone
  sepia:  '#8a6030', // aged cobblestone
  ocean:  '#1a7090', // water channel
  forest: '#4a7030', // mossy trail
};

// ── LEVEL MAP ─────────────────────────────────────────────────────────────
const MAP_LEVELS_PER_SECTION = 12;   // drawings per category per lap
const MAP_UNLOCK_PCT         = 0.70; // fraction of section to complete to unlock next

// ── WORLD ORDER (kid-friendly, easy → hard) ───────────────────────────────
const WORLD_ORDER = [
  'animals','food','vehicles','sports','nature',
  'household','body','clothing','kitchen','buildings',
  'music','tools','accessories','office','people',
  'weather','space','ocean','emotions','misc'
];

// ── WORLD THEMES (background color + emoji per category) ──────────────────
const WORLD_THEMES = {
  animals:     { color: '#00e5ff', emoji: '🐾' },
  food:        { color: '#ff6d00', emoji: '🍕' },
  vehicles:    { color: '#2979ff', emoji: '🚗' },
  sports:      { color: '#ff1744', emoji: '⚽' },
  nature:      { color: '#00e676', emoji: '🌿' },
  household:   { color: '#d500f9', emoji: '🏠' },
  body:        { color: '#ff4081', emoji: '💪' },
  clothing:    { color: '#651fff', emoji: '👕' },
  kitchen:     { color: '#ff9100', emoji: '🍳' },
  buildings:   { color: '#bcaaa4', emoji: '🏛' },
  music:       { color: '#7c4dff', emoji: '🎵' },
  tools:       { color: '#78909c', emoji: '🔧' },
  accessories: { color: '#ffd740', emoji: '💎' },
  office:      { color: '#69f0ae', emoji: '📋' },
  people:      { color: '#ff80ab', emoji: '👤' },
  weather:     { color: '#40c4ff', emoji: '🌤' },
  space:       { color: '#7986cb', emoji: '🚀' },
  ocean:       { color: '#00acc1', emoji: '🌊' },
  emotions:    { color: '#ffca28', emoji: '😊' },
  misc:        { color: '#b0bec5', emoji: '⭐' },
};
