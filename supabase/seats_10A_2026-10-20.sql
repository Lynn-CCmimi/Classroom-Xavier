-- 10A 新座位表 2026-10-20（老师调位，按 Cluster 图）
-- 数组顺序 = 屏幕从上到下：上排 组5组6组7组8，下排 组1组2组3组4（黑板在下方）
update public.cls_classes set groups='[{"name": "组5", "head": false, "student_ids": ["A10_22", "A10_21", "A10_0", "A10_2"]}, {"name": "组6", "head": false, "student_ids": ["A10_23", "A10_42", "A10_31", "A10_43"]}, {"name": "组7", "head": false, "student_ids": ["A10_10", "A10_20", "A10_50", "A10_12"]}, {"name": "组8", "head": false, "student_ids": ["A10_13", "A10_1", "A10_11", "A10_71"]}, {"name": "组1", "head": false, "student_ids": ["A10_41", "A10_30", "A10_51", "A10_40"]}, {"name": "组2", "head": false, "student_ids": ["A10_60", "A10_3", "A10_73", "A10_63"]}, {"name": "组3", "head": false, "student_ids": ["A10_33", "A10_53", "A10_52", "A10_32"]}, {"name": "组4", "head": false, "student_ids": ["A10_61", "A10_62", "A10_70", "A10_72"]}]', updated_at=now() where id='10A';

-- 职务：班长 / 副班长 / 秘书（用 || 合并，保留 9E、10H 已设的；组长 leaders 不动）
insert into public.cls_settings(key, value) values('monitors', jsonb_build_object('10A', 'A10_72'))
  on conflict (key) do update set value = public.cls_settings.value || excluded.value;  -- 班长 施礼嘉
insert into public.cls_settings(key, value) values('vice', jsonb_build_object('10A', 'A10_12'))
  on conflict (key) do update set value = public.cls_settings.value || excluded.value;  -- 副班长 杨丹杰
insert into public.cls_settings(key, value) values('secretary', jsonb_build_object('10A', 'A10_51'))
  on conflict (key) do update set value = public.cls_settings.value || excluded.value;  -- 秘书 尚吉伟

select key, value from public.cls_settings where key in ('monitors','vice','secretary');
