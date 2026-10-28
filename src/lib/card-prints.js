export const CARD_PRINT_IDS = ['original', 'orbitas', 'constelacao', 'ondas', 'geometria']
export function montarColecao(catalogo, conquistas, preferencia) {
  const owned = new Set(conquistas.map(row => row.estampa_id))
  const items = catalogo.filter(row => CARD_PRINT_IDS.includes(row.id)).map(row => ({
    ...row, disponivel: !!row.lancada && (row.id === 'original' || owned.has(row.id)),
  }))
  const selecionada = items.find(row => row.id === preferencia?.estampa_id && row.disponivel)?.id || 'original'
  return { items, selecionada }
}
export async function carregarColecao(client, usuarioId) {
  const results = await Promise.all([
    client.from('estampas_cartao').select('id,nome,descricao,lancada,ordem').order('ordem'),
    client.from('aluno_estampas').select('estampa_id').eq('usuario_id',usuarioId),
    client.from('cartao_estampa_preferencias').select('estampa_id').eq('usuario_id',usuarioId).maybeSingle(),
  ])
  for(const result of results) if(result.error) throw result.error
  return montarColecao(results[0].data || [], results[1].data || [], results[2].data)
}
export async function salvarEstampa(client, usuarioId, id, items) {
  if(!items.some(row => row.id === id && row.disponivel)) throw Error('Esta estampa ainda não está disponível na sua coleção.')
  const {data,error} = await client.from('cartao_estampa_preferencias').upsert({usuario_id:usuarioId,estampa_id:id},{onConflict:'usuario_id'}).select('estampa_id').single()
  if(error) throw error
  if(data?.estampa_id !== id) throw Error('Não foi possível confirmar a estampa salva.')
  return id
}
