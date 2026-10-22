# Correção do login repetido

O login redirecionava usando uma consulta própria de perfil enquanto o AuthProvider ainda carregava outra cópia desse perfil. A rota protegida podia receber sessão sem perfil e devolver o usuário ao login. O carregamento inicial de sessão também podia sobrescrever um evento de autenticação mais recente.

Agora `src/lib/auth-session.js` coordena sessão, perfil e assinatura em um único estado. O login redireciona depois que esse estado é confirmado pelo React. Consultas ao banco começam fora do callback de autenticação. Eventos repetidos compartilham a mesma consulta; resultados de usuários anteriores e de componentes desmontados são descartados.

Falhas ao carregar o acesso oferecem uma nova tentativa com a sessão atual, sem pedir a senha novamente. Perfis desconhecidos, permissões de rota e bloqueios de assinatura continuam sendo verificados. Uma falha ao consultar a assinatura não libera o acesso.

## Validação

Execute `node --test tests/auth-session.test.js`.

Os 14 cenários cobrem primeira entrada dos quatro perfis, perfil/assinatura lentos, restauração de sessão, bootstrap atrasado, eventos duplicados e renovação de token, logout durante consulta, falhas com nova tentativa, senha incorreta, papel inválido, troca de usuário e limpeza de efeitos do React StrictMode.

A revisão no navegador usou os componentes reais de login, contexto e proteção de rota com um serviço local fictício, atrasando perfil e assinatura. Cada um dos quatro perfis chegou ao destino com uma única chamada de login e uma única leitura de perfil. Os arquivos de simulação foram removidos antes da publicação. Nenhuma credencial real foi utilizada nesses testes.
