-- Keep the existing school authorization; return team scores for the three scopes.
create or replace function slark_private.live_ranking(p_sala uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare viewer public.usuarios;school uuid;selected uuid;payload jsonb;
begin
 select * into viewer from public.usuarios where id=auth.uid() and ativo is not false;
 if viewer.id is null then raise exception 'Entre na sua conta Slark.';end if;
 school:=viewer.escola_id;
 if viewer.perfil::text='aluno' then select sala_id into selected from public.alunos where usuario_id=viewer.id limit 1; end if;
 selected:=coalesce(p_sala,selected);
 if viewer.perfil::text='admin_slark' and selected is not null then select escola_id into school from public.salas where id=selected;end if;
 if viewer.perfil::text='admin_slark' and school is null then select escola_id,id into school,selected from public.salas order by criada_em,id limit 1;end if;
 if school is null then return jsonb_build_object('salas','[]'::jsonb,'times','[]'::jsonb,'salaId',null);end if;
 if selected is not null and not exists(select 1 from public.salas where id=selected and escola_id=school) then raise exception 'Turma fora da sua escola.';end if;
 if selected is null then select id into selected from public.salas where escola_id=school order by nome,id limit 1;end if;
 select jsonb_build_object('salaId',selected,'escolaId',school,
  'salas',coalesce((select jsonb_agg(x order by x.nome) from(
   select s.id,s.nome,s.serie,s.etapa,coalesce(sum(t.pontos),0)::bigint as pontos from public.salas s
   left join public.times t on t.sala_id=s.id where s.escola_id=school group by s.id
  ) x),'[]'::jsonb),
  'timesEscola',coalesce((select jsonb_agg(x order by x.pontos desc,x.nome) from(
   select t.id,t.nome,t.sala_id,coalesce(t.pontos,0) as pontos from public.times t join public.salas s on s.id=t.sala_id where s.escola_id=school
  )x),'[]'::jsonb),
  'times',coalesce((select jsonb_agg(x order by x.pontos desc,x.nome) from(
   select id,nome,coalesce(pontos,0) as pontos from public.times where sala_id=selected
  ) x),'[]'::jsonb)) into payload;
 return payload;
end $$;
