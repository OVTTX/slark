-- Add the new contract without changing any school's plan, price or existing teams.
alter table public.assinaturas drop constraint assinaturas_plano_check;
alter table public.assinaturas add constraint assinaturas_plano_check check(plano in ('base','live','pro'));

-- Only capability metadata is exposed to users; billing rows keep their existing RLS.
create or replace function slark_private.recursos_escola(p_escola uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare u public.usuarios; target uuid; plan text; state text; enabled boolean;
begin
 select * into u from public.usuarios where id=auth.uid() and ativo is true;
 if u.id is null then raise exception 'Entre com uma conta ativa da Slark.' using errcode='42501'; end if;
 target:=coalesce(p_escola,u.escola_id);
 if target is null or (u.perfil::text<>'admin_slark' and target is distinct from u.escola_id) then
  raise exception 'Escola fora do seu acesso.' using errcode='42501';
 end if;
 select a.plano,a.status::text into plan,state from public.assinaturas a where a.escola_id=target order by a.criada_em desc,a.id desc limit 1;
 enabled:=coalesce(plan='live' and state in ('ativa','trial'),false);
 return jsonb_build_object('plano',coalesce(plan,'base'),'status',state,'slark_live',enabled,'personalizar_equipes',enabled);
end $$;
revoke all on function slark_private.recursos_escola(uuid) from public,anon;
grant execute on function slark_private.recursos_escola(uuid) to authenticated;
create or replace function public.slark_recursos_escola(p_escola uuid default null) returns jsonb
language sql stable security invoker set search_path='' as $$ select slark_private.recursos_escola(p_escola) $$;
revoke all on function public.slark_recursos_escola(uuid) from public,anon;
grant execute on function public.slark_recursos_escola(uuid) to authenticated;

-- Base schools retain team membership/points but cannot choose custom team names.
create or replace function slark_private.validar_nome_equipe_plano() returns trigger
language plpgsql security definer set search_path='' as $$
declare school uuid; features jsonb; seq integer:=1; automatic_name text;
begin
 -- Database maintenance is distinct from authenticated application requests.
 if auth.uid() is null and session_user='postgres' and current_setting('role',true) in ('none','postgres') then return new; end if;
 select escola_id into school from public.salas where id=new.sala_id;
 if school is null then raise exception 'Turma não encontrada.'; end if;
 features:=slark_private.recursos_escola(school);
 if (features->>'personalizar_equipes')::boolean then return new; end if;
 if tg_op='UPDATE' then
  if new.nome is distinct from old.nome or new.sala_id is distinct from old.sala_id then
   raise exception 'A personalização dos nomes das equipes está disponível no Plano Live.' using errcode='42501';
  end if;
  return new;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('slark-team-name:'||new.sala_id::text,0));
 loop
  automatic_name:='Equipe '||case when seq<10 then '0' else '' end||seq::text;
  exit when not exists(select 1 from public.times where sala_id=new.sala_id and nome=automatic_name);
  seq:=seq+1;
 end loop;
 new.nome:=automatic_name;
 return new;
end $$;
revoke all on function slark_private.validar_nome_equipe_plano() from public,anon,authenticated;
create trigger validar_nome_equipe_plano before insert or update of nome,sala_id on public.times
for each row execute function slark_private.validar_nome_equipe_plano();

-- Public screens still need no login, but rooms from Base/cancelled schools stop.
-- Only the existing application database role can evaluate this internal check.
create or replace function slarklive_private.room_plan_enabled(p_pin text) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce((select a.plano='live' and a.status::text in ('ativa','trial')
 from slarklive_private.state s
 join public.trilhas t on t.id::text=s.data->'rooms'->p_pin->>'trailId'
 join lateral (select plano,status from public.assinaturas where escola_id=t.escola_id order by criada_em desc,id desc limit 1) a on true
 where s.id=1),false)
$$;
revoke all on function slarklive_private.room_plan_enabled(text) from public,anon,authenticated;
grant execute on function slarklive_private.room_plan_enabled(text) to slarkapp_live;
