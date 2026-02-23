/* ══════════════════════════════════════════
   INIT.JS — Inicialización, tabs, reset
   Se ejecuta al final, cuando el DOM y todos
   los módulos ya están cargados.
   ══════════════════════════════════════════ */

// ── Tabs ──────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'codigo') { renderTemplates(); renderCustomList(); }
  });
});

// ── Robot panel live-update ───────────────────
document.querySelectorAll('#tab-robot input').forEach(el => {
  el.addEventListener('change', scheduleSave);
  el.addEventListener('input',  () => render());
});

// ── Reset blocks button ───────────────────────
const resetBtn = document.getElementById('btn-reset-blocks');
resetBtn.addEventListener('click', () => {
  if (!confirm('¿Restaurar los bloques a la posición por defecto?')) return;
  fieldBlocks = deepCloneDefaults();
  closeBlkMenu();
  scheduleSave();
  render();
});
resetBtn.addEventListener('mouseenter', () => {
  resetBtn.style.color = 'var(--accent)';
  resetBtn.style.borderColor = 'var(--accent)';
});
resetBtn.addEventListener('mouseleave', () => {
  resetBtn.style.color = 'var(--muted)';
  resetBtn.style.borderColor = 'var(--border)';
});

// ── Boot ──────────────────────────────────────
loadAll();
render();
