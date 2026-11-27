begin;

-- Enrollment is managed by the project administrator after verifying pilot eligibility.
create table ayni_private.ai_pilot_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  region text not null check (region = 'PE'),
  adult_verified boolean not null check (adult_verified),
  authorized_until timestamptz not null
);
create table ayni_private.ai_usage (
  bucket text not null,
  window_start timestamptz not null,
  count integer not null check (count >= 0),
  primary key (bucket, window_start)
);
alter table ayni_private.ai_pilot_members enable row level security;
alter table ayni_private.ai_usage enable row level security;
revoke all on ayni_private.ai_pilot_members, ayni_private.ai_usage from public, anon, authenticated, service_role;

create function public.ayni_reserve_ai(
  p_actor uuid, p_purpose text, p_cached boolean, p_user_limit integer, p_daily_limit integer, p_minute_limit integer
)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  actor_bucket text;
  day_start timestamptz;
  minute_start timestamptz;
  reserved_at timestamptz;
begin
  if p_actor is null or p_purpose is null or p_purpose not in ('match', 'extract', 'roadmap') or p_cached is null
    or p_user_limit is null or p_user_limit not between 0 and 100
    or p_daily_limit is null or p_daily_limit not between 0 and 10000
    or p_minute_limit is null or p_minute_limit not between 0 and 1000
  then raise exception 'Invalid AI quota' using errcode = '22023'; end if;

  -- One transaction takes the global, minute and per-user budgets together.
  perform pg_advisory_xact_lock(717900613);
  reserved_at := clock_timestamp();
  if not exists (
    select 1 from ayni_private.ai_pilot_members
    where user_id = p_actor and adult_verified and region = 'PE' and authorized_until > reserved_at
  ) then return 'pilot'; end if;
  if p_purpose = 'extract' and not exists (
    select 1 from public.user_roles where user_id = p_actor and role = 'owner'
  ) then return 'pilot'; end if;

  actor_bucket := case when p_purpose = 'extract' then 'extract:' else 'student:' end || p_actor::text;
  day_start := date_trunc('day', reserved_at, 'America/Los_Angeles');
  minute_start := date_trunc('minute', reserved_at);
  if coalesce((select count from ayni_private.ai_usage where bucket = actor_bucket and window_start = day_start), 0) >= p_user_limit
    or p_daily_limit = 0 or p_minute_limit = 0
    or (not p_cached and (
      coalesce((select count from ayni_private.ai_usage where bucket = 'global:day' and window_start = day_start), 0) >= p_daily_limit
      or coalesce((select count from ayni_private.ai_usage where bucket = 'global:minute' and window_start = minute_start), 0) >= p_minute_limit
    ))
  then return 'quota'; end if;

  delete from ayni_private.ai_usage where window_start < reserved_at - interval '48 hours';
  insert into ayni_private.ai_usage (bucket, window_start, count)
    values (actor_bucket, day_start, 1)
    on conflict (bucket, window_start) do update set count = ayni_private.ai_usage.count + 1;
  if not p_cached then
    insert into ayni_private.ai_usage (bucket, window_start, count)
      values ('global:day', day_start, 1), ('global:minute', minute_start, 1)
      on conflict (bucket, window_start) do update set count = ayni_private.ai_usage.count + 1;
  end if;
  return 'ok';
end;
$$;

-- Reuse the same transaction for existing rule-based clients and verified Edge calls.
create function ayni_private.save_roadmap(p_actor uuid, p_opportunity_id uuid, p_actions jsonb, p_origin public.ayni_roadmap_origin)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  name text;
  result_id uuid;
  action jsonb;
  requirement_id uuid;
  position smallint := 0;
begin
  if p_actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if jsonb_typeof(p_actions) is distinct from 'array' then raise exception 'Invalid roadmap' using errcode = '22023'; end if;
  if jsonb_array_length(p_actions) not between 1 and 30 then raise exception 'Invalid action count' using errcode = '22023'; end if;
  select title into name from public.opportunities where id = p_opportunity_id and publication_status = 'published' and is_public;
  if not found then raise exception 'Opportunity is unavailable' using errcode = 'P0002'; end if;
  insert into public.roadmaps (user_id, opportunity_id, title, origin)
    values (p_actor, p_opportunity_id, name, p_origin) on conflict (user_id, opportunity_id) do nothing returning id into result_id;
  if not found then
    select id into result_id from public.roadmaps where user_id = p_actor and opportunity_id = p_opportunity_id;
    return result_id;
  end if;
  for action in select value from jsonb_array_elements(p_actions) loop
    if jsonb_typeof(action) <> 'object' then raise exception 'Invalid action' using errcode = '22023'; end if;
    requirement_id := (action->>'requirement_id')::uuid;
    if requirement_id is not null and not exists (
      select 1 from public.opportunity_requirements r where r.id = requirement_id and opportunity_id = p_opportunity_id
    ) then raise exception 'Requirement belongs to another opportunity' using errcode = '22023'; end if;
    insert into public.roadmap_actions (roadmap_id, requirement_id, requirement_label, title, description, priority, duration, resources, position)
    values (result_id, requirement_id, action->>'requirement_label', btrim(action->>'title'),
      btrim(action->>'description'), (action->>'priority')::public.ayni_action_priority, btrim(action->>'duration'),
      coalesce(action->'resources', '[]'), position);
    position := position + 1;
  end loop;
  return result_id;
end;
$$;

create or replace function public.ayni_save_roadmap(p_opportunity_id uuid, p_actions jsonb)
returns uuid
language sql security definer
set search_path = ''
as $$
  select ayni_private.save_roadmap(auth.uid(), p_opportunity_id, p_actions, 'deterministic');
$$;

create function public.ayni_save_ai_roadmap(p_actor uuid, p_opportunity_id uuid, p_actions jsonb)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from ayni_private.ai_pilot_members
    where user_id = p_actor and adult_verified and region = 'PE' and authorized_until > now()
  ) then raise exception 'Pilot enrollment required' using errcode = '42501'; end if;
  return ayni_private.save_roadmap(p_actor, p_opportunity_id, p_actions, 'ai');
end;
$$;

revoke execute on function ayni_private.save_roadmap(uuid, uuid, jsonb, public.ayni_roadmap_origin)
  from public, anon, authenticated, service_role;
revoke execute on function public.ayni_reserve_ai(uuid, text, boolean, integer, integer, integer),
  public.ayni_save_ai_roadmap(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.ayni_reserve_ai(uuid, text, boolean, integer, integer, integer),
  public.ayni_save_ai_roadmap(uuid, uuid, jsonb) to service_role;

commit;
