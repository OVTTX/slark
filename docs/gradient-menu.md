# Menu com gradiente

O projeto já usa React, Tailwind CSS e TypeScript. A configuração `components.json` define a estrutura shadcn, com componentes reutilizáveis em `components/ui` e alias `@/` para a raiz do repositório. Essa pasta mantém os componentes de interface compartilhados separados das páginas e permite que os imports e o CLI do shadcn usem o mesmo local.

- Componente: `components/ui/gradient-menu.tsx`.
- Estilos do menu: `components/ui/gradient-menu.css`.
- Estilos globais: `src/index.css` e `src/styles`.
- Integração nos quatro perfis: `src/components/BottomNav.jsx`.
- Dependência: `react-icons`, instalada com versão exata e lockfile.
- Demonstração: `components/ui/gradient-menu-demo.tsx` (dentro de um Router).

`items` recebe título, destino, ícone, correspondência exata opcional e duas cores opcionais. O estado ativo vem do React Router. Não exige um novo provider ou imagens. Os ícones do aplicativo continuam sendo os do Lucide, enquanto a demonstração padrão usa Ionicons, como a referência. A fonte é Plus Jakarta Sans.

A expansão funciona ao passar o mouse e ao focar pelo teclado. O menu mobile existente mantém links grandes por toque. Movimento reduzido desativa as transições. Barras com muitos itens permitem rolagem horizontal dentro do limite da tela.
