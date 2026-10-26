-- New contracts are exclusively Base and Live. Former contracts become Base;
-- this never grants a paid Live entitlement or changes existing prices.
update public.assinaturas set plano='base' where plano not in ('base','live');
alter table public.assinaturas drop constraint assinaturas_plano_check;
alter table public.assinaturas add constraint assinaturas_plano_check check(plano in ('base','live'));

-- Runaway belongs to the App in both plans; preserve school/role isolation.
create or replace function slark_private.materiais_do_plano() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.usuarios u
 join lateral (select plano,status from public.assinaturas where escola_id=u.escola_id order by criada_em desc,id desc limit 1) a on true
 where u.id=auth.uid() and u.ativo is true and a.plano in ('base','live') and a.status::text in ('ativa','trial'))
$$;
revoke all on function slark_private.materiais_do_plano() from public,anon;
grant execute on function slark_private.materiais_do_plano() to authenticated;
alter policy materiais_runaway_ler on public.materiais_runaway to authenticated
using(escola_id=(select public.minha_escola()) and (select slark_private.materiais_do_plano()));
alter policy materiais_runaway_gerencia on public.materiais_runaway to authenticated
using(escola_id=(select public.minha_escola()) and (select public.meu_perfil())::text in ('diretor','professor') and (select slark_private.materiais_do_plano()))
with check(escola_id=(select public.minha_escola()) and (select public.meu_perfil())::text in ('diretor','professor') and (select slark_private.materiais_do_plano()));
