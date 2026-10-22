# Slark App — identidade visual

Identidade aplicada em 22/10/2026 com base no manual SLARK RENEW e na seção 9 da documentação fornecida.

- Paleta institucional: branco #FFFFFF, azul-noite #000026, azul profundo #0B0697 e azul de destaque #0651C3.
- Plus Jakarta Sans, títulos bold italic e subtítulos leves.
- Órbitas abstratas, superfícies com bordas suaves, menus em vidro, campos e tabelas consistentes.
- Cores funcionais de características e estados preservadas.
- Navegação, consultas, permissões e fluxos de cada perfil preservados.

## Ponto de retorno

Commit anterior à remodelação do aplicativo: `f0df4301ce06a82fb8e0c6b1d99d5640909ebaeb`.

Para desfazer apenas esta remodelação, reverta o commit que adiciona este arquivo. Isso preserva alterações posteriores e o histórico. Não é necessário apagar dados nem restaurar o banco.

## Organização

`src/styles/slark-app.css` é restrito a `.slark-app`. Os estilos reconhecem as classes de superfície já presentes nas páginas (`bg-card` e `bg-white/[0.04]`) e a classe explícita `slark-panel` dos componentes compartilhados. As páginas internas permanecem intactas; as grades e as ações continuam em seus lugares. O login tem estilos próprios em `src/styles/slark-login.css`. O modo claro continua disponível.
