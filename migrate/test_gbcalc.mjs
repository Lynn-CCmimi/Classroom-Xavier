import * as g from '../site/gbcalc.js';
import assert from 'node:assert/strict';
const eq = (a, b, m) => assert.equal(a, b, m);
// 官方表抽查（满分 100/50/35/30/65/70）
eq(g.letterFromRaw(95,100),'A+'); eq(g.letterFromRaw(94,100),'A'); eq(g.letterFromRaw(59,100),'F'); eq(g.letterFromRaw(60,100),'D');
eq(g.letterFromRaw(47,50),'A+'); eq(g.letterFromRaw(46,50),'A'); eq(g.letterFromRaw(29,50),'F'); eq(g.letterFromRaw(30,50),'D');
eq(g.letterFromRaw(33,35),'A+'); eq(g.letterFromRaw(32,35),'A'); eq(g.letterFromRaw(20,35),'F'); eq(g.letterFromRaw(21,35),'D');
eq(g.letterFromRaw(29,30),'A+'); eq(g.letterFromRaw(18,30),'D'); eq(g.letterFromRaw(17,30),'F');
eq(g.letterFromRaw(61,65),'A+'); eq(g.letterFromRaw(38,65),'F'); eq(g.letterFromRaw(66,70),'A+'); eq(g.letterFromRaw(41,70),'F');
eq(g.letterFromRaw(19,27),'B'); eq(g.letterFromRaw(18,27),'C'); // 边界取高档
eq(g.tableRow(32).hps,30);
// 口语
eq(g.letterFromOral(35),'A+'); eq(g.letterFromOral(32.5),'A+'); eq(g.letterFromOral(32),'A'); eq(g.letterFromOral(13),'C'); eq(g.letterFromOral(12),'D'); eq(g.letterFromOral(7),'F'); eq(g.letterFromOral(7.5),'D');
// 百分比
eq(g.autoLetter({mode:'pct'},'93.65'),'A'); eq(g.autoLetter({mode:'pct'},'95'),'A+'); eq(g.autoLetter({mode:'raw',max:50},'A'),'A');
// 手动调等级不被覆盖
const it={id:'x',mode:'raw',max:30};
eq(g.effLetter(it,{raw:'10',grade:'D',override:true}),'D'); eq(g.effLetter(it,{raw:'10'}),'F');
// 聚合：听写 2 次 + 作文，缺的不算
const cfg=g.defaultConfig('G9'); cfg.items=[{id:'d1',name:'听写1',group:'dict',mode:'raw',max:30},{id:'d2',name:'听写2',group:'dict',mode:'raw',max:30},{id:'o',name:'口试',group:'oral',mode:'oral',max:35}];
let r=g.compute(cfg,'std',{d1:{raw:'29'},d2:{raw:'20'},o:{raw:'35'}});
eq(r.cats[1].groups[1].v,(97+75)/2); eq(r.cats[2].letter,'A+'); eq(r.cats[0].letter,null);
eq(r.coverage, (15+20)/100);
r=g.compute(cfg,'std',{d1:{raw:'29'}},{A2:'B'}); eq(r.cats[1].letter,'B'); eq(r.cats[1].overridden,true);
r=g.compute(cfg,'std',{},{}); eq(r.total,null); eq(r.final,null);
// 建议
let s=g.suggestCE({delta:10,slips:0,nb:{ok:3,part:0,miss:0},finalLetter:'A'}); eq(s.conduct,'O'); eq(s.effort,'O'); eq(s.ptc,false);
s=g.suggestCE({delta:10,slips:1,nb:{ok:3,part:0,miss:0},finalLetter:'A'}); eq(s.conduct,'G'); eq(s.ptc,false);
s=g.suggestCE({delta:-12,slips:2,nb:{ok:0,part:1,miss:2},finalLetter:'F'}); eq(s.conduct,'U'); eq(s.ptc,true);
console.log('gbcalc OK');
