import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { carregarColecao, salvarEstampa } from '../lib/card-prints'
const Context = createContext(null)
export const useEstampasCartao = () => useContext(Context)
export function EstampasCartaoProvider({ perfil, children }) {
  const id = perfil?.perfil === 'aluno' ? perfil.id : null
  const [state,setState] = useState({ id:null,items:[],selecionada:'original',loading:true,error:'' })
  const [saving,setSaving] = useState(false)
  const version = useRef(0)
  const currentId = useRef(id)
  currentId.current = id
  const busy = useRef(false)
  const reload = useCallback(async () => {
    if(!id || busy.current) return
    const request = ++version.current
    try {
      const result = await carregarColecao(supabase,id)
      if(request === version.current) setState({id,...result,loading:false,error:''})
    } catch {
      if(request === version.current) setState(previous => ({...previous,id,loading:false,error:'Não foi possível carregar sua coleção de estampas.'}))
    }
  },[id])
  useEffect(() => {
    void reload()
    window.addEventListener('focus',reload)
    return () => { version.current++; window.removeEventListener('focus',reload) }
  },[reload])
  const current = state.id === id ? state : {items:[],selecionada:'original',loading:true,error:''}
  async function aplicar(estampa) {
    if(current.loading || current.error) throw Error('Carregue sua coleção antes de aplicar uma estampa.')
    if(busy.current) throw Error('Aguarde a estampa anterior ser salva.')
    busy.current = true
    setSaving(true)
    version.current++
    try {
      const selected = await salvarEstampa(supabase,id,estampa,current.items)
      if(currentId.current === id) setState(previous => ({...previous,selecionada:selected}))
    } finally { busy.current = false; if(currentId.current === id) setSaving(false) }
  }
  return <Context.Provider value={{...current,saving,reload,aplicar}}>{children}</Context.Provider>
}
