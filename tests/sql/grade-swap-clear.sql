begin;
-- Disposable demo fixtures, rolled back at the end.
delete from public.solicitacoes_grade where professor_id='00000000-0000-0000-0000-000000000003';
delete from public.grade_horarios where sala_id='20000000-0000-0000-0000-000000000001';
delete from public.disponibilidade_professor where professor_id='00000000-0000-0000-0000-000000000003';
insert into public.grade_horarios(escola_id,sala_id,materia_id,professor_id,dia_semana,periodo)
select escola_id,sala_id,materia_id,professor_id,1,1 from public.sala_materias where id='45f5cf1d-9923-45c5-94e1-827d21f71d45';
insert into public.grade_horarios(escola_id,sala_id,materia_id,professor_id,dia_semana,periodo)
select escola_id,sala_id,materia_id,professor_id,2,1 from public.sala_materias where id='45f5cf1d-9923-45c5-94e1-827d21f71d45';
set local role authenticated;
do $$
declare a uuid; b uuid; r jsonb; q1 uuid; q2 uuid; d1 integer; d2 integer; outras bigint; materias bigint; negado boolean;
begin
 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
 select id into a from public.grade_horarios where sala_id='20000000-0000-0000-0000-000000000001' and dia_semana=1;
 select id into b from public.grade_horarios where sala_id='20000000-0000-0000-0000-000000000001' and dia_semana=2;
 r := public.trocar_aulas_slark(a,b);
 if r->>'status'<>'salva' or not exists(select 1 from public.grade_horarios where id=a and dia_semana=2) or not exists(select 1 from public.grade_horarios where id=b and dia_semana=1) then raise exception 'TEST: manual swap failed'; end if;
 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
 insert into public.disponibilidade_professor(escola_id,professor_id,dia_semana,periodo) values('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003',1,1);
 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
 r := public.trocar_aulas_slark(a,b);
 if r->>'status'<>'pendente' then raise exception 'TEST: unavailable swap must request approval'; end if;
 select id into q1 from public.solicitacoes_grade where grade_id=a and status='pendente';
 select id into q2 from public.solicitacoes_grade where grade_id=b and status='pendente';
 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
 r := public.responder_aula_slark(q1,'aceitar');
 if r->>'status'<>'aprovada' or not exists(select 1 from public.grade_horarios where id=a and dia_semana=2) then raise exception 'TEST: first approval must not swap'; end if;
 perform public.responder_aula_slark(q2,'aceitar');
 if not exists(select 1 from public.grade_horarios where id=a and dia_semana=1) or not exists(select 1 from public.grade_horarios where id=b and dia_semana=2) then raise exception 'TEST: second approval must swap both'; end if;
 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
 perform public.trocar_aulas_slark(a,b);
 select id into q1 from public.solicitacoes_grade where grade_id=a and status='pendente';
 select id into q2 from public.solicitacoes_grade where grade_id=b and status='pendente';
 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
 perform public.responder_aula_slark(q1,'aceitar');
 perform public.responder_aula_slark(q2,'recusar');
 if not exists(select 1 from public.grade_horarios where id=a and dia_semana=1) or exists(select 1 from public.solicitacoes_grade where id=q1 and status<>'cancelada') then raise exception 'TEST: refusal must cancel swap and keep both lessons'; end if;
 negado := false;
 begin perform public.esvaziar_grade_slark('20000000-0000-0000-0000-000000000001'); exception when insufficient_privilege then negado := true; end;
 if not negado then raise exception 'TEST: teacher can clear schedule'; end if;
 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
 select count(*) into outras from public.grade_horarios where sala_id<>'20000000-0000-0000-0000-000000000001';
 select count(*) into materias from public.sala_materias where sala_id='20000000-0000-0000-0000-000000000001';
 perform public.esvaziar_grade_slark('20000000-0000-0000-0000-000000000001');
 if exists(select 1 from public.grade_horarios where sala_id='20000000-0000-0000-0000-000000000001') or (select count(*) from public.grade_horarios where sala_id<>'20000000-0000-0000-0000-000000000001')<>outras or (select count(*) from public.sala_materias where sala_id='20000000-0000-0000-0000-000000000001')<>materias then raise exception 'TEST: clear must affect only selected class and preserve subject assignments'; end if;
end $$;
select 'PASS: manual swap, grouped approvals, refusal cancels group, teacher cannot clear, clear isolates class and preserves subjects' as resultado;
rollback;
