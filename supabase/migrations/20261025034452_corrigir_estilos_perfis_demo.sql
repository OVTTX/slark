-- Keep self-only RLS. Only the actual active admin can preview the three fixed demo accounts.
create or replace function slark_private.pode_personalizar_demo(p_usuario uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.usuarios actor join public.usuarios target on target.id=p_usuario
 where actor.id=auth.uid() and actor.ativo is not false and actor.perfil::text='admin_slark'
 and target.ativo is not false and target.perfil::text in ('aluno','professor','diretor')
 and target.email=target.perfil::text||'@slarkdemo.com.br')
$$;
revoke all on function slark_private.pode_personalizar_demo(uuid) from public,anon;
grant execute on function slark_private.pode_personalizar_demo(uuid) to authenticated;

create or replace function public.validar_personalizacao_slark() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare completo boolean; pontos integer; necessario integer;
begin
  if auth.uid() is null or (auth.uid() <> new.usuario_id and not slark_private.pode_personalizar_demo(new.usuario_id)) then
    raise exception 'Esta personalização pertence a outra conta.' using errcode='42501';
  end if;
  select (u.perfil::text in ('admin_slark','professor','diretor') or u.nome ilike '%vtx%' or u.email ilike '%vtx%')
    into completo from public.usuarios u where u.id=new.usuario_id;
  select coalesce(max(a.pontos),0) into pontos from public.alunos a where a.usuario_id=new.usuario_id;
  necessario := greatest(
    case new.skin when 'noir' then 0 when 'slark' then 0 when 'aurora' then 100 when 'oceano' then 300 when 'ametista' then 750 when 'ouro' then 1500 when 'rosa' then 450 when 'solar' then 600 when 'floresta' then 900 when 'cosmos' then 1200 when 'grafite' then 1800 when 'rubi' then 2100 else 2147483647 end,
    case new.texto when 'padrao' then 0 when 'gelo' then 100 when 'azul' then 300 when 'dourado' then 1000 else 2147483647 end,
    case new.moldura when 'padrao' then 0 when 'orbita' then 200 when 'constelacao' then 500 when 'ouro' then 1500 else 2147483647 end
  );
  if not coalesce(completo,false) and greatest(pontos,0)<necessario then
    raise exception 'Você ainda não desbloqueou este estilo.' using errcode='42501';
  end if;
  new.atualizado_em := now();
  return new;
end;
$$;

create or replace function slark_private.demo_estilos(p_usuario uuid,p_skin text default null,p_texto text default null,p_moldura text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare saved jsonb;score integer;
begin
 if not slark_private.pode_personalizar_demo(p_usuario) then
  raise exception 'Acesso permitido apenas ao administrador nos perfis demo da Slark.' using errcode='42501';
 end if;
 if p_skin is not null or p_texto is not null or p_moldura is not null then
  if p_skin is null or p_texto is null or p_moldura is null then raise exception 'Informe todos os estilos.';end if;
  insert into public.personalizacoes_slark(usuario_id,skin,texto,moldura)
  values(p_usuario,p_skin,p_texto,p_moldura) on conflict(usuario_id)
  do update set skin=excluded.skin,texto=excluded.texto,moldura=excluded.moldura;
 end if;
 select jsonb_build_object('skin',skin,'texto',texto,'moldura',moldura) into saved
 from public.personalizacoes_slark where usuario_id=p_usuario;
 select coalesce(max(pontos),0) into score from public.alunos where usuario_id=p_usuario;
 return jsonb_build_object('preferencias',coalesce(saved,'{"skin":"slark","texto":"padrao","moldura":"padrao"}'::jsonb),'pontos',score);
end $$;
revoke all on function slark_private.demo_estilos(uuid,text,text,text) from public,anon;
grant execute on function slark_private.demo_estilos(uuid,text,text,text) to authenticated;
create or replace function public.slark_demo_estilos(p_usuario uuid,p_skin text default null,p_texto text default null,p_moldura text default null)
returns jsonb language sql security invoker set search_path='' as $$
 select slark_private.demo_estilos(p_usuario,p_skin,p_texto,p_moldura)
$$;
revoke all on function public.slark_demo_estilos(uuid,text,text,text) from public,anon;
grant execute on function public.slark_demo_estilos(uuid,text,text,text) to authenticated;
