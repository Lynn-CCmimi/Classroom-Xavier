-- 2026-10-22 修正：当时页面停在 9E，按班号点的缺席记到了 9E 学生身上
-- 可重复执行。

-- 1) 删掉 9E 今天这 7 条误记
delete from public.cls_attendance
 where on_date = '2026-10-22'
   and student_id in (select id from public.cls_students where class_id = 'G9E');

-- 2) 把同样的号码记到 10A 对应的学生上
--    4 蔡福儿 / 5 蔡少峰 / 11 姚道成 / 16 吕麒耀 / 24 杨丹杰 / 28 吴安磊 / 30 陈国炎
insert into public.cls_attendance (student_id, class_id, on_date, flags)
values
  ('A10_40', '10A', '2026-10-22', '{absent}'),
  ('A10_10', '10A', '2026-10-22', '{absent}'),
  ('A10_20', '10A', '2026-10-22', '{absent}'),
  ('A10_43', '10A', '2026-10-22', '{absent}'),
  ('A10_12', '10A', '2026-10-22', '{absent}'),
  ('A10_33', '10A', '2026-10-22', '{absent}'),
  ('A10_42', '10A', '2026-10-22', '{absent}')
on conflict (student_id, on_date) do update set flags = excluded.flags, updated_at = now();

-- 3) 核对：应该只剩 10A 的 7 条
select a.class_id, s.num, s.name, a.flags
  from public.cls_attendance a
  join public.cls_students s on s.id = a.student_id
 where a.on_date = '2026-10-22'
 order by a.class_id, s.num;
