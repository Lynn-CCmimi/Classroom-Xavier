// 成绩簿计算层：纯函数，不碰 DOM / 数据库，Node 里也能跑（见 migrate/test_gbcalc.mjs）。
import { TT } from './gbtable.js';

export const LETTERS = ['A+', 'A', 'B+', 'B', 'C', 'D', 'F'];
export const DEFAULT_POINTS = { 'A+': 97, A: 93, 'B+': 87, B: 83, C: 75, D: 63, F: 50 };
export const PCT_LOWS = TT[100];                 // [95,88,81,74,67,60]：百分制 / 综评 / 总等级
const HPS_LIST = Object.keys(TT).map(Number).sort((a, b) => b - a);
const ORAL_LOWS = [6.5, 5.5, 4.5, 3.5, 2.5, 1.5]; // 口语考试：总分 ÷ 5 对照

const fromLows = (x, lows) => { const i = lows.findIndex(l => x >= l); return i < 0 ? 'F' : LETTERS[i]; };
export const letterFromPct = p => fromLows(p, PCT_LOWS);

// 满分不在表里：取不超过它的最近一行（>100 取 100）；比 14 还小的才退回百分制
export function tableRow(hps) {
  if (!(hps > 0)) return null;
  const hit = HPS_LIST.find(h => h <= hps);
  return hit ? { hps: hit, lows: TT[hit], exact: hit === hps } : null;
}
export function letterFromRaw(score, hps) {
  const r = tableRow(hps);
  if (!r) return letterFromPct(score / hps * 100);
  return fromLows(score, r.lows);
}
export const letterFromOral = raw => fromLows(raw / 5, ORAL_LOWS);

// 录入格 → 自动等级。item.mode: raw（有满分的卷子，查表）| pct（百分比）| oral | letter
export function parseEntry(text) {
  const t = String(text ?? '').trim().toUpperCase().replace('＋', '+');
  if (!t) return null;
  if (LETTERS.includes(t)) return { letter: t };
  const n = Number(t);
  return Number.isFinite(n) ? { num: n } : { bad: true };
}
export function autoLetter(item, text) {
  const e = parseEntry(text);
  if (!e || e.bad) return null;
  if (e.letter) return e.letter;
  if (item.mode === 'pct') return letterFromPct(e.num);
  if (item.mode === 'oral') return letterFromOral(e.num);
  return letterFromRaw(e.num, item.max);
}
// 手动调过的等级优先，永远不被自动值覆盖
export const effLetter = (item, cell) => !cell ? null : (cell.override && cell.grade) ? cell.grade : autoLetter(item, cell.raw ?? (cell.score != null ? String(cell.score) : cell.grade));

// ---------- 配置结构 ----------
// cfg = { items:[{id,name,group,mode,max}], tracks:{ std:{ cats:[{id,name,weight,groups:[{id,name,weight}]}] } } }
export const groupIds = track => track.cats.flatMap(c => c.groups.map(g => g.id));

const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const wmean = pairs => { // [[value, weight]] 忽略 null
  const p = pairs.filter(x => x[0] != null && x[1] > 0); const w = p.reduce((s, x) => s + x[1], 0);
  return w ? { v: p.reduce((s, x) => s + x[0] * x[1], 0) / w, w } : null;
};

// 一个学生在一份配置下的全部结果
// cells: { itemId: {raw, grade, override} }；ov: { catId: letter, final: letter }（老师手调的综评）
export function compute(cfg, trackKey, cells, ov = {}, points = DEFAULT_POINTS) {
  const track = cfg.tracks[trackKey] || Object.values(cfg.tracks)[0];
  const items = {}; cfg.items.forEach(it => { items[it.id] = it; });
  const itemOut = {};
  cfg.items.forEach(it => { const l = effLetter(it, cells[it.id]); itemOut[it.id] = l ? { letter: l, pts: points[l] } : null; });
  let totalW = 0, doneW = 0;
  const cats = track.cats.map(c => {
    const gs = c.groups.map(g => {
      const vals = cfg.items.filter(it => it.group === g.id).map(it => itemOut[it.id]?.pts).filter(v => v != null);
      return { id: g.id, name: g.name, weight: g.weight, v: mean(vals), n: vals.length };
    });
    const m = wmean(gs.map(g => [g.v, g.weight]));
    const gw = c.groups.reduce((s, g) => s + g.weight, 0);
    const auto = m ? letterFromPct(m.v) : null;
    const eff = ov[c.id] || auto;
    const val = ov[c.id] ? points[ov[c.id]] : (m ? m.v : null);
    totalW += c.weight; if (val != null) doneW += c.weight * (m ? m.w / gw : 1);
    return { id: c.id, name: c.name, weight: c.weight, groups: gs, value: val, auto, letter: eff, overridden: !!ov[c.id], coverage: gw ? (m ? m.w / gw : 0) : 0 };
  });
  const t = wmean(cats.map(c => [c.value, c.weight]));
  const autoFinal = t ? letterFromPct(t.v) : null;
  return { items: itemOut, cats, total: t ? t.v : null, autoFinal, final: ov.final || autoFinal, finalOverridden: !!ov.final,
    coverage: totalW ? doneW / totalW : 0 };
}

// 单项分布：本班学生里各等级人数
export function distribution(item, students, cellsOf) {
  const out = Object.fromEntries(LETTERS.map(l => [l, []])); const none = [];
  students.forEach(s => { const l = effLetter(item, (cellsOf(s.id) || {})[item.id]); (l ? out[l] : none).push(s); });
  return { by: out, none };
}

// ---------- Conduct / Effort / PTC 建议（规则可在设置里改） ----------
export const CE = ['O', 'V', 'G', 'S', 'U'];            // Outstanding / Very Good / Good / Satisfactory / Unsatisfactory
export const CE_NAME = { O: 'Outstanding', V: 'Very Good', G: 'Good', S: 'Satisfactory', U: 'Unsatisfactory' };
export const DEFAULT_RULES = {
  // 本季课堂分相对起始分的变化 ≥ 该值 → 对应档（O 最好）
  pointsDelta: { O: 8, V: 4, G: -3, S: -9 },
  // 笔记抽检平均（✓=1 △=0.5 ✗=0）≥ 该值 → Effort 档
  notebook: { O: 0.9, V: 0.75, G: 0.55, S: 0.35 },
  slipCap: { 1: 'G', 2: 'S', 3: 'U' },                   // Green Slip 次数 → Conduct 最好只能到这一档
  ptcSlips: 2, ptcNotebookMiss: 2, ptcConductEffort: 'S', ptcFinal: 'F',
};
const rank = l => CE.indexOf(l);
const worse = (a, b) => rank(a) >= rank(b) ? a : b;
function tier(v, th) { for (const l of ['O', 'V', 'G', 'S']) if (v >= th[l]) return l; return 'U'; }

export function suggestCE({ delta, slips, nb, finalLetter }, rules = DEFAULT_RULES) {
  const why = { conduct: [], effort: [], ptc: [] };
  let conduct = tier(delta, rules.pointsDelta); why.conduct.push(`课堂分 ${delta >= 0 ? '+' : ''}${delta} → ${conduct}`);
  const cap = rules.slipCap[Math.min(slips, 3)];
  if (slips > 0 && cap) { const c2 = worse(conduct, cap); if (c2 !== conduct) why.conduct.push(`Green Slip ${slips} 次，最高只能 ${cap}`); conduct = c2; }
  const nbN = nb.ok + nb.part + nb.miss;
  let effort = tier(delta, rules.pointsDelta); why.effort.push(`课堂分 → ${effort}`);
  if (nbN) { const avg = (nb.ok + nb.part * 0.5) / nbN; const e2 = tier(avg, rules.notebook); why.effort.push(`笔记抽检 ${nbN} 次，平均 ${avg.toFixed(2)} → ${e2}`); effort = worse(effort, e2); }
  if (slips > 0) { const e3 = worse(effort, 'G'); if (e3 !== effort) why.effort.push('开过 Green Slip，最高 G'); effort = e3; }
  const reasons = [];
  if (slips >= rules.ptcSlips) reasons.push(`Green Slip ${slips} 次`);
  if (nb.miss >= rules.ptcNotebookMiss) reasons.push(`笔记抽检 ✗ ${nb.miss} 次`);
  if (rank(conduct) >= rank(rules.ptcConductEffort)) reasons.push(`Conduct ${conduct}`);
  if (rank(effort) >= rank(rules.ptcConductEffort)) reasons.push(`Effort ${effort}`);
  if (finalLetter && LETTERS.indexOf(finalLetter) >= LETTERS.indexOf(rules.ptcFinal)) reasons.push(`目前总等级 ${finalLetter}`);
  why.ptc = reasons;
  return { conduct, effort, ptc: reasons.length > 0, why };
}

// ---------- 默认模板（学季初一键套用，之后随便改） ----------
let _n = 0; const uid = p => p + (++_n).toString(36) + Math.random().toString(36).slice(2, 5);
const cat = (id, name, weight, groups) => ({ id, name, weight, groups });
export function defaultConfig(kind) {
  if (kind === 'G9') return {
    items: [],
    tracks: { std: { name: '标准', cats: [
      cat('A1', 'A1 Performance', 20, [{ id: 'schoology', name: 'Schoology', weight: 10 }, { id: 'recit', name: 'Recitations', weight: 10 }]),
      cat('A2', 'A2 Writing', 30, [{ id: 'comp', name: 'Short Compositions', weight: 15 }, { id: 'dict', name: 'Dictations', weight: 15 }]),
      cat('A3', 'A3 Oral Test', 20, [{ id: 'oral', name: 'Oral Test', weight: 20 }]),
      cat('A4', 'A4 Mastery Test', 30, [{ id: 'mt', name: 'Mastery Test', weight: 30 }]),
    ] } },
  };
  return { // 十年级：std = 不去 XCE（100%）；xce = 去 XCE，只算 Xavier 的 40%
    items: [],
    tracks: {
      std: { name: '不去 XCE', cats: [
        cat('A1', 'A1 L&R', 20, [{ id: 'lr', name: 'Listening & Reading', weight: 20 }]),
        cat('A2', 'A2 Comprehensive', 30, [{ id: 'dict', name: 'Dictation', weight: 10 }, { id: 'art', name: 'Art Project', weight: 10 }, { id: 'hw', name: 'Homework / Schoology', weight: 10 }]),
        cat('A3', 'A3 Written MT', 20, [{ id: 'mt', name: 'Written MT', weight: 20 }]),
        cat('A4', 'A4 Song / Oral', 30, [{ id: 'song', name: 'Chinese Song', weight: 15 }, { id: 'oral', name: 'Oral Tests', weight: 15 }]),
      ] },
      xce: { name: '去 XCE（Xavier 40%）', cats: [
        cat('LR', 'L&R', 20, [{ id: 'lr', name: 'Listening & Reading', weight: 20 }]),
        cat('DT', '听写', 5, [{ id: 'dict', name: 'Dictation', weight: 5 }]),
        cat('HW', 'Schoology + HW', 5, [{ id: 'hw', name: 'Homework / Schoology', weight: 5 }]),
        cat('OR', '口试', 5, [{ id: 'oral', name: 'Oral Tests', weight: 5 }]),
        cat('MA', '中秋活动', 5, [{ id: 'art', name: 'Art Project', weight: 5 }]),
      ] },
    },
  };
}
export const newItemId = () => uid('i');
