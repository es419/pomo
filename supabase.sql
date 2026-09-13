create extension if not exists pgcrypto;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  title text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  mode text not null check (mode in ('fixed','open')),
  planned_seconds integer check (planned_seconds is null or planned_seconds > 0),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  status text not null default 'running' check (status in ('running','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists one_running_session_per_user
on focus_sessions(user_id)
where status = 'running';

create index if not exists focus_sessions_user_started_idx on focus_sessions(user_id, started_at desc);
create index if not exists focus_sessions_task_idx on focus_sessions(task_id);
create index if not exists tasks_user_project_idx on tasks(user_id, project_id);

alter table projects enable row level security;
alter table tasks enable row level security;
alter table focus_sessions enable row level security;

drop policy if exists "projects own rows" on projects;
drop policy if exists "tasks own rows" on tasks;
drop policy if exists "sessions own rows" on focus_sessions;

create policy "projects own rows" on projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tasks own rows" on tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sessions own rows" on focus_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
