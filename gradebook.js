// 成绩簿界面：总览 / 录分 / 分布 / 表现 / 设置。数据与算法见 gbcalc.js；存取走 db.js。
import * as C from './gbcalc.js';

const TABS = [['overview', '总览'], ['entry', '录分'], ['dist', '分布'], ['behav', '表现'], ['settings', '设置']];
const MODE_NAME = { raw: '有满分的卷子（查官方表）', pct: '百分比（如 Schoology）', oral: '口语考试（5 题 × 7 分）', letter: '直接填字母' };
const gb = { tab: localStorage.getItem('gb_tab') || 'overview', track: 'std', open: null };
let X = null; // 当前渲染的 ctx

export function renderGradebook(el, ctx) {
  X = ctx;
  const { h } = X;
  const cfg = getCfg();
  if (!gb.tab || !TABS.find(t => t[0] === gb.tab)) gb.tab = 'overview';
  const hasX = cfg && cfg.tracks.xce;
  if (!hasX) gb.track = 'std';
  el.innerHTML = `<div class="gb">
    <div class="gb-bar">
      <div class="seg">${TABS.map(([k, n]) => `<button data-gbtab="${k}" class="${gb.tab === k ? 'on' : ''}">${n}</button>`).join('')}</div>
      ${hasX && gb.tab === 'overview' ? `<div class="seg">${Object.entries(cfg.tracks).map(([k, t]) => `<button data-gbtrack="${k}" class="${gb.track === k ? 'on' : ''}">${h(t.name)}</button>`).join('')}</div>` : ''}
      <span class="gb-term">${h(X.className)} · ${h(X.term)}</span>
    </div>
    ${X.store.gbReady ? '' : '<div class="gb-warn">⚠ 数据库还没有成绩簿的新表——请先在 Supabase SQL Editor 跑一遍 <b>supabase/gradebook.sql</b>。在那之前，表现记录和手调综评存不下来。</div>'}
    <div class="gb-body" id="gbBody"></div></div>`;
  el.querySelectorAll('[data-gbtab]').forEach(b => b.onclick = () => { gb.tab = b.dataset.gbtab; localStorage.setItem('gb_tab', gb.tab); X.rerender(); });
  el.querySelectorAll('[data-gbtrack]').forEach(b => b.onclick = () => { gb.track = b.dataset.gbtrack; X.rerender(); });
  const body = el.querySelector('#gbBody');
  if (!cfg && gb.tab !== 'settings') return emptyState(body);
  ({ overview, entry, dist: distTab, behav, settings: settingsTab })[gb.tab](body, cfg);
}

// ---------- 数据访问 ----------
const key = () => `${X.classId}|${X.term}`;
const getCfg = () => (X.store.settings.gb_config || {})[key()] || null;
const saveCfg = cfg => X.db.setSetting('gb_config', { ...(X.store.settings.gb_config || {}), [key()]: cfg });
const points = () => ({ ...C.DEFAULT_POINTS, ...(X.store.settings.gb_points || {}) });
const rules = () => ({ ...C.DEFAULT_RULES, ...(X.store.settings.gb_rules || {}) });
const trackOf = (sid, cfg) => cfg.tracks.xce && (X.store.settings.gb_track || {})[sid] === 'xce' ? 'xce' : 'std';
const repOf = sid => X.store.reports.find(r => r.student_id === sid && r.term === X.term);
const marksOf = (sid, kind) => X.store.marks.filter(m => m.student_id === sid && m.term === X.term && m.kind === kind);
function cellsOf(sid, cfg) {
  const byName = Object.fromEntries(cfg.items.map(i => [i.name, i]));
  const out = {};
  X.store.exams.forEach(e => { if (e.student_id === sid && e.term === X.term && byName[e.name]) out[byName[e.name].id] = e; });
  return out;
}
const result = (sid, cfg) => C.compute(cfg, trackOf(sid, cfg), cellsOf(sid, cfg), repOf(sid)?.overrides || {}, points());
function behavior(sid, res) {
  const nbs = marksOf(sid, 'notebook');
  const nb = { ok: nbs.filter(m => m.val === 'ok').length, part: nbs.filter(m => m.val === 'part').length, miss: nbs.filter(m => m.val === 'miss').length };
  const slips = marksOf(sid, 'slip').length;
  const delta = X.score(sid) - X.baseScore();
  const sug = C.suggestCE({ delta, slips, nb, finalLetter: res?.final }, rules());
  const rep = repOf(sid) || {};
  return { sug, nb, slips, delta, conduct: rep.conduct || sug.conduct, effort: rep.effort || sug.effort, ptc: rep.ptc ?? sug.ptc, conductManual: !!rep.conduct, effortManual: !!rep.effort, ptcManual: rep.ptc != null };
}

// ---------- 小部件 ----------
const lcls = l => l === 'A+' || l === 'A' ? 'hi' : l === 'F' ? 'lo' : '';
const chip = (l, over, extra = '') => l ? `<span class="lt ${lcls(l)}" ${extra}>${X.h(l)}${over ? '<i title="手动调整过"></i>' : ''}</span>` : `<span class="lt none" ${extra}>–</span>`;
const ceChip = (l, manual) => `<span class="ce ce-${l}${manual ? ' man' : ''}">${l}</span>`;
function pickLetter({ title, auto, current, overridden, onPick }) {
  X.modal(`<h3>${X.h(title)}</h3><div class="hint">自动算出：<b>${auto || '（还没有数据）'}</b>${overridden ? ` · 现在是手调的 <b>${X.h(current)}</b>` : ''}。手调之后不会再被自动值改回去。</div>
    <div class="days" style="grid-template-columns:repeat(4,1fr)">${C.LETTERS.map(l => `<button data-pl="${l}" class="${current === l ? 'on' : ''}">${l}</button>`).join('')}</div>
    ${overridden ? '<button class="mbtn blue" data-pl="">恢复自动</button>' : ''}<button class="mbtn" id="mClose">取消</button>`);
  document.querySelectorAll('[data-pl]').forEach(b => b.onclick = async () => { X.closeModal(); await onPick(b.dataset.pl || null); X.rerender(); });
}
const emptyState = body => {
  const kind = X.classId.startsWith('G9') ? 'G9' : '10';
  body.innerHTML = `<div class="gb-empty"><b>${X.h(X.className)} · ${X.h(X.term)} 还没有成绩设置</b><p>先套用学校的占比模板，之后占比、小组、考核项都能改。</p>
    <button class="mbtn primary" id="gbTpl" style="max-width:280px">套用${kind === 'G9' ? '九年级' : '十年级'}模板</button></div>`;
  body.querySelector('#gbTpl').onclick = async () => { await saveCfg(C.defaultConfig(kind)); X.rerender(); };
};
const nameLabel = s => `<span class="gb-num">${s.num ?? ''}</span><span class="gb-nm">${X.h(s.name)}</span>`;

// ---------- 总览 ----------
function overview(body, cfg) {
  const stus = X.students().filter(s => trackOf(s.id, cfg) === gb.track);
  const track = cfg.tracks[gb.track] || cfg.tracks.std;
  const rows = stus.map(s => { const r = result(s.id, cfg); return { s, r, b: behavior(s.id, r) }; });
  const nF = rows.filter(x => x.r.final === 'F').length, nPtc = rows.filter(x => x.b.ptc).length;
  const wsum = track.cats.reduce((a, c) => a + c.weight, 0);
  body.innerHTML = `<div class="gb-sum"><span>${stus.length} 人</span><span class="${nF ? 'bad' : ''}">目前总等级 F · ${nF}</span><span class="${nPtc ? 'bad' : ''}">建议 PTC · ${nPtc}</span><span class="mute">占比合计 ${wsum}%</span><div class="grow"></div><button class="hbtn" id="gbCopy">复制给学校系统</button></div>
    <div class="gb-scroll"><table class="gb-table ov"><thead><tr><th class="l">#</th><th class="l">姓名</th>${track.cats.map(c => `<th>${X.h(c.name)}<small>${c.weight}%</small></th>`).join('')}<th>总等级<small>目前</small></th><th>课堂分</th><th>Conduct</th><th>Effort</th><th>PTC</th><th>Slip</th></tr></thead>
    <tbody>${rows.map(({ s, r, b }) => `<tr class="${r.final === 'F' ? 'rowF' : ''}"><td class="l num">${s.num ?? ''}</td><td class="l nm">${X.h(s.name)}</td>
      ${r.cats.map((c, i) => `<td><button class="lt-btn" data-s="${s.id}" data-cat="${c.id}" title="${c.value != null ? c.value.toFixed(1) : ''}">${chip(c.letter, c.overridden)}</button>${c.value != null && c.coverage < 0.999 ? `<small class="cov">${Math.round(c.coverage * 100)}%</small>` : ''}</td>`).join('')}
      <td><button class="lt-btn" data-s="${s.id}" data-cat="final">${chip(r.final, r.finalOverridden)}</button>${r.total != null ? `<small class="cov">${r.total.toFixed(1)} · 已录${Math.round(r.coverage * 100)}%</small>` : ''}</td>
      <td class="pts">${X.score(s.id)}<small class="${b.delta < 0 ? 'neg' : 'pos'}">${b.delta >= 0 ? '+' : ''}${b.delta}</small></td>
      <td>${ceChip(b.conduct, b.conductManual)}</td><td>${ceChip(b.effort, b.effortManual)}</td>
      <td>${b.ptc ? '<span class="ptc">PTC</span>' : ''}</td><td>${b.slips ? `<span class="slip">${b.slips}</span>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
  body.querySelectorAll('[data-cat]').forEach(btn => btn.onclick = () => {
    const sid = btn.dataset.s, cid = btn.dataset.cat, r = result(sid, cfg), st = X.store.students.find(x => x.id === sid);
    const node = cid === 'final' ? { auto: r.autoFinal, letter: r.final, over: r.finalOverridden, name: '总等级' } : (c => ({ auto: c.auto, letter: c.letter, over: c.overridden, name: c.name }))(r.cats.find(c => c.id === cid));
    pickLetter({ title: `${st.name} · ${node.name}`, auto: node.auto, current: node.letter, overridden: node.over, onPick: async l => {
      const ov = { ...(repOf(sid)?.overrides || {}) }; if (l) ov[cid] = l; else delete ov[cid];
      await X.db.upsertReport(sid, X.term, { overrides: ov });
    } });
  });
  body.querySelector('#gbCopy').onclick = () => {
    const head = ['#', '姓名', ...track.cats.map(c => c.name), '总等级', 'Conduct', 'Effort', 'PTC', '备注'];
    const lines = rows.map(({ s, r, b }) => [s.num ?? '', s.name, ...r.cats.map(c => c.letter || ''), r.final || '', b.conduct, b.effort, b.ptc ? 'PTC' : '', repOf(s.id)?.note || ''].join('\t'));
    navigator.clipboard.writeText([head.join('\t'), ...lines].join('\n')).then(() => X.toast('已复制，可直接粘贴到表格'), () => X.toast('复制失败'));
  };
}

// ---------- 录分 ----------
function itemLabel(cfg, it) {
  for (const t of Object.values(cfg.tracks)) for (const c of t.cats) { const g = c.groups.find(g => g.id === it.group); if (g) return `${g.name}`; }
  return '（未归组）';
}
function entry(body, cfg) {
  const stus = X.students();
  const items = cfg.items;
  body.innerHTML = `<div class="gb-sum"><span class="mute">格里可以填分数或字母（A+ … F）。整列从 Excel / Sheets 复制后，点第一格直接粘贴。等级旁的小圆点 = 手调过。</span><div class="grow"></div><button class="hbtn" id="gbAddItem">＋ 考核项</button></div>
    ${items.length ? `<div class="gb-scroll"><table class="gb-table en"><thead><tr><th class="l">#</th><th class="l">姓名</th>${items.map(it => `<th><button class="th-btn" data-edit="${it.id}">${it.show ? '<span class="eye" title="学生可以看到这一项">👁</span> ' : ''}${X.h(it.name)}<small>${X.h(itemLabel(cfg, it))} · ${it.mode === 'pct' ? '%' : it.mode === 'letter' ? '字母' : '/' + it.max}</small></button></th>`).join('')}</tr></thead>
    <tbody>${stus.map(s => { const cells = cellsOf(s.id, cfg); return `<tr><td class="l num">${s.num ?? ''}</td><td class="l nm">${X.h(s.name)}</td>${items.map(it => { const c = cells[it.id]; const l = C.effLetter(it, c); return `<td><div class="gcell"><input data-s="${s.id}" data-i="${it.id}" value="${X.h(c ? (c.raw ?? (c.score ?? c.grade ?? '')) : '')}" autocomplete="off" inputmode="text"><button class="lt-btn" data-ov-s="${s.id}" data-ov-i="${it.id}">${chip(l, c?.override)}</button></div></td>`; }).join('')}</tr>`; }).join('')}</tbody></table></div>` : '<div class="gb-empty"><p>还没有考核项。点右上角「＋ 考核项」添加第一个（比如“听写1”）。</p></div>'}`;
  body.querySelector('#gbAddItem').onclick = () => editItem(cfg, null);
  body.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => editItem(cfg, cfg.items.find(i => i.id === b.dataset.edit)));
  const inputs = [...body.querySelectorAll('.gcell input')];
  inputs.forEach(inp => {
    inp.onchange = () => saveRaw(cfg, inp.dataset.s, inp.dataset.i, inp.value, inp);
    inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); const nx = body.querySelectorAll(`input[data-i="${inp.dataset.i}"]`); const k = [...nx].indexOf(inp); (nx[k + 1] || inp).focus(); } };
    inp.onpaste = e => pasteGrid(cfg, e, inp, stus, items);
  });
  body.querySelectorAll('[data-ov-s]').forEach(b => b.onclick = () => {
    const sid = b.dataset.ovS, it = items.find(i => i.id === b.dataset.ovI), c = cellsOf(sid, cfg)[it.id], st = X.store.students.find(x => x.id === sid);
    pickLetter({ title: `${st.name} · ${it.name}`, auto: c && c.raw != null ? C.autoLetter(it, c.raw) : (c ? C.autoLetter(it, c.score ?? c.grade) : null), current: C.effLetter(it, c), overridden: !!c?.override, onPick: l => setCellGrade(cfg, sid, it, c, l) });
  });
}
const numOrNull = t => { const e = C.parseEntry(t); return e && e.num != null ? e.num : null; };
async function saveRaw(cfg, sid, iid, text, inp) {
  const it = cfg.items.find(i => i.id === iid), old = cellsOf(sid, cfg)[iid];
  const t = String(text).trim();
  if (!t) { if (old) await X.db.deleteCell(sid, X.term, it.name); return refreshCell(cfg, sid, iid, inp); }
  const e = C.parseEntry(t);
  if (!e || e.bad) { X.toast(`看不懂「${t}」——请填数字或 A+ … F`); inp.value = old ? (old.raw ?? old.score ?? old.grade ?? '') : ''; return; }
  if (e.num != null && it.mode !== 'pct' && it.max && e.num > it.max) X.toast(`注意：${e.num} 超过满分 ${it.max}`);
  const auto = C.autoLetter(it, t);
  const keep = old?.override && old.grade;
  await X.db.upsertCell({ student_id: sid, term: X.term, name: it.name, raw: t, score: e.num ?? null, grade: keep ? old.grade : auto, override: !!keep });
  if (keep) X.toast('这格的等级是手调的，已保留');
  refreshCell(cfg, sid, iid, inp);
}
function refreshCell(cfg, sid, iid, inp) {
  const it = cfg.items.find(i => i.id === iid), c = cellsOf(sid, cfg)[iid];
  const btn = inp.parentElement.querySelector('.lt-btn'); btn.innerHTML = chip(C.effLetter(it, c), c?.override);
}
async function setCellGrade(cfg, sid, it, c, letter) {
  if (!letter) { // 恢复自动
    if (!c) return;
    const auto = c.raw != null ? C.autoLetter(it, c.raw) : C.autoLetter(it, c.score ?? c.grade);
    return X.db.upsertCell({ student_id: sid, term: X.term, name: it.name, raw: c.raw ?? null, score: c.score ?? null, grade: auto || c.grade, override: false });
  }
  return X.db.upsertCell({ student_id: sid, term: X.term, name: it.name, raw: c?.raw ?? null, score: c?.score ?? null, grade: letter, override: true });
}
async function pasteGrid(cfg, e, inp, stus, items) {
  const txt = (e.clipboardData || window.clipboardData).getData('text');
  if (!/[\n\t]/.test(txt.trim())) return; // 单格粘贴走默认行为
  e.preventDefault();
  const grid = txt.replace(/\r/g, '').replace(/\n+$/, '').split('\n').map(r => r.split('\t'));
  const r0 = stus.findIndex(s => s.id === inp.dataset.s), c0 = items.findIndex(i => i.id === inp.dataset.i);
  const rows = []; let skipped = 0;
  grid.forEach((line, dr) => line.forEach((val, dc) => {
    const s = stus[r0 + dr], it = items[c0 + dc]; if (!s || !it) return;
    const t = val.trim(); if (!t) return;
    const en = C.parseEntry(t); if (!en || en.bad) { skipped++; return; }
    const old = cellsOf(s.id, cfg)[it.id]; const keep = old?.override && old.grade;
    rows.push({ student_id: s.id, term: X.term, name: it.name, raw: t, score: en.num ?? null, grade: keep ? old.grade : C.autoLetter(it, t), override: !!keep });
  }));
  if (rows.length) await X.db.bulkUpsertCells(rows);
  X.toast(`已粘贴 ${rows.length} 格${skipped ? `，${skipped} 格看不懂已跳过` : ''}`); X.rerender();
}

function editItem(cfg, it) {
  const groups = []; const seen = new Set();
  Object.values(cfg.tracks).forEach(t => t.cats.forEach(c => c.groups.forEach(g => { if (!seen.has(g.id)) { seen.add(g.id); groups.push([g.id, `${c.name} › ${g.name}`]); } })));
  const v = it || { name: '', group: groups[0]?.[0], mode: 'raw', max: 30 };
  X.modal(`<h3>${it ? '编辑考核项' : '新增考核项'}</h3>
    <div class="sec">名称</div><input type="text" id="eiName" value="${X.h(v.name)}" placeholder="例如：听写1">
    <div class="sec">属于哪个小组（决定占比）</div><select id="eiGroup">${groups.map(([id, n]) => `<option value="${id}" ${v.group === id ? 'selected' : ''}>${X.h(n)}</option>`).join('')}</select>
    <div class="sec">怎么换算成等级</div><select id="eiMode">${Object.entries(MODE_NAME).map(([k, n]) => `<option value="${k}" ${v.mode === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
    <label class="tgl" style="margin-top:4px"><input type="checkbox" id="eiShow" ${v.show ? 'checked' : ''}> 对学生可见（录完、调完等级之后再开）</label>
    <div id="eiMaxWrap"><div class="sec">满分</div><input type="number" id="eiMax" value="${v.max ?? ''}"><div class="hint" id="eiHint"></div></div>
    <button class="mbtn primary" id="eiOk">保存</button>${it ? '<button class="mbtn red" id="eiDel">删除这个考核项（连同所有人的分数）</button>' : ''}<button class="mbtn" id="mClose">取消</button>`);
  const syncMode = () => {
    const m = document.getElementById('eiMode').value, w = document.getElementById('eiMaxWrap');
    w.style.display = m === 'raw' ? '' : 'none';
    const mx = Number(document.getElementById('eiMax').value), r = C.tableRow(mx);
    document.getElementById('eiHint').textContent = m === 'raw' && mx > 0 ? (!r ? '满分太小，官方表查不到，改按百分比换算' : r.exact ? `官方表有满分 ${mx} 这一行` : `官方表没有满分 ${mx}，按最近的 ${r.hps} 行查`) : '';
  };
  document.getElementById('eiMode').onchange = syncMode; document.getElementById('eiMax').oninput = syncMode; syncMode();
  document.getElementById('eiOk').onclick = async () => {
    const name = document.getElementById('eiName').value.trim(), mode = document.getElementById('eiMode').value;
    const max = mode === 'oral' ? 35 : mode === 'pct' ? 100 : mode === 'letter' ? null : Number(document.getElementById('eiMax').value);
    if (!name) return X.toast('先写个名称');
    if (mode === 'raw' && !(max > 0)) return X.toast('满分要填一个正数');
    if (cfg.items.some(i => i.name === name && i !== it)) return X.toast('已经有同名的考核项了');
    const next = JSON.parse(JSON.stringify(cfg)); const ids = X.students().map(s => s.id);
    if (it) {
      const t = next.items.find(i => i.id === it.id); const oldName = t.name;
      Object.assign(t, { name, group: document.getElementById('eiGroup').value, mode, max, show: document.getElementById('eiShow').checked });
      if (oldName !== name) await X.db.renameItemCells(X.term, ids, oldName, name);
      const rows = X.store.exams.filter(e => e.term === X.term && e.name === name && ids.includes(e.student_id) && !e.override)
        .map(e => ({ student_id: e.student_id, term: e.term, name: e.name, raw: e.raw ?? null, score: e.score ?? null, grade: C.autoLetter(t, e.raw ?? e.score ?? e.grade) || e.grade, override: false }))
        .filter(r => { const o = X.store.exams.find(e => e.student_id === r.student_id && e.term === r.term && e.name === r.name); return o.grade !== r.grade; });
      if (rows.length) await X.db.bulkUpsertCells(rows);
    } else next.items.push({ id: C.newItemId(), name, group: document.getElementById('eiGroup').value, mode, max, show: document.getElementById('eiShow').checked });
    await saveCfg(next); X.closeModal(); X.rerender();
  };
  const del = document.getElementById('eiDel');
  if (del) del.onclick = async () => {
    if (!confirm(`删除「${it.name}」以及所有人这一项的分数？`)) return;
    const next = JSON.parse(JSON.stringify(cfg)); next.items = next.items.filter(i => i.id !== it.id);
    await X.db.deleteItemCells(X.term, X.students().map(s => s.id), it.name); await saveCfg(next); X.closeModal(); X.rerender();
  };
}

// ---------- 分布 ----------
function distTab(body, cfg) {
  const stus = X.students();
  const cards = [];
  // 总等级（目前）
  const finals = stus.map(s => ({ s, l: result(s.id, cfg).final }));
  cards.push({ id: '__final', title: '总等级（目前）', sub: '各分类已录部分折算', by: Object.fromEntries(C.LETTERS.map(l => [l, finals.filter(x => x.l === l).map(x => x.s)])), none: finals.filter(x => !x.l).map(x => x.s) });
  cfg.items.forEach(it => { const d = C.distribution(it, stus, sid => cellsOf(sid, cfg)); cards.push({ id: it.id, title: it.name, sub: `${itemLabel(cfg, it)} · ${it.mode === 'pct' ? '百分比' : it.mode === 'oral' ? '口语 /35' : it.mode === 'letter' ? '字母' : '满分 ' + it.max}`, ...d }); });
  body.innerHTML = `<div class="gb-cards">${cards.map(c => {
    const n = C.LETTERS.reduce((a, l) => a + c.by[l].length, 0);
    const open = gb.open && gb.open.startsWith(c.id + ':') ? gb.open.split(':')[1] : null;
    return `<div class="dcard"><div class="dhd"><b>${X.h(c.title)}</b><span>${X.h(c.sub)}</span><div class="grow"></div><span>${n} 人已录${c.none.length ? ` · 未录 ${c.none.length}` : ''}</span></div>
      <div class="dbar">${n ? C.LETTERS.filter(l => c.by[l].length).map(l => `<button class="seg-${l.replace('+', 'p')}" style="flex:${c.by[l].length}" data-dl="${c.id}:${l}">${l}<b>${c.by[l].length}</b></button>`).join('') : '<span class="mute">还没有分数</span>'}</div>
      <div class="dchips">${C.LETTERS.map(l => `<button class="dchip ${open === l ? 'on' : ''} ${l === 'F' && c.by[l].length ? 'f' : ''}" data-dl="${c.id}:${l}">${l} <b>${c.by[l].length}</b></button>`).join('')}${c.none.length ? `<button class="dchip ${open === 'none' ? 'on' : ''}" data-dl="${c.id}:none">未录 <b>${c.none.length}</b></button>` : ''}</div>
      ${open ? `<div class="dnames ${open === 'F' ? 'f' : ''}">${(open === 'none' ? c.none : c.by[open]).map(s => `<span>${s.num ?? ''} ${X.h(s.name)}</span>`).join('') || '<span class="mute">没有人</span>'}</div>` : ''}</div>`;
  }).join('')}</div>`;
  body.querySelectorAll('[data-dl]').forEach(b => b.onclick = () => { gb.open = gb.open === b.dataset.dl ? null : b.dataset.dl; X.rerender(); });
}

// ---------- 表现 ----------
function behav(body, cfg) {
  const stus = X.students();
  const rows = stus.map(s => { const r = result(s.id, cfg); return { s, r, b: behavior(s.id, r) }; });
  const opt = (cur, sug) => `<option value="">建议 ${sug}</option>${C.CE.map(l => `<option value="${l}" ${cur === l ? 'selected' : ''}>${l} ${C.CE_NAME[l]}</option>`).join('')}`;
  body.innerHTML = `<div class="gb-sum"><span class="mute">笔记抽检点一下 ✓ / △ / ✗ 记一次（记今天）。Conduct / Effort / PTC 先给建议，下拉改了就以你的为准。</span></div>
    <div class="gb-scroll"><table class="gb-table bh"><thead><tr><th class="l">#</th><th class="l">姓名</th><th>课堂分</th><th>笔记抽检</th><th>Green Slip</th><th>Conduct</th><th>Effort</th><th>PTC</th><th class="l">备注</th></tr></thead>
    <tbody>${rows.map(({ s, b }) => { const rep = repOf(s.id) || {}; return `<tr class="${b.ptc ? 'rowP' : ''}"><td class="l num">${s.num ?? ''}</td><td class="l nm">${X.h(s.name)}</td>
      <td class="pts">${X.score(s.id)}<small class="${b.delta < 0 ? 'neg' : 'pos'}">${b.delta >= 0 ? '+' : ''}${b.delta}</small></td>
      <td><div class="nbq"><button data-nb="ok:${s.id}" class="ok">✓</button><button data-nb="part:${s.id}" class="pt">△</button><button data-nb="miss:${s.id}" class="ms">✗</button><button class="cnt" data-list="notebook:${s.id}">${b.nb.ok + b.nb.part + b.nb.miss ? `${b.nb.ok}·${b.nb.part}·<span class="${b.nb.miss ? 'neg' : ''}">${b.nb.miss}</span>` : '—'}</button></div></td>
      <td><div class="nbq"><button data-slip="${s.id}" class="sl">＋绿条</button><button class="cnt" data-list="slip:${s.id}">${b.slips ? `<span class="slip">${b.slips}</span>` : '—'}</button></div></td>
      <td><select class="ce-sel ce-${b.conduct}${b.conductManual ? ' man' : ''}" data-ce="conduct:${s.id}" title="${X.h(b.sug.why.conduct.join('；'))}">${opt(rep.conduct, b.sug.conduct)}</select></td>
      <td><select class="ce-sel ce-${b.effort}${b.effortManual ? ' man' : ''}" data-ce="effort:${s.id}" title="${X.h(b.sug.why.effort.join('；'))}">${opt(rep.effort, b.sug.effort)}</select></td>
      <td><button class="ptc-btn ${b.ptc ? 'on' : ''} ${b.ptcManual ? 'man' : ''}" data-ptc="${s.id}" title="${X.h(b.sug.why.ptc.join('；') || '没有触发条件')}">${b.ptc ? 'PTC' : '–'}<small>${b.ptcManual ? '手定' : b.ptc ? '建议' : ''}</small></button></td>
      <td class="l"><input class="note" data-note="${s.id}" value="${X.h(rep.note || '')}" placeholder="备注" autocomplete="off"></td></tr>`; }).join('')}</tbody></table></div>`;
  const today = X.today();
  body.querySelectorAll('[data-nb]').forEach(b => b.onclick = async () => { const [v, sid] = b.dataset.nb.split(':'); await X.db.addMark({ student_id: sid, class_id: X.classId, term: X.term, kind: 'notebook', val: v, on_date: today }); X.toast(`记了一次 ${{ ok: '✓', part: '△', miss: '✗' }[v]}`); X.rerender(); });
  body.querySelectorAll('[data-slip]').forEach(b => b.onclick = async () => { const r = prompt('Green Slip 原因（可留空）：', ''); if (r === null) return; await X.db.addMark({ student_id: b.dataset.slip, class_id: X.classId, term: X.term, kind: 'slip', reason: r.trim() || null, on_date: today }); X.rerender(); });
  body.querySelectorAll('[data-list]').forEach(b => b.onclick = () => { const [kind, sid] = b.dataset.list.split(':'); markList(kind, sid); });
  body.querySelectorAll('[data-ce]').forEach(sel => sel.onchange = async () => { const [f, sid] = sel.dataset.ce.split(':'); await X.db.upsertReport(sid, X.term, { [f]: sel.value || null }); X.rerender(); });
  body.querySelectorAll('[data-ptc]').forEach(b => b.onclick = async () => { const sid = b.dataset.ptc; const cur = repOf(sid)?.ptc; await X.db.upsertReport(sid, X.term, { ptc: cur == null ? true : cur === true ? false : null }); X.rerender(); });
  body.querySelectorAll('[data-note]').forEach(i => i.onchange = () => X.db.upsertReport(i.dataset.note, X.term, { note: i.value.trim() || null }));
}
function markList(kind, sid) {
  const st = X.store.students.find(x => x.id === sid), ms = marksOf(sid, kind).slice().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  const sym = { ok: '✓', part: '△', miss: '✗' };
  X.modal(`<h3>${X.h(st.name)} · ${kind === 'slip' ? 'Green Slip' : '笔记抽检'}（${X.h(X.term)}）</h3>
    ${ms.length ? ms.map(m => `<div class="rec"><span class="d">${m.on_date ? m.on_date.slice(5).replace('-', '/') : ''}</span><span class="v ${m.val === 'miss' ? 'neg' : m.val === 'ok' ? 'pos' : ''}">${kind === 'slip' ? '' : sym[m.val] || ''}</span><span class="r">${X.h(m.reason || '')}</span><button class="x" data-dm="${m.id}">删</button></div>`).join('') : '<div class="hint">还没有记录</div>'}
    <button class="mbtn" id="mClose">关闭</button>`);
  document.querySelectorAll('[data-dm]').forEach(b => b.onclick = async () => { await X.db.deleteMark(b.dataset.dm); X.closeModal(); X.rerender(); });
}

// ---------- 设置 ----------
function settingsTab(body, cfg) {
  const st = X.store.settings, stus = X.students();
  const viewOn = !!(st.student_view || {})[X.classId];
  const pinned = stus.filter(s => s.pin).length;
  const base = location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '');
  const studentUrl = base + 's.html';
  const R = rules();
  body.innerHTML = `<div class="gb-set">
    ${cfg ? `<section><h4>占比</h4><div class="hint">每个分类 = 学校系统里的一个综评（A1–A4）。分类下面的“小组”决定考核项怎么平均：同一小组里的考核项取平均，小组之间按占比加权。听写考两次、作业多几个都不用动这里，直接在“录分”里加考核项。</div><div id="wtEd"></div><div class="inline"><button class="btn primary" id="wtSave">保存占比</button><button class="btn" id="wtReset">重新套用模板</button></div></section>` : `<section><h4>占比</h4><button class="mbtn primary" id="gbTpl2" style="max-width:280px">套用模板</button></section>`}
    ${cfg && cfg.tracks.xce ? `<section><h4>去 XCE 的学生</h4><div class="hint">勾选的人按「${X.h(cfg.tracks.xce.name)}」算（只管 Xavier 的 40%），不勾的按 100%。中国老师的成绩回来后再合并。</div>
      <div class="xgrid">${stus.map(s => `<label><input type="checkbox" data-xce="${s.id}" ${(st.gb_track || {})[s.id] === 'xce' ? 'checked' : ''}> ${s.num ?? ''} ${X.h(s.name)}</label>`).join('')}</div></section>` : ''}
    <section><h4>学生自查</h4>
      <div class="hint">学生在 <b>${X.h(studentUrl)}</b> 选班级，输入学号、中文名和个人码，只能看到<b>当前学季</b>自己的课堂分，以及你在“录分”里设为「对学生可见」的单项考试成绩（👁）。看不到综评、总评 / Final grade、Conduct / Effort / PTC / Green Slip / 笔记抽检，也看不到以前的学季。连续输错 5 次锁 15 分钟。</div>
      <label class="tgl"><input type="checkbox" id="viewOn" ${viewOn ? 'checked' : ''}> 对 ${X.h(X.className)} 开放学生查询${viewOn ? '' : '（现在是关闭的，学生查不到）'}</label>
      <div class="inline"><button class="btn" id="pinGen">给没有个人码的人生成（${stus.length - pinned} 人）</button><button class="btn" id="pinCopy" ${pinned ? '' : 'disabled'}>复制 学号/姓名/个人码</button><button class="btn primary" id="pinNotice" ${pinned ? '' : 'disabled'}>生成给学生的通知</button><button class="btn red" id="pinAll">全部重新生成</button></div>
      <div class="hint">已有个人码 ${pinned} / ${stus.length}。个人码只有你能看到，复制出来发给学生本人。</div></section>
    <section><h4>Conduct / Effort / PTC 建议规则</h4>
      <div class="hint">这些只是“建议”的依据，最终以你在“表现”里选的为准。课堂分用的是本季相对起始分（${X.baseScore()}）的变化。</div>
      <div class="rgrid">
        ${['O', 'V', 'G', 'S'].map(l => `<label>课堂分变化 ≥ <input type="number" data-r="pointsDelta.${l}" value="${R.pointsDelta[l]}"> → ${l}</label>`).join('')}
        ${['O', 'V', 'G', 'S'].map(l => `<label>笔记平均 ≥ <input type="number" step="0.05" data-r="notebook.${l}" value="${R.notebook[l]}"> → ${l}</label>`).join('')}
        ${[1, 2, 3].map(n => `<label>Green Slip ${n}${n === 3 ? '+' : ''} 次 → 最高 <select data-r="slipCap.${n}">${['O', 'V', 'G', 'S', 'U'].map(l => `<option ${R.slipCap[n] === l ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`).join('')}
        <label>Slip ≥ <input type="number" data-r="ptcSlips" value="${R.ptcSlips}"> 次 → PTC</label>
        <label>笔记 ✗ ≥ <input type="number" data-r="ptcNotebookMiss" value="${R.ptcNotebookMiss}"> 次 → PTC</label>
        <label>Conduct / Effort 到 <select data-r="ptcConductEffort">${['V', 'G', 'S', 'U'].map(l => `<option ${R.ptcConductEffort === l ? 'selected' : ''}>${l}</option>`).join('')}</select> 或更差 → PTC</label>
        <label>总等级到 <select data-r="ptcFinal">${C.LETTERS.slice(2).map(l => `<option ${R.ptcFinal === l ? 'selected' : ''}>${l}</option>`).join('')}</select> 或更差 → PTC</label>
      </div><div class="inline"><button class="btn primary" id="ruSave">保存规则</button><button class="btn" id="ruReset">恢复默认</button></div></section>
  </div>`;
  if (cfg) drawWeights(body, cfg);
  const tpl = body.querySelector('#gbTpl2'); if (tpl) tpl.onclick = async () => { await saveCfg(C.defaultConfig(X.classId.startsWith('G9') ? 'G9' : '10')); X.rerender(); };
  const reset = body.querySelector('#wtReset'); if (reset) reset.onclick = async () => {
    if (!confirm('重新套用模板会把占比设置恢复成默认，考核项列表保留（它们的小组归属可能要重新选）。继续？')) return;
    const t = C.defaultConfig(X.classId.startsWith('G9') ? 'G9' : '10'); t.items = cfg.items; await saveCfg(t); X.rerender();
  };
  body.querySelectorAll('[data-xce]').forEach(c => c.onchange = async () => { const m = { ...(st.gb_track || {}) }; if (c.checked) m[c.dataset.xce] = 'xce'; else delete m[c.dataset.xce]; await X.db.setSetting('gb_track', m); });
  body.querySelector('#viewOn').onchange = async e => { await X.db.setSetting('student_view', { ...(st.student_view || {}), [X.classId]: e.target.checked }); X.toast(e.target.checked ? '已开放学生查询' : '已关闭学生查询'); X.rerender(); };
  const gen = async all => {
    const used = new Set(stus.filter(s => s.pin && !all).map(s => s.pin)); const map = {};
    stus.forEach(s => { if (s.pin && !all) return; let p; do { p = String(Math.floor(Math.random() * 9000) + 1000); } while (used.has(p)); used.add(p); map[s.id] = p; });
    await X.db.setPins(map); X.toast(`生成了 ${Object.keys(map).length} 个个人码`); X.rerender();
  };
  body.querySelector('#pinGen').onclick = () => gen(false);
  body.querySelector('#pinAll').onclick = () => { if (confirm('全部重新生成会让学生手里的旧个人码失效。继续？')) gen(true); };
  body.querySelector('#pinNotice').onclick = () => studentNotices(stus, studentUrl);
  body.querySelector('#pinCopy').onclick = () => navigator.clipboard.writeText(['学号\t姓名\t个人码', ...stus.map(s => `${s.num ?? ''}\t${s.name}\t${s.pin || ''}`)].join('\n')).then(() => X.toast('已复制'), () => X.toast('复制失败'));
  const setPath = (o, path, v) => { const k = path.split('.'); let t = o; k.slice(0, -1).forEach(x => t = t[x]); t[k[k.length - 1]] = v; };
  body.querySelector('#ruSave').onclick = async () => {
    const r = JSON.parse(JSON.stringify(rules()));
    body.querySelectorAll('[data-r]').forEach(i => setPath(r, i.dataset.r, i.tagName === 'SELECT' ? i.value : Number(i.value)));
    await X.db.setSetting('gb_rules', r); X.toast('规则已保存'); X.rerender();
  };
  body.querySelector('#ruReset').onclick = async () => { await X.db.setSetting('gb_rules', null); X.rerender(); };
}
function drawWeights(body, cfg) {
  const ed = body.querySelector('#wtEd'); const h = X.h;
  const work = JSON.parse(JSON.stringify(cfg));
  const draw = () => {
    ed.innerHTML = Object.entries(work.tracks).map(([tk, t]) => `<div class="trk"><div class="trk-h"><b>${h(t.name)}</b><span class="mute" data-sum="${tk}"></span></div>
      ${t.cats.map((c, ci) => `<div class="cat"><div class="inline"><input type="text" data-f="${tk}.${ci}.name" value="${h(c.name)}"><input type="number" class="w" data-f="${tk}.${ci}.weight" value="${c.weight}"><span class="mute">%</span><button class="x" data-delcat="${tk}.${ci}">删</button></div>
        ${c.groups.map((g, gi) => `<div class="inline wgrp"><span class="mute">└</span><input type="text" data-f="${tk}.${ci}.g.${gi}.name" value="${h(g.name)}"><input type="number" class="w" data-f="${tk}.${ci}.g.${gi}.weight" value="${g.weight}"><span class="mute">%</span><button class="x" data-delgrp="${tk}.${ci}.${gi}">删</button></div>`).join('')}
        <button class="btn sm" data-addgrp="${tk}.${ci}">＋ 小组</button></div>`).join('')}
      <button class="btn sm" data-addcat="${tk}">＋ 分类</button></div>`).join('');
    const sums = () => Object.entries(work.tracks).forEach(([tk, t]) => {
      const tot = t.cats.reduce((a, c) => a + c.weight, 0); const el = ed.querySelector(`[data-sum="${tk}"]`);
      const bad = t.cats.filter(c => c.groups.reduce((a, g) => a + g.weight, 0) !== c.weight);
      el.textContent = `分类合计 ${tot}%${bad.length ? ` · ⚠ ${bad.map(c => c.name).join('、')} 的小组合计和分类占比不一致` : ''}`;
    });
    sums();
    ed.querySelectorAll('[data-f]').forEach(i => i.oninput = () => {
      const p = i.dataset.f.split('.'), t = work.tracks[p[0]], c = t.cats[+p[1]];
      const val = i.type === 'number' ? Number(i.value) || 0 : i.value;
      if (p[2] === 'g') c.groups[+p[3]][p[4]] = val; else c[p[2]] = val; sums();
    });
    ed.querySelectorAll('[data-delcat]').forEach(b => b.onclick = () => { const [tk, ci] = b.dataset.delcat.split('.'); work.tracks[tk].cats.splice(+ci, 1); draw(); });
    ed.querySelectorAll('[data-delgrp]').forEach(b => b.onclick = () => { const [tk, ci, gi] = b.dataset.delgrp.split('.'); const g = work.tracks[tk].cats[+ci].groups[+gi]; if (work.items.some(i => i.group === g.id) && !confirm(`「${g.name}」下面已经有考核项，删掉后它们不会再计入这条线。继续？`)) return; work.tracks[tk].cats[+ci].groups.splice(+gi, 1); draw(); });
    ed.querySelectorAll('[data-addgrp]').forEach(b => b.onclick = () => { const [tk, ci] = b.dataset.addgrp.split('.'); work.tracks[tk].cats[+ci].groups.push({ id: 'g' + Math.random().toString(36).slice(2, 7), name: '新小组', weight: 0 }); draw(); });
    ed.querySelectorAll('[data-addcat]').forEach(b => b.onclick = () => { work.tracks[b.dataset.addcat].cats.push({ id: 'C' + Math.random().toString(36).slice(2, 5), name: '新分类', weight: 0, groups: [] }); draw(); });
  };
  draw();
  body.querySelector('#wtSave').onclick = async () => { await saveCfg(work); X.toast('占比已保存'); X.rerender(); };
}

// 每个学生一段完整的中英双语通知（网址 + 登录要填的每一项）
function studentNotice(s, url) {
  return `【成绩查询 Grade Check】
网址 Link: ${url}
请按下面填写 Please enter:
班级 Class: ${X.className}
学号 Number: ${s.num ?? ''}
中文名 Chinese name: ${s.name}
个人码 Personal code: ${s.pin}

这是你自己的个人码，不要告诉同学。This code is only for you. Please do not share it.
可以查看 You can see: 课堂分 class points + 老师公布的单项成绩 released test results.
总评 Final grade 由学校成绩系统统一公布。Final grades are published by the school system.
连续输错 5 次会锁 15 分钟。5 wrong tries lock you out for 15 minutes.`;
}
function studentNotices(stus, url) {
  const list = stus.filter(s => s.pin);
  X.modal(`<h3>给学生的通知 · ${X.h(X.className)}</h3><div class="hint">每人一段，点「复制」再粘贴到私信里发给本人。别发到班级群，个人码只有本人能知道。${list.length < stus.length ? ` 还有 ${stus.length - list.length} 人没有个人码，先回设置里生成。` : ''}</div>
    <button class="mbtn blue" id="ntAll">复制全班（每人一段，中间用分隔线隔开）</button>
    ${list.map(s => `<div class="rep-block"><div class="t"><span>${s.num ?? ''} ${X.h(s.name)}</span><button class="mbtn blue" data-nt="${s.id}" style="width:auto;padding:6px 14px;min-height:34px">复制</button></div><pre>${X.h(studentNotice(s, url))}</pre></div>`).join('')}
    <button class="mbtn" id="mClose">关闭</button>`, true);
  const copy = (t, msg) => navigator.clipboard.writeText(t).then(() => X.toast(msg), () => X.toast('复制失败'));
  document.getElementById('ntAll').onclick = () => copy(list.map(s => `${s.num ?? ''} ${s.name}\n${studentNotice(s, url)}`).join('\n\n----------------\n\n'), '已复制全班');
  document.querySelectorAll('[data-nt]').forEach(b => b.onclick = () => copy(studentNotice(list.find(s => s.id === b.dataset.nt), url), '已复制'));
}
