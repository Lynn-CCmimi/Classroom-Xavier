-- 课堂系统 v2 · 表结构
-- 与 A-Level / SAT 站共用同一个 Supabase 项目；所有表加 cls_ 前缀，
-- 权限全部走已有的 public.is_teacher()（profiles.role = 'teacher'）。
-- 在 Supabase SQL Editor 里整段执行，可重复执行。

create table if not exists public.cls_classes (
  id                text primary key,             -- 'G9E' | '10H' | '10A'
  name              text not null,                -- 显示名 '9E'
  sort              int  not null default 0,
  current_day       int  not null default 1,      -- D1..D7
  day_dates         jsonb not null default '{}',  -- {"7":"2026-08-28"}
  is_online         boolean not null default false,
  rotation_step     int,
  position_to_group jsonb,
  groups            jsonb not null default '[]',  -- [{name, head, student_ids[]}]
  last_opened       date,                         -- 上次打开日期，用于自动推 D 几
  updated_at        timestamptz not null default now()
);

create table if not exists public.cls_students (
  id        text primary key,                     -- 'G9E_0'
  class_id  text not null references public.cls_classes(id),
  num       int,                                  -- 学号
  name      text not null,
  eng_name  text,
  active    boolean not null default true
);
create index if not exists cls_students_class on public.cls_students(class_id, num);

-- 加减分 / 点名记录。分数 = 100 + sum(delta where term)；
-- 被点次数 = count(kind='called' or (kind='score' and delta>0)) where term
create table if not exists public.cls_events (
  id          uuid primary key default gen_random_uuid(),
  student_id  text not null references public.cls_students(id),
  class_id    text not null,
  term        text not null,                      -- 'Q1'..'Q4'
  kind        text not null default 'score' check (kind in ('score','called')),
  delta       int  not null default 0,
  reason      text,
  day         int,
  on_date     date,
  created_at  timestamptz not null default now()
);
create index if not exists cls_events_student on public.cls_events(student_id, term);
create index if not exists cls_events_class_date on public.cls_events(class_id, on_date);

-- 考试成绩（从 Google Sheets 导入；按 学生+学季+考试名 去重更新）
create table if not exists public.cls_exams (
  id          uuid primary key default gen_random_uuid(),
  student_id  text not null references public.cls_students(id),
  term        text not null,
  name        text not null,                      -- '写作1' / '听写1' / '听力+阅读'
  grade       text not null,                      -- 'A+' .. 'F'
  score       numeric,
  updated_at  timestamptz not null default now(),
  unique (student_id, term, name)
);

-- 考勤：一人一天一行，flags 可多选
create table if not exists public.cls_attendance (
  id           uuid primary key default gen_random_uuid(),
  student_id   text not null references public.cls_students(id),
  class_id     text not null,
  on_date      date not null,
  flags        text[] not null default '{}',      -- absent | late | camera_off | no_response
  late_time    text,                              -- 'HH:MM'
  noresp_time  text,
  updated_at   timestamptz not null default now(),
  unique (student_id, on_date)
);
create index if not exists cls_attendance_class_date on public.cls_attendance(class_id, on_date);

-- 全局设置：current_term / term_starts / grade_thresholds / lib
create table if not exists public.cls_settings (
  key    text primary key,
  value  jsonb not null
);

-- 旧系统整包备份（JSON 原样存，不用于显示）
create table if not exists public.cls_backups (
  id          uuid primary key default gen_random_uuid(),
  label       text,
  payload     jsonb not null,
  created_at  timestamptz not null default now()
);

-- ---------- RLS：只有老师 ----------
do $$
declare t text;
begin
  foreach t in array array['cls_classes','cls_students','cls_events','cls_exams','cls_attendance','cls_settings','cls_backups'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_teacher on public.%I', t, t);
    execute format('create policy %I_teacher on public.%I for all using (public.is_teacher()) with check (public.is_teacher())', t, t);
  end loop;
end $$;
