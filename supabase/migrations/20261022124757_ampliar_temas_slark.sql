alter table public.personalizacoes_slark drop constraint personalizacoes_slark_skin_check;
alter table public.personalizacoes_slark add constraint personalizacoes_slark_skin_check check (skin in ('slark','aurora','oceano','ametista','ouro','rosa','solar','floresta','cosmos','grafite','rubi'));

create or replace function public.validar_personalizacao_slark() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare completo boolean; pontos integer; necessario integer;
begin
  if auth.uid() is null or auth.uid() <> new.usuario_id then
    raise exception 'Esta personalização pertence a outra conta.' using errcode='42501';
  end if;
  select (u.perfil::text='admin_slark' or u.nome ilike '%vtx%' or u.email ilike '%vtx%')
    into completo from public.usuarios u where u.id=auth.uid();
  select coalesce(max(a.pontos),0) into pontos from public.alunos a where a.usuario_id=auth.uid();
  necessario := greatest(
    case new.skin when 'slark' then 0 when 'aurora' then 100 when 'oceano' then 300 when 'ametista' then 750 when 'ouro' then 1500 when 'rosa' then 450 when 'solar' then 600 when 'floresta' then 900 when 'cosmos' then 1200 when 'grafite' then 1800 when 'rubi' then 2100 else 2147483647 end,
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
