create or replace function public.validar_personalizacao_slark() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare completo boolean; pontos integer; necessario integer;
begin
  if auth.uid() is null or auth.uid() <> new.usuario_id then
    raise exception 'Esta personalização pertence a outra conta.' using errcode='42501';
  end if;
  select (u.perfil::text in ('admin_slark','professor','diretor') or u.nome ilike '%vtx%' or u.email ilike '%vtx%')
    into completo from public.usuarios u where u.id=auth.uid();
  select coalesce(max(a.pontos),0) into pontos from public.alunos a where a.usuario_id=auth.uid();
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

-- Notifications for teachers, with no change to the existing student inbox.
create table public.solicitacoes_grade (
  id uuid primary key default gen_random_uuid(),
  escola_id uuid not null references public.escolas(id) on delete cascade,
  sala_id uuid not null references public.salas(id) on delete cascade,
  materia_id uuid not null references public.materias(id) on delete cascade,
  professor_id uuid not null references public.usuarios(id) on delete cascade,
  atribuicao_id uuid not null references public.sala_materias(id) on delete cascade,
  grade_id uuid references public.grade_horarios(id) on delete cascade,
  origem_dia smallint, origem_periodo smallint,
  dia_semana smallint not null check (dia_semana between 1 and 5),
  periodo smallint not null check (periodo between 1 and 6),
  status text not null default 'pendente' check(status in ('pendente','aceita','recusada','cancelada')),
  solicitante_id uuid not null references public.usuarios(id),
  criada_em timestamptz not null default now(), respondida_em timestamptz
);
create unique index solicitacao_grade_slot on public.solicitacoes_grade(sala_id,dia_semana,periodo) where status='pendente';
create unique index solicitacao_grade_professor on public.solicitacoes_grade(professor_id,dia_semana,periodo) where status='pendente';
create unique index solicitacao_grade_origem on public.solicitacoes_grade(grade_id) where status='pendente' and grade_id is not null;
create index solicitacao_grade_caixa on public.solicitacoes_grade(professor_id,status,criada_em desc);
alter table public.solicitacoes_grade enable row level security;
revoke all on public.solicitacoes_grade from anon, authenticated;
grant select on public.solicitacoes_grade to authenticated;
create policy solicitacoes_ler on public.solicitacoes_grade for select to authenticated using (
  public.sou_admin() or professor_id=(select auth.uid()) or (public.meu_perfil()='diretor' and escola_id=public.minha_escola())
);
-- Cross-role approval needs a privileged operation. Keep it in a non-exposed
-- schema, validate the caller against usuarios, and expose only narrow wrappers.
create schema if not exists slark_private;
revoke all on schema slark_private from public, anon;
grant usage on schema slark_private to authenticated;

create function slark_private.agendar_aula(p_atribuicao uuid,p_grade uuid,p_dia integer,p_periodo integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.sala_materias%rowtype; u public.usuarios%rowtype; g public.grade_horarios%rowtype; etapa text; pendente boolean; novo uuid;
begin
  select * into u from public.usuarios where id=auth.uid() and ativo;
  if auth.uid() is null or u.perfil::text not in ('admin_slark','diretor') or u.id is null then raise exception 'Apenas a direção pode organizar aulas.' using errcode='42501'; end if;
  select * into a from public.sala_materias where id=p_atribuicao;
  if a.id is null or a.professor_id is null then raise exception 'Defina o professor desta matéria antes de agendar.'; end if;
  if u.perfil::text<>'admin_slark' and u.escola_id is distinct from a.escola_id then raise exception 'Turma de outra escola.' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(a.escola_id::text,0));
  select s.etapa::text into etapa from public.salas s where s.id=a.sala_id and s.escola_id=a.escola_id;
  if etapa is null or not exists(select 1 from public.usuarios where id=a.professor_id and perfil::text='professor' and ativo and escola_id=a.escola_id) then raise exception 'Confira a turma e o professor cadastrados.'; end if;
  if p_dia is null or p_periodo is null or p_dia not between 1 and 5 or p_periodo not between 1 and (case when etapa='fundamental_2' then 5 else 6 end) then raise exception 'Horário inválido para esta turma.'; end if;
  if p_grade is not null then
    select * into g from public.grade_horarios where id=p_grade for update;
    if g.id is null or g.sala_id<>a.sala_id or g.materia_id<>a.materia_id or g.professor_id is distinct from a.professor_id then raise exception 'A aula mudou. Atualize a grade.'; end if;
    if g.dia_semana=p_dia and g.periodo=p_periodo then return jsonb_build_object('status','salva'); end if;
    if exists(select 1 from public.solicitacoes_grade where grade_id=p_grade and status='pendente') then raise exception 'Esta aula já aguarda resposta do professor.'; end if;
  else
    if (select count(*) from public.grade_horarios where sala_id=a.sala_id and materia_id=a.materia_id) + (select count(*) from public.solicitacoes_grade where atribuicao_id=a.id and grade_id is null and status='pendente') >= a.aulas_semana then raise exception 'Todas as aulas semanais desta matéria já estão alocadas ou pendentes.'; end if;
  end if;
  if exists(select 1 from public.grade_horarios where id is distinct from p_grade and dia_semana=p_dia and periodo=p_periodo and (sala_id=a.sala_id or professor_id=a.professor_id)) or exists(select 1 from public.solicitacoes_grade where status='pendente' and dia_semana=p_dia and periodo=p_periodo and (sala_id=a.sala_id or professor_id=a.professor_id)) then raise exception 'Horário ocupado ou reservado para a turma ou para o professor.'; end if;
  pendente := exists(select 1 from public.disponibilidade_professor where professor_id=a.professor_id) and not exists(select 1 from public.disponibilidade_professor where professor_id=a.professor_id and dia_semana=p_dia and periodo=p_periodo);
  if pendente then
    insert into public.solicitacoes_grade(escola_id,sala_id,materia_id,professor_id,atribuicao_id,grade_id,origem_dia,origem_periodo,dia_semana,periodo,solicitante_id)
    values(a.escola_id,a.sala_id,a.materia_id,a.professor_id,a.id,p_grade,g.dia_semana,g.periodo,p_dia,p_periodo,u.id) returning id into novo;
    return jsonb_build_object('status','pendente','id',novo);
  end if;
  if p_grade is null then
    insert into public.grade_horarios(escola_id,sala_id,materia_id,professor_id,dia_semana,periodo) values(a.escola_id,a.sala_id,a.materia_id,a.professor_id,p_dia,p_periodo);
  else
    update public.grade_horarios set dia_semana=p_dia,periodo=p_periodo where id=p_grade;
  end if;
  return jsonb_build_object('status','salva');
end $$;

create function slark_private.responder_aula(p_id uuid,p_resposta text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.solicitacoes_grade%rowtype; u public.usuarios%rowtype; a public.sala_materias%rowtype; g public.grade_horarios%rowtype;
begin
  select * into u from public.usuarios where id=auth.uid() and ativo;
  if auth.uid() is null or u.id is null then raise exception 'Entre na sua conta.' using errcode='42501'; end if;
  select * into r from public.solicitacoes_grade where id=p_id;
  if r.id is null then raise exception 'Solicitação não encontrada.'; end if;
  -- Admin preview can answer only the named disposable demo teacher account.
  if p_resposta='cancelar' then
    if not (u.perfil::text='admin_slark' or (u.perfil::text='diretor' and u.escola_id=r.escola_id)) then raise exception 'Sem permissão para cancelar.' using errcode='42501'; end if;
  elsif p_resposta in ('aceitar','recusar') then
    if not (u.id=r.professor_id or (u.perfil::text='admin_slark' and exists(select 1 from public.usuarios where id=r.professor_id and email='professor@slarkdemo.com.br' and perfil::text='professor'))) then raise exception 'Apenas o professor destinatário pode responder.' using errcode='42501'; end if;
  else raise exception 'Resposta inválida.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(r.escola_id::text,0));
  select * into r from public.solicitacoes_grade where id=p_id for update;
  if r.status<>'pendente' then raise exception 'Esta solicitação já foi respondida.'; end if;
  if p_resposta<>'aceitar' then
    update public.solicitacoes_grade set status=case when p_resposta='recusar' then 'recusada' else 'cancelada' end,respondida_em=now() where id=p_id;
    return jsonb_build_object('status',case when p_resposta='recusar' then 'recusada' else 'cancelada' end);
  end if;
  select * into a from public.sala_materias where id=r.atribuicao_id;
  if a.professor_id is distinct from r.professor_id or a.sala_id is distinct from r.sala_id or a.materia_id is distinct from r.materia_id then raise exception 'A atribuição mudou. Peça à direção uma nova solicitação.'; end if;
  if r.grade_id is not null then
    select * into g from public.grade_horarios where id=r.grade_id for update;
    if g.id is null or g.dia_semana is distinct from r.origem_dia or g.periodo is distinct from r.origem_periodo or g.professor_id is distinct from r.professor_id or g.materia_id<>r.materia_id then raise exception 'A aula original mudou. Peça à direção uma nova solicitação.'; end if;
  elsif (select count(*) from public.grade_horarios where sala_id=r.sala_id and materia_id=r.materia_id)>=a.aulas_semana then raise exception 'A carga semanal já foi preenchida. Peça à direção para revisar.';
  end if;
  if exists(select 1 from public.grade_horarios where id is distinct from r.grade_id and dia_semana=r.dia_semana and periodo=r.periodo and (sala_id=r.sala_id or professor_id=r.professor_id)) then raise exception 'O horário foi ocupado. Peça à direção para revisar a solicitação.'; end if;
  if r.grade_id is null then
    insert into public.grade_horarios(escola_id,sala_id,materia_id,professor_id,dia_semana,periodo) values(r.escola_id,r.sala_id,r.materia_id,r.professor_id,r.dia_semana,r.periodo);
  else update public.grade_horarios set dia_semana=r.dia_semana,periodo=r.periodo where id=r.grade_id; end if;
  update public.solicitacoes_grade set status='aceita',respondida_em=now() where id=p_id;
  return jsonb_build_object('status','aceita');
end $$;
revoke all on function slark_private.agendar_aula(uuid,uuid,integer,integer),slark_private.responder_aula(uuid,text) from public,anon;
grant execute on function slark_private.agendar_aula(uuid,uuid,integer,integer),slark_private.responder_aula(uuid,text) to authenticated;
create function public.agendar_aula_slark(p_atribuicao uuid,p_grade uuid,p_dia integer,p_periodo integer)
returns jsonb language sql security invoker set search_path='' as $$ select slark_private.agendar_aula(p_atribuicao,p_grade,p_dia,p_periodo) $$;
create function public.responder_aula_slark(p_id uuid,p_resposta text)
returns jsonb language sql security invoker set search_path='' as $$ select slark_private.responder_aula(p_id,p_resposta) $$;
revoke all on function public.agendar_aula_slark(uuid,uuid,integer,integer),public.responder_aula_slark(uuid,text) from public,anon;
grant execute on function public.agendar_aula_slark(uuid,uuid,integer,integer),public.responder_aula_slark(uuid,text) to authenticated;
