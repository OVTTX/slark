import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'
import { planFeatures } from '../lib/school-plan'
const PlanoContext = createContext(null)
const base = planFeatures('base', null)
export function PlanoProvider({ children }) {
  const { perfil, demoAtiva } = useAuth()
  const admin = perfil?.perfil === 'admin_slark' && !demoAtiva
  const owner = `${perfil?.id || ''}:${perfil?.escola_id || ''}:${admin}`
  const [state, setState] = useState(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let cancelled = false, request = 0
    async function load() {
      const current = ++request
      if (!perfil?.escola_id || admin) { setState({owner,...base,carregando:false,erro:''}); return }
      try {
        const { data, error } = await supabase.rpc('slark_recursos_escola', {p_escola:perfil.escola_id})
        if (error || !data) throw error || new Error('missing-plan')
        if (!cancelled && current === request) setState({owner,...planFeatures(data.plano,data.status),carregando:false,erro:''})
      } catch { if (!cancelled && current === request) setState({owner,...base,carregando:false,erro:'Não foi possível verificar o plano da escola.'}) }
    }
    void load()
    const refresh = () => { if (!document.hidden) void load() }
    window.addEventListener('focus',refresh)
    document.addEventListener('visibilitychange',refresh)
    const interval = setInterval(refresh,60000)
    return () => { cancelled=true; window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);clearInterval(interval) }
  },[owner,perfil?.escola_id,admin,revision])
  const value = state?.owner === owner ? state : {...base,carregando:true,erro:''}
  return <PlanoContext.Provider value={{...value,temLive:admin || value.temLive,personalizarEquipes:admin || value.personalizarEquipes,nomePlano:admin?'Administração Slark':value.nomePlano,recarregarPlano:()=>setRevision(number=>number+1)}}>{children}</PlanoContext.Provider>
}
export const usePlanoContext = () => useContext(PlanoContext)
