import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'
import { PADRAO, CATALOGO, acessoCompleto, podeUsar, preferenciasValidas } from '../lib/personalizacao'
const Context = createContext(null)
export function PersonalizacaoProvider({ children }) {
  const { perfil } = useAuth()
  const id = perfil?.id
  const request = useRef(0)
  const [state,setState] = useState({ id:null, pontos:0, preferencias:PADRAO, carregando:true, erro:'' })
  const [salvando,setSalvando] = useState(false)
  const completo = acessoCompleto(perfil)
  const carregar = useCallback(async () => {
    const version = ++request.current
    if (!id) { setState({id:null,pontos:0,preferencias:PADRAO,carregando:false,erro:''});return }
    setState(s=>({...s,carregando:true,erro:''}))
    try {
      const [preferences,student] = await Promise.all([
        supabase.from('personalizacoes_slark').select('skin,texto,moldura').eq('usuario_id',id).maybeSingle(),
        perfil.perfil==='aluno' ? supabase.from('alunos').select('pontos').eq('usuario_id',id).maybeSingle() : Promise.resolve({data:null}),
      ])
      if (preferences.error || student.error) throw preferences.error || student.error
      if (version===request.current) setState({id,pontos:student.data?.pontos||0,preferencias:preferences.data||PADRAO,carregando:false,erro:''})
    } catch {
      if (version===request.current) setState({id,pontos:0,preferencias:PADRAO,carregando:false,erro:'Não foi possível carregar seus estilos. Tente novamente.'})
    }
  },[id,perfil?.perfil])
  useEffect(()=>{
    void carregar()
    const focus=()=>{ void carregar() }
    window.addEventListener('focus',focus)
    return ()=>{ request.current++;window.removeEventListener('focus',focus) }
  },[carregar])
  const current = state.id===id ? state : {pontos:0,preferencias:PADRAO,carregando:true,erro:''}
  const preferencias = preferenciasValidas(current.preferencias,current.pontos,completo)
  async function aplicar(tipo,valor) {
    if (!id || salvando || current.carregando || current.erro) return
    const item=CATALOGO.find(i=>i.tipo===tipo && i.id===valor)
    if (!podeUsar(item,current.pontos,completo)) throw Error('Você ainda não desbloqueou este estilo.')
    const next={...preferencias,[tipo]:valor}
    const version=request.current
    setSalvando(true)
    try {
      const {error}=await supabase.from('personalizacoes_slark').upsert({usuario_id:id,...next},{onConflict:'usuario_id'})
      if (error) throw Error('Não foi possível salvar o estilo. Tente novamente.')
      if (version===request.current) setState(s=>({...s,preferencias:next}))
    } finally {setSalvando(false)}
  }
  return <Context.Provider value={{...current,preferencias,completo,salvando,aplicar,recarregar:carregar}}>{children}</Context.Provider>
}
export const usePersonalizacao=()=>useContext(Context)
