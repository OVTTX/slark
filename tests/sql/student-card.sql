-- Read-only card, scoring/ties and access checks. All fixtures are rolled back.
begin;
select set_config('slark.qa_student',(select id::text from public.usuarios where email='aluno@slarkdemo.com.br'),true);
select set_config('slark.qa_admin',(select id::text from public.usuarios where perfil::text='admin_slark' and ativo is not false order by id limit 1),true);
select set_config('slark.qa_teacher',(select id::text from public.usuarios where email='professor@slarkdemo.com.br'),true);
select set_config('slark.qa_school',(select escola_id::text from public.usuarios where id=current_setting('slark.qa_student')::uuid),true);
select set_config('slark.qa_student_row',(select id::text from public.alunos where usuario_id=current_setting('slark.qa_student')::uuid),true);
select set_config('slark.qa_room',(select sala_id::text from public.alunos where usuario_id=current_setting('slark.qa_student')::uuid),true);
select set_config('request.jwt.claim.sub', current_setting('slark.qa_student'),true);
set local role authenticated;
do $$ declare payload jsonb; blocked boolean:=false; begin
 payload:=public.slark_carteirinha_aluno();
 assert payload->'aluno'->>'nome' is not null,'Student cannot read own card';
 assert (payload->'aluno'->>'pontos')::integer=(select pontos from public.alunos where id=current_setting('slark.qa_student_row')::uuid),'Points differ from real balance';
 begin perform public.slark_carteirinha_aluno(gen_random_uuid()); exception when insufficient_privilege then blocked:=true;end;
 assert blocked,'Foreign card allowed';
end $$;
reset role;
-- Simulate a real second student account, without persisting it.
do $$ declare other_user uuid; begin
 select id into other_user from public.usuarios where email='diretor@slarkdemo.com.br';
 assert other_user is not null,'Demo director fixture is missing';
 update public.usuarios set perfil='aluno' where id=other_user;
 perform set_config('slark.qa_other',other_user::text,true);
end $$;
set local role authenticated;
do $$ declare blocked boolean:=false; begin
 begin perform public.slark_carteirinha_aluno(current_setting('slark.qa_other')::uuid); exception when insufficient_privilege then blocked:=true;end;
 assert blocked,'Another student card was allowed';
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('slark.qa_admin'),true);
set local role authenticated;
do $$ declare payload jsonb; blocked boolean:=false; begin
 payload:=public.slark_carteirinha_aluno(current_setting('slark.qa_student')::uuid);
 assert payload->'aluno'->>'nome' is not null,'Admin demo preview failed';
 begin perform public.slark_carteirinha_aluno(current_setting('slark.qa_other')::uuid); exception when insufficient_privilege then blocked:=true;end;
 assert blocked,'Admin preview escaped the fixed demo account';
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('slark.qa_teacher'),true);
set local role authenticated;
do $$ declare blocked boolean:=false; begin
 begin perform public.slark_carteirinha_aluno(current_setting('slark.qa_student')::uuid); exception when insufficient_privilege then blocked:=true;end;
 assert blocked,'Teacher read a student card through the self-only endpoint';
end $$;
reset role;
-- Three teams: top score, two tied scores. The tied teams must share second place.
delete from public.time_membros where aluno_id=current_setting('slark.qa_student_row')::uuid;
update public.times set pontos=0 where sala_id=current_setting('slark.qa_room')::uuid;
do $$ declare team_id uuid; begin
 insert into public.times(sala_id,nome,pontos) values(current_setting('slark.qa_room')::uuid,'Card QA leader',20);
 insert into public.times(sala_id,nome,pontos) values(current_setting('slark.qa_room')::uuid,'Card QA tie',7);
 insert into public.times(sala_id,nome,pontos) values(current_setting('slark.qa_room')::uuid,'Card QA student',7) returning id into team_id;
 insert into public.time_membros(time_id,aluno_id) values(team_id,current_setting('slark.qa_student_row')::uuid);
end $$;
select set_config('request.jwt.claim.sub',current_setting('slark.qa_student'),true);
set local role authenticated;
do $$ declare payload jsonb; begin
 payload:=public.slark_carteirinha_aluno();
 assert (payload->'equipe'->>'posicao')::integer=2,'Tied team rank incorrect';
 assert (payload->'equipe'->>'pontos')::integer=7,'Team and student balances mixed';
end $$;
reset role;
delete from public.time_membros where aluno_id=current_setting('slark.qa_student_row')::uuid;
update public.escolas set responsavel_email=null,responsavel_telefone=null where id=current_setting('slark.qa_school')::uuid;
set local role authenticated;
do $$ declare payload jsonb; begin
 payload:=public.slark_carteirinha_aluno();
 assert payload->'equipe'='null'::jsonb,'Missing team should be null';
 assert payload->'escola'->>'email' is null and payload->'escola'->>'telefone' is null,'Missing school contact should be null';
end $$;
reset role;
update public.usuarios set ativo=false where id=current_setting('slark.qa_student')::uuid;
set local role authenticated;
do $$ declare blocked boolean:=false; begin
 begin perform public.slark_carteirinha_aluno(); exception when insufficient_privilege then blocked:=true;end;
 assert blocked,'Inactive account allowed';
end $$;
reset role;
do $$ begin
 assert not has_function_privilege('anon','public.slark_carteirinha_aluno(uuid)','execute'),'Anonymous can read cards';
 assert not has_function_privilege('anon','slark_private.carteirinha_aluno(uuid)','execute'),'Anonymous can invoke private helper';
end $$;
rollback;
select 'Student card access, balances, tied ranks, empty states and demo assertions passed; rolled back' as result;
