// 批量把「成绩查询个人码」发到学生邮箱。粘进 Google 表格的 Apps Script（扩展程序 → Apps Script）。
// 配套表格由 migrate/build_mail_sheet.py 生成，包含「说明 / 名单 / 个人码_9E / 个人码_10A / 个人码_10H」。
// 用法：个人码表粘好 → 菜单①生成名单 → 填邮箱 → ②测试 → ③发送。
// 另一半：不及格（F）通知，见菜单④⑤⑥，文案在「不及格文案」工作表里，可自由改。
// 注意：个人码通知发给【学生本人】；不及格通知发给【家长】，收件人是家长邮箱。

const LINK = 'https://lynn-ccmimi.github.io/Classroom-Xavier/s.html';
const FROM_NAME = 'Lynn';
const ROSTER = '名单';

function onOpen() {
  SpreadsheetApp.getUi().createMenu('成绩通知')
    .addItem('① 从个人码表生成名单', 'buildRoster')
    .addItem('② 发一封给我自己（测试）', 'sendTest')
    .addItem('③ 发送所有还没发的', 'sendAll')
    .addSeparator()
    .addItem('④ 建立 / 清空「不及格通知」表', 'setupFailSheets')
    .addItem('⑤ 不及格通知：发一封给我自己（测试）', 'sendFailTest')
    .addItem('⑥ 不及格通知：发送所有还没发的', 'sendFailAll')
    .addToUi();
}

// 读所有「个人码_班级」工作表 → { '9E|3': {name, pin}, ... }，顺序保持原样
function loadPins_() {
  const map = {}, order = [];
  SpreadsheetApp.getActive().getSheets().forEach(sh => {
    const m = sh.getName().match(/^个人码[_\-\s]?(.+)$/);
    if (!m) return;
    const cls = m[1].trim().toUpperCase();
    sh.getDataRange().getValues().forEach(r => {
      const num = String(r[0]).trim(), name = String(r[1]).trim(), pin = String(r[2]).trim();
      if (!/^\d+$/.test(num) || !/^\d{4}$/.test(pin) || !name) return;   // 跳过表头和空行
      const key = cls + '|' + num;
      if (!map[key]) order.push(key);
      map[key] = { name: name, pin: pin };
    });
  });
  return { map: map, order: order };
}

function roster_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(ROSTER);
  if (!sh) throw new Error('找不到名为「' + ROSTER + '」的工作表');
  return sh;
}

// ① 按个人码表生成「班级 / 学号」两列，邮箱留空等你填。已填过的邮箱会保留。
function buildRoster() {
  const ui = SpreadsheetApp.getUi(), sh = roster_(), pins = loadPins_();
  if (!pins.order.length) { ui.alert('个人码表里没有数据。\n请先在课堂系统 设置 → 复制 学号/姓名/个人码，粘到「个人码_9E」等工作表。'); return; }
  const old = {};
  sh.getDataRange().getValues().slice(1).forEach(r => {
    const k = String(r[0]).trim().toUpperCase() + '|' + String(r[1]).trim();
    if (String(r[3]).trim()) old[k] = { email: String(r[3]).trim(), status: String(r[4]).trim() };
  });
  const rows = pins.order.map(k => {
    const p = k.split('|'), kept = old[k] || {};
    return [p[0], Number(p[1]), kept.email || '', kept.status || ''];
  });
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 5).clearContent();
  sh.getRange(2, 1, rows.length, 2).setValues(rows.map(r => [r[0], r[1]]));
  sh.getRange(2, 4, rows.length, 2).setValues(rows.map(r => [r[2], r[3]]));
  // C 列是核对用的公式，每次重建——之前这里被 clearContent 清掉后没补回来
  sh.getRange(2, 3, rows.length, 1).setFormulas(rows.map((_, i) => {
    const r = i + 2;
    return ['=IF(OR($A' + r + '="",$B' + r + '=""),"",IFERROR(VLOOKUP($B' + r + ',INDIRECT("个人码_"&$A' + r + '&"!A:C"),2,FALSE),"⚠ 没找到"))'];
  }));
  ui.alert('已生成 ' + rows.length + ' 行（C 列中文名会自动带出，用来核对）。\n现在把每个人的邮箱填到 D 列，核对一下名字和邮箱是同一个人，再点②测试。');
}

function body_(cls, num, name, pin) {
  return name + ' 同学你好 Hi ' + name + ',\n\n'
    + '这是你的成绩查询信息 Here is your grade-check information:\n\n'
    + '网址 Link: ' + LINK + '\n'
    + '班级 Class: ' + cls + '\n'
    + '学号 Number: ' + num + '\n'
    + '中文名 Chinese name: ' + name + '\n'
    + '个人码 Personal code: ' + pin + '\n\n'
    + '这是你自己的个人码，不要告诉同学。This code is only for you. Please do not share it.\n'
    + '可以查看 You can see: 课堂分 class points + 老师公布的单项成绩 released test results.\n'
    + '总评 Final grade 由学校成绩系统统一公布。Final grades are published by the school system.\n'
    + '连续输错 5 次会锁 15 分钟。5 wrong tries lock you out for 15 minutes.\n\n'
    + FROM_NAME;
}

// ② 把第一个能对上的人的邮件发到你自己邮箱，检查格式
function sendTest() {
  const ui = SpreadsheetApp.getUi(), pins = loadPins_().map, values = roster_().getDataRange().getValues();
  const me = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail();
  for (let i = 1; i < values.length; i++) {
    const cls = String(values[i][0]).trim().toUpperCase(), num = String(values[i][1]).trim();
    const p = pins[cls + '|' + num];
    if (!p) continue;
    GmailApp.sendEmail(me, '[测试 TEST] 成绩查询 Grade Check · ' + cls, body_(cls, num, p.name, p.pin), { name: FROM_NAME });
    ui.alert('已发到你自己的邮箱 ' + me + '\n（内容是 ' + cls + ' ' + p.name + ' 的那封）。\n检查格式和网址，没问题再点③。');
    return;
  }
  ui.alert('名单里没有一行能和个人码表对上。\n检查「班级」写法（9E / 10A / 10H）和「学号」是否是数字。');
}

// ③ 群发。已发送的行会跳过，可重复点。
function sendAll() {
  const ui = SpreadsheetApp.getUi(), sh = roster_(), pins = loadPins_().map, values = sh.getDataRange().getValues();
  const todo = [];
  for (let i = 1; i < values.length; i++) {
    if (!String(values[i][0]).trim()) continue;
    if (String(values[i][4]).indexOf('已发送') === 0) continue;
    todo.push(i);
  }
  if (!todo.length) { ui.alert('没有需要发送的了。'); return; }
  const quota = MailApp.getRemainingDailyQuota();
  if (ui.alert('确认发送',
      '将给 ' + todo.length + ' 位学生各发一封邮件，每封只发给本人，不抄送。\n今天剩余发信额度 ' + quota + '。\n发出去无法撤回——你已经核对过 C 列名字和 D 列邮箱是同一个人了吗？',
      ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  let sent = 0, skipped = 0;
  for (let j = 0; j < todo.length; j++) {
    const i = todo[j];
    const cls = String(values[i][0]).trim().toUpperCase(), num = String(values[i][1]).trim(), email = String(values[i][3]).trim();
    const cell = sh.getRange(i + 1, 5), p = pins[cls + '|' + num];
    if (!p) { cell.setValue('✗ 个人码表里没有 ' + cls + ' 的 ' + num + ' 号'); skipped++; continue; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { cell.setValue(email ? '✗ 邮箱格式不对' : '✗ 还没填邮箱'); skipped++; continue; }
    if (MailApp.getRemainingDailyQuota() < 1) { cell.setValue('✗ 今日额度用完，明天再点③'); skipped++; break; }
    try {
      GmailApp.sendEmail(email, '成绩查询 Grade Check · ' + cls, body_(cls, num, p.name, p.pin), { name: FROM_NAME });
      cell.setValue('已发送 ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MM-dd HH:mm'));
      sent++;
    } catch (e) { cell.setValue('✗ 失败：' + e.message); skipped++; }
    Utilities.sleep(300);
  }
  ui.alert('完成：已发送 ' + sent + ' 封，未发送 ' + skipped + ' 封。\n未发送的原因看「状态」列，处理完再点③，已发送的会自动跳过。');
}

// ============================================================
// 不及格（F）通知
// 「不及格通知」表：第 1–3 行填这次考试的背景；第 5 行表头；第 6 行起粘 F 名单
//   （课堂系统 → 成绩 → 分布 → 某次考试卡片上的「复制 F 名单」）
// 「不及格文案」表：三档的分数线和正文，想怎么改就怎么改
// ============================================================
const FAIL = '不及格通知';
const FAILTXT = '不及格文案';

const DEFAULT_TXT = {
  head:
'{name}的家长您好 Dear Parent/Guardian of {name},\n\n' +
'关于{name}这次的{exam}（范围：{lesson}）：\n' +
'Regarding {name}\u2019s recent {exam} (covering {lesson}):\n\n' +
'满分 {max} 个字，{name}写对了 {score} 个，这次没有及格。\n' +
'Out of {max} characters, {name} got {score} correct, which is below the passing mark.',
  A:
'离及格只差一点点，基础是有的，再多一点复习时间应该就能通过。这次的范围提前 {days} 天就公布了，希望您能提醒{name}在听写前安排一些时间复习。\n' +
'{name} was close to passing \u2014 the foundation is there, and a little more review time should be enough. The scope was announced {days} days in advance; I would appreciate your help in reminding {name} to set aside time to review before dictations.',
  B:
'这个结果说明复习的时间不太够。这次的范围提前 {days} 天就公布了，希望您能提醒{name}在听写前多安排一些时间复习。\n' +
'This suggests there was not enough review time. The scope was announced {days} days in advance; I would appreciate your help in reminding {name} to set aside more time to review before dictations.',
  C:
'这个结果说明这次几乎没有准备。这次的范围提前 {days} 天就公布了，希望您能和{name}一起看一下平时的安排，在听写前留出固定的复习时间。\n' +
'This suggests there was very little preparation. The scope was announced {days} days in advance; I would be grateful if you could go through {name}\u2019s routine together and set aside regular time to review before dictations.',
  tail:
'这次的分数已经记录下来了，但它只是学期成绩的一部分，后面还有机会。\n' +
'This result is recorded, but it is only one part of the term grade \u2014 there is still room to improve.\n\n' +
'如果您有任何问题，欢迎随时和我联系。\n' +
'If you have any questions, please feel free to contact me.\n\n' + FROM_NAME,
  subject: '{name} · {exam} 成绩反馈 Feedback on {name}\u2019s result',
};

// ④ 建表 / 清空重来
function setupFailSheets() {
  const ss = SpreadsheetApp.getActive(), ui = SpreadsheetApp.getUi();
  let txt = ss.getSheetByName(FAILTXT);
  let writeTxt = !txt;
  if (txt && ui.alert('文案表已存在', '要把「' + FAILTXT + '」恢复成默认文案吗？\n（默认文案现在是写给【家长】的；选「否」保留你自己改过的内容。）', ui.ButtonSet.YES_NO) === ui.Button.YES) {
    txt.clear(); writeTxt = true;
  }
  if (writeTxt) {
    if (!txt) txt = ss.insertSheet(FAILTXT);
    txt.getRange('A1:C1').setValues([['档位', '分数线（≥ 占满分比例）', '正文（{name} {exam} {lesson} {score} {max} {days} 会被替换）']]);
    txt.getRange('A2:C4').setValues([
      ['A 鼓励', 0.5, DEFAULT_TXT.A],
      ['B 提醒', 0.2, DEFAULT_TXT.B],
      ['C 严肃', 0,   DEFAULT_TXT.C],
    ]);
    txt.getRange('A6:C8').setValues([
      ['开头', '', DEFAULT_TXT.head],
      ['结尾', '', DEFAULT_TXT.tail],
      ['邮件标题', '', DEFAULT_TXT.subject],
    ]);
    txt.getRange('A1:C1').setFontWeight('bold');
    txt.setColumnWidth(1, 90); txt.setColumnWidth(2, 170); txt.setColumnWidth(3, 620);
    txt.getRange('C1:C8').setWrap(true);
    txt.setFrozenRows(1);
  }

  let sh = ss.getSheetByName(FAIL);
  if (sh) {
    if (ui.alert('清空「' + FAIL + '」', '会清掉里面现有的名单和发送状态（文案表不动）。继续？', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
    sh.clear();
  } else sh = ss.insertSheet(FAIL);

  sh.getRange('A1:B3').setValues([
    ['考试名称', ''],
    ['覆盖课次', ''],
    ['提前通知天数', ''],
  ]);
  sh.getRange('A1:A3').setFontWeight('bold');
  sh.getRange('B1:B3').setBackground('#fffbe6').setBorder(true, true, true, true, false, false);
  sh.getRange('A5:H5').setValues([['班级', '学号', '姓名', '分数', '满分', '家长邮箱（自动）', '档位（自动）', '状态']]);
  sh.getRange('A5:H5').setFontWeight('bold').setBackground('#1c1b19').setFontColor('#ffffff');
  const N = 200;
  const mail = [], tier = [];
  for (let r = 6; r < 6 + N; r++) {
    // 家长邮箱 = 学生邮箱把 @xs.edu.ph 换成 @parent.xs.edu.ph（全校 1834/1835 如此，她这三个班 109 人全部符合）
    mail.push(['=IFERROR(SUBSTITUTE(VLOOKUP($A' + r + '&"|"&$B' + r + ',{ARRAYFORMULA(' + ROSTER + '!$A$2:$A&"|"&' + ROSTER + '!$B$2:$B),' + ROSTER + '!$D$2:$D},2,FALSE),"@xs.edu.ph","@parent.xs.edu.ph"),"⚠ 名单里没有")']);
    tier.push(['=IF(OR($D' + r + '="",$E' + r + '=""),"",IF($D' + r + '/$E' + r + '>=' + FAILTXT + '!$B$2,"A 鼓励",IF($D' + r + '/$E' + r + '>=' + FAILTXT + '!$B$3,"B 提醒","C 严肃")))']);
  }
  sh.getRange(6, 6, N, 1).setFormulas(mail);
  sh.getRange(6, 7, N, 1).setFormulas(tier);
  sh.setColumnWidth(1, 60); sh.setColumnWidth(2, 60); sh.setColumnWidth(3, 90);
  sh.setColumnWidth(4, 60); sh.setColumnWidth(5, 60); sh.setColumnWidth(6, 230);
  sh.setColumnWidth(7, 90); sh.setColumnWidth(8, 180);
  sh.setFrozenRows(5);
  ss.setActiveSheet(sh);
  ui.alert('好了。\n\n1. B1/B2/B3 填考试名称、覆盖课次、提前通知天数\n2. 课堂系统 → 成绩 → 分布 → 点那次考试的「复制 F 名单」\n3. 回来点 A6 按 Cmd+V\n4. 对一眼 F 列的档位和 F 列右边的邮箱，再点⑤测试');
}

function failCfg_() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(FAIL), txt = ss.getSheetByName(FAILTXT);
  if (!sh || !txt) throw new Error('还没有「' + FAIL + '」表，先点菜单④');
  const exam = String(sh.getRange('B1').getValue()).trim();
  const lesson = String(sh.getRange('B2').getValue()).trim();
  const days = String(sh.getRange('B3').getValue()).trim();
  if (!exam || !lesson || !days) throw new Error('B1/B2/B3 还没填完（考试名称、覆盖课次、提前通知天数）');
  const t = txt.getRange('A1:C8').getValues();
  return {
    sh: sh, exam: exam, lesson: lesson, days: days,
    lineA: Number(t[1][1]), lineB: Number(t[2][1]),
    bodyA: String(t[1][2]), bodyB: String(t[2][2]), bodyC: String(t[3][2]),
    head: String(t[5][2]), tail: String(t[6][2]), subject: String(t[7][2]),
    rows: sh.getLastRow() > 5 ? sh.getRange(6, 1, sh.getLastRow() - 5, 8).getValues() : [],
  };
}

function fill_(s, v) {
  return String(s)
    .replace(/\{name\}/g, v.name).replace(/\{exam\}/g, v.exam).replace(/\{lesson\}/g, v.lesson)
    .replace(/\{score\}/g, v.score).replace(/\{max\}/g, v.max).replace(/\{days\}/g, v.days);
}

// 一行 → { email, subject, body, tier }；不合格的行返回 { err }
function failMail_(c, row) {
  const cls = String(row[0]).trim(), num = String(row[1]).trim(), name = String(row[2]).trim();
  const rawScore = String(row[3]).trim(), rawMax = String(row[4]).trim();
  const score = Number(rawScore), max = Number(rawMax), email = String(row[5]).trim();
  if (!name) return { err: '没有姓名' };
  if (rawMax === '' || !(max > 0)) return { err: '满分没填或不是数字' };
  if (rawScore === '' || isNaN(score) || score < 0) return { err: '分数没填或不是数字' };
  if (score > max) return { err: '分数比满分还大（' + score + '/' + max + '）' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { err: email ? '家长邮箱格式不对' : '名单里查不到邮箱' };
  const ratio = score / max;
  const tier = ratio >= c.lineA ? 'A' : ratio >= c.lineB ? 'B' : 'C';
  const v = { name: name, exam: c.exam, lesson: c.lesson, score: score, max: max, days: c.days };
  const body = [c.head, tier === 'A' ? c.bodyA : tier === 'B' ? c.bodyB : c.bodyC, c.tail]
    .map(function (x) { return fill_(x, v); }).join('\n\n');
  return { email: email, subject: fill_(c.subject, v), body: body, tier: tier, cls: cls, num: num, name: name };
}

// ⑤ 发一封给自己看看
function sendFailTest() {
  const ui = SpreadsheetApp.getUi(), c = failCfg_();
  const me = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail();
  for (let i = 0; i < c.rows.length; i++) {
    if (!String(c.rows[i][2]).trim()) continue;
    const m = failMail_(c, c.rows[i]);
    if (m.err) { ui.alert('第 ' + (i + 6) + ' 行有问题：' + m.err + '\n先把它改好，或者换一行测试。'); return; }
    GmailApp.sendEmail(me, '[测试 TEST] ' + m.subject, m.body, { name: FROM_NAME });
    ui.alert('已发到你自己的邮箱 ' + me + '\n\n内容是第 ' + (i + 6) + ' 行：' + m.name + '（' + m.cls + ' ' + m.num + ' 号，'
      + c.rows[i][3] + '/' + c.rows[i][4] + '，' + m.tier + ' 档）。\n\n读一遍，措辞不满意就去「' + FAILTXT + '」表里改，再点⑤重测。');
    return;
  }
  ui.alert('名单是空的。先把 F 名单粘到第 6 行起。');
}

// ⑥ 群发（已发送的自动跳过，可重复点）
function sendFailAll() {
  const ui = SpreadsheetApp.getUi(), c = failCfg_();
  const todo = [];
  for (let i = 0; i < c.rows.length; i++) {
    if (!String(c.rows[i][2]).trim()) continue;
    if (String(c.rows[i][7]).indexOf('已发送') === 0) continue;
    todo.push(i);
  }
  if (!todo.length) { ui.alert('没有需要发送的了。'); return; }
  const pre = todo.map(function (i) { return failMail_(c, c.rows[i]); });
  const bad = pre.filter(function (m) { return m.err; }).length;
  const cnt = { A: 0, B: 0, C: 0 };
  pre.forEach(function (m) { if (!m.err) cnt[m.tier]++; });
  if (ui.alert('确认发送',
      '这次考试：' + c.exam + '（' + c.lesson + '，提前 ' + c.days + ' 天通知）\n\n'
      + '将发出 ' + (todo.length - bad) + ' 封，收件人是【家长】，每封只发给该学生的家长一人。\n'
      + 'A 鼓励 ' + cnt.A + ' 封 · B 提醒 ' + cnt.B + ' 封 · C 严肃 ' + cnt.C + ' 封'
      + (bad ? '\n另有 ' + bad + ' 行有问题，会跳过并写在「状态」列。' : '')
      + '\n今天剩余发信额度 ' + MailApp.getRemainingDailyQuota() + '。\n\n发出去无法撤回。你点过⑤读过一封了吗？',
      ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  let sent = 0, skipped = 0;
  for (let j = 0; j < todo.length; j++) {
    const i = todo[j], cell = c.sh.getRange(i + 6, 8), m = pre[j];
    if (m.err) { cell.setValue('✗ ' + m.err); skipped++; continue; }
    if (MailApp.getRemainingDailyQuota() < 1) { cell.setValue('✗ 今日额度用完，明天再点⑥'); skipped++; break; }
    try {
      GmailApp.sendEmail(m.email, m.subject, m.body, { name: FROM_NAME });
      cell.setValue('已发送 ' + m.tier + ' 档 ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MM-dd HH:mm'));
      sent++;
    } catch (e) { cell.setValue('✗ 失败：' + e.message); skipped++; }
    Utilities.sleep(300);
  }
  ui.alert('完成：已发送 ' + sent + ' 封，未发送 ' + skipped + ' 封。\n未发送的原因看「状态」列，处理完再点⑥，已发送的会跳过。');
}
