# Carteirinha do aluno

A rota `/perfil` abre a aba **Minha carteirinha** quando o perfil efetivo é aluno. Dados gerais, segurança e loja de estilos continuam nas mesmas abas. Professores, direção e administradores mantêm o perfil anterior.

O componente de referência foi integrado em `components/ui/lanyard-badge.tsx`, com exemplo em `components/ui/lanyard-badge-demo.tsx`. O projeto já tem TypeScript, Tailwind e aliases shadcn (`components.json`); os estilos globais ficam em `src/index.css`. A integração utiliza React e os ícones Lucide já instalados, sem novas dependências ou imagens de terceiros.

`src/components/CarteirinhaAluno.jsx` carrega a carteirinha e fornece as duas faces ao cordão. Os estilos locais são `src/components/carteirinha-aluno.css`. A fonte é Plus Jakarta Sans e as cores acompanham a skin selecionada. O crachá permite arrastar e virar por toque, botão, Enter ou espaço; o desenho pausa fora da tela ou com a guia oculta. O comportamento de movimento segue a preferência compartilhada da Slark.

Dados reais na frente: foto/nome do perfil, turma, característica, saldo pessoal de pontos, posição da equipe **na sala** e escola. Verso: escola, cidade/estado, contato cadastrado pela escola e equipe. Os dados também aparecem abaixo, com links de telefone/e-mail válidos. Aluno sem equipe não recebe posição inventada. Escola sem contato apresenta estado vazio. Não há classificação individual nem dados fictícios na aplicação.

O RPC `slark_carteirinha_aluno` é somente leitura. O wrapper público usa SECURITY INVOKER; a implementação privada confere o usuário autenticado e ativo, permite apenas a própria conta de aluno e a prévia do aluno demo fixo por um admin real. O retorno contém somente os campos necessários, sem lista de alunos, membros de equipes ou dados de cobrança. A migração não modifica pontos, equipes nem políticas existentes.

Verificação: `tests/sql/student-card.sql` testa acesso próprio, bloqueio de outra conta/aluno/professor/inativo/anônimo, demo, saldo, empate e estados sem equipe/contato. As alterações de teste são revertidas pela transação.

## Tela cheia

Clicar na aba Minha carteirinha abre um dialog modal na camada superior do navegador, com tentativa de fullscreen nativo no mesmo gesto. Quando indisponível, o dialog preenche a área da página. F ou Escape fecham no computador; três toques consecutivos no cartão (intervalos inferiores a 500 ms) fecham em dispositivos touch ou layouts móveis. Arrastar ou cancelar um gesto reinicia a sequência. Nesse modo, o giro no celular fica no botão Ver verso, para não disputar os três toques. O botão Sair permanece disponível para acessibilidade.

O modal preserva o tema, ajusta o cartão à altura e largura disponíveis, bloqueia a rolagem e o foco do fundo e restaura a página ao fechar. Sair do fullscreen nativo pelo navegador também fecha o modal. A prévia e os dados completos continuam na página de perfil.

## Estampas colecionáveis

Perfil do aluno → Estampas do cartão. A Original Slark é a opção inicial. Órbitas, Constelação, Ondas e Geometria têm prévias e aparecem como Em breve. A conquista no Slark Live é futura: não há metas, quantidades, preços, resgates nem concessão automática implementados. Não há envio de imagens próprias.

A coleção permite prévia antes de aplicar; aplicar exige uma estampa lançada e conquistada, exceto a Original, que é sempre disponível. A escolha fica salva por conta e é refletida na carteirinha normal e na tela cheia. Os mesmos temas e informações são preservados.

`estampas_cartao` guarda o catálogo, `aluno_estampas` guarda as conquistas e `cartao_estampa_preferencias` a opção selecionada. As três tabelas têm RLS. Clientes autenticados leem o catálogo e a própria coleção e alteram apenas a própria seleção válida. O admin real pode testar exclusivamente a conta fixa aluno@slarkdemo.com.br. Nenhum cliente pode conceder uma conquista nem lançar estampas. As regras de aquisição e sua integração com Live serão definidas posteriormente pelo responsável pelo produto.

Verificação: testes de seleção/confirmação em tests/card-prints.test.js e testes transacionais de RLS/conquista simulada em tests/sql/card-prints.sql. Simulações revertem catálogo, conquistas e preferências, sem alterar saldos ou partidas reais.
