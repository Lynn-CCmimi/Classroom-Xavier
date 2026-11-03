-- 12/17 XCE 结束后还原：原班回到标签栏，临时班收进菜单（数据都不删）
update public.cls_classes set name = '10A'          where id = '10A';
update public.cls_classes set name = '10H'          where id = '10H';
update public.cls_classes set name = '10B（XCE期）'  where id = 'X10B';
update public.cls_classes set name = '10H（XCE期）'  where id = 'X10H';
insert into public.cls_settings(key, value) values('tucked_classes', '["X10B","X10H"]')
  on conflict (key) do update set value = excluded.value;

select id, name, sort from public.cls_classes order by sort;
