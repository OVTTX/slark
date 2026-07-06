-- =====================================================================
-- SLARK · Schema completo do banco (Supabase / PostgreSQL)
-- Ecossistema: Equipe Slark (admin) → Escolas → Diretores → Professores
--               → Salas → Alunos → Times → Pontos/Selos/Trilhas/Gabaritos
-- =====================================================================

-- ---------- ENUMS ----------
create type perfil_usuario as enum ('admin_slark', 'diretor', 'professor', 'aluno');
create type status_assinatura as enum ('trial', 'ativa', 'inadimplente', 'cancelada');
create type status_pagamento as enum ('pendente', 'pago', 'atrasado', 'estornado');
create type status_trilha as enum ('rascunho', 'publicado', 'arquivado');
create type status_atividade as enum ('pendente', 'entregue', 'corrigida', 'atrasada');

-- ---------- ESCOLAS (clientes B2B) ----------
create table escolas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cidade text,
  estado text,
  responsavel_nome text,
  responsavel_email text,
  responsavel_telefone text,
  criada_em timestamptz default now(),
  ativa boolean default true
);

-- ---------- ASSINATURAS (plano de cada escola) ----------
create table assinaturas (
  id uuid primary key default gen_random_uuid(),
  escola_id uuid references escolas(id) on delete cascade,
  status status_assinatura default 'trial',
  preco_por_aluno numeric(10,2) not null default 18.00,
  qtd_alunos_contratada int default 0,
  inicio date default current_date,
  proxima_cobranca date,
  criada_em timestamptz default now()
);

-- ---------- PAGAMENTOS ----------
create table pagamentos (
  id uuid primary key default gen_random_uuid(),
  assinatura_id uuid references assinaturas(id) on delete cascade,
  escola_id uuid references escolas(id) on delete cascade,
  valor numeric(10,2) not null,
  competencia date not null,          -- mês de referência
  status status_pagamento default 'pendente',
  pago_em timestamptz,
  criado_em timestamptz default now()
);

-- ---------- USUÁRIOS (perfil ligado ao auth do Supabase) ----------
-- O id casa com auth.users.id (autenticação nativa do Supabase)
create table usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  perfil perfil_usuario not null,
  nome text not null,
  email text unique not null,
  escola_id uuid references escolas(id) on delete set null, -- null p/ admin_slark
  avatar_url text,
  criado_em timestamptz default now()
);

-- ---------- SÉRIES / SALAS ----------
create table salas (
  id uuid primary key default gen_random_uuid(),
  escola_id uuid references escolas(id) on delete cascade,
  nome text not null,                 -- ex: "2A"
  serie text,                         -- ex: "2º Ano"
  professor_id uuid references usuarios(id) on delete set null,
  criada_em timestamptz default now()
);

-- ---------- CARACTERÍSTICAS (tipos do Método Slark) ----------
create table caracteristicas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,                 -- Observador, Detalhista, Criativo, Raciocínio...
  cor text,                           -- cor do selo na UI
  descricao text
);

-- ---------- ALUNOS ----------
create table alunos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios(id) on delete set null, -- login do aluno (opcional)
  escola_id uuid references escolas(id) on delete cascade,
  sala_id uuid references salas(id) on delete set null,
  nome text not null,
  caracteristica_id uuid references caracteristicas(id) on delete set null,
  pontos int default 0,
  nivel int default 1,                -- 1 = Explorador...
  criado_em timestamptz default now()
);

-- ---------- TIMES (equipes) ----------
create table times (
  id uuid primary key default gen_random_uuid(),
  sala_id uuid references salas(id) on delete cascade,
  nome text not null,
  pontos int default 0,
  criado_em timestamptz default now()
);
create table time_membros (
  time_id uuid references times(id) on delete cascade,
  aluno_id uuid references alunos(id) on delete cascade,
  primary key (time_id, aluno_id)
);

-- ---------- SELOS / INSÍGNIAS ----------
create table selos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  icone text,
  pontos_necessarios int default 50
);
create table aluno_selos (
  aluno_id uuid references alunos(id) on delete cascade,
  selo_id uuid references selos(id) on delete cascade,
  concedido_em timestamptz default now(),
  primary key (aluno_id, selo_id)
);

-- ---------- PONTUAÇÃO (histórico) ----------
create table pontuacoes (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid references alunos(id) on delete cascade,
  professor_id uuid references usuarios(id) on delete set null,
  pontos int not null,
  motivo text,
  criada_em timestamptz default now()
);

-- ---------- OBSERVAÇÕES ----------
create table observacoes (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid references alunos(id) on delete cascade,
  professor_id uuid references usuarios(id) on delete set null,
  texto text not null,
  criada_em timestamptz default now()
);

-- ---------- TRILHAS DE APRENDIZADO ----------
create table trilhas (
  id uuid primary key default gen_random_uuid(),
  escola_id uuid references escolas(id) on delete cascade,
  sala_id uuid references salas(id) on delete set null,
  professor_id uuid references usuarios(id) on delete set null,
  titulo text not null,
  descricao text,
  status status_trilha default 'rascunho',
  criada_em timestamptz default now()
);
create table trilha_blocos (
  id uuid primary key default gen_random_uuid(),
  trilha_id uuid references trilhas(id) on delete cascade,
  tipo text not null,                 -- texto | pdf | link | canva
  conteudo jsonb,
  ordem int default 0
);

-- ---------- GABARITOS (lista de exercícios + IA passo a passo) ----------
create table gabaritos (
  id uuid primary key default gen_random_uuid(),
  sala_id uuid references salas(id) on delete cascade,
  professor_id uuid references usuarios(id) on delete set null,
  titulo text not null,
  materia text,
  criado_em timestamptz default now()
);
create table gabarito_questoes (
  id uuid primary key default gen_random_uuid(),
  gabarito_id uuid references gabaritos(id) on delete cascade,
  numero int not null,
  enunciado text,
  resposta_correta text not null,     -- prof. coloca só a resposta
  passo_a_passo_ia text,              -- a IA gera o passo a passo
  ordem int default 0
);

-- ---------- ATIVIDADES (entregas dos alunos) ----------
create table atividades (
  id uuid primary key default gen_random_uuid(),
  sala_id uuid references salas(id) on delete cascade,
  professor_id uuid references usuarios(id) on delete set null,
  titulo text not null,
  descricao text,
  prazo timestamptz,
  criada_em timestamptz default now()
);
create table entregas (
  id uuid primary key default gen_random_uuid(),
  atividade_id uuid references atividades(id) on delete cascade,
  aluno_id uuid references alunos(id) on delete cascade,
  arquivo_url text,
  texto text,
  status status_atividade default 'pendente',
  nota numeric(4,2),
  feedback_ia text,                   -- explicação passo a passo da IA
  entregue_em timestamptz,
  unique (atividade_id, aluno_id)
);

-- ---------- CHAT (aluno ↔ professor) ----------
create table mensagens (
  id uuid primary key default gen_random_uuid(),
  remetente_id uuid references usuarios(id) on delete cascade,
  destinatario_id uuid references usuarios(id) on delete cascade,
  texto text not null,
  lida boolean default false,
  criada_em timestamptz default now()
);

-- ---------- CALENDÁRIO ----------
create table eventos (
  id uuid primary key default gen_random_uuid(),
  escola_id uuid references escolas(id) on delete cascade,
  sala_id uuid references salas(id) on delete set null,
  titulo text not null,
  descricao text,
  tipo text,                          -- prova | reuniao | feriado | evento
  inicio timestamptz not null,
  fim timestamptz
);

-- ---------- PLANOS DE AULA (IA) ----------
create table planos_aula (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid references usuarios(id) on delete cascade,
  sala_id uuid references salas(id) on delete set null,
  titulo text not null,
  conteudo jsonb,
  criado_em timestamptz default now()
);

-- ---------- DADOS-SEMENTE (características padrão do Método Slark) ----------
insert into caracteristicas (nome, cor, descricao) values
  ('Observador', '#2E5BFF', 'Aprende observando e analisando o contexto.'),
  ('Detalhista', '#F5C451', 'Foco em precisão e atenção aos detalhes.'),
  ('Criativo',   '#C44DFF', 'Gera ideias originais e soluções inovadoras.'),
  ('Raciocínio', '#3FD08A', 'Forte em lógica e resolução de problemas.');

insert into selos (nome, descricao, icone, pontos_necessarios) values
  ('Aprendiz', 'Alcançou 50 pontos.', '📘', 50),
  ('Dedicado', 'Alcançou 100 pontos.', '🌟', 100),
  ('Mestre',   'Alcançou 200 pontos.', '🏆', 200);

-- =====================================================================
-- Próximo arquivo: rls.sql (políticas de segurança por perfil)
-- =====================================================================
