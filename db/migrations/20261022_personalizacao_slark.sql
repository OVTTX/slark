create table public.personalizacoes_slark (
  usuario_id uuid primary key references public.usuarios(id) on delete cascade,
  skin text not null default 'slark' check (skin in ('slark','aurora','oceano','ametista','ouro')),
  texto text not null default 'padrao' check (texto in ('padrao','gelo','azul','dourado')),
  moldura text not null default 'padrao' check (moldura in ('padrao','orbita','constelacao','ouro')),
  atualizado_em timestamptz not null default now()
);
alter table public.personalizacoes_slark enable row level security;
revoke all on public.personalizacoes_slark from anon;
grant select,insert,update on public.personalizacoes_slark to authenticated;
create policy personalizacao_ler on public.personalizacoes_slark for select to authenticated using ((select auth.uid())=usuario_id);
create policy personalizacao_criar on public.personalizacoes_slark for insert to authenticated with check ((select auth.uid())=usuario_id);
create policy personalizacao_alterar on public.personalizacoes_slark for update to authenticated using ((select auth.uid())=usuario_id) with check ((select auth.uid())=usuario_id);

create function public.validar_personalizacao_slark() returns trigger
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
    case new.skin when 'slark' then 0 when 'aurora' then 100 when 'oceano' then 300 when 'ametista' then 750 when 'ouro' then 1500 else 2147483647 end,
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
revoke all on function public.validar_personalizacao_slark() from public,anon;
grant execute on function public.validar_personalizacao_slark() to authenticated;
create trigger validar_personalizacao before insert or update on public.personalizacoes_slark for each row execute function public.validar_personalizacao_slark();
