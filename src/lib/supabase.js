import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Aviso amigável caso as chaves ainda não tenham sido configuradas
if (!url || !anonKey) {
  console.warn(
    '[Slark] Supabase não configurado. Copie .env.example para .env e preencha as chaves do seu projeto Supabase.'
  )
}

export const supabase = createClient(url || 'http://localhost', anonKey || 'public-anon-key')

// Helper: retorna o perfil (linha da tabela usuarios) do usuário logado
export async function carregarPerfil(userId) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*, escolas(nome)')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}
