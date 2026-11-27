\set ON_ERROR_STOP on

-- Run only against a disposable database through psql. All fixtures roll back.
begin;
do $$
begin
  if current_setting('ayni.disposable_test', true) is distinct from 'on' then
    raise exception 'Use PGOPTIONS=-cayni.disposable_test=on on your local test database only.';
  end if;
end;
$$;

insert into auth.users (id, email) values
  ('fa200000-0000-4000-8000-000000000001', 'ayni-owner@example.invalid'),
  ('fa200000-0000-4000-8000-000000000002', 'ayni-student-a@example.invalid'),
  ('fa200000-0000-4000-8000-000000000003', 'ayni-student-b@example.invalid');
update public.user_roles set role = 'owner' where user_id = 'fa200000-0000-4000-8000-000000000001';

select set_config('ayni.test.opportunity', '{
  "title":"Convocatoria de prueba", "organization":"Institución de prueba", "description":"Prueba transaccional",
  "category":"Becas", "country":"Perú", "modality":"Virtual", "academic_levels":["Pregrado"],
  "funding":"Completo", "source":"https://becas.example.org/fase2", "verified_on":"2025-01-10"
}', true);

set local role anon;
do $$
begin
  if (select count(id) from public.opportunities) <> 0 then raise exception 'Expected an empty local catalog'; end if;
  begin perform id from public.submissions; raise exception 'Anonymous submissions readable';
    exception when insufficient_privilege then null; end;
  begin perform user_id from public.profiles; raise exception 'Anonymous profiles readable';
    exception when insufficient_privilege then null; end;
  begin perform public.ayni_admin_counts(); raise exception 'Anonymous metrics callable';
    exception when insufficient_privilege then null; end;
  begin perform public.ayni_save_opportunity(current_setting('ayni.test.opportunity')::jsonb, '[]'); raise exception 'Anonymous publication authorized';
    exception when insufficient_privilege then null; end;
  begin perform public.ayni_submit_opportunity('https://becas.example.org/anon', '', null, ''); raise exception 'Anonymous submissions accepted';
    exception when insufficient_privilege then null; end;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'fa200000-0000-4000-8000-000000000002', true);
insert into public.profiles (university, cycle) values ('Institución de prueba A', 3);

do $$
begin
  if (select role from public.user_roles) <> 'student' then raise exception 'Default student role missing'; end if;
  begin update public.user_roles set role = 'owner'; raise exception 'Role escalation authorized';
    exception when insufficient_privilege then null; end;
  begin insert into public.user_roles (user_id, role) values (auth.uid(), 'owner'); raise exception 'Role insertion authorized';
    exception when insufficient_privilege then null; end;
  begin insert into public.opportunities (title) values ('Prohibida'); raise exception 'Direct publication authorized';
    exception when insufficient_privilege then null; end;
  begin perform public.ayni_save_opportunity(current_setting('ayni.test.opportunity')::jsonb, '[]'); raise exception 'Student publication authorized by RPC';
    exception when insufficient_privilege then null; end;
  begin perform public.ayni_admin_submissions(); raise exception 'Student moderation list readable';
    exception when insufficient_privilege then null; end;
  begin insert into public.submissions (contributor_id, source, status) values (auth.uid(), 'https://becas.example.org/forzada', 'approved');
    raise exception 'Direct submission status authorized'; exception when insufficient_privilege then null; end;
  begin perform public.ayni_submit_opportunity('javascript:alert(1)', '', null, ''); raise exception 'Bad protocol accepted';
    exception when invalid_parameter_value then null; end;
  begin perform public.ayni_submit_opportunity('https://user@becas.example.org/credenciales', '', null, ''); raise exception 'Embedded credentials accepted';
    exception when invalid_parameter_value then null; end;
  begin perform public.ayni_submit_opportunity('https://becas.example.org/limite', repeat('a', 7001), null, ''); raise exception 'Length unchecked';
    exception when invalid_parameter_value then null; end;
end;
$$;

select set_config('ayni.test.submission', public.ayni_submit_opportunity('https://becas.example.org/fase2', 'Texto de prueba', 'Becas', '')::text, true);
do $$
begin
  if (select status from public.submissions where id = current_setting('ayni.test.submission')::uuid) <> 'pending' then raise exception 'Submission not pending'; end if;
  begin perform moderator_note from public.submissions; raise exception 'Private notes readable';
    exception when insufficient_privilege then null; end;
  begin perform public.ayni_submit_opportunity('http://BECAS.example.org:80/fase2/#duplicado', '', null, ''); raise exception 'Duplicate source accepted';
    exception when unique_violation then null; end;
  begin perform public.ayni_review_submission(current_setting('ayni.test.submission')::uuid, 'rejected', ''); raise exception 'Student moderation authorized';
    exception when insufficient_privilege then null; end;
  for n in 1..4 loop
    perform public.ayni_submit_opportunity('https://becas.example.org/prueba-' || n, '', null, '');
  end loop;
  begin perform public.ayni_submit_opportunity('https://becas.example.org/sexto', '', null, ''); raise exception 'Persistent rate limit bypassed';
    exception when sqlstate 'P0429' then null; end;
end;
$$;

select set_config('request.jwt.claim.sub', 'fa200000-0000-4000-8000-000000000003', true);
insert into public.profiles (university, cycle) values ('Institución de prueba B', 6);

do $$
begin
  if (select count(user_id) from public.profiles) <> 1 or exists (select 1 from public.profiles where university = 'Institución de prueba A') then
    raise exception 'Student isolation failed';
  end if;
  update public.profiles set university = 'No autorizada' where user_id = 'fa200000-0000-4000-8000-000000000002';
  if found then raise exception 'Foreign profile updated'; end if;
  begin insert into public.profiles (user_id, university) values ('fa200000-0000-4000-8000-000000000001', 'No autorizada');
    raise exception 'Foreign profile created'; exception when insufficient_privilege then null; end;
  if exists (select id from public.submissions) then raise exception 'Foreign submissions readable'; end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'fa200000-0000-4000-8000-000000000001', true);

do $$
begin
  if exists (select user_id from public.profiles) then raise exception 'Owner should not read academic profiles'; end if;
  if (select pending from public.ayni_admin_counts()) <> 5 then raise exception 'Owner counts incorrect'; end if;
  perform public.ayni_review_submission(current_setting('ayni.test.submission')::uuid, 'reviewing', 'Nota interna');
  perform public.ayni_review_submission(
    (select id from public.ayni_admin_submissions('pending') where source = 'https://becas.example.org/prueba-1'),
    'rejected', 'Fuente de prueba insuficiente'
  );
  if (select rejected from public.ayni_admin_counts()) <> 1 then raise exception 'Owner rejection failed'; end if;
  perform public.ayni_review_submission(
    (select id from public.ayni_admin_submissions('rejected') where source = 'https://becas.example.org/prueba-1'),
    'archived', 'Archivado de prueba'
  );
  if not exists (select 1 from public.ayni_admin_submissions('archived') where source = 'https://becas.example.org/prueba-1') then
    raise exception 'Owner submission archive failed';
  end if;
  begin
    perform public.ayni_save_opportunity(current_setting('ayni.test.opportunity')::jsonb,
      '[{"kind":"cycle","label":"Ciclo inválido","required_value":0}]', null, current_setting('ayni.test.submission')::uuid);
    raise exception 'Invalid requirements accepted';
  exception when check_violation then null; end;
  if exists (select id from public.opportunities) then raise exception 'Partial opportunity from a failed approval'; end if;
  if (select status from public.ayni_admin_submissions('reviewing') where id = current_setting('ayni.test.submission')::uuid) is distinct from 'reviewing' then
    raise exception 'Failed approval changed the submission';
  end if;
end;
$$;

select set_config('ayni.test.published', public.ayni_save_opportunity(current_setting('ayni.test.opportunity')::jsonb,
  '[{"kind":"cycle","label":"Ciclo mínimo de prueba","required_value":6,"condition":{"whenLevel":"Pregrado"},"mandatory":true}]',
  null, current_setting('ayni.test.submission')::uuid, null, 'Fuente revisada')::text, true);

do $$
begin
  if (select action from public.moderation_events where opportunity_id = current_setting('ayni.test.published')::uuid) <> 'approved' then raise exception 'Approval not audited'; end if;
  if public.ayni_save_opportunity('{}', '[]', null, current_setting('ayni.test.submission')::uuid)::text <> current_setting('ayni.test.published') then
    raise exception 'Approval retry produced another opportunity';
  end if;
end;
$$;

set local role anon;
do $$
begin
  if (select count(id) from public.opportunities) <> 1 then raise exception 'Approved opportunity not public'; end if;
  if (select count(id) from public.opportunity_requirements) <> 1 then raise exception 'Public requirements not readable'; end if;
  begin perform published_by from public.opportunities; raise exception 'Publisher identifier readable anonymously';
    exception when insufficient_privilege then null; end;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'fa200000-0000-4000-8000-000000000002', true);
insert into public.saved_opportunities (opportunity_id) values (current_setting('ayni.test.published')::uuid);
update public.saved_opportunities set status = 'En preparación' where opportunity_id = current_setting('ayni.test.published')::uuid;
do $$
begin
  if (select status from public.saved_opportunities) <> 'En preparación' then raise exception 'Saving or updating tracking failed'; end if;
  begin insert into public.saved_opportunities (opportunity_id) values (current_setting('ayni.test.published')::uuid);
    raise exception 'Duplicate save accepted'; exception when unique_violation then null; end;
end;
$$;
select public.ayni_save_roadmap(current_setting('ayni.test.published')::uuid,
  '[{"title":"Preparación de prueba","description":"Definir una meta","priority":"Alta","duration":"1 semana"}]');
update public.roadmap_actions set completed = true;

select set_config('request.jwt.claim.sub', 'fa200000-0000-4000-8000-000000000003', true);
do $$
begin
  if exists (select opportunity_id from public.saved_opportunities) or exists (select id from public.roadmaps)
    or exists (select id from public.roadmap_actions) then raise exception 'Foreign saved opportunities/roadmaps readable'; end if;
  update public.roadmap_actions set completed = false;
  if found then raise exception 'Foreign action updated'; end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'fa200000-0000-4000-8000-000000000001', true);
select public.ayni_archive_opportunity(current_setting('ayni.test.published')::uuid, true);
set local role anon;
do $$
begin
  if exists (select id from public.opportunities) or exists (select id from public.opportunity_requirements) then
    raise exception 'Archived opportunity or requirements are public';
  end if;
end;
$$;

reset role;
rollback;
\echo 'RLS, grants, approval atomicity, data isolation, rate limit and archives passed.'
