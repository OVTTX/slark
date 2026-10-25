export async function carregarEstilos(client, perfil, demo = false) {
  if (demo) {
    const {data,error} = await client.rpc('slark_demo_estilos', {p_usuario:perfil.id})
    if(error) throw error
    if(!data?.preferencias) throw Error('Não foi possível carregar os estilos do perfil demo.')
    return data
  }
  const [preferences,student] = await Promise.all([
    client.from('personalizacoes_slark').select('skin,texto,moldura').eq('usuario_id',perfil.id).maybeSingle(),
    perfil.perfil === 'aluno' ? client.from('alunos').select('pontos').eq('usuario_id',perfil.id).maybeSingle() : Promise.resolve({data:null}),
  ])
  if(preferences.error || student.error) throw preferences.error || student.error
  return {preferencias:preferences.data,pontos:student.data?.pontos || 0}
}

export async function salvarEstilos(client, id, preferencias, demo = false) {
  const result = demo
    ? await client.rpc('slark_demo_estilos', {p_usuario:id,p_skin:preferencias.skin,p_texto:preferencias.texto,p_moldura:preferencias.moldura})
    : await client.from('personalizacoes_slark').upsert({usuario_id:id,...preferencias},{onConflict:'usuario_id'}).select('skin,texto,moldura').single()
  if(result.error) throw result.error
  const saved = demo ? result.data?.preferencias : result.data
  if(!saved) throw Error('O banco não confirmou a gravação do estilo.')
  return saved
}
