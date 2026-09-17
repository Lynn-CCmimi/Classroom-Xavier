import * as db from './db.js';
const { store } = db;

// ---------- 小工具 ----------
const $ = s => document.querySelector(s);
const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const WD = ['日', '一', '二', '三', '四', '五', '六'];
const fmtDate = s => { if (!s) return ''; const d = new Date(s + 'T00:00:00'); return `${d.getMonth() + 1}月${d.getDate()}日 周${WD[d.getDay()]}`; };
const CW_ORDER = [0, 1, 2, 3, 7, 6, 5, 4];
const GRADES = ['A+', 'A', 'B+', 'B', 'C', 'D', 'F'];
const ATT = { absent: 'Absent', late: 'Late', camera_off: 'Camera off', no_response: 'No response' };
const ATT_CN = { absent: '缺席', late: '迟到', camera_off: '摄像头没开', no_response: '无回应' };

const ICON = {
  menu: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  cal: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  wifi: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0M12 19h.01"/></svg>',
  rot: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>',
  tick: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>',
  x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};

// ---------- 状态 ----------
const ui = { cls: localStorage.getItem('cls_cur') || 'G9E', view: localStorage.getItem('cls_view') || (innerWidth < 760 ? 'list' : 'seat'), filter: null, swap: false, swapFirst: null };

// ---------- 派生数据 ----------
const S = () => store.settings;
const term = () => S().current_term || 'Q1';
const prevTerm = () => { const n = parseInt(term().slice(1)); return n > 1 ? 'Q' + (n - 1) : null; };
const cls = () => store.classes.find(c => c.id === ui.cls);
const stuById = id => store.students.find(s => s.id === id);
const classStudents = cid => store.students.filter(s => s.class_id === cid && s.active !== false).sort((a, b) => (a.num ?? 999) - (b.num ?? 999));
const classDate = c => (c.current_day ? (c.day_dates || {})[c.current_day] : (c.day_dates || {})._d0) || todayStr();
const lastNonZero = c => c.current_day || (c.day_dates || {})._last || 1;
const termEvents = sid => store.events.filter(e => e.student_id === sid && e.term === term());
const score = sid => 100 + termEvents(sid).reduce((a, e) => a + (e.kind === 'score' ? e.delta : 0), 0);
const called = sid => termEvents(sid).filter(e => e.kind === 'called' || (e.kind === 'score' && e.delta > 0)).length;
const prevExams = sid => { const t = prevTerm(); return t ? store.exams.filter(e => e.student_id === sid && e.term === t) : []; };
const risk = sid => { const g = prevExams(sid).map(e => e.grade); return g.includes('F') ? 'F' : g.includes('D') ? 'D' : null; };
const attOf = (sid, date) => store.attendance.find(a => a.student_id === sid && a.on_date === date);
const gradeOf = sc => { const th = S().grade_thresholds || []; return (th.find(t => sc >= t.min) || th[th.length - 1] || { label: '' }).label; };

function attText(a, which) { // which: 'att' | 'cam'
  if (!a) return [];
  const out = [];
  if (which === 'att') { if (a.flags.includes('absent')) out.push('Absent'); if (a.flags.includes('late')) out.push('Late' + (a.late_time ? ' ' + a.late_time : '')); }
  else { if (a.flags.includes('camera_off')) out.push('Camera off'); if (a.flags.includes('no_response')) out.push('No response' + (a.noresp_time ? ' ' + a.noresp_time : '')); }
  return out;
}
function attChip(a) {
  if (!a || !a.flags.length) return '';
  if (a.flags.includes('absent')) return '<span class="chip bad">缺席</span>';
  if (a.flags.includes('late')) return `<span class="chip warn">迟到${a.late_time ? ' ' + a.late_time : ''}</span>`;
  if (a.flags.includes('no_response')) return `<span class="chip purple">无回应${a.noresp_time ? ' ' + a.noresp_time : ''}</span>`;
  if (a.flags.includes('camera_off')) return '<span class="chip purple">摄像头</span>';
  return '';
}

// ---------- 渲染 ----------
function render() { renderHeader(); renderMain(); renderTabbar(); }

function renderHeader() {
  const c = cls(); if (!c) return;
  const date = classDate(c);
  const stus = classStudents(c.id);
  const nF = stus.filter(s => risk(s.id) === 'F').length, nZero = stus.filter(s => called(s.id) === 0).length;
  $('#hdr').innerHTML = `
    <div class="seg class-seg">${store.classes.map(x => `<button data-cls="${x.id}" class="${x.id === ui.cls ? 'on' : ''}">${h(x.name)}</button>`).join('')}</div>
    <button class="hbtn ${c.current_day ? '' : 'warn'}" id="dayBtn">${ICON.cal}<b>${c.current_day ? 'D' + c.current_day : 'D0 · 停课'}</b><span class="date-txt" style="color:var(--mute)">· ${fmtDate(date)}</span></button>
    <button class="hbtn ${c.is_online ? 'on' : ''}" id="onlineBtn">${ICON.wifi}${c.is_online ? '线上课' : '线下'}</button>
    ${c.id === 'G9E' ? `<button class="hbtn" id="rotBtn">${ICON.rot}轮转</button>` : ''}
    ${ui.swap ? `<button class="hbtn warn" id="swapOff">换座中 · 退出</button>` : ''}
    <div class="grow"></div>
    <div class="seg"><button data-view="seat" class="${ui.view === 'seat' ? 'on' : ''}">座位</button><button data-view="list" class="${ui.view === 'list' ? 'on' : ''}">名单</button></div>
    <button class="pill bad ${ui.filter === 'F' ? 'on' : ''}" data-filter="F">有 F · ${nF}</button>
    <button class="pill blue ${ui.filter === 'zero' ? 'on' : ''}" data-filter="zero">${term()} 0 次 · ${nZero}</button>
    <button class="icon-btn" id="menuBtn">${ICON.menu}</button>`;
}

function visible(sid) { if (!ui.filter) return true; return ui.filter === 'F' ? risk(sid) === 'F' : called(sid) === 0; }

function card(sid) {
  const s = stuById(sid); if (!s) return '<div class="card"></div>';
  const c = cls(); const a = attOf(sid, classDate(c)); const r = risk(sid);
  const abs = a && a.flags.includes('absent');
  return `<div class="card ${abs ? 'absent' : ''} ${visible(sid) ? '' : 'dim'} ${ui.swapFirst === sid ? 'sel' : ''}" data-id="${sid}">
    ${r ? `<span class="dot ${r === 'F' ? 'bad' : 'warn'}"></span>` : ''}
    <div class="nm">${h(s.name)}</div><div class="sc">${score(sid)}</div>
    ${attChip(a) || `<span class="sub">${pad(s.num ?? '')}</span>`}
    ${called(sid) === 0 ? '<span class="bar"></span>' : ''}</div>`;
}
function groupBlock(g, gi, layout) {
  const ids = g.student_ids;
  const hasHead = layout !== 'grid' && g.head !== false && ids.length >= 5;
  const inner = hasHead
    ? card(ids[0]).replace('class="card', 'class="card head') + ids.slice(1, 5).map(card).join('')
    : ids.slice(0, layout === 'grid' ? 4 : 4).map(card).join('') + (ids.length > 4 && !hasHead ? ids.slice(4).map(card).join('') : '');
  return `<div class="grp"><div class="grp-label ${g.head !== false && layout !== 'grid' ? 'head' : ''}" data-gi="${gi}">▸ ${h(g.name)}</div><div class="grp-grid">${inner}</div></div>`;
}
function renderMain() {
  const c = cls(); if (!c) return;
  const m = $('#main');
  if (ui.view === 'seat') {
    let order = c.groups.map((_, i) => i);
    if (c.id === 'G9E' && c.position_to_group) order = c.position_to_group;
    const layout = c.id === '10A' ? 'grid' : 'convex';
    const html = order.map(gi => groupBlock(c.groups[gi], gi, layout)).join('');
    m.innerHTML = `${ui.swap ? '<div class="swap-hint">换座模式：点第一个学生，再点第二个，完成互换</div>' : ''}
      <div class="room">${html}<div class="wb">WHITEBOARD · 黑板${c.id === 'G9E' ? ` · 已轮转 ${c.rotation_step || 0} 次` : ''}</div></div>
      <div class="legend"><span><i style="background:var(--bad)"></i>上季度有 F</span><span><i style="background:var(--warn)"></i>上季度有 D</span><span><i class="bar"></i>本季度还没被点过</span><span>单击 → 面板 · 长按 → 点过了</span></div>`;
  } else {
    const date = classDate(c);
    const rows = classStudents(c.id).map(s => {
      const r = risk(s.id), n = called(s.id), a = attOf(s.id, date);
      const att = [...attText(a, 'att'), ...attText(a, 'cam')].join(', ');
      return `<div class="row ${visible(s.id) ? '' : 'dim'}" data-id="${s.id}"><span class="num">${pad(s.num ?? '')}</span><span class="nm">${h(s.name)}${r ? ` <span class="dot ${r === 'F' ? 'bad' : 'warn'}" style="position:static;display:inline-block;margin-left:4px"></span>` : ''}</span><span class="eng">${h(s.eng_name || '')}</span><span class="sc">${score(s.id)}</span><span>${r ? `<span class="tag ${r === 'F' ? 'bad' : 'warn'}">${r}</span>` : '<span class="tag mute">—</span>'}</span><span class="c-call">${n === 0 ? '<span class="tag blue">0</span>' : `<b>${n}</b>`}</span><span class="c-att" style="font-size:12px;color:${a && a.flags.length ? 'var(--warn)' : 'var(--mute)'}">${att || '出勤'}</span></div>`;
    }).join('');
    m.innerHTML = `<div class="list"><div class="row h"><span>#</span><span>姓名</span><span class="eng">英文名</span><span>本季分</span><span>上季</span><span class="c-call">点名次数</span><span class="c-att">今日</span></div>${rows}</div>`;
  }
  bindCards();
}
function renderTabbar() {
  $('#tabbar').innerHTML = store.classes.map(x => `<button data-cls="${x.id}" class="${x.id === ui.cls ? 'on' : ''}">${h(x.name)}</button>`).join('');
}

// ---------- 卡片交互：单击 / 长按 ----------
function bindCards() {
  document.querySelectorAll('[data-id]').forEach(el => {
    let timer = null, fired = false, sx = 0, sy = 0;
    const id = el.dataset.id;
    el.onpointerdown = e => {
      fired = false; sx = e.clientX; sy = e.clientY;
      if (ui.swap) return;
      timer = setTimeout(() => { fired = true; markCalled(id, el); }, 450);
    };
    const cancel = () => { clearTimeout(timer); timer = null; };
    el.onpointermove = e => { if (Math.abs(e.clientX - sx) > 8 || Math.abs(e.clientY - sy) > 8) cancel(); };
    el.onpointerup = cancel; el.onpointercancel = cancel; el.onpointerleave = cancel;
    el.onclick = () => { if (fired) { fired = false; return; } ui.swap ? swapTap(id) : openPanel(id); };
    el.oncontextmenu = e => e.preventDefault();
  });
  document.querySelectorAll('.grp-label').forEach(el => el.onclick = () => openGroupPanel(parseInt(el.dataset.gi)));
}
async function markCalled(sid, el) {
  const c = cls();
  const ev = await db.addEvent({ student_id: sid, class_id: c.id, term: term(), kind: 'called', delta: 0, reason: '点名', day: c.current_day, on_date: classDate(c) });
  if (el) { el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 400); }
  if (navigator.vibrate) navigator.vibrate(20);
  toast(`已点名 · ${stuById(sid).name}`, async () => { await db.deleteEvent(ev.id); render(); });
  render();
}

// ---------- 学生面板 ----------
let panelSid = null;
function openPanel(sid) {
  panelSid = sid; const s = stuById(sid), c = cls(), date = classDate(c);
  const lib = S().lib || { plus: [], minus: [], big: [] };
  const a = attOf(sid, date) || { flags: [] };
  const on = f => a.flags.includes(f) ? 'on' : '';
  const ex = prevExams(sid);
  const recs = termEvents(sid).slice().reverse().slice(0, 12);
  const pt = prevTerm();
  const prevNeg = pt ? store.events.filter(e => e.student_id === sid && e.term === pt && e.kind === 'score' && e.delta < 0).reduce((m, e) => (m[e.reason] = (m[e.reason] || 0) + 1, m), {}) : {};
  const prevNegTxt = Object.entries(prevNeg).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([r, n]) => `${h(r)} ×${n}`).join(' · ');
  const sc = score(sid);
  $('#overlay').innerHTML = `<div class="dim-bg" id="panelBg"></div><div class="sheet">
    <div class="sheet-hd">
      <div><div class="name">${h(s.name)} <span class="meta">${pad(s.num ?? '')} · ${h(s.eng_name || '')}</span></div>
        <div class="meta">${term()} 点名 <b style="color:var(--ink)">${called(sid)}</b> 次${pt ? ` · ${pt} 总分 ${100 + store.events.filter(e => e.student_id === sid && e.term === pt && e.kind === 'score').reduce((x, e) => x + e.delta, 0)}` : ''}</div></div>
      <div class="grow"></div>
      <div style="display:flex;align-items:baseline;gap:8px"><span class="score">${sc}</span><span class="tag ${sc < 74 ? 'warn' : ''}" style="background:var(--green-soft);color:var(--green)">${h(gradeOf(sc))}</span></div>
      <button class="icon-btn" id="panelClose">${ICON.x}</button>
    </div>
    <div class="big-row"><button class="btn big blue" data-act="called">${ICON.tick}点过了</button><button class="btn big green" data-delta="1" data-reason="回答正确">+1 回答正确</button></div>
    <div class="two"><div class="col">
      <div class="sec">加分</div><div class="wrap">${lib.plus.map(([r, d]) => `<button class="btn green" data-delta="${d}" data-reason="${h(r)}">+${d} ${h(r)}</button>`).join('')}</div>
      <div class="sec">减分</div><div class="wrap">${[...lib.minus, ...lib.big].map(([r, d]) => `<button class="btn red" data-delta="${d}" data-reason="${h(r)}">${d} ${h(r)}</button>`).join('')}</div>
      <div class="inline"><input id="cusDelta" type="number" placeholder="±分" style="max-width:80px"><input id="cusReason" type="text" placeholder="原因"><button class="btn primary" id="cusOk">记一笔</button></div>
      <div class="sec">今日考勤 · ${fmtDate(date)} · 可多选</div>
      <div class="wrap">
        <button class="btn ${on('absent')}" data-att="absent">缺席</button>
        <button class="btn warn ${on('late')}" data-att="late">迟到 <span style="font-weight:400">${a.late_time || ''}</span></button>
        <button class="btn purple ${on('camera_off')}" data-att="camera_off">摄像头没开</button>
        <button class="btn purple ${on('no_response')}" data-att="no_response">无回应 <span style="font-weight:400">${a.noresp_time || ''}</span></button>
        ${a.flags.length ? '<button class="btn" data-att="clear">清除</button>' : ''}
      </div>
      ${a.flags.includes('late') || a.flags.includes('no_response') ? `<div class="inline">${a.flags.includes('late') ? `<span class="sec">迟到时间</span><input id="lateT" type="text" value="${h(a.late_time || '')}" placeholder="HH:MM" style="max-width:110px">` : ''}${a.flags.includes('no_response') ? `<span class="sec">无回应时间</span><input id="norT" type="text" value="${h(a.noresp_time || '')}" placeholder="HH:MM" style="max-width:110px">` : ''}<button class="btn" id="timeOk">保存时间</button></div>` : ''}
    </div><div class="col">
      ${pt ? `<div class="sec">${pt} 成绩</div><div class="wrap">${ex.length ? ex.map(e => `<div class="exam ${e.grade}"><span class="n">${h(e.name)}</span><span class="g">${h(e.grade)}</span></div>`).join('') : '<span class="hint" style="font-size:12px;color:var(--mute)">无</span>'}</div>
      ${prevNegTxt ? `<div class="sec">${pt} 扣分原因</div><div style="font-size:12px;color:var(--mute)">${prevNegTxt}</div>` : ''}` : ''}
      <div class="sec">${term()} 记录</div>
      <div>${recs.length ? recs.map(e => `<div class="rec"><span class="d">${e.on_date ? e.on_date.slice(5).replace('-', '/') : 'D' + (e.day || '?')}</span><span class="v ${e.kind === 'called' ? 'call' : e.delta > 0 ? 'pos' : 'neg'}">${e.kind === 'called' ? '点名' : (e.delta > 0 ? '+' : '') + e.delta}</span><span class="r">${h(e.reason || '')}</span><button class="x" data-del="${e.id}">删</button></div>`).join('') : '<div style="font-size:12px;color:var(--mute);padding:6px 0">还没有记录</div>'}</div>
    </div></div></div>`;
  $('#panelBg').onclick = closePanel; $('#panelClose').onclick = closePanel;
  const sheet = $('#overlay .sheet');
  sheet.querySelectorAll('[data-delta]').forEach(b => b.onclick = () => addScore(sid, parseInt(b.dataset.delta), b.dataset.reason, true));
  sheet.querySelector('[data-act=called]').onclick = async () => { await markCalled(sid); closePanel(); };
  $('#cusOk').onclick = () => { const d = parseInt($('#cusDelta').value), r = $('#cusReason').value.trim(); if (!d) return; addScore(sid, d, r || (d > 0 ? '加分' : '扣分'), true); };
  sheet.querySelectorAll('[data-att]').forEach(b => b.onclick = () => toggleAtt(sid, b.dataset.att));
  const tOk = $('#timeOk'); if (tOk) tOk.onclick = () => saveTimes(sid);
  sheet.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { await db.deleteEvent(b.dataset.del); openPanel(sid); render(); });
}
function closePanel() { panelSid = null; $('#overlay').innerHTML = ''; }
async function addScore(sid, delta, reason, close) {
  const c = cls();
  await db.addEvent({ student_id: sid, class_id: c.id, term: term(), kind: 'score', delta, reason, day: c.current_day, on_date: classDate(c) });
  toast(`${stuById(sid).name} ${delta > 0 ? '+' : ''}${delta} ${reason}`);
  render(); if (close) closePanel(); else openPanel(sid);
}
async function toggleAtt(sid, flag) {
  const c = cls(), date = classDate(c);
  const a = attOf(sid, date);
  if (flag === 'clear') { await db.deleteAttendance(sid, date); render(); openPanel(sid); return; }
  let flags = a ? [...a.flags] : [];
  let late_time = a?.late_time || null, noresp_time = a?.noresp_time || null;
  if (flags.includes(flag)) { flags = flags.filter(f => f !== flag); if (flag === 'late') late_time = null; if (flag === 'no_response') noresp_time = null; }
  else {
    if (flag === 'absent') { flags = ['absent']; late_time = noresp_time = null; }
    else { flags = flags.filter(f => f !== 'absent'); flags.push(flag); if (flag === 'late' && !late_time) late_time = nowHM(); if (flag === 'no_response' && !noresp_time) noresp_time = nowHM(); }
  }
  if (!flags.length) await db.deleteAttendance(sid, date);
  else await db.upsertAttendance({ student_id: sid, class_id: c.id, on_date: date, flags, late_time, noresp_time });
  render(); openPanel(sid);
}
async function saveTimes(sid) {
  const c = cls(), date = classDate(c), a = attOf(sid, date); if (!a) return;
  const lt = $('#lateT'), nt = $('#norT');
  await db.upsertAttendance({ ...a, late_time: lt ? lt.value.trim() || null : a.late_time, noresp_time: nt ? nt.value.trim() || null : a.noresp_time });
  toast('时间已保存'); render(); openPanel(sid);
}

// ---------- 全组 ----------
function openGroupPanel(gi) {
  const c = cls(), g = c.groups[gi]; if (!g) return;
  const lib = S().lib || { plus: [], minus: [] };
  modal(`<h3>${h(g.name)} · 全组</h3><div class="hint">${g.student_ids.map(id => h(stuById(id)?.name || '')).join('、')}</div>
    <div class="sec">加分</div><div class="wrap">${lib.plus.map(([r, d]) => `<button class="btn green" data-gd="${d}" data-gr="${h(r)}">+${d} ${h(r)}</button>`).join('')}</div>
    <div class="sec">减分</div><div class="wrap">${lib.minus.map(([r, d]) => `<button class="btn red" data-gd="${d}" data-gr="${h(r)}">${d} ${h(r)}</button>`).join('')}</div>
    <button class="mbtn" id="mClose">关闭</button>`);
  document.querySelectorAll('[data-gd]').forEach(b => b.onclick = async () => {
    for (const id of g.student_ids) await db.addEvent({ student_id: id, class_id: c.id, term: term(), kind: 'score', delta: parseInt(b.dataset.gd), reason: b.dataset.gr, day: c.current_day, on_date: classDate(c) });
    toast(`${g.name} 全组 ${b.dataset.gd > 0 ? '+' : ''}${b.dataset.gd}`); closeModal(); render();
  });
}

// ---------- 换座 / 轮转 ----------
function swapTap(id) {
  if (!ui.swapFirst) { ui.swapFirst = id; render(); return; }
  if (ui.swapFirst === id) { ui.swapFirst = null; render(); return; }
  const c = cls(); let pa, pb;
  c.groups.forEach((g, gi) => g.student_ids.forEach((sid, si) => { if (sid === ui.swapFirst) pa = [gi, si]; if (sid === id) pb = [gi, si]; }));
  if (pa && pb) { const groups = JSON.parse(JSON.stringify(c.groups)); groups[pa[0]].student_ids[pa[1]] = id; groups[pb[0]].student_ids[pb[1]] = ui.swapFirst; db.updateClass(c.id, { groups }); }
  ui.swapFirst = null; toast('已互换'); render();
}
async function rotate() {
  const c = cls(); if (!c.position_to_group) return;
  if (!confirm('确认顺时针轮转一次？')) return;
  const old = [...c.position_to_group], nM = [...old];
  for (let i = 0; i < 8; i++) nM[CW_ORDER[(i + 1) % 8]] = old[CW_ORDER[i]];
  await db.updateClass(c.id, { position_to_group: nM, rotation_step: (c.rotation_step || 0) + 1 });
  toast('已轮转'); render();
}

// ---------- D 几 / 日期 ----------
function countWeekdays(a, b) { const s = new Date(a + 'T00:00:00'), e = new Date(b + 'T00:00:00'); let n = 0; const c = new Date(s); c.setDate(c.getDate() + 1); while (c <= e) { const d = c.getDay(); if (d && d !== 6) n++; c.setDate(c.getDate() + 1); } return n; }
async function autoAdvance() {
  const today = todayStr(), dow = new Date().getDay();
  for (const c of store.classes) {
    if (!c.last_opened) { await db.updateClass(c.id, { last_opened: today }); continue; }
    if (c.last_opened === today) continue;
    if (dow === 0 || dow === 6) { await db.updateClass(c.id, { last_opened: today }); continue; }
    const w = countWeekdays(c.last_opened, today);
    if (w > 0) { const next = ((lastNonZero(c) - 1 + w) % 7) + 1; const day_dates = { ...(c.day_dates || {}), [next]: today, _last: next }; await db.updateClass(c.id, { current_day: next, day_dates, last_opened: today }); }
    else await db.updateClass(c.id, { last_opened: today });
  }
}
function openDayModal() {
  const c = cls();
  modal(`<h3>今天是 D 几？</h3><div class="hint">${h(c.name)} · 当前 ${c.current_day ? 'D' + c.current_day : 'D0 停课'} · ${fmtDate(classDate(c))}</div>
    <div class="days">${[1, 2, 3, 4, 5, 6, 7].map(d => `<button class="${d === c.current_day ? 'on' : ''}" data-day="${d}">D${d}</button>`).join('')}<button class="${c.current_day === 0 ? 'on' : ''}" data-day="0" style="color:var(--bad)">D0<br><small style="font-weight:500">停课</small></button></div>
    <div class="sec">这一天对应的日期</div><input type="date" id="dayDate" value="${classDate(c)}">
    <button class="mbtn primary" id="dayOk">保存</button><button class="mbtn blue" id="dayCal">📆 回看以前某一天</button><button class="mbtn" id="mClose">取消</button>`);
  let pick = c.current_day;
  document.querySelectorAll('[data-day]').forEach(b => b.onclick = () => { pick = parseInt(b.dataset.day); document.querySelectorAll('[data-day]').forEach(x => x.classList.toggle('on', x === b)); });
  $('#dayOk').onclick = async () => {
    const dt = $('#dayDate').value || todayStr();
    const day_dates = { ...(c.day_dates || {}) };
    if (pick) { day_dates[pick] = dt; day_dates._last = pick; } else { day_dates._d0 = dt; if (c.current_day) day_dates._last = c.current_day; }
    await db.updateClass(c.id, { current_day: pick, day_dates, last_opened: todayStr() }); closeModal(); render();
  };
  $('#dayCal').onclick = () => openCalendar();
}

// ---------- 回看日历 ----------
function classDates(cid) {
  const set = {};
  store.events.filter(e => e.class_id === cid && e.on_date).forEach(e => set[e.on_date] = (set[e.on_date] || 0) + 1);
  store.attendance.filter(a => a.class_id === cid).forEach(a => set[a.on_date] = (set[a.on_date] || 0) + 1);
  return set;
}
function dayOfDate(c, date) {
  const dd = c.day_dates || {};
  const k = Object.keys(dd).find(k => /^\d$/.test(k) && dd[k] === date);
  if (k) return parseInt(k);
  const e = store.events.find(e => e.class_id === c.id && e.on_date === date && e.day);
  return e ? e.day : null;
}
let calYM = null;
function openCalendar(ym) {
  const c = cls(); const marks = classDates(c.id);
  if (!ym) { const t = new Date(); ym = calYM || [t.getFullYear(), t.getMonth()]; }
  calYM = ym; const [y, m] = ym;
  const first = new Date(y, m, 1), startDow = first.getDay(), days = new Date(y, m + 1, 0).getDate();
  const today = todayStr();
  let cells = '';
  for (let i = 0; i < startDow; i++) cells += '<div></div>';
  for (let d = 1; d <= days; d++) {
    const ds = `${y}-${pad(m + 1)}-${pad(d)}`; const n = marks[ds];
    cells += `<button class="cal-d ${n ? 'has' : ''} ${ds === today ? 'today' : ''}" data-date="${ds}" ${n ? '' : 'disabled'}><span>${d}</span>${n ? `<i>${n}</i>` : ''}</button>`;
  }
  modal(`<h3>回看 · ${h(c.name)}</h3>
    <div class="inline" style="justify-content:space-between"><button class="btn" id="calPrev">‹ 上月</button><b>${y} 年 ${m + 1} 月</b><button class="btn" id="calNext">下月 ›</button></div>
    <div class="cal-head">${['日', '一', '二', '三', '四', '五', '六'].map(x => `<span>${x}</span>`).join('')}</div>
    <div class="cal-grid">${cells}</div>
    <div class="hint">有数字的日子表示那天有记录（条数）。点进去看详情。</div>
    <button class="mbtn" id="mClose">关闭</button>`);
  $('#calPrev').onclick = () => openCalendar(m === 0 ? [y - 1, 11] : [y, m - 1]);
  $('#calNext').onclick = () => openCalendar(m === 11 ? [y + 1, 0] : [y, m + 1]);
  document.querySelectorAll('.cal-d.has').forEach(b => b.onclick = () => openDayReview(b.dataset.date));
}
function openDayReview(date) {
  const c = cls(); const d = dayOfDate(c, date);
  const stus = classStudents(c.id);
  const atts = stus.map(s => [s, attOf(s.id, date)]).filter(([, a]) => a && a.flags.length);
  const evs = store.events.filter(e => e.class_id === c.id && e.on_date === date).sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
  const byStu = {}; evs.forEach(e => (byStu[e.student_id] = byStu[e.student_id] || []).push(e));
  const attHtml = atts.length ? atts.map(([s, a]) => `<div class="rec"><span class="r"><b>${h(s.name)}</b> <span class="hint">${pad(s.num ?? '')}</span></span><span style="font-size:12px;color:var(--warn)">${[...attText(a, 'att'), ...attText(a, 'cam')].map(x => ATT_CN_TXT(x)).join('、')}</span></div>`).join('') : '<div class="hint">全员出勤</div>';
  const evHtml = Object.keys(byStu).length ? stus.filter(s => byStu[s.id]).map(s => `<div class="rec"><span class="r"><b>${h(s.name)}</b></span><span style="font-size:12px;display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">${byStu[s.id].map(e => `<span class="tag ${e.kind === 'called' ? 'blue' : e.delta > 0 ? '' : 'bad'}" style="${e.delta > 0 ? 'background:var(--green-soft);color:var(--green)' : ''}">${e.kind === 'called' ? '点名' : (e.delta > 0 ? '+' : '') + e.delta + ' ' + h(e.reason || '')}</span>`).join('')}</span></div>`).join('') : '<div class="hint">没有加减分记录</div>';
  modal(`<h3>${fmtDate(date)}${d ? ` · D${d}` : ''}</h3><div class="hint">${h(c.name)} · ${date}</div>
    <div class="sec">考勤（${atts.length} 人）</div><div>${attHtml}</div>
    <div class="sec">加减分 / 点名（${evs.length} 条）</div><div>${evHtml}</div>
    <button class="mbtn blue" id="backCal">‹ 返回日历</button><button class="mbtn" id="mClose">关闭</button>`, true);
  $('#backCal').onclick = () => openCalendar();
}
const ATT_CN_TXT = x => x.replace('Absent', '缺席').replace('Late', '迟到').replace('Camera off', '摄像头没开').replace('No response', '无回应');

// ---------- 考勤报告 ----------
function allAttDates() { const s = new Set(store.attendance.map(a => a.on_date)); return [...s].sort().reverse(); }
function reportFor(cid, date) {
  const stus = classStudents(cid);
  const att = [], cam = [];
  stus.forEach(s => { const a = attOf(s.id, date); if (!a) return; const nm = s.eng_name || s.name; const t1 = attText(a, 'att'), t2 = attText(a, 'cam'); if (t1.length) att.push(`${nm} - ${t1.join(', ')}`); if (t2.length) cam.push(`${nm} - ${t2.join(', ')}`); });
  return { att, cam };
}
function openReport(date) {
  const dates = allAttDates(); if (!date) date = dates.includes(classDate(cls())) ? classDate(cls()) : dates[0] || todayStr();
  const blocks = store.classes.map(c => { const r = reportFor(c.id, date); return { c, r }; });
  const mailBody = blocks.map(({ c, r }) => `【${c.name} · 出勤】\n${r.att.join('\n') || 'All present'}\n\n【${c.name} · 摄像头 / 回应】\n${r.cam.join('\n') || '—'}`).join('\n\n');
  const gmail = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(S().report_email || '') + '&su=' + encodeURIComponent('考勤 ' + date) + '&body=' + encodeURIComponent(mailBody);
  modal(`<h3>线上考勤报告</h3>
    <div class="inline"><span class="sec">日期</span><select id="repDate">${[...new Set([date, ...dates])].map(d => `<option value="${d}" ${d === date ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
    ${blocks.map(({ c, r }, i) => `<div class="rep-block"><div class="t">${h(c.name)} <span class="hint">出勤 ${r.att.length} · 摄像头/回应 ${r.cam.length}</span></div>
      <div class="sec">出勤（Absent / Late）</div><pre id="ra${i}">${h(r.att.join('\n') || 'All present')}</pre><button class="btn" data-copy="ra${i}">复制出勤</button>
      <div class="sec">摄像头 / 回应（Camera off / No response）</div><pre id="rc${i}">${h(r.cam.join('\n') || '—')}</pre><button class="btn" data-copy="rc${i}">复制摄像头/回应</button></div>`).join('')}
    <a class="mbtn blue" style="text-decoration:none;display:flex;align-items:center;justify-content:center" href="${gmail}" target="_blank">用 Gmail 发给自己</a>
    <button class="mbtn" id="mClose">关闭</button>`, true);
  $('#repDate').onchange = e => openReport(e.target.value);
  document.querySelectorAll('[data-copy]').forEach(b => b.onclick = () => copyText($('#' + b.dataset.copy).textContent));
}
async function copyText(t) { try { await navigator.clipboard.writeText(t); toast('已复制'); } catch { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast('已复制'); } }

// ---------- 菜单 / 设置 ----------
function openMenu() {
  const items = [
    ['📅', '设置今天 D 几 / 日期', openDayModal],
    ['📆', '回看日历（以前某一天）', () => openCalendar()],
    ['📹', '线上考勤报告', () => openReport()],
    ['🔀', ui.swap ? '退出换座模式' : '换座模式', () => { ui.swap = !ui.swap; ui.swapFirst = null; closeModal(); render(); }],
    null,
    ['📝', '导入考试成绩（从 Google Sheets 粘贴）', openExamImport],
    ['📂', '导入旧系统备份 JSON（iPad 导出）', openOldImport],
    ['💾', '导出全部数据 JSON', exportJSON],
    null,
    ['✏️', '加减分项库', openLibEditor],
    ['📊', '等级线', openGradeEditor],
    ['✉️', '报告收件邮箱', () => { const v = prompt('Gmail 报告发给谁？', S().report_email || ''); if (v != null) db.setSetting('report_email', v.trim()); }],
    ['🆕', `开始新学季（当前 ${term()}）`, openNewTerm],
    null,
    ['🚪', '退出登录', async () => { await db.signOut(); location.reload(); }],
  ];
  modal(`<h3>菜单</h3><ul class="menu">${items.map((it, i) => it ? `<li data-mi="${i}"><span>${it[0]}</span>${it[1]}</li>` : '<li style="padding:4px;border:none;background:var(--bg)"></li>').join('')}</ul><button class="mbtn" id="mClose">关闭</button>`);
  document.querySelectorAll('[data-mi]').forEach(li => li.onclick = () => { closeModal(); items[li.dataset.mi][2](); });
}

function parseSheet(text, cid) {
  // 从 Google Sheets 直接复制的 TSV（含表头行）；也接受逗号分隔
  const lines = text.split(/\r?\n/).map(l => l.split(l.includes('\t') ? '\t' : ','));
  const hi = lines.findIndex(r => r.some(c => c.trim() === '学号'));
  if (hi < 0) throw new Error('找不到「学号」表头行——请从表头那一行开始复制');
  const hdr = lines[hi].map(c => c.trim().replace(/\s+/g, ''));
  const numCol = hdr.indexOf('学号');
  const skip = new Set(['#', '学号', '姓名', '中文姓名', '组别', '作业提交', '积分等级', 'Recitation', '课堂表现', 'Schoology', '加权均分', '总等级', 'C', 'E', '']);
  const cols = hdr.map((c, i) => [i, c]).filter(([, c]) => !skip.has(c) && !/^作业\d/.test(c));
  const byNum = Object.fromEntries(classStudents(cid).map(s => [s.num, s.id]));
  const rows = [], miss = [];
  for (const r of lines.slice(hi + 1)) {
    const num = parseInt((r[numCol] || '').trim()); if (!num) continue;
    const sid = byNum[num]; if (!sid) { miss.push(num); continue; }
    for (const [i, name] of cols) {
      const cell = (r[i] || '').trim(), nxt = (r[i + 1] || '').trim();
      let grade = null, sc = null;
      if (GRADES.includes(cell)) grade = cell; else if (GRADES.includes(nxt)) { grade = nxt; sc = parseFloat(cell); if (isNaN(sc)) sc = null; }
      if (grade) rows.push({ student_id: sid, term: term(), name, grade, score: sc });
    }
  }
  return { rows, miss };
}
function openExamImport() {
  modal(`<h3>导入考试成绩</h3><div class="hint">在 Google Sheets 里从「学号」那一行表头开始，选到最后一个学生，复制，粘到下面。会写入 <b>${term()}</b>，同名考试覆盖更新。</div>
    <select id="impCls">${store.classes.map(c => `<option value="${c.id}" ${c.id === ui.cls ? 'selected' : ''}>${h(c.name)}</option>`).join('')}</select>
    <select id="impTerm">${['Q1', 'Q2', 'Q3', 'Q4'].map(t => `<option ${t === term() ? 'selected' : ''}>${t}</option>`).join('')}</select>
    <textarea id="impTxt" placeholder="粘贴…"></textarea><div class="hint" id="impRes"></div>
    <button class="mbtn primary" id="impOk">导入</button><button class="mbtn" id="mClose">取消</button>`, true);
  $('#impOk').onclick = async () => {
    try {
      const t = $('#impTerm').value; const { rows, miss } = parseSheet($('#impTxt').value, $('#impCls').value);
      rows.forEach(r => r.term = t);
      if (!rows.length) { $('#impRes').textContent = '没有识别到任何成绩'; return; }
      await db.upsertExams(rows);
      $('#impRes').textContent = `已导入 ${rows.length} 条（${[...new Set(rows.map(r => r.name))].join('、')}）${miss.length ? '；找不到学号：' + miss.join(',') : ''}`;
      render();
    } catch (e) { $('#impRes').textContent = e.message; }
  };
}
function openOldImport() {
  modal(`<h3>导入旧系统备份</h3><div class="hint">把 iPad 上「导出备份 (JSON)」的内容粘进来。会把里面的加减分记录整体替换成所选学季、考勤合并进来、座位和 D 几更新；整包原样存一份备份。</div>
    <select id="oldTerm">${['Q1', 'Q2', 'Q3', 'Q4'].map(t => `<option ${t === (prevTerm() || term()) ? 'selected' : ''}>${t}</option>`).join('')}</select>
    <textarea id="oldTxt" placeholder="粘贴 JSON…"></textarea><div class="hint" id="oldRes"></div>
    <button class="mbtn primary" id="oldOk">导入</button><button class="mbtn" id="mClose">取消</button>`, true);
  $('#oldOk').onclick = async () => {
    try {
      const snap = JSON.parse($('#oldTxt').value); if (!snap.classes) throw new Error('格式不对');
      const t = $('#oldTerm').value; const evs = [], atts = [];
      for (const [cid, c] of Object.entries(snap.classes)) {
        const dd = c.dayDates || {};
        for (const [sid, s] of Object.entries(c.students)) {
          if (!stuById(sid)) continue;
          (s.records || []).forEach(r => evs.push({ id: crypto.randomUUID(), student_id: sid, class_id: cid, term: t, kind: 'score', delta: r.delta | 0, reason: r.desc || '', day: r.day || null, on_date: dd[r.day] || null, created_at: (dd[r.day] || '2026-08-01') + 'T08:00:00Z' }));
          for (const [d, v] of Object.entries(s.attendanceLog || {})) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !v) continue;
            let flags = [], late_time = null, noresp_time = null;
            if (v === 'X') flags = ['absent']; else if (v === 'Ø') flags = ['camera_off']; else if (v[0] === '?') { flags = ['no_response']; noresp_time = /^\d\d:\d\d$/.test(v.slice(1)) ? v.slice(1) : null; } else if (v[0] === 'L') { flags = ['late']; late_time = /^\d\d:\d\d$/.test(v.slice(1)) ? v.slice(1) : null; } else continue;
            atts.push({ student_id: sid, class_id: cid, on_date: d, flags, late_time, noresp_time });
          }
        }
        const cc = store.classes.find(x => x.id === cid);
        if (cc) await db.updateClass(cid, { groups: c.groups.map(g => ({ name: g.name, head: g.head !== false, student_ids: g.studentIds })), current_day: c.currentDay || cc.current_day, day_dates: c.dayDates || cc.day_dates, rotation_step: c.rotationStep ?? cc.rotation_step, position_to_group: c.positionToGroup ?? cc.position_to_group });
      }
      await db.replaceTermEvents(t, evs); await db.bulkUpsertAttendance(atts);
      await db.addBackup('旧系统备份 ' + todayStr(), snap);
      $('#oldRes').textContent = `完成：${evs.length} 条记录 → ${t}，${atts.length} 条考勤`; render();
    } catch (e) { $('#oldRes').textContent = e.message; }
  };
}
function exportJSON() {
  const t = JSON.stringify({ exported: new Date().toISOString(), ...store }, null, 1);
  modal(`<h3>全部数据 JSON</h3><div class="hint">点文字框全选复制，存到备忘录或发给自己</div><textarea readonly onclick="this.select()">${h(t)}</textarea><button class="mbtn primary" id="cpAll">复制全部</button><button class="mbtn" id="mClose">关闭</button>`, true);
  $('#cpAll').onclick = () => copyText(t);
}
function openLibEditor() {
  const lib = JSON.parse(JSON.stringify(S().lib || { plus: [], minus: [], big: [] }));
  const draw = () => {
    modal(`<h3>加减分项库</h3>${['plus', 'minus', 'big'].map(k => `<div class="sec">${{ plus: '加分', minus: '减分 (−1)', big: '大额扣分' }[k]}</div><div class="wrap">${lib[k].map(([r, d], i) => `<button class="btn ${d > 0 ? 'green' : 'red'}" data-k="${k}" data-i="${i}">${d > 0 ? '+' : ''}${d} ${h(r)} ✕</button>`).join('')}</div>
      <div class="inline"><input type="number" id="n_${k}" placeholder="分" style="max-width:70px"><input type="text" id="r_${k}" placeholder="原因"><button class="btn" data-add="${k}">加</button></div>`).join('')}
      <button class="mbtn primary" id="libOk">保存</button><button class="mbtn" id="mClose">取消</button>`);
    document.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { lib[b.dataset.k].splice(b.dataset.i, 1); draw(); });
    document.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { const k = b.dataset.add, d = parseInt($('#n_' + k).value), r = $('#r_' + k).value.trim(); if (!d || !r) return; lib[k].push([r, d]); draw(); });
    $('#libOk').onclick = async () => { await db.setSetting('lib', lib); closeModal(); toast('已保存'); };
  };
  draw();
}
function openGradeEditor() {
  const th = JSON.parse(JSON.stringify(S().grade_thresholds || []));
  modal(`<h3>等级线</h3>${th.map((t, i) => `<div class="inline"><b style="width:36px">${h(t.label)}</b><input type="number" data-g="${i}" value="${t.min}"><span class="hint">分以上</span></div>`).join('')}<button class="mbtn primary" id="gOk">保存</button><button class="mbtn" id="mClose">取消</button>`);
  $('#gOk').onclick = async () => { document.querySelectorAll('[data-g]').forEach(i => th[i.dataset.g].min = parseInt(i.value) || 0); await db.setSetting('grade_thresholds', th); closeModal(); render(); };
}
function openNewTerm() {
  const n = parseInt(term().slice(1)) + 1, next = 'Q' + n;
  modal(`<h3>开始 ${next}</h3><div class="hint">所有人分数回到 100，点名次数归零；${term()} 的分数、记录、成绩全部保留，成为「上季度」。这一步可以在菜单里再切回去。</div>
    <div class="sec">${next} 开始日期</div><input type="date" id="ntDate" value="${todayStr()}">
    <button class="mbtn primary" id="ntOk">确认开始 ${next}</button><button class="mbtn" id="mClose">取消</button>`);
  $('#ntOk').onclick = async () => { const ts = { ...(S().term_starts || {}), [next]: $('#ntDate').value }; await db.setSetting('term_starts', ts); await db.setSetting('current_term', next); closeModal(); toast(`已开始 ${next}`); render(); };
}

// ---------- 通用弹窗 / toast ----------
function modal(html, wide) { $('#modal').innerHTML = `<div class="modal" id="modalBg"><div class="box ${wide ? 'wide' : ''}">${html}</div></div>`; $('#modalBg').onclick = e => { if (e.target.id === 'modalBg') closeModal(); }; const c = $('#mClose'); if (c) c.onclick = closeModal; }
function closeModal() { $('#modal').innerHTML = ''; }
let toastT = null;
function toast(msg, undo) {
  const el = $('#toast'); el.innerHTML = `<span>${h(msg)}</span>${undo ? '<button id="undoBtn">撤销</button>' : ''}`; el.hidden = false;
  if (undo) $('#undoBtn').onclick = () => { undo(); el.hidden = true; };
  clearTimeout(toastT); toastT = setTimeout(() => el.hidden = true, undo ? 4000 : 1800);
}

// ---------- 事件绑定 ----------
document.addEventListener('click', e => {
  const t = e.target.closest('[data-cls],[data-view],[data-filter],#dayBtn,#onlineBtn,#rotBtn,#swapOff,#menuBtn');
  if (!t) return;
  if (t.dataset.cls) { ui.cls = t.dataset.cls; localStorage.setItem('cls_cur', ui.cls); ui.swapFirst = null; render(); }
  else if (t.dataset.view) { ui.view = t.dataset.view; localStorage.setItem('cls_view', ui.view); render(); }
  else if (t.dataset.filter) { ui.filter = ui.filter === t.dataset.filter ? null : t.dataset.filter; render(); }
  else if (t.id === 'dayBtn') openDayModal();
  else if (t.id === 'onlineBtn') { const c = cls(); db.updateClass(c.id, { is_online: !c.is_online }); render(); }
  else if (t.id === 'rotBtn') rotate();
  else if (t.id === 'swapOff') { ui.swap = false; ui.swapFirst = null; render(); }
  else if (t.id === 'menuBtn') openMenu();
});

// ---------- 启动 ----------
async function boot() {
  const app = $('#app'), login = $('#login');
  const s = await db.session();
  if (!s) {
    login.hidden = false;
    $('#loginForm').onsubmit = async e => { e.preventDefault(); $('#loginErr').textContent = ''; try { await db.signIn($('#u').value, $('#p').value); location.reload(); } catch (err) { $('#loginErr').textContent = '登录失败：' + (err.message || ''); } };
    return;
  }
  await db.loadAll();
  if (!store.classes.find(c => c.id === ui.cls)) ui.cls = store.classes[0]?.id;
  await autoAdvance();
  app.hidden = false; render();
  if (db.DEV) { const b = document.createElement('button'); b.textContent = 'DEV 重置数据'; b.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:9;font-size:11px;opacity:.5'; b.onclick = () => { db.devReset(); location.reload(); }; document.body.appendChild(b); }
}
boot().catch(e => { console.error(e); alert('加载失败：' + e.message); });
