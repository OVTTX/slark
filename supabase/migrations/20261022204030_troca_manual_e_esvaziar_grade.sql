alter table public.grade_horarios drop constraint grade_horarios_sala_id_dia_semana_periodo_key;
alter table public.grade_horarios add constraint grade_horarios_sala_id_dia_semana_periodo_key unique(sala_id,dia_semana,periodo) deferrable initially immediate;
alter table public.solicitacoes_grade add column grupo_troca uuid;
alter table public.solicitacoes_grade drop constraint solicitacoes_grade_status_check;
alter table public.solicitacoes_grade add constraint solicitacoes_grade_status_check check(status in ('pendente','aprovada','aceita','recusada','cancelada'));
drop index public.solicitacao_grade_slot;
drop index public.solicitacao_grade_professor;
drop index public.solicitacao_grade_origem;
create unique index solicitacao_grade_slot on public.solicitacoes_grade(sala_id,dia_semana,periodo) where status in ('pendente','aprovada');
create unique index solicitacao_grade_professor on public.solicitacoes_grade(professor_id,dia_semana,periodo) where status in ('pendente','aprovada');
create unique index solicitacao_grade_origem on public.solicitacoes_grade(grade_id) where status in ('pendente','aprovada') and grade_id is not null;
create index solicitacao_grade_grupo on public.solicitacoes_grade(grupo_troca) where grupo_troca is not null;

create function slark_private.trocar_aulas(p_origem uuid,p_destino uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u public.usuarios%rowtype; a public.grade_horarios%rowtype; b public.grade_horarios%rowtype; x public.grade_horarios%rowtype; atrib uuid; grupo uuid := gen_random_uuid(); precisa boolean := false; dia integer; periodo_dest integer;
begin
 select * into u from public.usuarios where id=auth.uid() and ativo;
 if auth.uid() is null or u.id is null or u.perfil::text not in ('diretor','admin_slark') then raise exception 'Apenas a direção pode trocar aulas.' using errcode='42501'; end if;
 select * into a from public.grade_horarios where id=p_origem;
 select * into b from public.grade_horarios where id=p_destino;
 if a.id is null or b.id is null or a.id=b.id or a.sala_id<>b.sala_id or a.escola_id<>b.escola_id then raise exception 'Escolha duas aulas diferentes da mesma turma.'; end if;
 if u.perfil::text<>'admin_slark' and u.escola_id is distinct from a.escola_id then raise exception 'Turma de outra escola.' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(a.escola_id::text,0));
 select * into a from public.grade_horarios where id=p_origem for update;
 select * into b from public.grade_horarios where id=p_destino for update;
 if a.id is null or b.id is null then raise exception 'A grade mudou. Atualize a página.'; end if;
 if exists(select 1 from public.solicitacoes_grade where status in ('pendente','aprovada') and grade_id in(a.id,b.id)) then raise exception 'Uma destas aulas já aguarda uma resposta.'; end if;
 foreach x in array array[a,b] loop
   dia := case when x.id=a.id then b.dia_semana else a.dia_semana end;
   periodo_dest := case when x.id=a.id then b.periodo else a.periodo end;
   if x.professor_id is null then raise exception 'Defina os professores antes de trocar as aulas.'; end if;
   if exists(select 1 from public.grade_horarios where id not in(a.id,b.id) and professor_id=x.professor_id and dia_semana=dia and periodo=periodo_dest)
    or exists(select 1 from public.solicitacoes_grade where status in ('pendente','aprovada') and dia_semana=dia and periodo=periodo_dest and (sala_id=x.sala_id or professor_id=x.professor_id)) then raise exception 'Há conflito ou reserva de horário para um dos professores.'; end if;
   if exists(select 1 from public.disponibilidade_professor where professor_id=x.professor_id) and not exists(select 1 from public.disponibilidade_professor where professor_id=x.professor_id and dia_semana=dia and periodo=periodo_dest) then precisa := true; end if;
 end loop;
 if precisa then
  foreach x in array array[a,b] loop
   select id into atrib from public.sala_materias where sala_id=x.sala_id and materia_id=x.materia_id and professor_id=x.professor_id;
   if atrib is null then raise exception 'Confira os professores atribuídos às matérias.'; end if;
   insert into public.solicitacoes_grade(escola_id,sala_id,materia_id,professor_id,atribuicao_id,grade_id,origem_dia,origem_periodo,dia_semana,periodo,solicitante_id,grupo_troca)
   values(x.escola_id,x.sala_id,x.materia_id,x.professor_id,atrib,x.id,x.dia_semana,x.periodo,case when x.id=a.id then b.dia_semana else a.dia_semana end,case when x.id=a.id then b.periodo else a.periodo end,u.id,grupo);
  end loop;
  return jsonb_build_object('status','pendente');
 end if;
 update public.grade_horarios set dia_semana=case when id=a.id then b.dia_semana else a.dia_semana end,periodo=case when id=a.id then b.periodo else a.periodo end where id in(a.id,b.id);
 return jsonb_build_object('status','salva');
end $$;

create function slark_private.esvaziar_grade(p_sala uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u public.usuarios%rowtype; escola uuid; quantidade integer;
begin
 select * into u from public.usuarios where id=auth.uid() and ativo;
 select escola_id into escola from public.salas where id=p_sala;
 if auth.uid() is null or u.id is null or escola is null or u.perfil::text not in ('diretor','admin_slark') or (u.perfil::text<>'admin_slark' and u.escola_id is distinct from escola) then raise exception 'Sem permissão para esvaziar esta turma.' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(escola::text,0));
 update public.solicitacoes_grade set status='cancelada',respondida_em=now() where sala_id=p_sala and status in ('pendente','aprovada');
 delete from public.grade_horarios where sala_id=p_sala and escola_id=escola;
 get diagnostics quantidade = row_count;
 return jsonb_build_object('removidas',quantidade);
end $$;
create function public.trocar_aulas_slark(p_origem uuid,p_destino uuid) returns jsonb language sql security invoker set search_path='' as $$ select slark_private.trocar_aulas(p_origem,p_destino) $$;
create function public.esvaziar_grade_slark(p_sala uuid) returns jsonb language sql security invoker set search_path='' as $$ select slark_private.esvaziar_grade(p_sala) $$;
revoke all on function slark_private.trocar_aulas(uuid,uuid),slark_private.esvaziar_grade(uuid),public.trocar_aulas_slark(uuid,uuid),public.esvaziar_grade_slark(uuid) from public,anon;
grant execute on function slark_private.trocar_aulas(uuid,uuid),slark_private.esvaziar_grade(uuid),public.trocar_aulas_slark(uuid,uuid),public.esvaziar_grade_slark(uuid) to authenticated;

create or replace function slark_private.responder_aula(p_id uuid,p_resposta text)
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
  if r.status<>'pendente' and not (r.grupo_troca is not null and r.status='aprovada' and p_resposta='cancelar') then raise exception 'Esta solicitação já foi respondida.'; end if;

  if r.grupo_troca is not null then
    if p_resposta<>'aceitar' then
      update public.solicitacoes_grade set status=case when id=p_id and p_resposta='recusar' then 'recusada' else 'cancelada' end,respondida_em=now() where grupo_troca=r.grupo_troca and status in ('pendente','aprovada');
      return jsonb_build_object('status',case when p_resposta='recusar' then 'recusada' else 'cancelada' end);
    end if;
    update public.solicitacoes_grade set status='aprovada',respondida_em=now() where id=p_id;
    if exists(select 1 from public.solicitacoes_grade where grupo_troca=r.grupo_troca and status='pendente') then return jsonb_build_object('status','aprovada'); end if;
    if (select count(*) from public.solicitacoes_grade where grupo_troca=r.grupo_troca and status='aprovada')<>2 then raise exception 'Troca incompleta. Peça uma nova solicitação.'; end if;
    if exists(select 1 from public.solicitacoes_grade q left join public.grade_horarios h on h.id=q.grade_id left join public.sala_materias m on m.id=q.atribuicao_id where q.grupo_troca=r.grupo_troca and (h.id is null or h.dia_semana is distinct from q.origem_dia or h.periodo is distinct from q.origem_periodo or h.professor_id is distinct from q.professor_id or h.materia_id is distinct from q.materia_id or m.professor_id is distinct from q.professor_id)) then raise exception 'A grade mudou. Peça à direção para cancelar e propor uma nova troca.'; end if;
    if exists(select 1 from public.solicitacoes_grade q join public.grade_horarios h on h.dia_semana=q.dia_semana and h.periodo=q.periodo and (h.sala_id=q.sala_id or h.professor_id=q.professor_id) where q.grupo_troca=r.grupo_troca and h.id not in (select grade_id from public.solicitacoes_grade where grupo_troca=r.grupo_troca)) then raise exception 'O horário foi ocupado. Peça à direção uma nova troca.'; end if;
    update public.grade_horarios h set dia_semana=q.dia_semana,periodo=q.periodo from public.solicitacoes_grade q where q.grupo_troca=r.grupo_troca and h.id=q.grade_id;
    update public.solicitacoes_grade set status='aceita',respondida_em=now() where grupo_troca=r.grupo_troca;
    return jsonb_build_object('status','aceita');
  end if;
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

create or replace function slark_private.agendar_aula(p_atribuicao uuid,p_grade uuid,p_dia integer,p_periodo integer)
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
    if exists(select 1 from public.solicitacoes_grade where grade_id=p_grade and status in ('pendente','aprovada')) then raise exception 'Esta aula já aguarda resposta do professor.'; end if;
  else
    if (select count(*) from public.grade_horarios where sala_id=a.sala_id and materia_id=a.materia_id) + (select count(*) from public.solicitacoes_grade where atribuicao_id=a.id and grade_id is null and status in ('pendente','aprovada')) >= a.aulas_semana then raise exception 'Todas as aulas semanais desta matéria já estão alocadas ou pendentes.'; end if;
  end if;
  if exists(select 1 from public.grade_horarios where id is distinct from p_grade and dia_semana=p_dia and periodo=p_periodo and (sala_id=a.sala_id or professor_id=a.professor_id)) or exists(select 1 from public.solicitacoes_grade where status in ('pendente','aprovada') and dia_semana=p_dia and periodo=p_periodo and (sala_id=a.sala_id or professor_id=a.professor_id)) then raise exception 'Horário ocupado ou reservado para a turma ou para o professor.'; end if;
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

