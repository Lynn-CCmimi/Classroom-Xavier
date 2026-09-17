# -*- coding: utf-8 -*-
"""
把旧系统快照 + Google Sheets 成绩表 → supabase/seed.sql（灌数据）+ site/dev-seed.json（本地预览用）

用法：
  python3 build_seed.py [snapshot.json]     默认 snapshot_2026-08-30.json
  之后 iPad 导出的新 JSON 直接换成参数重跑即可。
"""
import csv, io, json, sys, re, datetime

SNAP = sys.argv[1] if len(sys.argv) > 1 else 'snapshot_2026-08-30.json'
Q1_END = '2026-09-15'          # Q2 从 2026-09-16 起
TERM_STARTS = {'Q1': '2026-07-14', 'Q2': '2026-09-16'}
CLASS_META = {'G9E': ('9E', 0), '10H': ('10H', 1), '10A': ('10A', 2)}

snap = json.load(io.open(SNAP, encoding='utf-8'))

def esc(s):
    return "'" + str(s).replace("'", "''") + "'"
def jl(o):
    return esc(json.dumps(o, ensure_ascii=False))

classes, students, events, attendance, exams = [], [], [], [], []

# ---------- 班级 / 学生 / 事件 / 考勤（快照） ----------
for cid, c in snap['classes'].items():
    name, sort = CLASS_META[cid]
    classes.append(dict(id=cid, name=name, sort=sort, current_day=c.get('currentDay', 1),
                        day_dates=c.get('dayDates', {}), is_online=bool(c.get('isOnline')),
                        rotation_step=c.get('rotationStep'), position_to_group=c.get('positionToGroup'), last_opened=c.get('lastOpenedDate'),
                        groups=[{'name': g['name'], 'head': g.get('head', True), 'student_ids': g['studentIds']} for g in c['groups']]))
    day_dates = c.get('dayDates', {})
    for sid, s in c['students'].items():
        students.append(dict(id=sid, class_id=cid, num=int(s['num']) if str(s.get('num', '')).isdigit() else None,
                             name=s['name'], eng_name=s.get('engName') or None))
        for r in s.get('records', []):
            d = r.get('day')
            on_date = day_dates.get(str(d)) if d else None
            events.append(dict(student_id=sid, class_id=cid, term='Q1', kind='score',
                               delta=int(r.get('delta', 0)), reason=r.get('desc', ''), day=d, on_date=on_date))
        for dt, v in (s.get('attendanceLog') or {}).items():
            if not re.match(r'^\d{4}-\d{2}-\d{2}$', dt) or not v:
                continue
            flags, late, noresp = [], None, None
            if v == 'X': flags = ['absent']
            elif v == '\u00d8': flags = ['camera_off']
            elif v.startswith('?'): flags = ['no_response']; noresp = v[1:] if re.match(r'^\d\d:\d\d$', v[1:]) else None
            elif v.startswith('L'): flags = ['late']; late = v[1:] if re.match(r'^\d\d:\d\d$', v[1:]) else None
            else: continue
            attendance.append(dict(student_id=sid, class_id=cid, on_date=dt, flags=flags, late_time=late, noresp_time=noresp))

by_class_num = {(s['class_id'], s['num']): s['id'] for s in students}

# ---------- 考试成绩（Google Sheets CSV） ----------
GRADES = {'A+', 'A', 'B+', 'B', 'C', 'D', 'F'}
SHEETS = {'G9E': 'sheet_9E.csv', '10A': 'sheet_10A.csv', '10H': 'sheet_10H.csv'}
SKIP_HDR = {'#', '学号', '姓名', '中文姓名', '组别', '作业/提交', '积分/等级', 'Recitation', 'MT', '课堂表现',
            'Schoology', '加权/均分', '总/等级', 'C', 'E', 'Essay writing', '', '作业1/提交', '作业1/成绩',
            '作业2/提交', '作业2/成绩', '作业3/提交', '作业3/成绩'}
missing = []
for cid, fn in SHEETS.items():
    rows = list(csv.reader(io.open(fn, encoding='utf-8')))
    hdr = [h.replace('\n', '/').strip() for h in rows[2]]
    num_col = hdr.index('学号')
    exam_cols = [(i, h) for i, h in enumerate(hdr) if h not in SKIP_HDR]
    for r in rows[4:]:
        if num_col >= len(r) or not r[num_col].strip().isdigit():
            continue
        num = int(r[num_col])
        sid = by_class_num.get((cid, num))
        if not sid:
            missing.append((cid, num, r[num_col + 1] if num_col + 1 < len(r) else '?')); continue
        for i, h in exam_cols:
            cell = r[i].strip() if i < len(r) else ''
            nxt = r[i + 1].strip() if i + 1 < len(r) else ''
            grade, score = None, None
            if cell in GRADES: grade = cell
            elif nxt in GRADES:
                grade = nxt
                try: score = float(cell)
                except: score = None
            if grade:
                exams.append(dict(student_id=sid, term='Q1', name=h, grade=grade, score=score))

# ---------- 设置 ----------
settings = {
    'current_term': 'Q2',
    'term_starts': TERM_STARTS,
    'grade_thresholds': [{'label': g['label'], 'min': g['min']} for g in snap['gradeThresholds']],
    'lib': {
        'plus': [['举手回答', 1], ['回答正确', 1], ['书写漂亮', 1], ['材料带齐', 1], ['作业准时正确', 1], ['积极参与', 1], ['不讲小话', 1], ['听写高分', 1], ['进步明显', 1]],
        'minus': [['频繁说话', -1], ['打闹', -1], ['不参与', -1], ['Schoology不达标', -1], ['听写<70%', -1], ['考试fail', -1], ['绿纸条', -1], ['用品未带', -1]],
        'big': [['未交/迟交作业', -10], ['作业不达标', -3], ['作业不达标', -5], ['笔记不完整', -3], ['玩iPad', -5]],
    },
}

# ---------- 写 seed.sql ----------
out = io.StringIO()
w = out.write
w('-- 课堂系统 v2 · 初始数据（由 migrate/build_seed.py 生成 %s）\n' % datetime.date.today())
w('-- 先执行 schema.sql，再整段执行本文件。可重复执行（upsert）。\n\n')
w('begin;\n\n')
for c in classes:
    w('insert into public.cls_classes (id,name,sort,current_day,day_dates,is_online,rotation_step,position_to_group,groups,last_opened) values (%s,%s,%d,%d,%s,%s,%s,%s,%s,%s)\n'
      '  on conflict (id) do update set name=excluded.name,sort=excluded.sort,current_day=excluded.current_day,day_dates=excluded.day_dates,is_online=excluded.is_online,rotation_step=excluded.rotation_step,position_to_group=excluded.position_to_group,groups=excluded.groups,last_opened=excluded.last_opened;\n'
      % (esc(c['id']), esc(c['name']), c['sort'], c['current_day'], jl(c['day_dates']), 'true' if c['is_online'] else 'false',
         c['rotation_step'] if c['rotation_step'] is not None else 'null', jl(c['position_to_group']) if c['position_to_group'] else 'null', jl(c['groups']), esc(c['last_opened']) if c.get('last_opened') else 'null'))
w('\n')
for s in students:
    w('insert into public.cls_students (id,class_id,num,name,eng_name) values (%s,%s,%s,%s,%s) on conflict (id) do update set class_id=excluded.class_id,num=excluded.num,name=excluded.name,eng_name=excluded.eng_name;\n'
      % (esc(s['id']), esc(s['class_id']), s['num'] if s['num'] is not None else 'null', esc(s['name']), esc(s['eng_name']) if s['eng_name'] else 'null'))
w('\n-- 旧记录只导一次：清掉 Q1 的 score 事件再插，避免重跑翻倍\n')
w("delete from public.cls_events where term='Q1';\n")
w('insert into public.cls_events (student_id,class_id,term,kind,delta,reason,day,on_date) values\n')
w(',\n'.join('  (%s,%s,%s,%s,%d,%s,%s,%s)' % (esc(e['student_id']), esc(e['class_id']), esc(e['term']), esc(e['kind']), e['delta'], esc(e['reason']),
                                            e['day'] if e['day'] else 'null', esc(e['on_date']) if e['on_date'] else 'null') for e in events))
w(';\n\n')
w('insert into public.cls_attendance (student_id,class_id,on_date,flags,late_time,noresp_time) values\n')
w(',\n'.join('  (%s,%s,%s,%s,%s,%s)' % (esc(a['student_id']), esc(a['class_id']), esc(a['on_date']), "array[%s]::text[]" % ','.join(esc(f) for f in a['flags']),
    esc(a['late_time']) if a['late_time'] else 'null', esc(a['noresp_time']) if a['noresp_time'] else 'null') for a in attendance))
w('\n  on conflict (student_id,on_date) do update set flags=excluded.flags,late_time=excluded.late_time,noresp_time=excluded.noresp_time;\n')
w('\n')
w('insert into public.cls_exams (student_id,term,name,grade,score) values\n')
w(',\n'.join('  (%s,%s,%s,%s,%s)' % (esc(e['student_id']), esc(e['term']), esc(e['name']), esc(e['grade']), e['score'] if e['score'] is not None else 'null') for e in exams))
w('\n  on conflict (student_id,term,name) do update set grade=excluded.grade,score=excluded.score,updated_at=now();\n')
w('\n')
for k, v in settings.items():
    w('insert into public.cls_settings (key,value) values (%s,%s) on conflict (key) do update set value=excluded.value;\n' % (esc(k), jl(v)))
w('\ncommit;\n')
io.open('../supabase/seed.sql', 'w', encoding='utf-8').write(out.getvalue())
io.open('../supabase/seed_backup.sql', 'w', encoding='utf-8').write('-- 旧系统整包备份，可选\ninsert into public.cls_backups (label,payload) values (%s,%s);\n' % (esc('旧系统快照 ' + SNAP), jl(snap)))

# ---------- 本地预览用 JSON ----------
json.dump(dict(classes=classes, students=students, events=events, attendance=attendance, exams=exams, settings=settings),
          io.open('../site/dev-seed.json', 'w', encoding='utf-8'), ensure_ascii=False)

print('classes %d, students %d, events %d, attendance %d, exams %d' % (len(classes), len(students), len(events), len(attendance), len(exams)))
if missing:
    print('成绩表里有但系统里没有的学号：', missing)
from collections import Counter
print('exams per class/name:', Counter((by_class_num and e['student_id'].split('_')[0], e['name']) for e in exams).most_common())
