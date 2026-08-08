// A trilha é dividida em "Aulas": Aula 1, Aula 2, Aula 3... e opcionalmente
// uma Aula 0 de introdução, sempre fixada como o primeiro bloco.
// Não criamos coluna nova no banco pra isso — a Aula 0 é só um bloco normal
// de trilha_blocos com conteudo.intro = true, então nada quebra pra quem já
// tinha trilhas antes dessa mudança.

export function ehIntroducao(bloco) {
  return !!bloco?.conteudo?.intro
}

// Rótulo de exibição pro bloco no índice i (0-based) dentro do array `blocos`
// já ordenado por `ordem`.
export function rotuloAula(blocos, i) {
  const bloco = blocos[i]
  if (ehIntroducao(bloco)) return 'Aula 0 · Introdução'
  const temIntro = ehIntroducao(blocos[0])
  const numero = temIntro ? i : i + 1
  return `Aula ${numero}`
}

// Número curto (só o dígito) pro nó no caminho sinuoso.
export function numeroAula(blocos, i) {
  const bloco = blocos[i]
  if (ehIntroducao(bloco)) return 0
  const temIntro = ehIntroducao(blocos[0])
  return temIntro ? i : i + 1
}

export const TEMPLATE_INTRODUCAO = `Oi, turma! 👋

Antes de começarmos, um recadinho rápido pra vocês:

[Escreva aqui a introdução da trilha — o que vamos aprender e por que isso importa.]

Bora nessa!`
