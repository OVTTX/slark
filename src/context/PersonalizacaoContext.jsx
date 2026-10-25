import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'
import { carregarEstilos, salvarEstilos } from '../lib/style-store'
import { PADRAO, CATALOGO, acessoCompleto, podeUsar, preferenciasValidas } from '../lib/personalizacao'
const Context = createContext(null)
export function PersonalizacaoProvider({ children }) {
  const { perfil, demoAtiva } = useAuth()
  const id = perfil?.id
  const request = useRef(0)
  const activeId = useRef(id)
  activeId.current = id
  const [state,setState] = useState({ id:null, pontos:0, preferencias:PADRAO, carregando:true, erro:'' })
  const [salvando,setSalvando] = useState(false)
  const completo = acessoCompleto(perfil)
  const carregar = useCallback(async () => {
    const version = ++request.current
    if (!id) { setState({id:null,pontos:0,preferencias:PADRAO,carregando:false,erro:''});return }
    setState(s=>({...s,carregando:true,erro:''}))
    try {
      const data = await carregarEstilos(supabase,perfil,demoAtiva)
      if (version===request.current) setState({id,pontos:data.pontos||0,preferencias:data.preferencias||PADRAO,carregando:false,erro:''})
    } catch {
      if (version===request.current) setState({id,pontos:0,preferencias:PADRAO,carregando:false,erro:'Não foi possível carregar seus estilos. Tente novamente.'})
    }
  },[id,perfil?.perfil,demoAtiva])
  useEffect(()=>{
    void carregar()
    const focus=()=>{ void carregar() }
    window.addEventListener('focus',focus)
    return ()=>{ request.current++;window.removeEventListener('focus',focus) }
  },[carregar])
  const current = state.id===id ? state : {pontos:0,preferencias:PADRAO,carregando:true,erro:''}
  const preferencias = preferenciasValidas(current.preferencias,current.pontos,completo)
  async function aplicar(tipo,valor) {
    if (!id || current.carregando) throw Error('Aguarde o carregamento dos estilos e tente novamente.')
    if (salvando) throw Error('Aguarde o estilo anterior ser salvo.')
    if (current.erro) throw Error(current.erro)
    const item=CATALOGO.find(i=>i.tipo===tipo && i.id===valor)
    if (!podeUsar(item,current.pontos,completo)) throw Error('Você ainda não desbloqueou este estilo.')
    const next={...preferencias,[tipo]:valor}
    setSalvando(true)
    try {
      const saved = await salvarEstilos(supabase,id,next,demoAtiva)
      if (activeId.current===id) {
        request.current++
        setState(s=>({...s,preferencias:saved,carregando:false,erro:''}))
      }
    } finally {setSalvando(false)}
  }
  return <Context.Provider value={{...current,preferencias,completo,salvando,aplicar,recarregar:carregar}}>{children}</Context.Provider>
}
export const usePersonalizacao=()=>useContext(Context)
