# -*- coding: utf-8 -*-
"""
旧系统 iPad 备份 → 只补差异的 SQL（不动学生名单/成绩/设置）：
  - 指定学季的加减分记录整体替换（D 几映射出的日期超出该学季则不记日期）
  - 考勤按 (学生, 日期) upsert
  - 班级座位 / 轮转更新
  - 整包存进 cls_backups
用法: python3 delta_from_snapshot.py snapshot.json Q1 > ../supabase/delta_YYYY-MM-DD.sql
"""
import io, json, sys, re, datetime
SNAP, TERM = sys.argv[1], sys.argv[2]
TERM_STARTS = {'Q1': '2026-07-14', 'Q2': '2026-09-16'}
snap = json.load(io.open(SNAP, encoding='utf-8'))
esc = lambda s: "'" + str(s).replace("'", "''") + "'"
jl = lambda o: esc(json.dumps(o, ensure_ascii=False))
n = int(TERM[1:]); this_start = TERM_STARTS.get(TERM, '0000-01-01'); next_start = TERM_STARTS.get('Q%d' % (n + 1), '9999-12-31')

events, atts, cls_upd = [], [], []
for cid, c in snap['classes'].items():
    dd = c.get('dayDates', {})
    def date_for(d):
        x = dd.get(str(d)); return x if x and this_start <= x < next_start else None
    for sid, s in c['students'].items():
        for r in s.get('records', []):
            events.append((sid, cid, int(r.get('delta', 0)), r.get('desc', ''), r.get('day') or None, date_for(r.get('day'))))
        for dt, v in (s.get('attendanceLog') or {}).items():
            if not re.match(r'^\d{4}-\d{2}-\d{2}$', dt) or not v: continue
            flags, late, nr = [], None, None
            if v == 'X': flags = ['absent']
            elif v == '\u00d8': flags = ['camera_off']
            elif v[0] == '?': flags = ['no_response']; nr = v[1:] if re.match(r'^\d\d:\d\d$', v[1:]) else None
            elif v[0] == 'L': flags = ['late']; late = v[1:] if re.match(r'^\d\d:\d\d$', v[1:]) else None
            else: continue
            atts.append((sid, cid, dt, flags, late, nr))
    cls_upd.append((cid, [{'name': g['name'], 'head': g.get('head', True), 'student_ids': g['studentIds']} for g in c['groups']], c.get('rotationStep'), c.get('positionToGroup')))

w = sys.stdout.write
w('-- 旧系统备份补差异 · %s · 学季 %s（由 migrate/delta_from_snapshot.py 生成）\nbegin;\n\n' % (datetime.date.today(), TERM))
w("delete from public.cls_events where term=%s;\n" % esc(TERM))
w('insert into public.cls_events (student_id,class_id,term,kind,delta,reason,day,on_date,created_at) values\n')
w(',\n'.join("  (%s,%s,%s,'score',%d,%s,%s,%s,%s)" % (esc(sid), esc(cid), esc(TERM), delta, esc(desc), day if day else 'null', esc(od) if od else 'null', esc((od or this_start) + 'T08:00:00Z'))
             for sid, cid, delta, desc, day, od in events))
w(';\n\n')
w('insert into public.cls_attendance (student_id,class_id,on_date,flags,late_time,noresp_time) values\n')
w(',\n'.join('  (%s,%s,%s,array[%s]::text[],%s,%s)' % (esc(sid), esc(cid), esc(dt), ','.join(esc(f) for f in flags), esc(late) if late else 'null', esc(nr) if nr else 'null') for sid, cid, dt, flags, late, nr in atts))
w('\n  on conflict (student_id,on_date) do update set flags=excluded.flags,late_time=excluded.late_time,noresp_time=excluded.noresp_time,updated_at=now();\n\n')
for cid, groups, rot, ptg in cls_upd:
    w('update public.cls_classes set groups=%s,rotation_step=%s,position_to_group=%s,updated_at=now() where id=%s;\n' % (jl(groups), rot if rot is not None else 'null', jl(ptg) if ptg else 'null', esc(cid)))
snap_lite = {k: v for k, v in snap.items() if not k.startswith('_')}
w('\ninsert into public.cls_backups (label,payload) values (%s,%s);\n' % (esc('iPad 旧系统备份 ' + datetime.date.today().isoformat()), jl(snap_lite)))
w('\ncommit;\n')
sys.stderr.write('events %d, attendance %d, classes %d\n' % (len(events), len(atts), len(cls_upd)))
