/* ══════════════════════════════════════════
   CANVAS.JS — Rendering del campo, robot y tooltip
   ══════════════════════════════════════════ */

const canvas  = document.getElementById('field');
const ctx     = canvas.getContext('2d');
const zoomEl  = document.getElementById('zoomVal');
const cursorEl = document.getElementById('cursorPos');

// Field background image
const fieldImg = new Image();
fieldImg.onload = fieldImg.onerror = () => render();
fieldImg.src = 'TOP.png';

const easeOutExpo = t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
const fmt = v => v.toFixed(1).replace('.', ',');

// ── Tooltip animation ────────────────────────
function startTooltipAnim() {
  tooltipVisible = true; animStart = null; animProgress = 0;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(function loop(ts) {
    if (!animStart) animStart = ts;
    animProgress = Math.min(1, (ts - animStart) / ANIM_DUR);
    render();
    if (animProgress < 1) rafId = requestAnimationFrame(loop);
    else rafId = null;
  });
}
function stopTooltip() {
  tooltipVisible = false; animProgress = 0; animStart = null;
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
}

// ── Utility ──────────────────────────────────
function rRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x+r, y); c.lineTo(x+w-r, y); c.arcTo(x+w, y, x+w, y+r, r);
  c.lineTo(x+w, y+h-r); c.arcTo(x+w, y+h, x+w-r, y+h, r);
  c.lineTo(x+r, y+h); c.arcTo(x, y+h, x, y+h-r, r);
  c.lineTo(x, y+r); c.arcTo(x, y, x+r, y, r);
  c.closePath();
}

function fieldToScreen(ix, iy) {
  return { sx: panX + ix * SCALE * zoom, sy: panY + iy * SCALE * zoom };
}

function clampPan() {
  const fs = SIZE_PX * zoom;
  panX = Math.min(0, Math.max(SIZE_PX - fs, panX));
  panY = Math.min(0, Math.max(SIZE_PX - fs, panY));
}

// ── Main render ──────────────────────────────
function render() {
  // Clear
  ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0, 0, SIZE_PX, SIZE_PX); ctx.restore();

  ctx.save();
  ctx.translate(panX, panY);
  ctx.scale(zoom, zoom);

  // Background
  if (fieldImg.complete && fieldImg.naturalWidth > 0)
    ctx.drawImage(fieldImg, 0, 0, SIZE_PX, SIZE_PX);
  else { ctx.fillStyle = '#0d1a10'; ctx.fillRect(0, 0, SIZE_PX, SIZE_PX); }

  // Inch grid lines
  ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 0.5 / zoom;
  for (let i = 1; i < FIELD_IN; i++) {
    if (i % TILE_IN === 0) continue;
    const p = i * SCALE;
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, SIZE_PX); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(SIZE_PX, p); ctx.stroke();
  }

  // Vertex dots (non-tile intersections)
  const dotR = Math.max(0.5, 0.75 / zoom);
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  for (let x = 0; x <= FIELD_IN; x++)
    for (let y = 0; y <= FIELD_IN; y++) {
      if (x % TILE_IN === 0 && y % TILE_IN === 0) continue;
      ctx.fillRect(x*SCALE - dotR, y*SCALE - dotR, dotR*2, dotR*2);
    }

  // Tile grid lines
  ctx.strokeStyle = 'rgba(0,212,255,.35)'; ctx.lineWidth = 1.2 / zoom;
  for (let i = 0; i <= FIELD_IN; i += TILE_IN) {
    const p = i * SCALE;
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, SIZE_PX); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(SIZE_PX, p); ctx.stroke();
  }

  // Tile corner dots
  ctx.fillStyle = 'rgba(0,212,255,.7)';
  for (let x = 0; x <= FIELD_IN; x += TILE_IN)
    for (let y = 0; y <= FIELD_IN; y += TILE_IN) {
      ctx.beginPath(); ctx.arc(x*SCALE, y*SCALE, 3/zoom, 0, Math.PI*2); ctx.fill();
    }

  // Tile labels
  const fs = Math.max(6, 10/zoom);
  ctx.font = `${fs}px "Share Tech Mono",monospace`;
  ctx.fillStyle = 'rgba(0,212,255,.35)'; ctx.textAlign = 'left';
  for (let c = 0; c < 6; c++)
    for (let r = 0; r < 6; r++)
      ctx.fillText(COLS[c]+(r+1), c*TILE_IN*SCALE + 5/zoom, r*TILE_IN*SCALE + 14/zoom);

  ctx.restore();

  // Layered objects (drawn in screen space)
  drawRobot();
  drawFieldBlocks();
  drawLoaders();
  if (snapVertex) drawOverlay();
}

// ── Robot drawing ────────────────────────────
function getRobotDims() {
  return {
    largo: parseFloat(document.getElementById('r-largo').value) || 18,
    ancho: parseFloat(document.getElementById('r-ancho').value) || 18,
    ox:    parseFloat(document.getElementById('r-ox').value)    || 0,
    oy:    parseFloat(document.getElementById('r-oy').value)    || 0,
  };
}

function drawRobot() {
  const { largo, ancho, ox, oy } = getRobotDims();
  const { sx: originSX, sy: originSY } = fieldToScreen(robotPos.x, robotPos.y);
  const centerSX = panX + (robotPos.x + ox) * SCALE * zoom;
  const centerSY = panY + (robotPos.y + oy) * SCALE * zoom;
  const bw = largo * SCALE * zoom, bh = ancho * SCALE * zoom;
  const bx = centerSX - bw/2, by = centerSY - bh/2;

  ctx.save();

  // Body
  ctx.fillStyle   = 'rgba(160,100,255,0.18)';
  ctx.strokeStyle = 'rgba(180,120,255,0.7)';
  ctx.lineWidth   = 1.5;
  ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.fill(); ctx.stroke();

  // Corner ticks
  const tick = Math.min(10, bw*0.12, bh*0.12);
  ctx.strokeStyle = 'rgba(200,150,255,0.5)'; ctx.lineWidth = 1;
  [[bx,by],[bx+bw,by],[bx,by+bh],[bx+bw,by+bh]].forEach(([cx,cy], i) => {
    const dx = i%2===0 ? 1 : -1, dy = i<2 ? 1 : -1;
    ctx.beginPath(); ctx.moveTo(cx+dx*tick, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy+dy*tick); ctx.stroke();
  });

  // Origin point (green)
  ctx.shadowColor = 'rgba(0,255,120,0.6)'; ctx.shadowBlur = 8;
  ctx.fillStyle   = '#00ff78';
  ctx.beginPath(); ctx.arc(originSX, originSY, 5, 0, Math.PI*2); ctx.fill();

  // Cross at origin
  ctx.shadowBlur   = 0;
  ctx.strokeStyle  = 'rgba(0,255,120,0.6)'; ctx.lineWidth = 1;
  const cr = 7;
  ctx.beginPath(); ctx.moveTo(originSX-cr, originSY); ctx.lineTo(originSX+cr, originSY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(originSX, originSY-cr); ctx.lineTo(originSX, originSY+cr); ctx.stroke();

  ctx.restore();
}

// ── Snap vertex tooltip overlay ───────────────
function drawOverlay() {
  const { ix, iy } = snapVertex;
  const sx = panX + ix * SCALE * zoom, sy = panY + iy * SCALE * zoom;

  // Red snap circle
  ctx.save();
  ctx.strokeStyle = 'rgba(255,77,77,.9)'; ctx.lineWidth = 1.8;
  ctx.shadowColor = 'rgba(255,77,77,.4)'; ctx.shadowBlur = 7;
  ctx.beginPath(); ctx.arc(sx, sy, 7, 0, Math.PI*2); ctx.stroke();
  ctx.restore();

  if (!tooltipVisible || animProgress <= 0) return;

  const t     = easeOutExpo(animProgress);
  const alpha = t, slide = (1 - t) * 8;
  const colIdx = Math.min(5, Math.floor(ix / TILE_IN));
  const rowIdx = Math.min(5, Math.floor(iy / TILE_IN));
  const tile   = COLS[colIdx] + (rowIdx+1);
  const relX   = ix - colIdx*TILE_IN, relY = iy - rowIdx*TILE_IN;
  const line1  = `${fmt(ix)}, ${fmt(iy)} in`;
  const line2  = `${tile}  ·  ${fmt(relX)}, ${fmt(relY)} in`;

  const F1 = '500 12px "Roboto Mono",monospace', F2 = '400 10px "Roboto Mono",monospace';
  ctx.font = F1; const w1 = ctx.measureText(line1).width;
  ctx.font = F2; const w2 = ctx.measureText(line2).width;
  const padX=13, padY=9, gap=5, h1=13, h2=11;
  const bw = Math.max(w1, w2) + padX*2, bh = padY*2 + h1 + gap + h2, rr = 4;
  let tx = sx+12, ty = sy-bh-12;
  if (tx+bw > SIZE_PX-6) tx = sx-bw-12;
  if (ty < 4) ty = sy+14;
  if (ty+bh > SIZE_PX-6) ty = SIZE_PX-bh-6;
  ty += slide;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#111827'; rRect(ctx, tx, ty, bw, bh, rr); ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.fillStyle = '#ff4d4d'; rRect(ctx, tx, ty+7, 3, bh-14, 1.5); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(tx+padX+6, ty+padY+h1+gap*.5); ctx.lineTo(tx+bw-padX, ty+padY+h1+gap*.5); ctx.stroke();
  ctx.font = F1; ctx.fillStyle = 'rgba(225,235,255,.93)'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(line1, tx+padX+6, ty+padY);
  ctx.font = F2; ctx.fillStyle = 'rgba(0,212,255,.6)';
  ctx.fillText(line2, tx+padX+6, ty+padY+h1+gap);
  ctx.restore();
}
