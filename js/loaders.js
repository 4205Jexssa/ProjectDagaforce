/* ══════════════════════════════════════════
   LOADERS.JS — Estaciones de recarga
   ══════════════════════════════════════════ */

// ── Images ───────────────────────────────────
const imgLoaderRed   = new Image(); imgLoaderRed.src   = 'recarga_red.png';
const imgLoaderBlue  = new Image(); imgLoaderBlue.src  = 'recarga_blue.png';
const imgLoaderEmpty = new Image(); imgLoaderEmpty.src = 'recarga_empty.png';
[imgLoaderRed, imgLoaderBlue, imgLoaderEmpty].forEach(i => { i.onload = () => render(); });

// ── Helpers ───────────────────────────────────
/** Devuelve el color del bloque en la ranura más alta ocupada, o null si vacío */
function loaderTopColor(loader) {
  for (let i = LOADER_SLOTS - 1; i >= 0; i--) {
    if (loader.slots[i]) return loader.slots[i];
  }
  return null;
}

// ── Drawing ───────────────────────────────────
function drawLoaders() {
  loaders.forEach(loader => {
    const sx  = panX + loader.x * SCALE * zoom;
    const sy  = panY + loader.y * SCALE * zoom;
    const wpx = LOADER_W_IN * SCALE * zoom;
    const hpx = LOADER_H_IN * SCALE * zoom;

    const top = loaderTopColor(loader);
    const img = top === 'red' ? imgLoaderRed : top === 'blue' ? imgLoaderBlue : imgLoaderEmpty;

    // Lado rojo = azulejos 1-3 = x < 72 in
    const angle = (loader.y < 72) ? -Math.PI / 2 : Math.PI / 2;

    // ── Draw image (rotated) ──
    if (img.complete && img.naturalWidth > 0) {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(angle);
      ctx.drawImage(img, -hpx/2, -wpx/2, hpx, wpx);
      ctx.restore();
    } else {
      // Fallback rect
      ctx.save();
      ctx.fillStyle   = 'rgba(253,203,110,.15)';
      ctx.strokeStyle = top === 'red' ? '#ff7070' : top === 'blue' ? '#6fa8ff' : '#fdcb6e';
      ctx.lineWidth   = 1.5;
      ctx.fillRect(sx-wpx/2, sy-hpx/2, wpx, hpx);
      ctx.strokeRect(sx-wpx/2, sy-hpx/2, wpx, hpx);
      ctx.fillStyle = '#fdcb6e';
      ctx.font = `${Math.max(7, 9/zoom)}px "Share Tech Mono",monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('LOADER', sx, sy);
      ctx.restore();
    }

    // ── Selection ring (no rotation) ──
    if (editingLoader && editingLoader.uid === loader.uid) {
      ctx.save();
      ctx.strokeStyle = 'rgba(253,203,110,.8)'; ctx.lineWidth = 2;
      ctx.strokeRect(sx-wpx/2-2, sy-hpx/2-2, wpx+4, hpx+4);
      ctx.restore();
    }

    drawLoaderSlotBar(loader, sx, sy, wpx, hpx);
  });
}

function drawLoaderSlotBar(loader, sx, sy, wpx, hpx) {
  const slotH = hpx / LOADER_SLOTS;
  const slotW = Math.max(8, 7 * zoom);
  const barX  = sx + wpx/2 + 4;
  const barTop = sy - hpx/2;
  const r = Math.max(2, slotH * 0.3);

  ctx.save();
  for (let i = 0; i < LOADER_SLOTS; i++) {
    const color = loader.slots[i];
    // slot 5 rendered at top of bar, slot 0 at bottom
    const slotY = barTop + (LOADER_SLOTS - 1 - i) * slotH;
    const gap = 1;

    ctx.fillStyle   = color === 'red'  ? 'rgba(255,80,80,.85)'
                    : color === 'blue' ? 'rgba(60,130,255,.85)'
                    : 'rgba(255,255,255,.08)';
    ctx.strokeStyle = color === 'red'  ? 'rgba(255,80,80,.5)'
                    : color === 'blue' ? 'rgba(60,130,255,.5)'
                    : 'rgba(255,255,255,.12)';
    ctx.lineWidth = 1;
    rRect(ctx, barX, slotY + gap, slotW, slotH - gap*2, r);
    ctx.fill(); ctx.stroke();

    if (zoom >= 2.5) {
      ctx.fillStyle = 'rgba(255,255,255,.4)';
      ctx.font = `${Math.max(5, 5*zoom/4)}px "Share Tech Mono",monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(i, barX + slotW/2, slotY + slotH/2);
    }
  }
  ctx.restore();
}

function loaderAtScreen(sx, sy) {
  for (let i = loaders.length - 1; i >= 0; i--) {
    const l   = loaders[i];
    const lsx = panX + l.x * SCALE * zoom;
    const lsy = panY + l.y * SCALE * zoom;
    const hw  = LOADER_W_IN * SCALE * zoom / 2;
    const hh  = LOADER_H_IN * SCALE * zoom / 2;
    if (sx >= lsx-hw && sx <= lsx+hw && sy >= lsy-hh && sy <= lsy+hh) return l;
  }
  return null;
}

// ── Loader context menu ───────────────────────
let editingLoader = null;

const ldrMenu      = document.getElementById('ldr-menu');
const ldrMenuTitle = document.getElementById('ldr-menu-title');
const ldrSlotsWrap = document.getElementById('ldr-slots-wrap');

function openLdrMenu(loader, screenX, screenY) {
  editingLoader = loader;
  ldrMenuTitle.textContent = `Loader · (${loader.x}, ${loader.y}) in`;
  renderLdrSlots();
  positionMenu(ldrMenu, screenX, screenY, 200, 260);
  ldrMenu.classList.add('open');
  closeCtxMenu(); closeBlkMenu();
  render();
}

function closeLdrMenu() {
  ldrMenu.classList.remove('open');
  editingLoader = null;
  render();
}

function renderLdrSlots() {
  ldrSlotsWrap.innerHTML = '';
  if (!editingLoader) return;

  // Show top slot first (5 → 0) in the UI
  for (let i = LOADER_SLOTS - 1; i >= 0; i--) {
    const color = editingLoader.slots[i];

    const row = document.createElement('div'); row.className = 'ldr-slot-row';
    const num = document.createElement('div');
    num.className = 'ldr-slot-num'; num.textContent = i;

    const btn = document.createElement('button');
    btn.className = 'ldr-slot-btn' + (color ? ' ' + color : '');
    const dot = document.createElement('span'); dot.className = 'ldr-slot-dot';
    const lbl = document.createElement('span'); lbl.textContent = color || 'vacío';
    btn.appendChild(dot); btn.appendChild(lbl);

    // Cycle: null → red → blue → null
    btn.addEventListener('click', () => {
      const cur = editingLoader.slots[i];
      editingLoader.slots[i] = cur === null ? 'red' : cur === 'red' ? 'blue' : null;
      renderLdrSlots();
      scheduleSave(); render();
    });

    row.appendChild(num); row.appendChild(btn);
    ldrSlotsWrap.appendChild(row);
  }
}

document.getElementById('ldr-delete-btn').addEventListener('click', () => {
  if (!editingLoader) return;
  const idx = loaders.findIndex(l => l.uid === editingLoader.uid);
  if (idx !== -1) loaders.splice(idx, 1);
  closeLdrMenu(); scheduleSave();
});

// Close on outside click
window.addEventListener('mousedown', e => {
  if (!ldrMenu.contains(e.target)) closeLdrMenu();
});

// ── Vertex menu: place loader ─────────────────
document.getElementById('ctx-place-loader').addEventListener('click', () => {
  if (!ctxVertex) return;
  const l = {
    uid:   String(Date.now()),
    x:     ctxVertex.x,
    y:     ctxVertex.y,
    slots: Array(LOADER_SLOTS).fill(null),
  };
  loaders.push(l);
  closeCtxMenu();
  const rect = canvas.getBoundingClientRect();
  openLdrMenu(l, panX + l.x*SCALE*zoom + rect.left + 14,
                 panY + l.y*SCALE*zoom + rect.top  - 10);
  scheduleSave(); render();
});
