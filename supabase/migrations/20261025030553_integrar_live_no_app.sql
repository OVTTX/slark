-- Internal Slark Live: immutable, once-per-room podium; existing points are preserved.
do $$ begin
 if not exists(select 1 from pg_roles where rolname='slarkapp_live') then
  create role slarkapp_live login nosuperuser nocreatedb nocreaterole noinherit nobypassrls connection limit 6;
 end if;
end $$;
grant usage on schema slarklive_private to slarkapp_live;
grant select,update on slarklive_private.state to slarkapp_live;
create policy slarkapp_backend_select on slarklive_private.state for select to slarkapp_live using(id=1);
create policy slarkapp_backend_update on slarklive_private.state for update to slarkapp_live using(id=1) with check(id=1);
alter role slarkapp_live set statement_timeout='15s';
alter role slarkapp_live set idle_in_transaction_session_timeout='30s';

create table slarklive_private.podium_rewards(
 room_id uuid not null, team_id uuid not null references public.times(id),
 aluno_id uuid not null references public.alunos(id),place integer not null check(place>0),
 points integer not null check(points in (5,7,20)),awarded_at timestamptz not null default now(),
 primary key(room_id,aluno_id)
);
create table slarklive_private.podium_team_rewards(
 room_id uuid not null,team_id uuid not null references public.times(id),
 sala_id uuid not null references public.salas(id),place integer not null check(place>0),
 points integer not null check(points in (5,7,20)),awarded_at timestamptz not null default now(),
 primary key(room_id,team_id)
);
alter table slarklive_private.podium_rewards enable row level security;
alter table slarklive_private.podium_team_rewards enable row level security;
revoke all on slarklive_private.podium_rewards,slarklive_private.podium_team_rewards from public,anon,authenticated,slarkapp_live;
create or replace function slarklive_private.credit_podium() returns trigger
language plpgsql security definer set search_path='' as $$
declare entry record; room jsonb; previous jsonb; award jsonb; classroom uuid; owner_id uuid;
 roster jsonb; member_ids uuid[]; team uuid; reward integer; position integer; match_id uuid; changed integer;
begin
 if tg_table_schema<>'slarklive_private' or tg_table_name<>'state' or session_user not in ('slarkapp_live','postgres') then
  raise exception 'Slark Live: origem da premiação inválida.';
 end if;
 for entry in select key,value from jsonb_each(new.data->'rooms') loop
  room:=entry.value;previous:=old.data->'rooms'->entry.key;
  if room=previous or room->>'rankingVersion' is distinct from '2' or room->>'demo' is distinct from 'false'
     or room->>'completed' is distinct from 'true' or room->>'status' is distinct from 'closed'
     or room->'standings' is null or previous->'standings' is not null then continue; end if;
  if previous->>'rankingId' is distinct from room->>'rankingId' or previous->>'status' is distinct from 'active'
     or room->'teams' is distinct from previous->'teams' or room->>'owner' is distinct from previous->>'owner'
     or room->>'trailId' is distinct from previous->>'trailId' then
   raise exception 'Slark Live: partida ou integrantes alterados.';
  end if;
  if room->'tournament' is not null and (room->'tournament'->>'phase' is distinct from 'completed' or room->'tournament'->>'champion' is null) then
   raise exception 'Slark Live: torneio ainda não concluído.';
  end if;
  match_id:=(room->>'rankingId')::uuid;owner_id:=(room->>'owner')::uuid;
  select t.sala_id into classroom from public.trilhas t join public.usuarios u on u.id=owner_id
   where t.id=(room->>'trailId')::uuid and u.ativo is not false
   and (u.perfil::text='admin_slark' or(u.perfil::text='professor' and t.professor_id=u.id)
        or(u.perfil::text='diretor' and t.escola_id=u.escola_id));
  if classroom is null then raise exception 'Slark Live: turma fora do acesso do professor.'; end if;
  for award in select value from jsonb_array_elements(room->'standings') loop
   position:=(award->>'place')::integer;
   reward:=case position when 1 then 20 when 2 then 7 when 3 then 5 else 0 end;
   if reward=0 or coalesce((award->>'points')::integer,0)=0 then continue;end if;
   if (award->>'points')::integer<>reward then raise exception 'Slark Live: valor da premiação inválido.';end if;
   team:=(award->>'teamId')::uuid;roster:=room->'teams'->(team::text)->'members';
   if roster is null or jsonb_array_length(roster)<>4 then raise exception 'Slark Live: quarteto inválido.';end if;
   select array_agg(distinct (m->>'id')::uuid) into member_ids from jsonb_array_elements(roster) m;
   if cardinality(member_ids)<>4 or (select count(*) from public.time_membros tm
     join public.alunos a on a.id=tm.aluno_id join public.times t on t.id=tm.time_id
     where tm.time_id=team and a.id=any(member_ids) and a.sala_id=classroom and t.sala_id=classroom)<>4 then
    raise exception 'Slark Live: integrantes fora do quarteto cadastrado.';
   end if;
   with credited as (
    insert into slarklive_private.podium_team_rewards(room_id,team_id,sala_id,place,points)
    values(match_id,team,classroom,position,reward) on conflict do nothing returning team_id
   ) update public.times t set pontos=coalesce(t.pontos,0)+reward from credited where t.id=credited.team_id;
   with credited as (
    insert into slarklive_private.podium_rewards(room_id,team_id,aluno_id,place,points)
    select match_id,team,id,position,reward from unnest(member_ids) id on conflict do nothing returning aluno_id
   ) update public.alunos a set pontos=coalesce(a.pontos,0)+reward from credited where a.id=credited.aluno_id;
   get diagnostics changed=row_count;
   if changed not in (0,4) then raise exception 'Slark Live: crédito incompleto; operação desfeita.';end if;
  end loop;
 end loop;
 return new;
end $$;
revoke all on function slarklive_private.credit_podium() from public,anon,authenticated,slarkapp_live;
create trigger credit_podium after update of data on slarklive_private.state
 for each row when(old.data is distinct from new.data and session_user in ('slarkapp_live','postgres')) execute function slarklive_private.credit_podium();

-- Only aggregate team/class scores are returned, never student names or account data.
create or replace function slark_private.live_ranking(p_sala uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare viewer public.usuarios;school uuid;selected uuid;payload jsonb;
begin
 select * into viewer from public.usuarios where id=auth.uid() and ativo is not false;
 if viewer.id is null then raise exception 'Entre na sua conta Slark.';end if;
 school:=viewer.escola_id;
 if viewer.perfil::text='aluno' then select sala_id into selected from public.alunos where usuario_id=viewer.id limit 1; end if;
 selected:=coalesce(p_sala,selected);
 if viewer.perfil::text='admin_slark' and selected is not null then select escola_id into school from public.salas where id=selected;end if;
 if viewer.perfil::text='admin_slark' and school is null then select escola_id,id into school,selected from public.salas order by criada_em,id limit 1;end if;
 if school is null then return jsonb_build_object('salas','[]'::jsonb,'times','[]'::jsonb,'salaId',null);end if;
 if selected is not null and not exists(select 1 from public.salas where id=selected and escola_id=school) then raise exception 'Turma fora da sua escola.';end if;
 if selected is null then select id into selected from public.salas where escola_id=school order by nome,id limit 1;end if;
 select jsonb_build_object('salaId',selected,
  'salas',coalesce((select jsonb_agg(x order by x.nome) from(
   select s.id,s.nome,s.serie,s.etapa,coalesce(sum(t.pontos),0)::bigint as pontos from public.salas s
   left join public.times t on t.sala_id=s.id where s.escola_id=school group by s.id
  ) x),'[]'::jsonb),
  'times',coalesce((select jsonb_agg(x order by x.pontos desc,x.nome) from(
   select id,nome,coalesce(pontos,0) as pontos from public.times where sala_id=selected
  ) x),'[]'::jsonb)) into payload;
 return payload;
end $$;
revoke all on function slark_private.live_ranking(uuid) from public,anon;
grant usage on schema slark_private to authenticated;
grant execute on function slark_private.live_ranking(uuid) to authenticated;
create or replace function public.slark_live_ranking(p_sala uuid default null) returns jsonb
language sql security invoker set search_path='' as $$select slark_private.live_ranking(p_sala)$$;
revoke all on function public.slark_live_ranking(uuid) from public,anon;
grant execute on function public.slark_live_ranking(uuid) to authenticated;

create or replace function slarklive_private.screen_rankings(p_pin text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare room jsonb; classroom uuid; school uuid;
begin
 if session_user not in ('slarkapp_live','postgres') then raise exception 'Acesso restrito ao servidor.';end if;
 select data->'rooms'->p_pin into room from slarklive_private.state where id=1;
 if room is null or room->>'demo'='true' then return jsonb_build_object('geral','[]'::jsonb,'turma','[]'::jsonb);end if;
 select t.sala_id,s.escola_id into classroom,school from public.trilhas t join public.salas s on s.id=t.sala_id where t.id=(room->>'trailId')::uuid;
 return jsonb_build_object('geral',coalesce((select jsonb_agg(x) from(
   select t.id,t.nome||' · '||s.nome as nome,coalesce(t.pontos,0) as pontos from public.times t join public.salas s on s.id=t.sala_id
   where s.escola_id=school order by t.pontos desc nulls last,t.nome,t.id limit 10
  ) x),'[]'::jsonb),'turma',coalesce((select jsonb_agg(x) from(
   select id,nome,coalesce(pontos,0) as pontos from public.times where sala_id=classroom order by pontos desc nulls last,nome,id
  )x),'[]'::jsonb));
end $$;
revoke all on function slarklive_private.screen_rankings(text) from public,anon,authenticated;
grant execute on function slarklive_private.screen_rankings(text) to slarkapp_live;
-- The old standalone site's per-duel awards remain historical; the App uses podiums.
drop trigger credit_match_winners on slarklive_private.state;
create trigger credit_match_winners after update of data on slarklive_private.state
 for each row when(old.data is distinct from new.data and session_user<>'slarkapp_live')
 execute function slarklive_private.credit_match_winners();
