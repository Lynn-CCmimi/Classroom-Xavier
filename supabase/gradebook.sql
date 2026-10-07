-- 成绩簿 · 追加表结构（在 Supabase SQL Editor 里整段执行，可重复执行）
-- 内容：考试格增加「原始输入 / 是否手调」；笔记抽检 + Green Slip 记录；每人每季的 Conduct/Effort/手调综评；
--       学生个人码；学生自查用的受限查询函数（只返回本人、不含 Conduct/Effort/PTC/Green Slip）。

-- 1. 考试格：raw = 老师输入的原文（'23' 或 'A+'），override = 等级被手动调过（自动值不会再覆盖）
alter table public.cls_exams add column if not exists raw text;
alter table public.cls_exams add column if not exists override boolean not null default false;

-- 2. 课堂表现记录：笔记抽检 / Green Slip
create table if not exists public.cls_marks (
  id          uuid primary key default gen_random_uuid(),
  student_id  text not null references public.cls_students(id),
  class_id    text not null,
  term        text not null,
  kind        text not null check (kind in ('notebook','slip')),
  val         text,                     -- notebook: ok | part | miss ；slip: 空
  reason      text,
  on_date     date,
  created_at  timestamptz not null default now()
);
create index if not exists cls_marks_student on public.cls_marks(student_id, term);

-- 3. 每人每季的报告：Conduct/Effort（O/V/G/S/U）、PTC、备注、手调的综评 {"A1":"B+","final":"A"}
create table if not exists public.cls_term_report (
  student_id  text not null references public.cls_students(id),
  term        text not null,
  conduct     text,
  effort      text,
  ptc         boolean,                  -- null = 用系统建议；true/false = 老师手定
  note        text,
  overrides   jsonb not null default '{}',
  updated_at  timestamptz not null default now(),
  primary key (student_id, term)
);

-- 4. 学生个人码 + 输错记录
alter table public.cls_students add column if not exists pin text;
create table if not exists public.cls_lookup_fail (
  id        bigserial primary key,
  class_id  text not null,
  num       int  not null,
  at        timestamptz not null default now()
);

-- 5. RLS：以上全部只有老师能直接读写
do $$
declare t text;
begin
  foreach t in array array['cls_marks','cls_term_report','cls_lookup_fail'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_teacher on public.%I', t, t);
    execute format('create policy %I_teacher on public.%I for all using (public.is_teacher()) with check (public.is_teacher())', t, t);
  end loop;
end $$;

-- 6. 学生自查：班级 + 学号 + 中文名 + 个人码 → 只返回这一个学生的成绩和课堂分。
--    只给学生看当前学季、老师开放的考试项成绩 + 课堂分。连续输错 5 次锁 15 分钟（按 班级+学号 计）；错误提示一律「信息不对」，不透露是哪一项错。
create or replace function public.cls_student_view(p_class text, p_num int, p_name text, p_pin text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s   public.cls_students%rowtype;
  st  jsonb; v_term text; cfg jsonb; vis jsonb; base int; sc int;
begin
  delete from cls_lookup_fail where at < now() - interval '1 day';
  if (select count(*) from cls_lookup_fail where class_id = p_class and num = p_num and at > now() - interval '15 minutes') >= 5 then
    return jsonb_build_object('error', 'locked');
  end if;
  select * into s from cls_students
   where class_id = p_class and num = p_num and active is not false
     and trim(name) = trim(p_name) and pin is not null and pin = trim(p_pin);
  if not found then
    insert into cls_lookup_fail(class_id, num) values (p_class, p_num);
    return jsonb_build_object('error', 'bad');
  end if;
  select coalesce(jsonb_object_agg(key, value), '{}') into st from cls_settings
   where key in ('current_term','student_view','gb_config','gb_track','gb_points','base_score');
  if coalesce((st->'student_view'->>p_class)::boolean, false) is not true then
    return jsonb_build_object('error', 'closed');
  end if;
  v_term := coalesce(st->>'current_term', 'Q1');
  base := coalesce((st->'base_score'->>v_term)::int, case when v_term = 'Q1' then 100 else 60 end);
  select base + coalesce(sum(delta), 0) into sc from cls_events where student_id = s.id and term = v_term and kind = 'score';
  cfg := st->'gb_config'->(p_class || '|' || v_term);
  -- 只返回「当前学季」里老师已开放（show=true）的考试项；不返回综评、总等级、Conduct/Effort/PTC/Green Slip、手调综评
  vis := coalesce((select jsonb_agg(jsonb_build_object('name', i->>'name', 'mode', i->>'mode', 'max', i->'max'))
                   from jsonb_array_elements(coalesce(cfg->'items', '[]'::jsonb)) i
                   where coalesce((i->>'show')::boolean, false)), '[]'::jsonb);
  return jsonb_build_object(
    'student', jsonb_build_object('name', s.name, 'num', s.num, 'class_id', s.class_id),
    'class_name', (select name from cls_classes where id = p_class),
    'term', v_term,
    'points', sc,
    'items', vis,
    'gb_points', st->'gb_points',
    'cells', coalesce((select jsonb_agg(jsonb_build_object('name', e.name, 'raw', e.raw, 'score', e.score, 'grade', e.grade, 'override', e.override))
                       from cls_exams e
                       where e.student_id = s.id and e.term = v_term
                         and e.name in (select v->>'name' from jsonb_array_elements(vis) v)), '[]'::jsonb)
  );
end $$;
grant execute on function public.cls_student_view(text, int, text, text) to anon, authenticated;
