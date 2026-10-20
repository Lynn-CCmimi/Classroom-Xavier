// 批量把「成绩查询个人码」发到学生邮箱。粘进 Google 表格的 Apps Script（扩展程序 → Apps Script）。
// 配套表格由 migrate/build_mail_sheet.py 生成，包含「说明 / 名单 / 个人码_9E / 个人码_10A / 个人码_10H」。
// 用法：个人码表粘好 → 菜单①生成名单 → 填邮箱 → ②测试 → ③发送。
// 只发给「名单」里该行自己的邮箱，不抄送任何人。

const LINK = 'https://lynn-ccmimi.github.io/Classroom-Xavier/s.html';
const FROM_NAME = 'Lynn';
const ROSTER = '名单';

function onOpen() {
  SpreadsheetApp.getUi().createMenu('成绩通知')
    .addItem('① 从个人码表生成名单', 'buildRoster')
    .addItem('② 发一封给我自己（测试）', 'sendTest')
    .addItem('③ 发送所有还没发的', 'sendAll')
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
