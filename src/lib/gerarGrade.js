// Algoritmo determinístico de montagem de grade de horários.
//
// Recebe as salas da escola (com a etapa, que define quantos períodos por
// dia ela tem), as atribuições de matéria+professor por sala (com quantas
// aulas por semana cada uma precisa) e a disponibilidade que cada professor
// marcou para si. Devolve as linhas da grade (uma por sala+dia+período) e uma
// lista de avisos em português para o diretor revisar (ex: "não deu pra
// encaixar todas as aulas de X porque o professor tem pouca disponibilidade").
//
// Importante: isso NÃO é uma IA generativa — é um algoritmo guloso comum em
// problemas de alocação (CSP). Dá pra confiar que ele nunca encaixa duas
// aulas no mesmo horário pra a mesma sala nem pro mesmo professor.

export const PERIODOS_POR_ETAPA = {
  ensino_medio: 6,
  fundamental_2: 5,
}

export const DIAS_SEMANA_GRADE = [1, 2, 3, 4, 5]
export const NOME_DIA_SEMANA = { 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta' }

function chave(dia, periodo) {
  return `${dia}-${periodo}`
}

export function gerarGradeEscola({ salas, atribuicoes, disponibilidades }) {
  const avisos = []
  const linhas = []

  const salaPorId = Object.fromEntries(salas.map((s) => [s.id, s]))

  // disponibilidade de cada professor: Set de "dia-periodo"
  const disponibilidadePorProfessor = new Map()
  for (const d of disponibilidades) {
    if (!disponibilidadePorProfessor.has(d.professor_id)) disponibilidadePorProfessor.set(d.professor_id, new Set())
    disponibilidadePorProfessor.get(d.professor_id).add(chave(d.dia_semana, d.periodo))
  }

  // ocupação (já alocado nesta geração), global por professor e por sala
  const ocupacaoProfessor = new Map()
  const ocupacaoSala = new Map()
  function ocupado(mapa, id, dia, periodo) {
    return mapa.get(id)?.has(chave(dia, periodo)) || false
  }
  function ocupar(mapa, id, dia, periodo) {
    if (!mapa.has(id)) mapa.set(id, new Set())
    mapa.get(id).add(chave(dia, periodo))
  }

  // só processa atribuições com professor definido e sala conhecida
  const pendentes = atribuicoes.filter((a) => {
    if (!a.professor_id) {
      avisos.push(`"${a.materiaNome}" em ${a.salaNome} não tem professor definido — pulada na geração da grade.`)
      return false
    }
    if (!salaPorId[a.sala_id]) return false
    return true
  })

  // ordena: professor mais engessado (menos disponibilidade) primeiro, depois quem precisa de mais aulas/semana
  const periodosPorProfessorDisponiveis = (professorId) => {
    const set = disponibilidadePorProfessor.get(professorId)
    return set ? set.size : Infinity // sem disponibilidade cadastrada = tratado como "sempre livre"
  }
  pendentes.sort((a, b) => {
    const da = periodosPorProfessorDisponiveis(a.professor_id)
    const db = periodosPorProfessorDisponiveis(b.professor_id)
    if (da !== db) return da - db
    return (b.aulas_semana || 1) - (a.aulas_semana || 1)
  })

  for (const atrib of pendentes) {
    const sala = salaPorId[atrib.sala_id]
    const periodosPorDia = PERIODOS_POR_ETAPA[sala.etapa] || PERIODOS_POR_ETAPA.ensino_medio
    const disponibilidadeProf = disponibilidadePorProfessor.get(atrib.professor_id) || null
    const temDisponibilidadeCadastrada = disponibilidadePorProfessor.has(atrib.professor_id)

    if (!temDisponibilidadeCadastrada) {
      avisos.push(`${atrib.professorNome || 'Professor'} ainda não marcou disponibilidade — foi considerado disponível o tempo todo para "${atrib.materiaNome}" em ${sala.nome}.`)
    }

    // lista de todos os slots possíveis para essa sala (dia, periodo), em ordem
    const todosSlots = []
    for (const dia of DIAS_SEMANA_GRADE) {
      for (let periodo = 1; periodo <= periodosPorDia; periodo++) {
        todosSlots.push({ dia, periodo })
      }
    }

    const diasUsados = new Set()
    let faltaAlocar = atrib.aulas_semana || 1

    while (faltaAlocar > 0) {
      const candidatos = todosSlots.filter(({ dia, periodo }) => {
        if (ocupado(ocupacaoSala, atrib.sala_id, dia, periodo)) return false
        if (ocupado(ocupacaoProfessor, atrib.professor_id, dia, periodo)) return false
        if (disponibilidadeProf && !disponibilidadeProf.has(chave(dia, periodo))) return false
        return true
      })

      if (candidatos.length === 0) {
        avisos.push(`Não foi possível encaixar ${faltaAlocar} aula(s) de "${atrib.materiaNome}" em ${sala.nome} (professor ${atrib.professorNome || '—'}) — faltou horário livre em comum.`)
        break
      }

      // prefere espalhar pelos dias da semana antes de repetir a mesma matéria no mesmo dia
      const semRepetirDia = candidatos.filter((c) => !diasUsados.has(c.dia))
      const pool = semRepetirDia.length > 0 ? semRepetirDia : candidatos
      const escolhido = pool[0]

      ocupar(ocupacaoSala, atrib.sala_id, escolhido.dia, escolhido.periodo)
      ocupar(ocupacaoProfessor, atrib.professor_id, escolhido.dia, escolhido.periodo)
      diasUsados.add(escolhido.dia)

      linhas.push({
        escola_id: sala.escola_id,
        sala_id: atrib.sala_id,
        dia_semana: escolhido.dia,
        periodo: escolhido.periodo,
        materia_id: atrib.materia_id,
        professor_id: atrib.professor_id,
      })

      faltaAlocar--
    }
  }

  return { linhas, avisos }
}
