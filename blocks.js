/* ══════════════════════════════════════════
   BLOCKS.JS — Bloques de juego en el campo
   ══════════════════════════════════════════ */

// ── Geometry constants ───────────────────────
const BLOCK_SIZE_IN = 3.25;           // flat-to-flat (diámetro de círculo inscrito)
const BLOCK_APOTHEM = BLOCK_SIZE_IN / 2;
const BLOCK_SIDES   = 18;
const BLOCK_R_IN    = BLOCK_APOTHEM / Math.cos(Math.PI / BLOCK_SIDES); // circumradius ≈ 1.650 in
const BLOCK_HIT_PX  = 10;            // radio de hit extra en screen px

// ── Images ───────────────────────────────────
const imgRed  = new Image(); imgRed.src  = 'block_red.png';
const imgBlue = new Image(); imgBlue.src = 'block_blue.png';
imgRed.onload = imgBlue.onload = () => render();

// ── Draw helpers ─────────────────────────────
function drawPoly18(cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < BLOCK_SIDES; i++) {
    const a = (i / BLOCK_SIDES) * Math.PI * 2 - Math.PI / 2;
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawFieldBlocks() {
  fieldBlocks.filter(b => b.place === 'field' && b.location).forEach(b => {
    const sx  = panX + b.location.x * SCALE * zoom;
    const sy  = panY + b.location.y * SCALE * zoom;
    const rpx = BLOCK_R_IN    * SCALE * zoom;
    const dpx = BLOCK_SIZE_IN * SCALE * zoom;
    const img = b.color === 'red' ? imgRed : imgBlue;

    ctx.save();
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, sx-dpx/2, sy-dpx/2, dpx, dpx);
    } else {
      ctx.fillStyle   = b.color === 'red' ? 'rgba(255,80,80,.85)' : 'rgba(60,130,255,.85)';
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.2;
      drawPoly18(sx, sy, rpx); ctx.fill(); ctx.stroke();
    }
    // Selection ring
    if (editingBlock && editingBlock.uid === b.uid) {
      ctx.strokeStyle = 'rgba(253,121,168,.9)'; ctx.lineWidth = 2;
      drawPoly18(sx, sy, rpx + 3); ctx.stroke();
    }
    ctx.restore();
  });
}

function blockAtScreen(sx, sy) {
  const onField = fieldBlocks.filter(b => b.place === 'field' && b.location);
  for (let i = onField.length - 1; i >= 0; i--) {
    const b   = onField[i];
    const bsx = panX + b.location.x * SCALE * zoom;
    const bsy = panY + b.location.y * SCALE * zoom;
    if (Math.hypot(sx - bsx, sy - bsy) <= BLOCK_R_IN * SCALE * zoom + BLOCK_HIT_PX) return b;
  }
  return null;
}

// ── Block context menu ────────────────────────
let editingBlock    = null;
let pickingLocation = false;

const blkMenu       = document.getElementById('blk-menu');
const blkMenuTitle  = document.getElementById('blk-menu-title');
const blkLocSection = document.getElementById('blk-loc-section');
const blkLocVal     = document.getElementById('blk-loc-val');
const blkPickBtn    = document.getElementById('blk-pick-btn');
const pickBanner    = document.getElementById('pick-banner');

function openBlkMenu(block, screenX, screenY) {
  editingBlock    = block;
  pickingLocation = false;
  blkPickBtn.classList.remove('picking');
  pickBanner.classList.remove('active');
  blkMenuTitle.textContent = `Bloque · ${block.color === 'red' ? '🔴' : '🔵'} ${block.color}`;
  document.querySelectorAll('.blk-color-btn').forEach(b =>
    b.classList.toggle('sel', b.dataset.color === block.color));
  document.querySelectorAll('.blk-place-btn').forEach(b =>
    b.classList.toggle('sel', b.dataset.place === block.place));
  blkLocSection.style.display = block.place === 'field' ? '' : 'none';
  blkLocVal.textContent = block.location
    ? `(${block.location.x}, ${block.location.y}) in` : '—';

  positionMenu(blkMenu, screenX, screenY, 230, 300);
  blkMenu.classList.add('open');
  closeCtxMenu(); closeLdrMenu();
  render();
}

function closeBlkMenu() {
  blkMenu.classList.remove('open');
  editingBlock    = null;
  pickingLocation = false;
  blkPickBtn.classList.remove('picking');
  pickBanner.classList.remove('active');
  render();
}

// ── Block menu events ─────────────────────────
document.querySelectorAll('.blk-color-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!editingBlock) return;
    editingBlock.color = btn.dataset.color;
    blkMenuTitle.textContent = `Bloque · ${editingBlock.color === 'red' ? '🔴' : '🔵'} ${editingBlock.color}`;
    document.querySelectorAll('.blk-color-btn').forEach(b =>
      b.classList.toggle('sel', b.dataset.color === editingBlock.color));
    scheduleSave(); render();
  });
});

document.querySelectorAll('.blk-place-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!editingBlock) return;
    editingBlock.place = btn.dataset.place;
    if (editingBlock.place !== 'field') editingBlock.location = null;
    document.querySelectorAll('.blk-place-btn').forEach(b =>
      b.classList.toggle('sel', b.dataset.place === editingBlock.place));
    blkLocSection.style.display = editingBlock.place === 'field' ? '' : 'none';
    blkLocVal.textContent = editingBlock.location
      ? `(${editingBlock.location.x}, ${editingBlock.location.y}) in` : '—';
    scheduleSave(); render();
  });
});

blkPickBtn.addEventListener('click', () => {
  if (!editingBlock) return;
  pickingLocation = !pickingLocation;
  blkPickBtn.classList.toggle('picking', pickingLocation);
  pickBanner.classList.toggle('active', pickingLocation);
  if (pickingLocation) blkMenu.classList.remove('open');
});

document.getElementById('blk-delete-btn').addEventListener('click', () => {
  if (!editingBlock) return;
  const idx = fieldBlocks.findIndex(b => b.uid === editingBlock.uid);
  if (idx !== -1) fieldBlocks.splice(idx, 1);
  closeBlkMenu(); scheduleSave();
});

// Close on outside click
window.addEventListener('mousedown', e => {
  if (!blkMenu.contains(e.target) && !pickingLocation) closeBlkMenu();
});

// ── Vertex menu: place block ──────────────────
document.getElementById('ctx-place-block').addEventListener('click', () => {
  if (!ctxVertex) return;
  const b = { uid: String(Date.now()), color: 'red', place: 'field',
               location: { x: ctxVertex.x, y: ctxVertex.y } };
  fieldBlocks.push(b);
  closeCtxMenu();
  const rect = canvas.getBoundingClientRect();
  openBlkMenu(b, panX + b.location.x*SCALE*zoom + rect.left + 14,
                 panY + b.location.y*SCALE*zoom + rect.top  - 10);
  scheduleSave(); render();
});
