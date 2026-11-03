-- 补两个学生的中文名（之前用英文占位）
update public.cls_students set name = '施泓辉' where id = 'XB_17';   -- 10B 17 号 SY, SHAUN CADEN NG
update public.cls_students set name = '施宇宸' where id = 'XH_3';    -- 10H  3 号 SHI, YUCHEN
select id, class_id, num, name, eng_name from public.cls_students where id in ('XB_17','XH_3');
