// Termômetro de engajamento: combina três sinais em uma nota de 0 a 100.
// - pontosScore: pontos do aluno relativos ao maior valor do grupo (sala/escola)
// - trilhaScore: % de blocos de trilha concluídos sobre o total disponível
// - presencaScore: % de presenças sobre o total de chamadas feitas
// Sinal sem dados suficientes (ex.: nenhuma chamada feita ainda) fica como
// null e não entra na média — evita punir quem ainda não teve chance.

export function calcularScoreAluno({ pontos = 0, maxPontos = 0, blocosFeitos = 0, blocosTotais = 0, presentes = 0, totalChamadas = 0 }) {
  const pontosScore = maxPontos > 0 ? Math.round(Math.min(100, (pontos / maxPontos) * 100)) : null
  const trilhaScore = blocosTotais > 0 ? Math.round(Math.min(100, (blocosFeitos / blocosTotais) * 100)) : null
  const presencaScore = totalChamadas > 0 ? Math.round(Math.min(100, (presentes / totalChamadas) * 100)) : null

  const partes = [pontosScore, trilhaScore, presencaScore].filter((v) => v != null)
  const semDados = partes.length === 0
  const geral = semDados ? 0 : Math.round(partes.reduce((s, v) => s + v, 0) / partes.length)

  return { pontosScore, trilhaScore, presencaScore, geral, semDados }
}

// Agrega uma lista de scores (de alunos) em um único score médio — usado
// para consolidar por equipe, sala ou escola.
export function agregarScores(scores) {
  const validos = scores.filter((s) => s && !s.semDados)
  if (validos.length === 0) return { geral: 0, semDados: true }
  const geral = Math.round(validos.reduce((s, v) => s + v.geral, 0) / validos.length)
  return { geral, semDados: false }
}

export function faixaTermometro(valor) {
  if (valor >= 70) return { nome: 'Quente', cor: '#FF5A5F' }
  if (valor >= 40) return { nome: 'Morno', cor: '#F5C451' }
  return { nome: 'Frio', cor: '#2E9BFF' }
}
