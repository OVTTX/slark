# Slark Base e Slark Live

Somente os contratos `base` e `live` são aceitos. Os antigos contratos foram normalizados para Base; nenhum preço, assinatura Base ou nome de equipe existente foi alterado. A edição fica em Administrativo → Escolas → Editar escola. Financeiro → Assinaturas exibe um resumo com atalho para essa mesma edição.

- Base: aplicativo e materiais Runaway; novas equipes recebem nomes automáticos. Sem Live nos menus.
- Live: aplicativo, Slark Live e nomes personalizados para equipes.
- Live exige contrato Live em status ativa/trial. Ausência ou falha ao consultar o contrato não libera o recurso. Cancelamento/inadimplência revoga o Live.
- Metadados do plano são lidos por RPC que valida a conta ativa e sua escola. As regras de leitura financeira continuam preservadas.
- Menus mobile/desktop, rotas, API de participação/condução/Live Solo e telões verificam acesso. Telões de escolas habilitadas continuam públicos por PIN, sem login.
- O banco gera nomes para novas equipes Base e recusa renomeações, inclusive via API direta. Pontos e integrantes não mudam.
- Administradores mantêm a gestão geral; a prévia de professor/aluno/diretor usa o contrato da escola efetiva. Criar uma partida administrativa exige que a escola da trilha tenha Live.
- O plano é revalidado ao voltar à janela e a cada minuto; a API verifica em cada operação.

# Ferramentas de aula

`/professor/ferramentas`, disponível no Base e no Live:

- Sorteio uniforme, com opção sem repetição e histórico da rodada.
- Grupos temporários equilibrados por quantidade ou máximo de integrantes; cópia da lista.
- Cronômetro e contagem regressiva, pausa/continuação, atalhos de duração e tela cheia quando suportada. A contagem usa o relógio e continua ao alternar ferramentas nesta página; sair da página encerra a sessão local.
- Turmas vinculadas ao professor, alunos paginados com filtro de escola/turma, seleção de participantes e entrada manual de nomes. Nomes iguais em linhas diferentes identificam participantes distintos.
- Resultados locais da atividade não alteram quartetos, pontos ou cadastros e são reiniciados quando a lista muda.

Validação: testes Node, testes SQL transacionais com rollback de planos/permissões/nomes/telões, e prévia de interface com dados fictícios (mobile, desktop, temas, sorteio sem repetição, grupos e pausa/continuação do timer). A API de tela cheia não foi disponibilizada pelo navegador de prévia; o aviso de indisponibilidade foi verificado.

A edição da escola reúne status Ativa/Inativa/Inadimplente, plano Base/Live e a marcação independente Escola-Farol. Inativa é armazenada como escola desativada e assinatura cancelada; ao ativar novamente, o contrato volta a ativa. Essa tela não edita valores por aluno, quantidades contratadas ou datas de cobrança. Os valores financeiros existentes são preservados.
