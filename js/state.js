/* ══════════════════════════════════════════
   STATE.JS — Constantes y estado global
   Todo lo que necesita ser compartido entre módulos vive aquí.
   ══════════════════════════════════════════ */

// ── Canvas / campo ──────────────────────────
const FIELD_IN  = 144;
const TILE_IN   = 24;
const SCALE     = 4;          // px por inch en el canvas base (sin zoom)
const SIZE_PX   = FIELD_IN * SCALE;  // 576px
const COLS      = 'ABCDEF';

// Pan / zoom
let zoom = 1, panX = 0, panY = 0;
const ZOOM_MIN  = 1;
const ZOOM_MAX  = 10;
const ZOOM_STEP = 0.12;

// Tooltip / snap
let snapVertex     = null;
const TOOLTIP_DELAY = 900;
const ANIM_DUR      = 260;
let hoverTimer = null, tooltipVisible = false,
    animStart  = null, animProgress   = 0, rafId = null;

// ── Robot ────────────────────────────────────
/** Posición del punto de origen del robot en pulgadas (float) */
let robotPos = { x: 0, y: 0 };

// ── Game blocks ──────────────────────────────
/**
 * Bloque de juego:
 * { uid, color:'red'|'blue',
 *   place:'field'|'intake'|'storage'|'holding'|'longgoal'|'lowergoal'|'uppergoal',
 *   location:{x,y} | null }
 */
const DEFAULT_BLOCKS = [
  {uid:"d0",  color:"red",  place:"field", location:{x:48,  y:48}},
  {uid:"d1",  color:"red",  place:"field", location:{x:48,  y:51}},
  {uid:"d2",  color:"red",  place:"field", location:{x:51,  y:48}},
  {uid:"d3",  color:"red",  place:"field", location:{x:96,  y:48}},
  {uid:"d4",  color:"red",  place:"field", location:{x:93,  y:48}},
  {uid:"d5",  color:"red",  place:"field", location:{x:96,  y:51}},
  {uid:"d6",  color:"blue", place:"field", location:{x:2,   y:23}},
  {uid:"d7",  color:"blue", place:"field", location:{x:2,   y:26}},
  {uid:"d8",  color:"blue", place:"field", location:{x:143, y:23}},
  {uid:"d9",  color:"blue", place:"field", location:{x:143, y:26}},
  {uid:"d10", color:"red",  place:"field", location:{x:25,  y:71}},
  {uid:"d11", color:"red",  place:"field", location:{x:25,  y:68}},
  {uid:"d12", color:"red",  place:"field", location:{x:119, y:71}},
  {uid:"d13", color:"red",  place:"field", location:{x:119, y:68}},
  {uid:"d14", color:"blue", place:"field", location:{x:25,  y:74}},
  {uid:"d15", color:"blue", place:"field", location:{x:25,  y:77}},
  {uid:"d16", color:"blue", place:"field", location:{x:119, y:74}},
  {uid:"d17", color:"blue", place:"field", location:{x:119, y:77}},
  {uid:"d18", color:"blue", place:"field", location:{x:96,  y:96}},
  {uid:"d19", color:"blue", place:"field", location:{x:96,  y:93}},
  {uid:"d20", color:"blue", place:"field", location:{x:93,  y:96}},
  {uid:"d21", color:"blue", place:"field", location:{x:48,  y:96}},
  {uid:"d22", color:"blue", place:"field", location:{x:48,  y:93}},
  {uid:"d23", color:"blue", place:"field", location:{x:51,  y:96}},
  {uid:"d24", color:"red",  place:"field", location:{x:2,   y:118}},
  {uid:"d25", color:"red",  place:"field", location:{x:2,   y:121}},
  {uid:"d26", color:"red",  place:"field", location:{x:142, y:118}},
  {uid:"d27", color:"red",  place:"field", location:{x:142, y:121}},
];
function deepCloneDefaults(){
  return DEFAULT_BLOCKS.map(b => ({ ...b, location: { ...b.location } }));
}
let fieldBlocks = deepCloneDefaults();

// ── Loaders ──────────────────────────────────
/**
 * Loader: { uid, x, y, slots:[null|'red'|'blue' ×6] }
 * slots[0] = posición de abajo, slots[5] = arriba
 */
let loaders = [];

const LOADER_W_IN  = 6;
const LOADER_H_IN  = 5.5;
const LOADER_SLOTS = 6;

// ── Code / templates ─────────────────────────
/** codeTemplates[defId] = string con {variables} */
let codeTemplates = {};
/** customDefs: [{uid, label, args:[{id,opt}], template}] */
let customDefs    = [];

// ── Misc ─────────────────────────────────────
let saveTimer = null;
