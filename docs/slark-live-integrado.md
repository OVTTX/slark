# Slark Live dentro do Slark App

## Comportamento

- `/professor/slark-live`, `/aluno/slark-live`, `/diretor/slark-live` e `/admin/slark-live` usam a sessão já aberta no App. O menu não aponta mais ao site separado.
- Live Room: o professor escolhe uma trilha vinculada à turma, prepara slides/quizzes, gera o PIN e controla a apresentação ou mata-mata. Os quartetos continuam sendo os times cadastrados com quatro integrantes.
- O aluno informa o PIN e o código fixo do próprio quarteto. A API verifica sua identidade no Supabase Auth e sua participação no quarteto; só aceita uma resposta por pergunta e um dispositivo por equipe.
- Live Solo: o professor publica as perguntas para revisão individual nas trilhas; alunos praticam com flashcards, quizzes e bot simulado. Treino não concede premiação competitiva.
- A aba do Live mostra quartetos da turma, comparação de turmas da mesma série/etapa e de toda a escola. Pontuação do App continua em sua própria aba.
- O total de uma turma é a soma dos pontos dos seus times, contado uma vez por equipe, sem multiplicar pelos quatro integrantes.
- O PIN é um link para `/slark-live/telao/:pin`; o telão não exige login. Mostra apenas dados de apresentação e classificações agregadas, nunca códigos de equipe, integrantes, observações ou gabarito não revelado.
- O telão segue o desenho enviado: classificação geral, quartetos da turma, PIN e chaveamento; durante perguntas, o conteúdo ocupa a área principal.

## Premiação

Novas partidas usam `rankingVersion: 2`. A premiação ocorre uma única vez, no resultado final: 1º = 20, 2º = 7, 3º = 5, demais = 0. Cada um dos quatro estudantes recebe o valor da colocação, e o time recebe esse mesmo valor uma vez. Não se somam prêmios por vitórias intermediárias de mata-mata. Encerrar antecipadamente, uma apresentação só de slides ou não haver respostas não gera prêmio. Quartetos sem participação não recebem pontos.

Quiz: classificação por acertos. Mata-mata: campeão, finalista e demais equipes por fase alcançada e acertos; os semifinalistas são ordenados por acertos para definir terceiro e quarto. Empates compartilham a colocação e pulam a seguinte (1, 2, 2, 4). Os pontos já concedidos pelo sistema anterior são preservados.

## Implantação pendente de aprovação

A revisão automática rejeitou a aplicação em produção da migração `20261025030553_integrar_live_no_app.sql`, pois ela cria uma role de servidor, funções privilegiadas restritas e altera triggers de premiação. A migração não foi aplicada, a role não foi criada, e este recurso não foi publicado em produção.

O SQL cria `slarkapp_live`, sem superusuário, sem bypass de RLS e sem criação de bancos/roles. Essa conexão só lê/escreve o estado privado do Live e chama uma função privada de classificações do telão. O acesso às tabelas de premiação não é concedido a clientes nem a essa role. A função pública de ranking é SECURITY INVOKER, delegando a uma função privada que verifica a sessão e a escola. Triggers privados executam os créditos atômicos e mantêm registros únicos por partida/aluno e partida/time.

Após a aprovação: aplicar a migração, gerar senha exclusiva da nova role, configurar `DATABASE_URL` apenas no servidor do projeto Vercel `slark-kvy7` e copiar a configuração pública do certificado CA do armazenamento existente. `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` aceitam os valores `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` já existentes; nenhum service-role é necessário. Não reaproveitar banco de produção em previews. Nunca colocar senha/URL de conexão nas variáveis VITE, no código ou em logs.

A conexão da produção deve ser verificada com o pooler real do projeto Supabase antes do deploy. O valor da variável DATABASE_URL do projeto antigo é do tipo sensitive e não pode ser exportado pelo conector; por isso a proposta usa uma credencial nova, sem rotacionar a existente. O site antigo só deve ser retirado após validação da integração.

## Verificações

- `node --test tests/*.test.js`: sessão, permissões, quarteto próprio, sigilo do gabarito, telão público, respostas concorrentes, cinco perguntas por fase, desempates, premiação e demais testes existentes.
- `npx tsc --noEmit` e `npm run build`.
- SQL em Postgres local via PGlite: `PGLITE_MODULE=/caminho/para/@electric-sql/pglite/dist/index.js node scripts/test-live-database.mjs`. Cria fixtures isoladas: 20/7/5/0, quatro integrantes, crédito do time uma vez, repetição sem duplicação, rollback de prêmio malformado, escopo de escola, ranking público sem integrantes e permissões do anônimo.
- Nenhum dado real de aluno ou pontuação foi alterado pelos testes locais.
