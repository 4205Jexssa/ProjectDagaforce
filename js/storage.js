/* ══════════════════════════════════════════
   STORAGE.JS — Persistencia en cookies
   ══════════════════════════════════════════ */

function setCookie(n, v) {
  try { document.cookie = `${n}=${encodeURIComponent(v)};max-age=${365*86400};path=/`; } catch(e) {}
}
function getCookie(n) {
  const m = document.cookie.match('(^|;)\\s*' + n + '\\s*=\\s*([^;]+)');
  return m ? decodeURIComponent(m[2]) : null;
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveAll, 500);
}

function saveAll() {
  // Robot panel inputs
  const rData = {};
  document.querySelectorAll('#tab-robot input').forEach(el => {
    rData[el.id] = el.type === 'checkbox' ? el.checked : el.value;
  });
  setCookie('df_robot',     JSON.stringify(rData));
  setCookie('df_templates', JSON.stringify(codeTemplates));
  setCookie('df_custom2',   JSON.stringify(customDefs));
  setCookie('df_blocks',    JSON.stringify(fieldBlocks));
  setCookie('df_loaders',   JSON.stringify(loaders));
}

function loadAll() {
  // Robot config
  const rRaw = getCookie('df_robot');
  if (rRaw) {
    try {
      const d = JSON.parse(rRaw);
      Object.entries(d).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.type === 'checkbox') el.checked = val;
        else el.value = val;
      });
    } catch(e) {}
  }

  // Code templates
  const tRaw = getCookie('df_templates');
  if (tRaw) { try { codeTemplates = JSON.parse(tRaw); } catch(e) {} }

  // Custom code blocks
  const cRaw = getCookie('df_custom2');
  if (cRaw) { try { customDefs = JSON.parse(cRaw); } catch(e) {} }

  // Field game blocks
  const bRaw = getCookie('df_blocks');
  if (bRaw) { try { fieldBlocks = JSON.parse(bRaw); } catch(e) { fieldBlocks = deepCloneDefaults(); } }
  // else: stays as deepCloneDefaults() from state.js declaration

  // Loaders
  const lRaw = getCookie('df_loaders');
  if (lRaw) { try { loaders = JSON.parse(lRaw); } catch(e) {} }
}
