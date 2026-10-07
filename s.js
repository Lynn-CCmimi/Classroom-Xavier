// 学生自查页：只调用受限的 cls_student_view 函数（服务器端只返回本人数据，不含 Conduct/Effort/PTC/Green Slip）。
import * as C from './gbcalc.js';
const CFG = window.CLASSROOM_CONFIG, $ = s => document.querySelector(s);
const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MSG = { bad: '信息不对，请检查后再试 · Details don\'t match', locked: '输错次数太多，请 15 分钟后再试 · Too many tries, try again in 15 minutes', closed: '老师还没有开放查询 · Not available yet' };
const lcls = l => l === 'A+' || l === 'A' ? 'hi' : l === 'F' ? 'lo' : '';
const chip = l => l ? `<span class="lt ${lcls(l)}">${h(l)}</span>` : '<span class="lt none">–</span>';

$('#f').onsubmit = async e => {
  e.preventDefault(); $('#err').textContent = '';
  const body = { p_class: $('#cls').value, p_num: parseInt($('#num').value, 10), p_name: $('#nm').value.trim(), p_pin: $('#pin').value.trim() };
  if (!body.p_num || !body.p_name || !body.p_pin) { $('#err').textContent = '请填写完整 · Please fill in everything'; return; }
  try {
    const r = await fetch(`${CFG.url}/rest/v1/rpc/cls_student_view`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: CFG.anonKey, Authorization: `Bearer ${CFG.anonKey}` }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.message || r.status);
    if (d.error) { $('#err').textContent = MSG[d.error] || '出错了 · Error'; return; }
    show(d);
  } catch (err) { $('#err').textContent = '网络出错，请稍后再试 · Network error'; console.error(err); }
};

function show(d) {
  const items = d.items || [];
  const byName = Object.fromEntries(items.map(i => [i.name, i]));
  const rows = (d.cells || []).filter(c => byName[c.name]).map(c => {
    const it = byName[c.name], l = C.effLetter(it, c);
    const num = c.score != null && it.mode === 'raw' ? `${c.score}/${it.max}` : c.score != null && it.mode === 'pct' ? `${c.score}%` : c.score != null && it.mode === 'oral' ? `${c.score}/35` : '';
    return { name: it.name, num, l, order: items.indexOf(it) };
  }).sort((a, b) => a.order - b.order);
  const out = $('#out');
  out.innerHTML = `<div class="card"><div class="who"><b>${h(d.student.name)}</b><span>${h(d.class_name || '')} · #${h(d.student.num)}</span></div>
    <div class="pts"><b>${h(d.points)}</b><span>课堂分 Class points (${h(d.term)})</span></div></div>
    <div class="card"><div class="who"><b>考试成绩 Test results</b></div>
      ${rows.length ? rows.map(r => `<div class="it"><span>${h(r.name)}</span><span><em>${h(r.num)}</em>${chip(r.l)}</span></div>`).join('') : '<div class="note">目前还没有公布的成绩。 No results released yet.</div>'}
      <div class="note">这里只显示老师已公布的单项成绩。总评 Final grade 由学校成绩系统统一公布。 Only released test results are shown here. Final grades are published by the school system.</div></div>
    <button class="back" id="back">返回 Back</button>`;
  out.hidden = false; $('#f').hidden = true;
  $('#back').onclick = () => { out.hidden = true; $('#f').hidden = false; $('#pin').value = ''; };
}
