// 数据层。所有数据一次性拉到内存（三个班加起来几千行），页面从内存渲染，
// 写操作先改内存再写后台。本地预览（file:// 或 ?dev）用 dev-seed.json + localStorage，不碰后台。

const CONFIG = window.CLASSROOM_CONFIG || {};
export const DEV = location.protocol === 'file:' || /[?&]dev\b/.test(location.search);
const DEV_KEY = 'cls_dev_store_v1';

export const store = { classes: [], students: [], events: [], attendance: [], exams: [], settings: {} };

let client = null;
async function sb() {
  if (client) return client;
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  client = createClient(CONFIG.url, CONFIG.anonKey);
  return client;
}

// ---------- 登录 ----------
export async function session() {
  if (DEV) return { user: { email: 'dev' } };
  const db = await sb();
  const { data } = await db.auth.getSession();
  return data.session;
}
export async function signIn(username, password) {
  const db = await sb();
  const email = `${String(username).trim().toLowerCase()}@${CONFIG.emailDomain}`;
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) throw error;
}
export async function signOut() {
  if (DEV) return;
  const db = await sb();
  await db.auth.signOut();
}

// ---------- 读 ----------
async function fetchAll(table, order) {
  const db = await sb();
  const out = [];
  for (let from = 0; ; from += 1000) {
    let q = db.from(table).select('*').range(from, from + 999);
    if (order) q = q.order(order);
    const { data, error } = await q;
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

export async function loadAll() {
  if (DEV) {
    const saved = localStorage.getItem(DEV_KEY);
    const src = saved ? JSON.parse(saved) : await (await fetch('dev-seed.json')).json();
    Object.assign(store, src);
    store.events.forEach((e, i) => { if (!e.id) e.id = 'dev_' + i; if (!e.created_at) e.created_at = (e.on_date || '2026-08-01') + 'T08:00:00Z'; });
    store.attendance.forEach((a, i) => { if (!a.id) a.id = 'deva_' + i; });
    return;
  }
  const [classes, students, events, attendance, exams, settings] = await Promise.all([
    fetchAll('cls_classes', 'sort'), fetchAll('cls_students'), fetchAll('cls_events', 'created_at'),
    fetchAll('cls_attendance'), fetchAll('cls_exams'), fetchAll('cls_settings'),
  ]);
  Object.assign(store, { classes, students, events, attendance, exams });
  store.settings = Object.fromEntries(settings.map(r => [r.key, r.value]));
}

function devSave() { if (DEV) localStorage.setItem(DEV_KEY, JSON.stringify(store)); }
export function devReset() { localStorage.removeItem(DEV_KEY); }

// ---------- 写 ----------
async function run(fn) {
  if (DEV) { devSave(); return; }
  const db = await sb();
  const { error } = await fn(db);
  if (error) { console.error(error); throw error; }
}

export async function addEvent(e) {
  const row = { id: crypto.randomUUID(), created_at: new Date().toISOString(), kind: 'score', delta: 0, reason: null, day: null, on_date: null, ...e };
  store.events.push(row);
  await run(db => db.from('cls_events').insert(row));
  return row;
}
export async function deleteEvent(id) {
  store.events = store.events.filter(e => e.id !== id);
  await run(db => db.from('cls_events').delete().eq('id', id));
}

export async function upsertAttendance(a) {
  const i = store.attendance.findIndex(x => x.student_id === a.student_id && x.on_date === a.on_date);
  const row = { id: i >= 0 ? store.attendance[i].id : crypto.randomUUID(), late_time: null, noresp_time: null, ...a, updated_at: new Date().toISOString() };
  if (i >= 0) store.attendance[i] = row; else store.attendance.push(row);
  await run(db => db.from('cls_attendance').upsert(row, { onConflict: 'student_id,on_date' }));
}
export async function deleteAttendance(student_id, on_date) {
  store.attendance = store.attendance.filter(x => !(x.student_id === student_id && x.on_date === on_date));
  await run(db => db.from('cls_attendance').delete().eq('student_id', student_id).eq('on_date', on_date));
}

export async function updateClass(id, patch) {
  const c = store.classes.find(c => c.id === id);
  Object.assign(c, patch, { updated_at: new Date().toISOString() });
  await run(db => db.from('cls_classes').update({ ...patch, updated_at: c.updated_at }).eq('id', id));
}

export async function setSetting(key, value) {
  store.settings[key] = value;
  await run(db => db.from('cls_settings').upsert({ key, value }));
}

export async function upsertExams(rows) {
  rows.forEach(r => {
    const i = store.exams.findIndex(x => x.student_id === r.student_id && x.term === r.term && x.name === r.name);
    const row = { id: i >= 0 ? store.exams[i].id : crypto.randomUUID(), score: null, ...r, updated_at: new Date().toISOString() };
    if (i >= 0) store.exams[i] = row; else store.exams.push(row);
  });
  await run(db => db.from('cls_exams').upsert(rows.map(r => ({ score: null, ...r })), { onConflict: 'student_id,term,name' }));
}

export async function replaceTermEvents(term, rows) {
  // 导入旧系统 JSON 时用：整学季重灌
  store.events = store.events.filter(e => e.term !== term).concat(rows);
  if (DEV) { devSave(); return; }
  const db = await sb();
  let r = await db.from('cls_events').delete().eq('term', term); if (r.error) throw r.error;
  for (let i = 0; i < rows.length; i += 500) { r = await db.from('cls_events').insert(rows.slice(i, i + 500)); if (r.error) throw r.error; }
}
export async function bulkUpsertAttendance(rows) {
  rows.forEach(a => {
    const i = store.attendance.findIndex(x => x.student_id === a.student_id && x.on_date === a.on_date);
    if (i >= 0) store.attendance[i] = { ...store.attendance[i], ...a }; else store.attendance.push({ id: crypto.randomUUID(), ...a });
  });
  if (DEV) { devSave(); return; }
  const db = await sb();
  for (let i = 0; i < rows.length; i += 500) { const r = await db.from('cls_attendance').upsert(rows.slice(i, i + 500), { onConflict: 'student_id,on_date' }); if (r.error) throw r.error; }
}
export async function addBackup(label, payload) {
  await run(db => db.from('cls_backups').insert({ label, payload }));
}
