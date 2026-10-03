// Sugestão de aulas/semana por matéria, baseada na distribuição mais comum
// usada por redes de ensino brasileiras para atender a BNCC (Base Nacional
// Comum Curricular). A BNCC em si não fixa um número exato de aulas por
// semana por matéria — ela define áreas do conhecimento e carga horária
// anual/total (800h/ano no Fundamental, 1.800h na BNCC do Médio + itinerários
// até 4.200h), deixando a distribuição semanal a critério de cada rede/escola.
// Os valores abaixo são só um ponto de partida comum; o diretor pode ajustar
// livremente cada atribuição.

const SUGESTOES_FUNDAMENTAL_2 = {
  'lingua portuguesa': 5,
  portugues: 5,
  'portugues e literatura': 5,
  matematica: 5,
  ciencias: 3,
  historia: 3,
  geografia: 3,
  arte: 2,
  'educacao fisica': 2,
  ingles: 2,
  'lingua inglesa': 2,
  'ensino religioso': 1,
}

const SUGESTOES_ENSINO_MEDIO = {
  'lingua portuguesa': 4,
  portugues: 4,
  'portugues e literatura': 4,
  'tecnicas de redacao': 2,
  redacao: 2,
  matematica: 4,
  biologia: 2,
  fisica: 2,
  quimica: 2,
  historia: 2,
  geografia: 2,
  filosofia: 1,
  sociologia: 1,
  arte: 1,
  'educacao fisica': 2,
  ingles: 2,
  'lingua inglesa': 2,
  'educacao financeira': 1,
  'lideranca e oratoria': 1,
}

function normalizar(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos
    .trim()
}

// Devolve a sugestão de aulas/semana pra uma matéria, de acordo com a etapa
// da turma (fundamental_2 ou ensino_medio). Retorna null quando a matéria não
// está no mapa de sugestões (o chamador decide o padrão nesse caso).
export function sugerirAulasSemana(nomeMateria, etapa) {
  const chave = normalizar(nomeMateria)
  const tabela = etapa === 'fundamental_2' ? SUGESTOES_FUNDAMENTAL_2 : SUGESTOES_ENSINO_MEDIO
  if (chave in tabela) return tabela[chave]

  // tenta um match parcial (ex: "Matemática Aplicada" contém "matematica")
  const encontrada = Object.keys(tabela).find((k) => chave.includes(k) || k.includes(chave))
  return encontrada ? tabela[encontrada] : null
}
