-- =====================================================================
-- Como criar os primeiros usuários (rode DEPOIS de schema.sql)
-- =====================================================================
-- O Supabase tem autenticação nativa (auth.users). O fluxo é:
--   1. Criar o usuário em Authentication > Users no painel do Supabase
--      (ou via signUp), anotando o UUID gerado.
--   2. Inserir a linha correspondente na tabela "usuarios" com o perfil.
--
-- Exemplo: depois de criar o login admin@slark.com no painel e copiar o UUID:

-- insert into usuarios (id, perfil, nome, email)
-- values ('COLE-O-UUID-AQUI', 'admin_slark', 'Equipe Slark', 'admin@slark.com');

-- Exemplo de uma escola + professor:
-- insert into escolas (id, nome, cidade, estado)
-- values ('11111111-1111-1111-1111-111111111111', 'Escola Monte Castelo', 'São Paulo', 'SP');

-- insert into usuarios (id, perfil, nome, email, escola_id)
-- values ('UUID-DO-PROFESSOR', 'professor', 'Prof. Exemplo', 'prof@escola.com',
--         '11111111-1111-1111-1111-111111111111');
