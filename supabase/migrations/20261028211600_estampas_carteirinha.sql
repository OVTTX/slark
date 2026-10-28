-- Collectible card prints. Acquisition rules will be introduced with a future Live feature.
create table public.estampas_cartao (
  id text primary key,
  nome text not null,
  descricao text not null,
  lancada boolean not null default false,
  ordem integer not null default 0
);
insert into public.estampas_cartao(id,nome,descricao,lancada,ordem) values
 ('original','Original Slark','O visual original da sua carteirinha.',true,0),
 ('orbitas','Órbitas','Caminhos que se encontram no seu universo.',false,1),
 ('constelacao','Constelação','Cada conquista, uma nova estrela.',false,2),
 ('ondas','Ondas','Movimento para acompanhar a sua jornada.',false,3),
 ('geometria','Geometria','Novas formas de ver o seu universo.',false,4);

create table public.aluno_estampas (
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  estampa_id text not null references public.estampas_cartao(id),
  conquistada_em timestamptz not null default now(),
  primary key(usuario_id,estampa_id)
);
create table public.cartao_estampa_preferencias (
  usuario_id uuid primary key references public.usuarios(id) on delete cascade,
  estampa_id text not null references public.estampas_cartao(id) default 'original'
);
alter table public.estampas_cartao enable row level security;
alter table public.aluno_estampas enable row level security;
alter table public.cartao_estampa_preferencias enable row level security;
revoke all on public.estampas_cartao,public.aluno_estampas,public.cartao_estampa_preferencias from public,anon,authenticated;
grant select on public.estampas_cartao,public.aluno_estampas,public.cartao_estampa_preferencias to authenticated;
grant insert,update on public.cartao_estampa_preferencias to authenticated;

create or replace function slark_private.pode_ver_estampas(p_usuario uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.usuarios actor join public.usuarios target on target.id=p_usuario
 where actor.id=auth.uid() and actor.ativo is not false and target.ativo is not false
 and target.perfil::text='aluno' and (actor.id=target.id or
 (actor.perfil::text='admin_slark' and target.email='aluno@slarkdemo.com.br')))
$$;
revoke all on function slark_private.pode_ver_estampas(uuid) from public,anon;
grant execute on function slark_private.pode_ver_estampas(uuid) to authenticated;

create or replace function slark_private.pode_aplicar_estampa(p_usuario uuid,p_estampa text)
returns boolean language sql stable security definer set search_path='' as $$
 select slark_private.pode_ver_estampas(p_usuario) and exists(
 select 1 from public.estampas_cartao c where c.id=p_estampa and c.lancada and
 (c.id='original' or exists(select 1 from public.aluno_estampas a where a.usuario_id=p_usuario and a.estampa_id=c.id)))
$$;
revoke all on function slark_private.pode_aplicar_estampa(uuid,text) from public,anon;
grant execute on function slark_private.pode_aplicar_estampa(uuid,text) to authenticated;

create policy estampas_catalogo on public.estampas_cartao for select to authenticated using(true);
create policy estampas_conquistadas on public.aluno_estampas for select to authenticated
 using(slark_private.pode_ver_estampas(usuario_id));
create policy estampas_preferencia_ler on public.cartao_estampa_preferencias for select to authenticated
 using(slark_private.pode_ver_estampas(usuario_id));
create policy estampas_preferencia_criar on public.cartao_estampa_preferencias for insert to authenticated
 with check(slark_private.pode_aplicar_estampa(usuario_id,estampa_id));
create policy estampas_preferencia_atualizar on public.cartao_estampa_preferencias for update to authenticated
 using(slark_private.pode_ver_estampas(usuario_id)) with check(slark_private.pode_aplicar_estampa(usuario_id,estampa_id));

comment on table public.aluno_estampas is 'Collectible ownership. Authenticated clients cannot grant themselves awards. Future Slark Live acquisition rules are not implemented.';
