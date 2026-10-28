-- No real ownership, preferences, catalog release or awards survive these assertions.
begin;
select set_config('slark.qa_student',(select id::text from public.usuarios where email='aluno@slarkdemo.com.br'),true);
select set_config('slark.qa_admin',(select id::text from public.usuarios where perfil::text='admin_slark' and ativo is not false order by id limit 1),true);
select set_config('slark.qa_other',(select id::text from public.usuarios where email='diretor@slarkdemo.com.br'),true);
update public.usuarios set perfil='aluno' where id=current_setting('slark.qa_other')::uuid;
select set_config('request.jwt.claim.sub',current_setting('slark.qa_student'),true);
set local role authenticated;
do $$ declare blocked boolean:=false; affected integer; begin
 assert (select count(*)=5 from public.estampas_cartao),'Catalog missing';
 insert into public.cartao_estampa_preferencias(usuario_id,estampa_id) values(auth.uid(),'original')
 on conflict(usuario_id) do update set estampa_id=excluded.estampa_id;
 assert (select estampa_id='original' from public.cartao_estampa_preferencias where usuario_id=auth.uid()),'Original unavailable';
 begin update public.cartao_estampa_preferencias set estampa_id='orbitas' where usuario_id=auth.uid();exception when insufficient_privilege then blocked:=true;end;
 assert blocked,'Unowned unreleased print was equipped';
 blocked:=false;
 begin insert into public.aluno_estampas(usuario_id,estampa_id) values(auth.uid(),'orbitas');exception when insufficient_privilege then blocked:=true;end;
 assert blocked,'Student granted their own collectible';
 blocked:=false;
 begin update public.estampas_cartao set lancada=true where id='orbitas';exception when insufficient_privilege then blocked:=true;end;
 assert blocked,'Student released future content';
 blocked:=false;
 begin insert into public.cartao_estampa_preferencias(usuario_id,estampa_id) values(current_setting('slark.qa_other')::uuid,'original');exception when insufficient_privilege then blocked:=true;end;
 assert blocked,'Another student preference was writable';
end $$;
reset role;
-- Future award simulation: a print must be both released and owned.
update public.estampas_cartao set lancada=true where id in ('orbitas','constelacao');
insert into public.aluno_estampas(usuario_id,estampa_id) values(current_setting('slark.qa_student')::uuid,'orbitas');
set local role authenticated;
do $$ declare blocked boolean:=false; begin
 update public.cartao_estampa_preferencias set estampa_id='orbitas' where usuario_id=auth.uid();
 assert (select estampa_id='orbitas' from public.cartao_estampa_preferencias where usuario_id=auth.uid()),'Owned released print not saved';
 begin update public.cartao_estampa_preferencias set estampa_id='constelacao' where usuario_id=auth.uid();exception when insufficient_privilege then blocked:=true;end;
 assert blocked,'Released but unowned print allowed';
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('slark.qa_other'),true);
set local role authenticated;
do $$ begin
 assert (select count(*)=0 from public.aluno_estampas),'Foreign ownership leaked';
 assert (select count(*)=0 from public.cartao_estampa_preferencias),'Foreign preference leaked';
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('slark.qa_admin'),true);
set local role authenticated;
do $$ declare blocked boolean:=false; begin
 assert (select count(*)=1 from public.aluno_estampas),'Admin demo cannot read collection';
 update public.cartao_estampa_preferencias set estampa_id='original' where usuario_id=current_setting('slark.qa_student')::uuid;
 assert (select estampa_id='original' from public.cartao_estampa_preferencias where usuario_id=current_setting('slark.qa_student')::uuid),'Admin demo cannot select';
 begin insert into public.cartao_estampa_preferencias(usuario_id,estampa_id) values(current_setting('slark.qa_other')::uuid,'original');exception when insufficient_privilege then blocked:=true;end;
 assert blocked,'Admin demo escaped fixed demo account';
end $$;
reset role;
update public.usuarios set ativo=false where id=current_setting('slark.qa_student')::uuid;
select set_config('request.jwt.claim.sub',current_setting('slark.qa_student'),true);
set local role authenticated;
do $$ begin assert not slark_private.pode_aplicar_estampa(auth.uid(),'original'),'Inactive account can equip';end $$;
reset role;
do $$ begin
 assert not has_table_privilege('anon','public.aluno_estampas','select'),'Anonymous can read ownership';
 assert not has_table_privilege('authenticated','public.aluno_estampas','insert'),'Clients can award prints';
 assert not has_function_privilege('anon','slark_private.pode_ver_estampas(uuid)','execute'),'Anonymous can use private helper';
end $$;
rollback;
select 'Card collection access, award denial, future ownership simulation and demo assertions passed; rolled back' as result;
