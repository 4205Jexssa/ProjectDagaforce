/* ══════════════════════════════════════════
   INTERACTION.JS — Eventos de mouse, pan/zoom,
   menú de vértice, dispatch de clicks
   ══════════════════════════════════════════ */

// ── Vertex context menu ───────────────────────
let ctxVertex = null;
const ctxMenu  = document.getElementById('ctx-menu');
const ctxLabel = document.getElementById('ctx-label');

/** Posiciona y abre el menú de vértice */
function openCtxMenu(screenX, screenY, vx, vy) {
  ctxVertex = { x: vx, y: vy };
  ctxLabel.textContent = `(${vx}, ${vy}) in`;
  positionMenu(ctxMenu, screenX, screenY, 210, 130);
  ctxMenu.classList.add('open');
}
function closeCtxMenu() { ctxMenu.classList.remove('open'); ctxVertex = null; }

document.getElementById('ctx-teleport').addEventListener('click', () => {
  if (!ctxVertex) return;
  robotPos.x = ctxVertex.x; robotPos.y = ctxVertex.y;
  closeCtxMenu(); render();
});

// ── Shared menu positioner ────────────────────
/** Flip cerca de los bordes de la ventana */
function positionMenu(el, sx, sy, mw, mh) {
  const ww = window.innerWidth, wh = window.innerHeight;
  let left = sx, top = sy;
  if (left + mw > ww - 8) left = sx - mw;
  if (top  + mh > wh - 8) top  = sy - mh;
  el.style.left = left + 'px';
  el.style.top  = top  + 'px';
}

// Close any menu on outside click / Escape
window.addEventListener('mousedown', e => {
  if (!ctxMenu.contains(e.target)) closeCtxMenu();
});
window.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeCtxMenu(); closeBlkMenu(); closeLdrMenu(); }
});

// ── Zoom ──────────────────────────────────────
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  const dir = e.deltaY < 0 ? 1 : -1;
  const nz  = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom * (1 + dir * ZOOM_STEP)));
  panX = mx - (mx - panX) * (nz / zoom);
  panY = my - (my - panY) * (nz / zoom);
  zoom = nz;
  clampPan();
  zoomEl.textContent = zoom.toFixed(2) + '×';
  render();
}, { passive: false });

// ── Pan + click dispatch ──────────────────────
let dragging = false, lmx = 0, lmy = 0;
let didDrag = false, mouseDownOnCanvas = false;

canvas.addEventListener('mousedown', e => {
  dragging = true; didDrag = false; mouseDownOnCanvas = true;
  lmx = e.clientX; lmy = e.clientY;
  canvas.classList.add('grabbing');
  stopTooltip(); closeCtxMenu();
});

window.addEventListener('mousemove', e => {
  if (!dragging) return;
  const dx = e.clientX - lmx, dy = e.clientY - lmy;
  if (Math.abs(dx) > 4 || Math.abs(dy) > 4) didDrag = true;
  panX += dx; panY += dy; lmx = e.clientX; lmy = e.clientY;
  clampPan(); render();
});

window.addEventListener('mouseup', e => {
  dragging = false; canvas.classList.remove('grabbing');

  if (!didDrag && mouseDownOnCanvas) {
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;

    if (cx >= 0 && cy >= 0 && cx <= SIZE_PX && cy <= SIZE_PX) {
      const inX = (cx - panX) / zoom / SCALE;
      const inY = (cy - panY) / zoom / SCALE;
      const vx  = Math.round(inX), vy = Math.round(inY);
      const dsx = Math.abs((vx - inX) * SCALE * zoom);
      const dsy = Math.abs((vy - inY) * SCALE * zoom);
      const nearVertex = dsx <= 14 && dsy <= 14;

      if (pickingLocation && editingBlock) {
        // ── Pick mode: set block field location ──
        editingBlock.location = {
          x: Math.max(0, Math.min(FIELD_IN, vx)),
          y: Math.max(0, Math.min(FIELD_IN, vy)),
        };
        blkLocVal.textContent = `(${editingBlock.location.x}, ${editingBlock.location.y}) in`;
        pickingLocation = false;
        blkPickBtn.classList.remove('picking');
        pickBanner.classList.remove('active');
        blkMenu.classList.add('open');
        scheduleSave(); render();

      } else {
        // ── Normal click: loader > block > vertex ──
        const hitLoader = loaderAtScreen(cx, cy);
        const hitBlock  = !hitLoader && blockAtScreen(cx, cy);

        if (hitLoader)       openLdrMenu(hitLoader, e.clientX, e.clientY);
        else if (hitBlock)   openBlkMenu(hitBlock,  e.clientX, e.clientY);
        else if (nearVertex) openCtxMenu(e.clientX, e.clientY,
                               Math.max(0, Math.min(FIELD_IN, vx)),
                               Math.max(0, Math.min(FIELD_IN, vy)));
      }
    }
  }

  didDrag = false; mouseDownOnCanvas = false;
});

// ── Cursor / snap vertex on move ──────────────
canvas.addEventListener('mousemove', e => {
  if (dragging) return;
  const rect = canvas.getBoundingClientRect();
  const inX  = ((e.clientX - rect.left) - panX) / zoom / SCALE;
  const inY  = ((e.clientY - rect.top)  - panY) / zoom / SCALE;
  cursorEl.textContent =
    `(${inX.toFixed(1)}in, ${inY.toFixed(1)}in) / (${(inX/12).toFixed(2)}ft, ${(inY/12).toFixed(2)}ft)`;
  const cIX = Math.max(0, Math.min(FIELD_IN, Math.round(inX)));
  const cIY = Math.max(0, Math.min(FIELD_IN, Math.round(inY)));
  if (!snapVertex || snapVertex.ix !== cIX || snapVertex.iy !== cIY) {
    snapVertex = { ix: cIX, iy: cIY };
    stopTooltip(); render();
    hoverTimer = setTimeout(startTooltipAnim, TOOLTIP_DELAY);
  }
});

canvas.addEventListener('mouseleave', () => {
  if (dragging) return;
  snapVertex = null; stopTooltip();
  cursorEl.textContent = '—'; render();
});

// ── Rulers ────────────────────────────────────
['rulerX', 'rulerY'].forEach(id => {
  const el = document.getElementById(id);
  for (let i = 0; i <= 12; i++) {
    const d = document.createElement('div');
    d.textContent = (i === 0 || i === 12) ? i + 'ft' : i;
    el.appendChild(d);
  }
});
