import { supabase } from './supabase'

export async function liveRequest(action, data, query = {}, signal, publicScreen = false) {
  const headers = { 'Content-Type':'application/json' }
  if (!publicScreen) {
    const { data:{session} } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('Entre na sua conta Slark para continuar.')
    headers.Authorization = `Bearer ${session.access_token}`
  }
  const response = await fetch('/api/live?' + new URLSearchParams({ action, ...query }), {
    method:data ? 'POST' : 'GET', headers, body:data ? JSON.stringify(data) : undefined, signal,
  })
  const value = await response.json()
  if (!response.ok) throw new Error(value.error || 'Não foi possível continuar. Tente novamente.')
  return value
}
