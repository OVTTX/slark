-- Read-only student card. The admin preview is restricted to the existing demo student.
create or replace function slark_private.carteirinha_aluno(p_usuario uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer public.usuarios;
  target public.usuarios;
  student public.alunos;
  school public.escolas;
  team public.times;
  characteristic text;
  classroom text;
  position bigint;
begin
  select * into viewer from public.usuarios where id = auth.uid() and ativo is not false;
  if viewer.id is null then raise exception 'Entre na sua conta Slark.' using errcode = '42501'; end if;
  select * into target from public.usuarios where id = coalesce(p_usuario, viewer.id) and ativo is not false;
  if target.id is null or target.perfil::text <> 'aluno' then
    raise exception 'Carteirinha disponível somente para alunos.' using errcode = '42501';
  end if;
  if not (target.id = viewer.id or (
    viewer.perfil::text = 'admin_slark' and lower(target.email) = 'aluno@slarkdemo.com.br'
  )) then
    raise exception 'Você só pode consultar a própria carteirinha.' using errcode = '42501';
  end if;
  select * into student from public.alunos where usuario_id = target.id and escola_id = target.escola_id;
  if student.id is null then raise exception 'Cadastro de aluno não encontrado. Fale com sua escola.' using errcode = 'P0002'; end if;
  select * into school from public.escolas where id = student.escola_id;
  select nome into characteristic from public.caracteristicas where id = student.caracteristica_id;
  select nome into classroom from public.salas where id = student.sala_id and escola_id = student.escola_id;
  select t.* into team from public.time_membros m join public.times t on t.id = m.time_id
    join public.salas s on s.id = t.sala_id
    where m.aluno_id = student.id and t.sala_id = student.sala_id and s.escola_id = student.escola_id
    order by t.criado_em, t.id limit 1;
  if team.id is not null then
    select count(*) + 1 into position from public.times
      where sala_id = student.sala_id and coalesce(pontos, 0) > coalesce(team.pontos, 0);
  end if;
  return jsonb_build_object(
    'aluno', jsonb_build_object('nome', student.nome, 'pontos', coalesce(student.pontos, 0),
      'caracteristica', characteristic, 'sala', classroom),
    'escola', jsonb_build_object('nome', school.nome, 'telefone', school.responsavel_telefone,
      'email', school.responsavel_email, 'cidade', school.cidade, 'estado', school.estado),
    'equipe', case when team.id is null then null else jsonb_build_object(
      'nome', team.nome, 'pontos', coalesce(team.pontos, 0), 'posicao', position) end
  );
end;
$$;
revoke all on function slark_private.carteirinha_aluno(uuid) from public, anon;
grant execute on function slark_private.carteirinha_aluno(uuid) to authenticated;

create or replace function public.slark_carteirinha_aluno(p_usuario uuid default null)
returns jsonb language sql security invoker set search_path = ''
as $$ select slark_private.carteirinha_aluno(p_usuario) $$;
revoke all on function public.slark_carteirinha_aluno(uuid) from public, anon;
grant execute on function public.slark_carteirinha_aluno(uuid) to authenticated;
