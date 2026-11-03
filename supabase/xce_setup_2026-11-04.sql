-- 11/4–12/17 XCE 期间的临时班：新 10B、新 10H
-- 原来的 10A / 10H 一行数据都不动，只改显示名加「(原)」，并从标签栏收起（菜单里仍可进入）。
-- 12/17 之后用 supabase/xce_restore.sql 还原。可重复执行。

insert into public.cls_classes (id, name, sort, groups) values
  ('X10B', '10B', 3, '[{"name": "组1", "head": false, "student_ids": ["XB_1", "XB_2", "XB_3", "XB_4"]}, {"name": "组2", "head": false, "student_ids": ["XB_5", "XB_6", "XB_7", "XB_8"]}, {"name": "组3", "head": false, "student_ids": ["XB_9", "XB_10", "XB_11", "XB_12"]}, {"name": "组4", "head": false, "student_ids": ["XB_13", "XB_14", "XB_15", "XB_16"]}, {"name": "组5", "head": false, "student_ids": ["XB_17", "XB_18", "XB_19", "XB_20"]}, {"name": "组6", "head": false, "student_ids": ["XB_21", "XB_22", "XB_23", "XB_24"]}, {"name": "组7", "head": false, "student_ids": ["XB_25", "XB_26", "XB_27", "XB_28"]}, {"name": "组8", "head": false, "student_ids": ["XB_29", "XB_30", "XB_31"]}]')
  on conflict (id) do update set name=excluded.name, sort=excluded.sort, groups=excluded.groups, updated_at=now();

insert into public.cls_classes (id, name, sort, groups) values
  ('X10H', '10H', 4, '[{"name": "组1", "head": false, "student_ids": ["XH_1", "XH_2", "XH_3", "XH_4"]}, {"name": "组2", "head": false, "student_ids": ["XH_5", "XH_6", "XH_7", "XH_8"]}, {"name": "组3", "head": false, "student_ids": ["XH_9", "XH_10", "XH_11", "XH_12"]}, {"name": "组4", "head": false, "student_ids": ["XH_13", "XH_14", "XH_15", "XH_16"]}, {"name": "组5", "head": false, "student_ids": ["XH_17", "XH_18", "XH_19", "XH_20"]}, {"name": "组6", "head": false, "student_ids": ["XH_21", "XH_22", "XH_23", "XH_24"]}, {"name": "组7", "head": false, "student_ids": ["XH_25", "XH_26", "XH_27", "XH_28"]}, {"name": "组8", "head": false, "student_ids": ["XH_29", "XH_30", "XH_31", "XH_32"]}]')
  on conflict (id) do update set name=excluded.name, sort=excluded.sort, groups=excluded.groups, updated_at=now();

insert into public.cls_students (id, class_id, num, name, eng_name, active) values
  ('XB_1', 'X10B', 1, '亚安德', 'ATIENZA, ANDRES GABRIEL TAJONERA', true),
  ('XB_2', 'X10B', 2, '潘忠顺', 'BANZUELA, JUAN ALFONSO TIONGSON', true),
  ('XB_3', 'X10B', 3, '罗杰仕', 'BERNOS, JOSEPH STO. NIÑO II BERONILLA', true),
  ('XB_4', 'X10B', 4, '张力顺', 'CHANG, LUCIAN TYLER CABILAO', true),
  ('XB_5', 'X10B', 5, '路天伯', 'CRUZ, TYBALT JUSTIN YULDE', true),
  ('XB_6', 'X10B', 6, '邱己华', 'CU-UNJIENG, LORENZO SEBASTIAN SUBIA', true),
  ('XB_7', 'X10B', 7, '洪伟城', 'HUNG, MAXWELL SANTI SIY', true),
  ('XB_8', 'X10B', 8, '李光勇', 'LEE, DRAKE TAN', true),
  ('XB_9', 'X10B', 9, '谢承典', 'ONG, LEVI JET YU', true),
  ('XB_10', 'X10B', 10, '黄金城', 'PEREZ, HUNTER BRUCE CAGALINGAN', true),
  ('XB_11', 'X10B', 11, '白礼安', 'PINEDA, PIO JOSE JULIAN', true),
  ('XB_12', 'X10B', 12, '罗督敏', 'RESUELLO, DOMINICUS ZEN VELARDE', true),
  ('XB_13', 'X10B', 13, '吴安敦', 'RICAFRENTE, RAFAEL ANTON TECSON', true),
  ('XB_14', 'X10B', 14, '史奋祥', 'SAY, SHAWN RILEY REBOSA', true),
  ('XB_15', 'X10B', 15, '施礼安', 'SILVA, LIAM THOMAS YAP', true),
  ('XB_16', 'X10B', 16, '刘嘉诚', 'SO, CALEB EVAN SALGADO', true),
  ('XB_17', 'X10B', 17, 'Shaun Sy', 'SY, SHAUN CADEN NG', true),
  ('XB_18', 'X10B', 18, '陳泰宏', 'TAN, STEFAN JARED TAN', true),
  ('XB_19', 'X10B', 19, '庄东霖', 'VALENCIA, ELIJAH MARKUS UYGONGCO', true),
  ('XB_20', 'X10B', 20, '王廉捷', 'YU, ANDREW FEROZ CRESCINI', true),
  ('XB_21', 'X10B', 21, '杨宏程', 'YU, GIAN GABRIEL TE', true),
  ('XB_22', 'X10B', 22, '陈巍鴻', 'ZULUETA, AIDAN JACOB PAHANG', true),
  ('XB_23', 'X10B', 23, '许天财', 'BRIONES, LUCAS ANDRADE', true),
  ('XB_24', 'X10B', 24, '兆雅各', 'CAGASAN, JACOB RYAN ANDRADE', true),
  ('XB_25', 'X10B', 25, '罗富西', 'CAJUCOM, JOSE MATTEO DEL ROSARIO', true),
  ('XB_26', 'X10B', 26, '詹富杰', 'CHAM, NATHANIEL PAUL ONG', true),
  ('XB_27', 'X10B', 27, '蔡洁利', 'CHUA, KYLE ANDREW SIY', true),
  ('XB_28', 'X10B', 28, '罗仁顺', 'DATU, NATHAN LORENZO MANAWATAO', true),
  ('XB_29', 'X10B', 29, '杜金荣', 'DESQUITADO, JUSTIN AARON CAPILITAN', true),
  ('XB_30', 'X10B', 30, '王智杰', 'DY, GARETH EOIN EDUSMA', true),
  ('XB_31', 'X10B', 31, '黄大舜', 'GO, JOHN ELIAN GO', true),
  ('XH_1', 'X10H', 1, '曾勇士', 'REYES, LUCAS NATHANIEL CABOCHAN', true),
  ('XH_2', 'X10H', 2, '惠佳龙', 'SANDOVAL, LAZARO JUSTO GOROSPE', true),
  ('XH_3', 'X10H', 3, 'Yuchen Shi', 'SHI, YUCHEN', true),
  ('XH_4', 'X10H', 4, '陈俊英', 'TAN, MATTHEW GERALD FLORES', true),
  ('XH_5', 'X10H', 5, '蔡理富', 'TSAI, JOHN CALEB TURINGAN', true),
  ('XH_6', 'X10H', 6, '米明源', 'VICENCIO, YSAIAH RAPHAEL NUÑEZ', true),
  ('XH_7', 'X10H', 7, '吴鸿君', 'WU, HONGJUN', true),
  ('XH_8', 'X10H', 8, '楊凯陽', 'YANG, HARVEY LANCE', true),
  ('XH_9', 'X10H', 9, '杨智桀', 'YU, EDRICH KEON GO', true),
  ('XH_10', 'X10H', 10, '颜泉水', 'YU, JON WARREN CHUA', true),
  ('XH_11', 'X10H', 11, '孙闻名', 'BORROMEO, RODRIGO ESCUDERO', true),
  ('XH_12', 'X10H', 12, '林乙贵', 'CASTILLO, NATHAN RICHTER LIM CABALINAN', true),
  ('XH_13', 'X10H', 13, '蔡宏勋', 'CHUA, JACE CALIX CHUA', true),
  ('XH_14', 'X10H', 14, '伍代昌', 'ESCOLAR, RAIZO JEREMIAH DAVID', true),
  ('XH_15', 'X10H', 15, '凯天才', 'GARLITOS, JAYDEN GABRIEL', true),
  ('XH_16', 'X10H', 16, '吴明洲', 'GO, GEOFF EVANDER CHUA', true),
  ('XH_17', 'X10H', 17, '关鸿升', 'LAUREL, MARCUS IGNATIUS WONG', true),
  ('XH_18', 'X10H', 18, '李文杰', 'LEGASPI, JACOB GABRIEL', true),
  ('XH_19', 'X10H', 19, '林文涛', 'LIM, BRENDAN TYLER SO', true),
  ('XH_20', 'X10H', 20, '林仁恩', 'LIM, CODY STEVEN LIM', true),
  ('XH_21', 'X10H', 21, '黄大明', 'LIM, DAVIN JAMES SIA', true),
  ('XH_22', 'X10H', 22, '林建荣', 'LIM, JADEN BRADLEY NGO', true),
  ('XH_23', 'X10H', 23, '李文泽', 'MITRA, CARLOS XAVIER MABASA', true),
  ('XH_24', 'X10H', 24, '陈吉祥', 'NEGAPATAN, JOSEPH CISCO ESPERANZA', true),
  ('XH_25', 'X10H', 25, '王礼鸿', 'ONG, LIAM DANIEL GO', true),
  ('XH_26', 'X10H', 26, '吴志嘉', 'PEREZ, JAVIER ZAVIN MARTIN', true),
  ('XH_27', 'X10H', 27, '萧利伟', 'SIO, GAVIN BRYCE TAN', true),
  ('XH_28', 'X10H', 28, '苏俊源', 'SO, NATHANIEL JARED SY', true),
  ('XH_29', 'X10H', 29, '陈立和', 'TAN, RAFAEL LEVINE FUERZAS', true),
  ('XH_30', 'X10H', 30, '孙伟明', 'TIONGSON, JOHN ETHAN ARO PABELLANO', true),
  ('XH_31', 'X10H', 31, '翁志勇', 'WENG, KENNAN YANG', true),
  ('XH_32', 'X10H', 32, '杨元昆', 'YOUNG, KURT LAWRENCE GAMMAD', true)
  on conflict (id) do update set class_id=excluded.class_id, num=excluded.num, name=excluded.name, eng_name=excluded.eng_name, active=true;

-- 原班改显示名 + 收进菜单（数据不动）
update public.cls_classes set name='10A（原）' where id='10A';
update public.cls_classes set name='10H（原）' where id='10H';
insert into public.cls_settings(key, value) values('tucked_classes', '["10A","10H"]')
  on conflict (key) do update set value=excluded.value;

select id, name, sort, jsonb_array_length(groups) as 组数,
       (select count(*) from public.cls_students s where s.class_id=c.id and s.active) as 人数
  from public.cls_classes c order by sort;
