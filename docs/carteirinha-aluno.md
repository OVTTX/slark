# Carteirinha do aluno

A rota `/perfil` abre a aba **Minha carteirinha** quando o perfil efetivo é aluno. Dados gerais, segurança e loja de estilos continuam nas mesmas abas. Professores, direção e administradores mantêm o perfil anterior.

O componente de referência foi integrado em `components/ui/lanyard-badge.tsx`, com exemplo em `components/ui/lanyard-badge-demo.tsx`. O projeto já tem TypeScript, Tailwind e aliases shadcn (`components.json`); os estilos globais ficam em `src/index.css`. A integração utiliza React e os ícones Lucide já instalados, sem novas dependências ou imagens de terceiros.

`src/components/CarteirinhaAluno.jsx` carrega a carteirinha e fornece as duas faces ao cordão. Os estilos locais são `src/components/carteirinha-aluno.css`. A fonte é Plus Jakarta Sans e as cores acompanham a skin selecionada. O crachá permite arrastar e virar por toque, botão, Enter ou espaço; o desenho pausa fora da tela ou com a guia oculta. O comportamento de movimento segue a preferência compartilhada da Slark.

Dados reais na frente: foto/nome do perfil, turma, característica, saldo pessoal de pontos, posição da equipe **na sala** e escola. Verso: escola, cidade/estado, contato cadastrado pela escola e equipe. Os dados também aparecem abaixo, com links de telefone/e-mail válidos. Aluno sem equipe não recebe posição inventada. Escola sem contato apresenta estado vazio. Não há classificação individual nem dados fictícios na aplicação.

O RPC `slark_carteirinha_aluno` é somente leitura. O wrapper público usa SECURITY INVOKER; a implementação privada confere o usuário autenticado e ativo, permite apenas a própria conta de aluno e a prévia do aluno demo fixo por um admin real. O retorno contém somente os campos necessários, sem lista de alunos, membros de equipes ou dados de cobrança. A migração não modifica pontos, equipes nem políticas existentes.

Verificação: `tests/sql/student-card.sql` testa acesso próprio, bloqueio de outra conta/aluno/professor/inativo/anônimo, demo, saldo, empate e estados sem equipe/contato. As alterações de teste são revertidas pela transação.
