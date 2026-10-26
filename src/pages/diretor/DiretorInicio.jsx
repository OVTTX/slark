import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { loadSchoolOverview } from '../../lib/school-overview'
import { PainelLoading } from '../../components/SlarkLoading'
import SchoolBento from '../../../components/ui/school-bento'

export default function DiretorInicio() {
  const { perfil } = useAuth()
  const [state,setState]=useState({id:null,data:null,error:'',loading:true})
  const [refresh,setRefresh]=useState(0)
  useEffect(()=>{
    const controller=new AbortController()
    let active=true
    setState(previous=>({...previous,error:'',loading:true}))
    if(!perfil?.escola_id){setState({id:null,data:null,error:'Sua conta ainda não está vinculada a uma escola.',loading:false});return}
    loadSchoolOverview(supabase,perfil.escola_id,controller.signal).then(data=>{
      if(active)setState({id:perfil.escola_id,data,error:'',loading:false})
    }).catch(error=>{if(active && error.name!=='AbortError')setState({id:perfil.escola_id,data:null,error:'Não foi possível carregar o resumo da escola.',loading:false})})
    return ()=>{active=false;controller.abort()}
  },[perfil?.escola_id,refresh])
  const data=state.id===perfil?.escola_id?state.data:null
  return <div className="slark-school-dashboard">
    {state.loading && !data?<PainelLoading />:data?<SchoolBento data={data} schoolName={perfil?.escolas?.nome || 'Minha escola'} refreshing={state.loading} onRefresh={()=>setRefresh(value=>value+1)} />:<section role="alert" className="rounded-3xl border bg-card p-8"><h1 className="text-3xl font-bold">Resumo da escola</h1><p className="mt-4 text-texto/60">{state.error}</p><button className="mt-5 rounded-full bg-azul px-5 py-3 text-white" onClick={()=>setRefresh(value=>value+1)}>Tentar novamente</button></section>}
  </div>
}
