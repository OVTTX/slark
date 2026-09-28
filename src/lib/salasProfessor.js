import { supabase } from './supabase'

// Uma sala "pertence" ao professor se ele for o representante dela (salas.professor_id)
// OU se lecionar alguma matéria nela (atribuição feita pelo diretor em Matérias,
// tabela sala_materias) — as duas coisas são independentes desde a mudança que
// separou "representante da turma" de "professor de cada matéria".
//
// Retorna no mesmo formato de uma chamada do Supabase ({ data, error }), pra
// poder substituir direto um `supabase.from('salas').select(...).eq('professor_id', id)`
// por `salasDoProfessor(id, 'id, nome')`, inclusive dentro de Promise.all([...]).
export async function salasDoProfessor(professorId, camposSala = '*') {
  try {
    const [{ data: comoRepresentante, error: eRepresentante }, { data: materiasDoProf, error: eMaterias }] = await Promise.all([
      supabase.from('salas').select(camposSala).eq('professor_id', professorId),
      supabase.from('sala_materias').select('sala_id').eq('professor_id', professorId),
    ])
    if (eRepresentante) throw eRepresentante
    if (eMaterias) throw eMaterias

    const idsComoMateria = [...new Set((materiasDoProf || []).map((m) => m.sala_id))].filter(
      (id) => !(comoRepresentante || []).some((s) => s.id === id)
    )
    let salasComoMateria = []
    if (idsComoMateria.length > 0) {
      const { data, error } = await supabase.from('salas').select(camposSala).in('id', idsComoMateria)
      if (error) throw error
      salasComoMateria = data || []
    }

    const data = [...(comoRepresentante || []), ...salasComoMateria].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}
