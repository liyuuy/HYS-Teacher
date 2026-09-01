-- ============================================================
-- 教师工作台 · Supabase 数据库初始化脚本
-- 使用方法：在 Supabase 控制台 -> SQL Editor 中整段执行
-- 该脚本会：开启 pgcrypto 扩展、建 6 张表、启用 RLS 并创建按用户隔离的策略
-- ============================================================

-- 1. 开启扩展（生成 uuid 需要）
create extension if not exists "pgcrypto";

-- 2. 用户资料表
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz default now()
);

-- 3. 每日计划
create table public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  plan_date date not null,
  content text not null,
  plan_type text not null default '教学',   -- 教学 / 班主任 / 其他
  priority smallint not null default 2,    -- 1 高 / 2 中 / 3 低
  status text not null default '待办',     -- 待办 / 已完成
  created_at timestamptz default now()
);

-- 4. 待办事项
create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  category text not null default 'teaching', -- teaching 教学 / head_teacher 班主任 / other 其他
  title text not null,
  description text,
  due_date date,
  priority smallint not null default 2,     -- 1 高 / 2 中 / 3 低
  status text not null default 'todo',      -- todo / doing / done
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- 5. 课表
create table public.schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  term text not null,           -- 学期，如 '2026秋'
  weekday smallint not null,    -- 1-7 周一~周日
  period smallint not null,     -- 节次 1-12
  course text not null,
  class_name text,
  location text,
  color text default '#9BBBF4',
  notes text,
  created_at timestamptz default now(),
  unique (user_id, term, weekday, period)
);

-- 6. 教学进度
create table public.teaching_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  term text not null,
  course text not null,
  class_name text,
  chapter text not null,
  topic text,
  planned_date date,
  actual_date date,
  status text not null default '未开始',    -- 未开始 / 进行中 / 已完成
  remark text,
  created_at timestamptz default now()
);

-- 7. 班级日志
create table public.class_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  log_date date not null default current_date,
  class_name text,
  log_type text not null default '日常',    -- 日常 / 班会 / 事件
  content text not null,
  created_at timestamptz default now()
);

-- ============================================================
-- RLS：启用行级安全并创建「仅本人可读写」策略
-- 以下对每张业务表执行相同的 4 条策略（select / insert / update / delete）
-- ============================================================

-- ---------- profiles ----------
alter table public.profiles enable row level security;

create policy "own_profiles_select" on public.profiles
  for select using (auth.uid() = id);
create policy "own_profiles_insert" on public.profiles
  for insert with check (auth.uid() = id);
create policy "own_profiles_update" on public.profiles
  for update using (auth.uid() = id);
create policy "own_profiles_delete" on public.profiles
  for delete using (auth.uid() = id);

-- ---------- daily_plans ----------
alter table public.daily_plans enable row level security;

create policy "own_daily_plans_select" on public.daily_plans
  for select using (auth.uid() = user_id);
create policy "own_daily_plans_insert" on public.daily_plans
  for insert with check (auth.uid() = user_id);
create policy "own_daily_plans_update" on public.daily_plans
  for update using (auth.uid() = user_id);
create policy "own_daily_plans_delete" on public.daily_plans
  for delete using (auth.uid() = user_id);

-- ---------- todos ----------
alter table public.todos enable row level security;

create policy "own_todos_select" on public.todos
  for select using (auth.uid() = user_id);
create policy "own_todos_insert" on public.todos
  for insert with check (auth.uid() = user_id);
create policy "own_todos_update" on public.todos
  for update using (auth.uid() = user_id);
create policy "own_todos_delete" on public.todos
  for delete using (auth.uid() = user_id);

-- ---------- schedule ----------
alter table public.schedule enable row level security;

create policy "own_schedule_select" on public.schedule
  for select using (auth.uid() = user_id);
create policy "own_schedule_insert" on public.schedule
  for insert with check (auth.uid() = user_id);
create policy "own_schedule_update" on public.schedule
  for update using (auth.uid() = user_id);
create policy "own_schedule_delete" on public.schedule
  for delete using (auth.uid() = user_id);

-- ---------- teaching_progress ----------
alter table public.teaching_progress enable row level security;

create policy "own_teaching_progress_select" on public.teaching_progress
  for select using (auth.uid() = user_id);
create policy "own_teaching_progress_insert" on public.teaching_progress
  for insert with check (auth.uid() = user_id);
create policy "own_teaching_progress_update" on public.teaching_progress
  for update using (auth.uid() = user_id);
create policy "own_teaching_progress_delete" on public.teaching_progress
  for delete using (auth.uid() = user_id);

-- ---------- class_logs ----------
alter table public.class_logs enable row level security;

create policy "own_class_logs_select" on public.class_logs
  for select using (auth.uid() = user_id);
create policy "own_class_logs_insert" on public.class_logs
  for insert with check (auth.uid() = user_id);
create policy "own_class_logs_update" on public.class_logs
  for update using (auth.uid() = user_id);
create policy "own_class_logs_delete" on public.class_logs
  for delete using (auth.uid() = user_id);

-- ============================================================
-- 可选：为新注册用户自动创建 profiles 记录
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
