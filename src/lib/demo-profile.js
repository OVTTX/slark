export async function carregarDemo(client, admin, tipo) {
  if (admin?.perfil !== 'admin_slark') throw new Error('Este recurso é exclusivo da equipe administrativa.')
  if (!['aluno', 'professor', 'diretor'].includes(tipo)) throw new Error('Perfil de demonstração inválido.')
  const { data, error } = await client.from('usuarios').select('*, escolas(nome)')
    .eq('email', `${tipo}@slarkdemo.com.br`).eq('perfil', tipo).single()
  if (error || !data?.escola_id || data.perfil !== tipo || data.email !== `${tipo}@slarkdemo.com.br`) {
    throw new Error('Não foi possível abrir a conta demo. Tente novamente.')
  }
  return data
}
