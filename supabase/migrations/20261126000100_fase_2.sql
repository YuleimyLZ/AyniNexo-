begin;

create schema ayni_private;
revoke all on schema ayni_private from public;
grant usage on schema ayni_private to authenticated;

create type public.ayni_role as enum ('student', 'owner');
create type public.ayni_category as enum (
  'Becas', 'Intercambios', 'Investigación', 'Hackathons', 'Conferencias',
  'Certificaciones', 'Liderazgo', 'Voluntariados', 'Oportunidades profesionales'
);
create type public.ayni_modality as enum ('Presencial', 'Virtual', 'Híbrida');
create type public.ayni_funding as enum ('Completo', 'Parcial', 'Sin financiamiento', 'Por confirmar');
create type public.ayni_academic_level as enum ('Pregrado', 'Egresado', 'Posgrado');
create type public.ayni_english as enum ('Sin nivel', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2');
create type public.ayni_publication as enum ('published', 'archived');
create type public.ayni_call_status as enum ('automatic', 'closed');
create type public.ayni_requirement_kind as enum ('cycle', 'english', 'certificate', 'travel', 'manual', 'skill', 'level');
create type public.ayni_submission_status as enum ('pending', 'reviewing', 'approved', 'rejected', 'archived');
create type public.ayni_tracking_status as enum ('Guardada', 'Me interesa', 'En preparación', 'Postulé', 'Finalizada');
create type public.ayni_roadmap_origin as enum ('deterministic', 'ai');
create type public.ayni_action_priority as enum ('Alta', 'Media');

create function ayni_private.official_url_key(value text)
returns text
language plpgsql immutable strict
set search_path = ''
as $$
declare
  parts text[];
  port text;
begin
  if char_length(value) not between 12 and 2048
     or value ~ '[[:space:][:cntrl:]]' or strpos(value, chr(92)) > 0 then
    return null;
  end if;
  parts := regexp_match(value, '^(https?)://([a-z0-9](?:[a-z0-9.-]*[a-z0-9])?)(:[0-9]{1,5})?((?:[/?][^#]*)?)(?:#.*)?$', 'i');
  if parts is null or strpos(parts[2], '.') = 0 or strpos(parts[2], '..') > 0 then
    return null;
  end if;
  if parts[3] is not null then
    port := substr(parts[3], 2)::integer::text;
    if port::integer not between 1 and 65535 then return null; end if;
    if (lower(parts[1]) = 'https' and port = '443')
       or (lower(parts[1]) = 'http' and port = '80') then port := null; end if;
  end if;
  return lower(parts[2]) || coalesce(':' || port, '') ||
         regexp_replace(coalesce(parts[4], ''), '/+$|/+(?=\?)', '', 'g');
end;
$$;

create function ayni_private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.ayni_role not null default 'student',
  created_at timestamptz not null default now()
);

create unique index ayni_single_owner on public.user_roles (role) where role = 'owner';

create function ayni_private.create_student_role()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.user_roles (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger ayni_student_role_after_signup
after insert on auth.users for each row execute function ayni_private.create_student_role();

insert into public.user_roles (user_id) select id from auth.users on conflict (user_id) do nothing;

create function ayni_private.is_owner()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'owner'
  )
$$;

create function ayni_private.require_owner()
returns uuid
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not ayni_private.is_owner() then
    raise exception 'Owner authorization required' using errcode = '42501';
  end if;
  return auth.uid();
end;
$$;

create table public.profiles (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  university text not null default '' check (char_length(university) <= 120),
  program text not null default '' check (char_length(program) <= 120),
  academic_level public.ayni_academic_level,
  cycle smallint check (cycle between 1 and 16),
  english public.ayni_english,
  certificate boolean,
  skills text[] not null default '{}' check (cardinality(skills) <= 12 and coalesce(char_length(array_to_string(skills, ',')), 0) <= 971 and array_position(skills, null) is null),
  interests text[] not null default '{}' check (cardinality(interests) <= 12 and coalesce(char_length(array_to_string(interests, ',')), 0) <= 971 and array_position(interests, null) is null),
  goals text not null default '' check (char_length(goals) <= 500),
  projects text not null default '' check (char_length(projects) <= 500),
  research text not null default '' check (char_length(research) <= 500),
  funding public.ayni_funding,
  travel boolean,
  destinations text[] not null default '{}' check (cardinality(destinations) <= 12 and coalesce(char_length(array_to_string(destinations, ',')), 0) <= 971 and array_position(destinations, null) is null),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 130),
  organization text not null check (char_length(btrim(organization)) between 1 and 100),
  description text not null check (char_length(btrim(description)) between 1 and 2500),
  category public.ayni_category not null,
  country text not null check (char_length(btrim(country)) between 1 and 60),
  modality public.ayni_modality not null,
  academic_levels public.ayni_academic_level[] not null check (cardinality(academic_levels) between 1 and 3 and array_position(academic_levels, null) is null),
  funding public.ayni_funding not null,
  benefits text[] not null default '{}' check (cardinality(benefits) <= 30 and coalesce(char_length(array_to_string(benefits, '')), 0) <= 1500 and array_position(benefits, null) is null),
  pending_information text[] not null default '{}' check (cardinality(pending_information) <= 30 and coalesce(char_length(array_to_string(pending_information, '')), 0) <= 1500 and array_position(pending_information, null) is null),
  topics text[] not null default '{}' check (cardinality(topics) <= 20 and coalesce(char_length(array_to_string(topics, '')), 0) <= 400 and array_position(topics, null) is null),
  deadline date,
  source text not null,
  source_key text generated always as (ayni_private.official_url_key(source)) stored not null unique,
  verified_on date not null,
  publication_status public.ayni_publication not null default 'published',
  is_public boolean not null default true,
  call_status public.ayni_call_status not null default 'automatic',
  published_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((publication_status = 'published') = is_public)
);

create index ayni_opportunities_public_deadline on public.opportunities (deadline, id)
where is_public and publication_status = 'published';

create table public.opportunity_requirements (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  kind public.ayni_requirement_kind not null,
  label text not null check (char_length(btrim(label)) between 1 and 300),
  condition jsonb not null default '{}' check (condition in ('{}', '{"whenLevel":"Pregrado"}', '{"whenLevel":"Egresado"}', '{"whenLevel":"Posgrado"}')),
  required_value jsonb,
  unit text check (char_length(unit) <= 60),
  mandatory boolean not null default true,
  source text check (source is null or ayni_private.official_url_key(source) is not null),
  display_order smallint not null default 0 check (display_order between 0 and 29),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind = 'cycle' or condition = '{}'),
  check (
    case kind
      when 'cycle' then coalesce(jsonb_typeof(required_value) = 'number' and required_value::text ~ '^([1-9]|1[0-6])$', false)
      when 'english' then coalesce(required_value in ('"Sin nivel"', '"A1"', '"A2"', '"B1"', '"B2"', '"C1"', '"C2"'), false)
      when 'skill' then coalesce(jsonb_typeof(required_value) = 'string' and char_length(btrim(required_value #>> '{}')) between 1 and 80, false)
      when 'level' then coalesce(jsonb_typeof(required_value) = 'array' and required_value <> '[]' and required_value <@ '["Pregrado","Egresado","Posgrado"]', false)
      else required_value is null
    end
  )
);

create index ayni_requirements_opportunity on public.opportunity_requirements (opportunity_id, display_order);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid references auth.users(id) on delete set null,
  source text not null,
  source_key text generated always as (ayni_private.official_url_key(source)) stored not null,
  body text not null default '' check (char_length(body) <= 7000),
  suggested_category public.ayni_category,
  comment text not null default '' check (char_length(comment) <= 700),
  status public.ayni_submission_status not null default 'pending',
  moderator_note text not null default '' check (char_length(moderator_note) <= 2000),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_id uuid references auth.users(id) on delete set null,
  published_opportunity_id uuid unique references public.opportunities(id) on delete restrict,
  updated_at timestamptz not null default now(),
  check (status <> 'approved' or published_opportunity_id is not null)
);

create unique index ayni_submissions_active_source on public.submissions (source_key)
where status in ('pending', 'reviewing', 'approved');
create index ayni_submissions_contributor on public.submissions (contributor_id, submitted_at desc);
create index ayni_submissions_queue on public.submissions (status, submitted_at desc);

create table public.saved_opportunities (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  status public.ayni_tracking_status not null default 'Guardada',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, opportunity_id)
);
create index ayni_saved_opportunity on public.saved_opportunities (opportunity_id);

create table public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 130),
  origin public.ayni_roadmap_origin not null default 'deterministic',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, opportunity_id)
);
create index ayni_roadmaps_opportunity on public.roadmaps (opportunity_id);

create table public.roadmap_actions (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.roadmaps(id) on delete cascade,
  requirement_id uuid references public.opportunity_requirements(id) on delete set null,
  requirement_label text check (char_length(requirement_label) <= 300),
  title text not null check (char_length(btrim(title)) between 1 and 130),
  description text not null check (char_length(btrim(description)) between 1 and 1200),
  priority public.ayni_action_priority not null,
  duration text not null check (char_length(btrim(duration)) between 1 and 80),
  resources jsonb not null default '[]' check (jsonb_typeof(resources) = 'array' and octet_length(resources::text) <= 8000),
  position smallint not null check (position between 0 and 29),
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (roadmap_id, position)
);
create index ayni_roadmap_actions_requirement on public.roadmap_actions (requirement_id);

create table public.moderation_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  submission_id uuid references public.submissions(id) on delete set null,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  action text not null check (action in ('reviewing', 'rejected', 'submission_archived', 'approved', 'published', 'edited', 'opportunity_archived', 'restored')),
  note text not null default '' check (char_length(note) <= 2000),
  created_at timestamptz not null default now()
);
create index ayni_audit_submission on public.moderation_events (submission_id, created_at desc);
create index ayni_audit_opportunity on public.moderation_events (opportunity_id, created_at desc);

create trigger ayni_profile_timestamp before update on public.profiles for each row execute function ayni_private.touch_updated_at();
create trigger ayni_opportunity_timestamp before update on public.opportunities for each row execute function ayni_private.touch_updated_at();
create trigger ayni_requirement_timestamp before update on public.opportunity_requirements for each row execute function ayni_private.touch_updated_at();
create trigger ayni_submission_timestamp before update on public.submissions for each row execute function ayni_private.touch_updated_at();
create trigger ayni_saved_timestamp before update on public.saved_opportunities for each row execute function ayni_private.touch_updated_at();
create trigger ayni_roadmap_timestamp before update on public.roadmaps for each row execute function ayni_private.touch_updated_at();
create trigger ayni_action_timestamp before update on public.roadmap_actions for each row execute function ayni_private.touch_updated_at();

alter table public.user_roles enable row level security;
alter table public.profiles enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_requirements enable row level security;
alter table public.submissions enable row level security;
alter table public.saved_opportunities enable row level security;
alter table public.roadmaps enable row level security;
alter table public.roadmap_actions enable row level security;
alter table public.moderation_events enable row level security;

revoke all on table public.user_roles, public.profiles, public.opportunities, public.opportunity_requirements,
  public.submissions, public.saved_opportunities, public.roadmaps, public.roadmap_actions,
  public.moderation_events from public, anon, authenticated;

grant select (id, title, organization, description, category, country, modality, academic_levels, funding,
  benefits, pending_information, topics, deadline, source, verified_on, publication_status, is_public,
  call_status, created_at, updated_at) on public.opportunities to anon, authenticated;
grant select on public.opportunity_requirements to anon, authenticated;
grant select on public.user_roles, public.profiles, public.saved_opportunities, public.roadmaps,
  public.roadmap_actions, public.moderation_events to authenticated;
grant select (id, contributor_id, source, body, suggested_category, comment, status, submitted_at, reviewed_at, published_opportunity_id)
  on public.submissions to authenticated;
grant insert (user_id, university, program, academic_level, cycle, english, certificate, skills, interests, goals, projects, research, funding, travel, destinations)
  on public.profiles to authenticated;
grant update (user_id, university, program, academic_level, cycle, english, certificate, skills, interests, goals, projects, research, funding, travel, destinations)
  on public.profiles to authenticated;
grant insert (user_id, opportunity_id, status), update (user_id, opportunity_id, status), delete on public.saved_opportunities to authenticated;
grant update (completed) on public.roadmap_actions to authenticated;

create policy ayni_role_self on public.user_roles for select to authenticated using (user_id = (select auth.uid()));
create policy ayni_profile_self on public.profiles for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy ayni_catalog_public on public.opportunities for select to anon, authenticated
using (is_public and publication_status = 'published');
create policy ayni_catalog_owner on public.opportunities for select to authenticated using ((select ayni_private.is_owner()));
create policy ayni_requirements_visible on public.opportunity_requirements for select to anon, authenticated
using (exists (select 1 from public.opportunities where id = opportunity_id));
create policy ayni_submissions_self on public.submissions for select to authenticated
using (contributor_id = (select auth.uid()));
create policy ayni_saved_self on public.saved_opportunities for select to authenticated using (user_id = (select auth.uid()));
create policy ayni_saved_remove_self on public.saved_opportunities for delete to authenticated using (user_id = (select auth.uid()));
create policy ayni_saved_insert_self on public.saved_opportunities for insert to authenticated
with check (user_id = (select auth.uid()) and exists (
  select 1 from public.opportunities where id = opportunity_id and is_public and publication_status = 'published'
));
create policy ayni_saved_update_self on public.saved_opportunities for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and exists (
  select 1 from public.opportunities where id = opportunity_id and is_public and publication_status = 'published'
));
create policy ayni_roadmaps_self on public.roadmaps for select to authenticated using (user_id = (select auth.uid()));
create policy ayni_actions_self on public.roadmap_actions for select to authenticated
using (exists (select 1 from public.roadmaps where id = roadmap_id and user_id = (select auth.uid())));
create policy ayni_actions_complete_self on public.roadmap_actions for update to authenticated
using (exists (select 1 from public.roadmaps where id = roadmap_id and user_id = (select auth.uid())))
with check (exists (select 1 from public.roadmaps where id = roadmap_id and user_id = (select auth.uid())));
create policy ayni_audit_owner on public.moderation_events for select to authenticated using ((select ayni_private.is_owner()));

create function public.ayni_submit_opportunity(p_source text, p_body text, p_category public.ayni_category, p_comment text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  requested_key text := ayni_private.official_url_key(btrim(p_source));
  new_id uuid;
begin
  if actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if requested_key is null or char_length(coalesce(p_body, '')) > 7000 or char_length(coalesce(p_comment, '')) > 700 then
    raise exception 'Invalid submission' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('ayni:submit:' || actor::text, 0));
  if (select count(*) from public.submissions where contributor_id = actor and submitted_at > clock_timestamp() - interval '1 hour') >= 5 then
    raise exception 'Submission rate limit reached' using errcode = 'P0429';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('ayni:source:' || requested_key, 0));
  if exists (select 1 from public.opportunities o where o.source_key = requested_key) then
    raise exception 'Source already registered' using errcode = '23505';
  end if;
  insert into public.submissions (contributor_id, source, body, suggested_category, comment)
  values (actor, btrim(p_source), btrim(coalesce(p_body, '')), p_category, btrim(coalesce(p_comment, '')))
  returning id into new_id;
  return new_id;
end;
$$;

create function public.ayni_admin_submissions(p_status public.ayni_submission_status default null)
returns setof public.submissions
language plpgsql stable security definer
set search_path = ''
as $$
begin
  perform ayni_private.require_owner();
  return query select * from public.submissions where p_status is null or status = p_status
    order by submitted_at desc, id;
end;
$$;

create function public.ayni_admin_counts()
returns table (published bigint, pending bigint, rejected bigint, expired bigint)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  perform ayni_private.require_owner();
  return query select
    (select count(*) from public.opportunities where publication_status = 'published'),
    (select count(*) from public.submissions where status in ('pending', 'reviewing')),
    (select count(*) from public.submissions where status = 'rejected'),
    (select count(*) from public.opportunities where call_status = 'closed' or deadline < (now() at time zone 'America/Lima')::date);
end;
$$;

create function public.ayni_review_submission(p_id uuid, p_status public.ayni_submission_status, p_note text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  actor uuid := ayni_private.require_owner();
  current_status public.ayni_submission_status;
  note_value text := btrim(coalesce(p_note, ''));
begin
  select status into current_status from public.submissions where id = p_id for update;
  if not found then raise exception 'Submission not found' using errcode = 'P0002'; end if;
  if char_length(note_value) > 2000 then raise exception 'Invalid moderation note' using errcode = '22023'; end if;
  if p_status is null or not (
    (p_status in ('reviewing', 'rejected') and current_status in ('pending', 'reviewing')) or
    (p_status = 'archived' and current_status in ('pending', 'reviewing', 'approved', 'rejected'))
  ) then raise exception 'Invalid moderation transition' using errcode = '55000'; end if;
  update public.submissions set status = p_status, moderator_note = note_value, reviewer_id = actor, reviewed_at = now()
    where id = p_id;
  insert into public.moderation_events (actor_id, submission_id, action, note)
    values (actor, p_id, case when p_status = 'archived' then 'submission_archived' else p_status::text end, note_value);
end;
$$;

-- The opportunity, requirements, submission transition and audit share one transaction.
create function public.ayni_save_opportunity(
  p_data jsonb, p_requirements jsonb, p_id uuid default null, p_submission_id uuid default null,
  p_expected_updated_at timestamptz default null, p_note text default ''
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  actor uuid := ayni_private.require_owner();
  candidate public.opportunities;
  submission public.submissions;
  result_id uuid;
  requirement jsonb;
  requirement_id uuid;
  retained uuid[] := '{}';
  position smallint := 0;
  note_value text := btrim(coalesce(p_note, ''));
  duplicate_key text;
begin
  if p_submission_id is not null then
    if p_id is not null then raise exception 'Invalid approval' using errcode = '22023'; end if;
    select * into submission from public.submissions where id = p_submission_id for update;
    if not found then raise exception 'Submission not found' using errcode = 'P0002'; end if;
    if submission.status = 'approved' then return submission.published_opportunity_id; end if;
    if submission.status not in ('pending', 'reviewing') then
      raise exception 'Submission is no longer eligible for approval' using errcode = '55000';
    end if;
  end if;
  if jsonb_typeof(p_data) is distinct from 'object' or jsonb_typeof(p_requirements) is distinct from 'array'
     or char_length(note_value) > 2000 then raise exception 'Invalid opportunity' using errcode = '22023'; end if;
  if jsonb_array_length(p_requirements) > 30 then raise exception 'Too many requirements' using errcode = '22023'; end if;

  candidate := jsonb_populate_record(null::public.opportunities, p_data);
  candidate.source := btrim(candidate.source);
  duplicate_key := ayni_private.official_url_key(candidate.source);
  if duplicate_key is null then raise exception 'Invalid official source' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('ayni:source:' || duplicate_key, 0));

  if p_id is null then
    insert into public.opportunities (title, organization, description, category, country, modality, academic_levels, funding,
      benefits, pending_information, topics, deadline, source, verified_on, call_status, published_by)
    values (btrim(candidate.title), btrim(candidate.organization), btrim(candidate.description), candidate.category, btrim(candidate.country),
      candidate.modality, candidate.academic_levels, candidate.funding, coalesce(candidate.benefits, '{}'),
      coalesce(candidate.pending_information, '{}'), coalesce(candidate.topics, '{}'), candidate.deadline,
      candidate.source, candidate.verified_on, coalesce(candidate.call_status, 'automatic'), actor)
    returning id into result_id;
  else
    update public.opportunities set title = btrim(candidate.title), organization = btrim(candidate.organization),
      description = btrim(candidate.description), category = candidate.category, country = btrim(candidate.country),
      modality = candidate.modality, academic_levels = candidate.academic_levels, funding = candidate.funding,
      benefits = coalesce(candidate.benefits, '{}'), pending_information = coalesce(candidate.pending_information, '{}'),
      topics = coalesce(candidate.topics, '{}'), deadline = candidate.deadline, source = candidate.source,
      verified_on = candidate.verified_on, call_status = coalesce(candidate.call_status, 'automatic')
      where id = p_id and updated_at = p_expected_updated_at
      returning id into result_id;
    if not found then raise exception 'Opportunity changed since it was opened' using errcode = '40001'; end if;
  end if;

  for requirement in select value from jsonb_array_elements(p_requirements) loop
    if jsonb_typeof(requirement) <> 'object' then raise exception 'Invalid requirement' using errcode = '22023'; end if;
    requirement_id := coalesce((requirement->>'id')::uuid, gen_random_uuid());
    if requirement_id = any(retained) then raise exception 'Repeated requirement' using errcode = '22023'; end if;
    insert into public.opportunity_requirements (id, opportunity_id, kind, label, condition, required_value, unit, mandatory, source, display_order)
      values (requirement_id, result_id, (requirement->>'kind')::public.ayni_requirement_kind, btrim(requirement->>'label'),
        coalesce(requirement->'condition', '{}'), nullif(requirement->'required_value', 'null'), nullif(btrim(requirement->>'unit'), ''),
        coalesce((requirement->>'mandatory')::boolean, true), nullif(btrim(requirement->>'source'), ''), position)
      on conflict (id) do update set kind = excluded.kind, label = excluded.label, condition = excluded.condition,
        required_value = excluded.required_value, unit = excluded.unit, mandatory = excluded.mandatory,
        source = excluded.source, display_order = excluded.display_order
      where opportunity_requirements.opportunity_id = result_id;
    if not found then raise exception 'Requirement belongs to another opportunity' using errcode = '22023'; end if;
    retained := array_append(retained, requirement_id);
    position := position + 1;
  end loop;
  if p_id is not null then
    delete from public.opportunity_requirements where opportunity_id = result_id and not (id = any(retained));
  end if;
  if p_submission_id is not null then
    update public.submissions set status = 'approved', published_opportunity_id = result_id,
      moderator_note = note_value, reviewer_id = actor, reviewed_at = now()
      where id = p_submission_id;
  end if;
  insert into public.moderation_events (actor_id, submission_id, opportunity_id, action, note)
  values (actor, p_submission_id, result_id,
    case when p_submission_id is not null then 'approved' when p_id is not null then 'edited' else 'published' end, note_value);
  return result_id;
end;
$$;

create function public.ayni_archive_opportunity(p_id uuid, p_archived boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare actor uuid := ayni_private.require_owner();
begin
  if p_archived is null then raise exception 'Missing archive state' using errcode = '22023'; end if;
  update public.opportunities
    set publication_status = case when p_archived then 'archived'::public.ayni_publication else 'published'::public.ayni_publication end,
      is_public = not p_archived
    where id = p_id and is_public = p_archived;
  if found then
    insert into public.moderation_events (actor_id, opportunity_id, action)
      values (actor, p_id, case when p_archived then 'opportunity_archived' else 'restored' end);
  elsif not exists (select 1 from public.opportunities where id = p_id) then
    raise exception 'Opportunity not found' using errcode = 'P0002';
  end if;
end;
$$;

create function public.ayni_save_roadmap(p_opportunity_id uuid, p_actions jsonb)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  name text;
  result_id uuid;
  action jsonb;
  requirement_id uuid;
  position smallint := 0;
begin
  if actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if jsonb_typeof(p_actions) is distinct from 'array' then raise exception 'Invalid roadmap' using errcode = '22023'; end if;
  if jsonb_array_length(p_actions) not between 1 and 30 then raise exception 'Invalid action count' using errcode = '22023'; end if;
  select title into name from public.opportunities where id = p_opportunity_id and publication_status = 'published' and is_public;
  if not found then raise exception 'Opportunity is unavailable' using errcode = 'P0002'; end if;
  insert into public.roadmaps (user_id, opportunity_id, title)
    values (actor, p_opportunity_id, name) on conflict (user_id, opportunity_id) do nothing returning id into result_id;
  if not found then
    select id into result_id from public.roadmaps where user_id = actor and opportunity_id = p_opportunity_id;
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

revoke execute on all functions in schema ayni_private from public, anon, authenticated;
grant execute on function ayni_private.is_owner() to authenticated;

revoke execute on function public.ayni_submit_opportunity(text, text, public.ayni_category, text),
  public.ayni_admin_submissions(public.ayni_submission_status), public.ayni_admin_counts(),
  public.ayni_review_submission(uuid, public.ayni_submission_status, text),
  public.ayni_save_opportunity(jsonb, jsonb, uuid, uuid, timestamptz, text),
  public.ayni_archive_opportunity(uuid, boolean), public.ayni_save_roadmap(uuid, jsonb)
from public, anon, authenticated;
grant execute on function public.ayni_submit_opportunity(text, text, public.ayni_category, text),
  public.ayni_admin_submissions(public.ayni_submission_status), public.ayni_admin_counts(),
  public.ayni_review_submission(uuid, public.ayni_submission_status, text),
  public.ayni_save_opportunity(jsonb, jsonb, uuid, uuid, timestamptz, text),
  public.ayni_archive_opportunity(uuid, boolean), public.ayni_save_roadmap(uuid, jsonb)
to authenticated;

commit;
