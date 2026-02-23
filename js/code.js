/* ══════════════════════════════════════════
   CODE.JS — Definiciones de bloques del auton,
   motor de plantillas, panel Código
   ══════════════════════════════════════════ */

// ── Category colors ───────────────────────────
const CAT_COLOR = {
  move:   '#00d4ff',
  mech:   '#ff9f43',
  goal:   '#00c97d',
  store:  '#a29bfe',
  clr:    '#fdcb6e',
  custom: '#fd79a8',
};

// ── Standard block definitions ────────────────
const BLOCK_DEFS = [
  { id:'wait',    cat:'move',  label:'Esperar',                  req:null,        args:[{id:'ms',   label:'ms',           opt:false, def:500}] },
  { id:'advance', cat:'move',  label:'Avance',                   req:null,        args:[{id:'x',label:'X',opt:false,def:0},{id:'y',label:'Y',opt:false,def:24},{id:'minV',label:'minVelocity',opt:true,def:0},{id:'maxV',label:'maxVelocity',opt:true,def:127}] },
  { id:'turn',    cat:'move',  label:'Girar',                    req:null,        args:[{id:'theta',label:'Theta',opt:false,def:90},{id:'minV',label:'minVelocity',opt:true,def:0},{id:'maxV',label:'maxVelocity',opt:true,def:127}] },
  { id:'lookat',  cat:'move',  label:'MirarAPunto',              req:null,        args:[{id:'x',label:'X',opt:false,def:0},{id:'y',label:'Y',opt:false,def:0},{id:'minV',label:'minVelocity',opt:true,def:0},{id:'maxV',label:'maxVelocity',opt:true,def:127}] },
  { id:'brake',   cat:'move',  label:'Frenar',                   req:null,        args:[] },
  { id:'intake',  cat:'mech',  label:'AbsorberBloques',          req:null,        args:[] },
  { id:'outtake', cat:'mech',  label:'DevolverBloques',          req:null,        args:[] },
  { id:'longG',   cat:'goal',  label:'PuntuarLongGoal',          req:'longGoal',  args:[] },
  { id:'upperG',  cat:'goal',  label:'PuntuarUpperCenterGoal',   req:'upperGoal', args:[] },
  { id:'lowerG',  cat:'goal',  label:'PuntuarLowerCenterGoal',   req:'lowerGoal', args:[] },
  { id:'toStore', cat:'store', label:'RedirigirAAlmacenamiento', req:'storage',   args:[] },
  { id:'toIntake',cat:'store', label:'RedirigirAIntake',         req:'storage',   args:[] },
  { id:'retain',  cat:'store', label:'Retener',                  req:'retention', args:[] },
  { id:'release', cat:'store', label:'Desbloquear',              req:'retention', args:[] },
  { id:'reload',  cat:'store', label:'Recargar',                 req:'reload',    args:[] },
  { id:'colorOn', cat:'clr',   label:'ActivarColorSorting',      req:'colorSort', args:[] },
  { id:'colorOff',cat:'clr',   label:'DesactivarColorSorting',   req:'colorSort', args:[] },
];

// ── Template engine ───────────────────────────
function applyTemplate(tmpl, argsMap) {
  return tmpl.replace(/\{(\w+)\}/g, (_, k) =>
    argsMap.hasOwnProperty(k) ? argsMap[k] : `{${k}}`);
}

function exampleArgs(args) {
  const m = {};
  args.forEach((a, i) => { m[a.id] = a.def !== undefined ? a.def : (i+1)*10; });
  return m;
}

function refreshPreview(el, args, tmpl) {
  if (!tmpl) { el.textContent = ''; el.className = 'tmpl-preview'; return; }
  el.textContent = '→ ' + applyTemplate(tmpl, exampleArgs(args));
  el.className   = 'tmpl-preview ok';
}

// ── Standard templates panel ──────────────────
function renderTemplates() {
  const list = document.getElementById('template-list');
  list.innerHTML = '';
  BLOCK_DEFS.forEach(def => {
    const color  = CAT_COLOR[def.cat] || '#888';
    const tmpl   = codeTemplates[def.id] || '';
    const argStr = def.args.length
      ? '(' + def.args.map(a => (a.opt ? '*' : '') + a.id).join(', ') + ')'
      : '()';

    const row = document.createElement('div');
    row.className = 'tmpl-row'; row.style.borderLeftColor = color;

    const sig = document.createElement('div'); sig.className = 'tmpl-sig';
    sig.innerHTML =
      `<span class="t-dot" style="background:${color}"></span>` +
      `<span class="t-name" style="color:${color}">${def.label}</span>` +
      `<span class="t-args">${argStr}</span>`;
    row.appendChild(sig);

    const inp = document.createElement('input');
    inp.type = 'text'; inp.spellcheck = false;
    inp.className   = 'tmpl-input' + (tmpl ? ' filled' : '');
    inp.value       = tmpl;
    inp.placeholder = '// sin plantilla';

    const prev = document.createElement('div');
    prev.className = 'tmpl-preview';
    refreshPreview(prev, def.args, tmpl);

    inp.addEventListener('input', () => {
      codeTemplates[def.id] = inp.value;
      inp.classList.toggle('filled', !!inp.value);
      refreshPreview(prev, def.args, inp.value);
      scheduleSave();
    });

    row.appendChild(inp); row.appendChild(prev);
    list.appendChild(row);
  });
}

// ── Custom code blocks panel ──────────────────
function renderCustomList() {
  const list = document.getElementById('custom-list');
  list.innerHTML = '';
  customDefs.forEach((cd, idx) => list.appendChild(buildCustomCard(cd, idx)));
}

function buildCustomCard(cd, idx) {
  const card = document.createElement('div'); card.className = 'custom-card';

  // Header
  const header  = document.createElement('div'); header.className = 'custom-card-header';
  const nameSpan = document.createElement('span'); nameSpan.className = 'custom-card-name';
  nameSpan.textContent = cd.label + (cd.args.length
    ? '(' + cd.args.map(a => (a.opt ? '*' : '') + a.id).join(', ') + ')' : '()');
  const delBtn = document.createElement('button'); delBtn.className = 'custom-card-del'; delBtn.textContent = '×';
  delBtn.addEventListener('click', () => { customDefs.splice(idx, 1); renderCustomList(); scheduleSave(); });
  header.appendChild(nameSpan); header.appendChild(delBtn);
  card.appendChild(header);

  // Body
  const body = document.createElement('div'); body.className = 'custom-card-body';

  // Name field
  body.appendChild(makeField('Nombre', 'cc-input', cd.label, 'MiAccion...', v => {
    cd.label = v; refreshCardHeader(header, cd); scheduleSave();
  }));

  // Args
  const argsWrap   = document.createElement('div'); argsWrap.className = 'cc-field';
  const argsHeader = document.createElement('div'); argsHeader.className = 'args-label';
  argsHeader.innerHTML = 'Argumentos';
  const addArgBtn = document.createElement('button'); addArgBtn.className = 'args-add-btn'; addArgBtn.textContent = '+ arg';
  const argList   = document.createElement('div');   argList.className   = 'args-list';
  addArgBtn.addEventListener('click', () => {
    cd.args.push({ id: 'arg' + cd.args.length, opt: false });
    renderArgRows(argList, cd, header); scheduleSave();
  });
  argsHeader.appendChild(addArgBtn);
  renderArgRows(argList, cd, header);
  argsWrap.appendChild(argsHeader); argsWrap.appendChild(argList);
  body.appendChild(argsWrap);

  // Template
  const tmplWrap  = document.createElement('div');  tmplWrap.className = 'cc-field';
  const tmplLabel = document.createElement('span'); tmplLabel.className = 'cc-field-label'; tmplLabel.textContent = 'Plantilla';
  const tmplInp   = document.createElement('input');
  tmplInp.type    = 'text'; tmplInp.spellcheck = false;
  tmplInp.className   = 'cc-tmpl-input' + (cd.template ? ' filled' : '');
  tmplInp.value       = cd.template || '';
  tmplInp.placeholder = 'miFunc({arg1})';
  const prev = document.createElement('div'); prev.className = 'cc-preview';
  refreshPreview(prev, cd.args, cd.template || '');
  tmplInp.addEventListener('input', () => {
    cd.template = tmplInp.value;
    tmplInp.classList.toggle('filled', !!tmplInp.value);
    refreshPreview(prev, cd.args, tmplInp.value);
    scheduleSave();
  });
  tmplWrap.appendChild(tmplLabel); tmplWrap.appendChild(tmplInp); tmplWrap.appendChild(prev);
  body.appendChild(tmplWrap);

  card.appendChild(body);
  return card;
}

function refreshCardHeader(header, cd) {
  header.querySelector('.custom-card-name').textContent = cd.label +
    (cd.args.length ? '(' + cd.args.map(a => (a.opt ? '*' : '') + a.id).join(', ') + ')' : '()');
}

function renderArgRows(container, cd, header) {
  container.innerHTML = '';
  cd.args.forEach((arg, i) => {
    const row = document.createElement('div'); row.className = 'arg-row';

    const idInp = document.createElement('input');
    idInp.type  = 'text'; idInp.placeholder = 'id'; idInp.value = arg.id;
    idInp.title = 'Nombre/ID del argumento (usado en plantilla como {id})';
    idInp.addEventListener('input', () => { arg.id = idInp.value.replace(/\s/g, ''); refreshCardHeader(header, cd); scheduleSave(); });

    const optLabel = document.createElement('label'); optLabel.className = 'arg-opt-label';
    const optCb    = document.createElement('input'); optCb.type = 'checkbox'; optCb.checked = arg.opt;
    optCb.addEventListener('change', () => { arg.opt = optCb.checked; refreshCardHeader(header, cd); scheduleSave(); });
    optLabel.appendChild(optCb); optLabel.append('opt');

    const del = document.createElement('button'); del.className = 'arg-del-btn'; del.textContent = '×';
    del.addEventListener('click', () => { cd.args.splice(i, 1); renderArgRows(container, cd, header); refreshCardHeader(header, cd); scheduleSave(); });

    row.appendChild(idInp); row.appendChild(optLabel); row.appendChild(del);
    container.appendChild(row);
  });
}

function makeField(labelText, inputClass, value, placeholder, onChange) {
  const wrap = document.createElement('div'); wrap.className = 'cc-field';
  const lbl  = document.createElement('span'); lbl.className = 'cc-field-label'; lbl.textContent = labelText;
  const inp  = document.createElement('input'); inp.type = 'text'; inp.className = inputClass;
  inp.value  = value; inp.placeholder = placeholder;
  inp.addEventListener('input', () => onChange(inp.value));
  wrap.appendChild(lbl); wrap.appendChild(inp);
  return wrap;
}

// ── New custom block form ─────────────────────
let nbfTempArgs = [];

function openNewBlockForm() {
  nbfTempArgs = [];
  document.getElementById('nbf-name').value     = '';
  document.getElementById('nbf-template').value = '';
  document.getElementById('nbf-args-list').innerHTML = '';
  document.getElementById('new-block-form').classList.add('open');
  document.getElementById('nbf-name').focus();
}
function closeNewBlockForm() {
  document.getElementById('new-block-form').classList.remove('open');
}

document.getElementById('btn-add-custom').addEventListener('click', openNewBlockForm);
document.getElementById('nbf-cancel').addEventListener('click', closeNewBlockForm);

document.getElementById('nbf-add-arg').addEventListener('click', () => {
  nbfTempArgs.push({ id: 'arg' + nbfTempArgs.length, opt: false });
  renderNbfArgRows();
});

function renderNbfArgRows() {
  const container = document.getElementById('nbf-args-list');
  container.innerHTML = '';
  nbfTempArgs.forEach((arg, i) => {
    const row = document.createElement('div'); row.className = 'arg-row';
    const idInp = document.createElement('input'); idInp.type = 'text';
    idInp.placeholder = 'id del arg'; idInp.value = arg.id;
    idInp.addEventListener('input', () => { arg.id = idInp.value.replace(/\s/g, ''); });
    const optLabel = document.createElement('label'); optLabel.className = 'arg-opt-label';
    const optCb    = document.createElement('input'); optCb.type = 'checkbox'; optCb.checked = arg.opt;
    optCb.addEventListener('change', () => { arg.opt = optCb.checked; });
    optLabel.appendChild(optCb); optLabel.append('opt');
    const del = document.createElement('button'); del.className = 'arg-del-btn'; del.textContent = '×';
    del.addEventListener('click', () => { nbfTempArgs.splice(i, 1); renderNbfArgRows(); });
    row.appendChild(idInp); row.appendChild(optLabel); row.appendChild(del);
    container.appendChild(row);
  });
}

document.getElementById('nbf-confirm').addEventListener('click', () => {
  const name = document.getElementById('nbf-name').value.trim(); if (!name) return;
  const tmpl = document.getElementById('nbf-template').value.trim();
  customDefs.push({ uid: String(Date.now()), label: name, args: nbfTempArgs.map(a => ({...a})), template: tmpl });
  closeNewBlockForm(); renderCustomList(); scheduleSave();
});
document.getElementById('nbf-name').addEventListener('keydown', e => {
  if (e.key === 'Enter')  document.getElementById('nbf-confirm').click();
  if (e.key === 'Escape') closeNewBlockForm();
});
