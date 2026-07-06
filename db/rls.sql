-- =====================================================================
-- SLARK · Políticas de Segurança (Row Level Security)
-- Rode DEPOIS de schema.sql.
-- Garante isolamento entre escolas e acesso correto por perfil.
-- =====================================================================

-- ---------- FUNÇÕES AUXILIARES ----------
-- Retornam dados do usuário logado (auth.uid()) para usar nas políticas.

create or replace function meu_perfil()
returns perfil_usuario
language sql stable security definer
as $$
  select perfil from usuarios where id = auth.uid()
$$;

create or replace function minha_escola()
returns uuid
language sql stable security definer
as $$
  select escola_id from usuarios where id = auth.uid()
$$;

create or replace function sou_admin()
returns boolean
language sql stable security definer
as $$
  select coalesce(meu_perfil() = 'admin_slark', false)
$$;

-- id do registro "aluno" ligado ao usuário logado (quando o perfil é aluno)
create or replace function meu_aluno_id()
returns uuid
language sql stable security definer
as $$
  select id from alunos where usuario_id = auth.uid()
$$;

-- =====================================================================
-- ATIVAR RLS EM TODAS AS TABELAS
-- =====================================================================
alter table escolas            enable row level security;
alter table assinaturas        enable row level security;
alter table pagamentos         enable row level security;
alter table usuarios           enable row level security;
alter table salas              enable row level security;
alter table caracteristicas    enable row level security;
alter table alunos             enable row level security;
alter table times              enable row level security;
alter table time_membros       enable row level security;
alter table selos              enable row level security;
alter table aluno_selos        enable row level security;
alter table pontuacoes         enable row level security;
alter table observacoes        enable row level security;
alter table trilhas            enable row level security;
alter table trilha_blocos      enable row level security;
alter table gabaritos          enable row level security;
alter table gabarito_questoes  enable row level security;
alter table atividades         enable row level security;
alter table entregas           enable row level security;
alter table mensagens          enable row level security;
alter table eventos            enable row level security;
alter table planos_aula        enable row level security;

-- =====================================================================
-- ESCOLAS
-- admin: tudo. diretor/professor/aluno: só a própria escola (leitura).
-- =====================================================================
create policy escolas_admin_total on escolas
  for all using (sou_admin()) with check (sou_admin());
create policy escolas_ler_propria on escolas
  for select using (id = minha_escola());

-- =====================================================================
-- ASSINATURAS e PAGAMENTOS
-- admin: tudo. diretor: leitura da própria escola.
-- =====================================================================
create policy assinaturas_admin_total on assinaturas
  for all using (sou_admin()) with check (sou_admin());
create policy assinaturas_diretor_ler on assinaturas
  for select using (escola_id = minha_escola() and meu_perfil() = 'diretor');

create policy pagamentos_admin_total on pagamentos
  for all using (sou_admin()) with check (sou_admin());
create policy pagamentos_diretor_ler on pagamentos
  for select using (escola_id = minha_escola() and meu_perfil() = 'diretor');

-- =====================================================================
-- USUÁRIOS
-- cada um lê o próprio registro; admin lê todos; membros da mesma escola
-- se enxergam (diretor/professor precisam listar colegas).
-- =====================================================================
create policy usuarios_proprio on usuarios
  for select using (id = auth.uid());
create policy usuarios_admin_total on usuarios
  for all using (sou_admin()) with check (sou_admin());
create policy usuarios_mesma_escola on usuarios
  for select using (escola_id = minha_escola() and escola_id is not null);
-- diretor pode criar/editar usuários da própria escola
create policy usuarios_diretor_gerencia on usuarios
  for all using (meu_perfil() = 'diretor' and escola_id = minha_escola())
  with check (meu_perfil() = 'diretor' and escola_id = minha_escola());

-- =====================================================================
-- SALAS
-- admin: tudo. mesma escola: leitura. professor: gerencia as suas.
-- diretor: gerencia todas da escola.
-- =====================================================================
create policy salas_admin_total on salas
  for all using (sou_admin()) with check (sou_admin());
create policy salas_mesma_escola_ler on salas
  for select using (escola_id = minha_escola());
create policy salas_professor_gerencia on salas
  for all using (professor_id = auth.uid())
  with check (professor_id = auth.uid());
create policy salas_diretor_gerencia on salas
  for all using (meu_perfil() = 'diretor' and escola_id = minha_escola())
  with check (meu_perfil() = 'diretor' and escola_id = minha_escola());

-- =====================================================================
-- CARACTERÍSTICAS e SELOS (catálogos globais)
-- todos logados leem; só admin escreve.
-- =====================================================================
create policy caracteristicas_ler on caracteristicas
  for select using (auth.uid() is not null);
create policy caracteristicas_admin on caracteristicas
  for all using (sou_admin()) with check (sou_admin());

create policy selos_ler on selos
  for select using (auth.uid() is not null);
create policy selos_admin on selos
  for all using (sou_admin()) with check (sou_admin());

-- =====================================================================
-- ALUNOS
-- admin: tudo. mesma escola (diretor/professor): leitura e gestão.
-- o próprio aluno: lê o seu registro.
-- =====================================================================
create policy alunos_admin_total on alunos
  for all using (sou_admin()) with check (sou_admin());
create policy alunos_escola_ler on alunos
  for select using (escola_id = minha_escola());
create policy alunos_escola_gerencia on alunos
  for all using (escola_id = minha_escola() and meu_perfil() in ('diretor','professor'))
  with check (escola_id = minha_escola() and meu_perfil() in ('diretor','professor'));
create policy alunos_proprio_ler on alunos
  for select using (usuario_id = auth.uid());

-- =====================================================================
-- TIMES e MEMBROS
-- visíveis a quem é da mesma escola da sala; professor/diretor gerenciam.
-- =====================================================================
create policy times_admin_total on times
  for all using (sou_admin()) with check (sou_admin());
create policy times_escola_ler on times
  for select using (
    exists (select 1 from salas s where s.id = times.sala_id and s.escola_id = minha_escola())
  );
create policy times_gerencia on times
  for all using (
    exists (select 1 from salas s where s.id = times.sala_id and s.escola_id = minha_escola()
            and meu_perfil() in ('diretor','professor'))
  ) with check (
    exists (select 1 from salas s where s.id = times.sala_id and s.escola_id = minha_escola()
            and meu_perfil() in ('diretor','professor'))
  );

create policy time_membros_escola_ler on time_membros
  for select using (
    exists (select 1 from times t join salas s on s.id = t.sala_id
            where t.id = time_membros.time_id and s.escola_id = minha_escola())
  );
create policy time_membros_gerencia on time_membros
  for all using (
    exists (select 1 from times t join salas s on s.id = t.sala_id
            where t.id = time_membros.time_id and s.escola_id = minha_escola()
            and meu_perfil() in ('diretor','professor'))
  ) with check (
    exists (select 1 from times t join salas s on s.id = t.sala_id
            where t.id = time_membros.time_id and s.escola_id = minha_escola()
            and meu_perfil() in ('diretor','professor'))
  );

-- =====================================================================
-- ALUNO_SELOS, PONTUAÇÕES, OBSERVAÇÕES
-- escola lê; professor/diretor escrevem; o próprio aluno lê o seu.
-- =====================================================================
create policy aluno_selos_escola on aluno_selos
  for select using (
    exists (select 1 from alunos a where a.id = aluno_selos.aluno_id and a.escola_id = minha_escola())
    or exists (select 1 from alunos a where a.id = aluno_selos.aluno_id and a.usuario_id = auth.uid())
    or sou_admin()
  );
create policy aluno_selos_gerencia on aluno_selos
  for all using (
    exists (select 1 from alunos a where a.id = aluno_selos.aluno_id and a.escola_id = minha_escola()
            and meu_perfil() in ('diretor','professor'))
  ) with check (
    exists (select 1 from alunos a where a.id = aluno_selos.aluno_id and a.escola_id = minha_escola()
            and meu_perfil() in ('diretor','professor'))
  );

create policy pontuacoes_ler on pontuacoes
  for select using (
    exists (select 1 from alunos a where a.id = pontuacoes.aluno_id and a.escola_id = minha_escola())
    or exists (select 1 from alunos a where a.id = pontuacoes.aluno_id and a.usuario_id = auth.uid())
    or sou_admin()
  );
create policy pontuacoes_gerencia on pontuacoes
  for all using (
    exists (select 1 from alunos a where a.id = pontuacoes.aluno_id and a.escola_id = minha_escola()
            and meu_perfil() in ('diretor','professor'))
  ) with check (
    exists (select 1 from alunos a where a.id = pontuacoes.aluno_id and a.escola_id = minha_escola()
            and meu_perfil() in ('diretor','professor'))
  );

create policy observacoes_ler on observacoes
  for select using (
    exists (select 1 from alunos a where a.id = observacoes.aluno_id and a.escola_id = minha_escola())
    or exists (select 1 from alunos a where a.id = observacoes.aluno_id and a.usuario_id = auth.uid())
    or sou_admin()
  );
create policy observacoes_gerencia on observacoes
  for all using (
    exists (select 1 from alunos a where a.id = observacoes.aluno_id and a.escola_id = minha_escola()
            and meu_perfil() in ('diretor','professor'))
  ) with check (
    exists (select 1 from alunos a where a.id = observacoes.aluno_id and a.escola_id = minha_escola()
            and meu_perfil() in ('diretor','professor'))
  );

-- =====================================================================
-- TRILHAS e BLOCOS
-- escola lê (alunos veem as publicadas); professor/diretor gerenciam.
-- =====================================================================
create policy trilhas_escola_ler on trilhas
  for select using (
    escola_id = minha_escola()
    and (status = 'publicado' or meu_perfil() in ('diretor','professor'))
  );
create policy trilhas_admin_total on trilhas
  for all using (sou_admin()) with check (sou_admin());
create policy trilhas_gerencia on trilhas
  for all using (escola_id = minha_escola() and meu_perfil() in ('diretor','professor'))
  with check (escola_id = minha_escola() and meu_perfil() in ('diretor','professor'));

create policy trilha_blocos_ler on trilha_blocos
  for select using (
    exists (select 1 from trilhas t where t.id = trilha_blocos.trilha_id and t.escola_id = minha_escola())
  );
create policy trilha_blocos_gerencia on trilha_blocos
  for all using (
    exists (select 1 from trilhas t where t.id = trilha_blocos.trilha_id and t.escola_id = minha_escola()
            and meu_perfil() in ('diretor','professor'))
  ) with check (
    exists (select 1 from trilhas t where t.id = trilha_blocos.trilha_id and t.escola_id = minha_escola()
            and meu_perfil() in ('diretor','professor'))
  );

-- =====================================================================
-- GABARITOS e QUESTÕES
-- escola lê; professor/diretor gerenciam.
-- =====================================================================
create policy gabaritos_escola_ler on gabaritos
  for select using (
    exists (select 1 from salas s where s.id = gabaritos.sala_id and s.escola_id = minha_escola())
  );
create policy gabaritos_gerencia on gabaritos
  for all using (
    exists (select 1 from salas s where s.id = gabaritos.sala_id and s.escola_id = minha_escola()
            and meu_perfil() in ('diretor','professor'))
  ) with check (
    exists (select 1 from salas s where s.id = gabaritos.sala_id and s.escola_id = minha_escola()
            and meu_perfil() in ('diretor','professor'))
  );

create policy gabarito_questoes_ler on gabarito_questoes
  for select using (
    exists (select 1 from gabaritos g join salas s on s.id = g.sala_id
            where g.id = gabarito_questoes.gabarito_id and s.escola_id = minha_escola())
  );
create policy gabarito_questoes_gerencia on gabarito_questoes
  for all using (
    exists (select 1 from gabaritos g join salas s on s.id = g.sala_id
            where g.id = gabarito_questoes.gabarito_id and s.escola_id = minha_escola()
            and meu_perfil() in ('diretor','professor'))
  ) with check (
    exists (select 1 from gabaritos g join salas s on s.id = g.sala_id
            where g.id = gabarito_questoes.gabarito_id and s.escola_id = minha_escola()
            and meu_perfil() in ('diretor','professor'))
  );

-- =====================================================================
-- ATIVIDADES e ENTREGAS
-- atividades: escola lê, professor/diretor gerenciam.
-- entregas: o próprio aluno cria/edita a sua; professor lê/corrige as da escola.
-- =====================================================================
create policy atividades_escola_ler on atividades
  for select using (
    exists (select 1 from salas s where s.id = atividades.sala_id and s.escola_id = minha_escola())
  );
create policy atividades_gerencia on atividades
  for all using (
    exists (select 1 from salas s where s.id = atividades.sala_id and s.escola_id = minha_escola()
            and meu_perfil() in ('diretor','professor'))
  ) with check (
    exists (select 1 from salas s where s.id = atividades.sala_id and s.escola_id = minha_escola()
            and meu_perfil() in ('diretor','professor'))
  );

-- aluno: lê e cria/edita apenas as próprias entregas
create policy entregas_aluno_propria on entregas
  for select using (aluno_id = meu_aluno_id());
create policy entregas_aluno_envia on entregas
  for insert with check (aluno_id = meu_aluno_id());
create policy entregas_aluno_edita on entregas
  for update using (aluno_id = meu_aluno_id()) with check (aluno_id = meu_aluno_id());
-- professor/diretor: leem e corrigem as entregas da escola
create policy entregas_professor on entregas
  for select using (
    exists (select 1 from atividades at join salas s on s.id = at.sala_id
            where at.id = entregas.atividade_id and s.escola_id = minha_escola()
            and meu_perfil() in ('diretor','professor'))
  );
create policy entregas_professor_corrige on entregas
  for update using (
    exists (select 1 from atividades at join salas s on s.id = at.sala_id
            where at.id = entregas.atividade_id and s.escola_id = minha_escola()
            and meu_perfil() in ('diretor','professor'))
  ) with check (
    exists (select 1 from atividades at join salas s on s.id = at.sala_id
            where at.id = entregas.atividade_id and s.escola_id = minha_escola()
            and meu_perfil() in ('diretor','professor'))
  );

-- =====================================================================
-- MENSAGENS (chat aluno ↔ professor)
-- só remetente e destinatário veem; só envia em nome próprio.
-- =====================================================================
create policy mensagens_ler on mensagens
  for select using (remetente_id = auth.uid() or destinatario_id = auth.uid());
create policy mensagens_enviar on mensagens
  for insert with check (remetente_id = auth.uid());
create policy mensagens_marcar_lida on mensagens
  for update using (destinatario_id = auth.uid()) with check (destinatario_id = auth.uid());

-- =====================================================================
-- EVENTOS (calendário)
-- escola lê; professor/diretor gerenciam.
-- =====================================================================
create policy eventos_escola_ler on eventos
  for select using (escola_id = minha_escola() or sou_admin());
create policy eventos_gerencia on eventos
  for all using (escola_id = minha_escola() and meu_perfil() in ('diretor','professor'))
  with check (escola_id = minha_escola() and meu_perfil() in ('diretor','professor'));

-- =====================================================================
-- PLANOS DE AULA (IA)
-- cada professor gerencia os seus.
-- =====================================================================
create policy planos_aula_proprio on planos_aula
  for all using (professor_id = auth.uid()) with check (professor_id = auth.uid());

-- =====================================================================
-- FIM. RLS ativo e isolando dados por escola/perfil.
-- =====================================================================
