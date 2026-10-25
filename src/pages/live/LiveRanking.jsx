import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { classificarTimes } from '../../lib/team-ranking'

export default function LiveRanking({ standalone = false }) {
  const { perfil, demoAtiva } = useAuth()
  const [data,setData]=useState(null)
  const [sala,setSala]=useState('')
  const [scope,setScope]=useState('turma')
  const [error,setError]=useState('')
  const [refresh,setRefresh]=useState(0)
  const [escolas,setEscolas]=useState([])
  const [escola,setEscola]=useState('')
  useEffect(()=>{
    if(perfil?.perfil!=='admin_slark')return
    let active=true
    supabase.from('escolas').select('id,nome').order('nome').then(({data,error})=>{
      if(active && !error)setEscolas(data || [])
    })
    return ()=>{active=false}
  },[perfil?.id,perfil?.perfil])
  useEffect(()=>{
    let active=true
    setError('')
    async function load(){
      let selected=sala || null
      const school=escola || (demoAtiva ? perfil?.escola_id : null)
      if(!selected && school){
        const result=await supabase.from('salas').select('id').eq('escola_id',school).order('nome').limit(1).maybeSingle()
        if(result.error)throw result.error
        if(!result.data){if(active)setData({salas:[],timesEscola:[],salaId:null,escolaId:school});return}
        selected=result.data.id
      }
      const result=await supabase.rpc('slark_live_ranking',{p_sala:selected})
      if(result.error)throw result.error
      if(active)setData(result.data)
    }
    void load().catch(error=>{if(active)setError(error.message)})
    return ()=>{active=false}
  },[perfil?.id,perfil?.escola_id,demoAtiva,sala,escola,refresh])
  useEffect(()=>{
    const reload=()=>setRefresh(value=>value+1)
    window.addEventListener('focus',reload)
    const timer=setInterval(reload,15000)
    return ()=>{window.removeEventListener('focus',reload);clearInterval(timer)}
  },[])
  const selected=sala || data?.salaId
  const rows=classificarTimes(data,selected,scope)
  const base=perfil?.perfil==='admin_slark'?'admin':perfil?.perfil
  return <section className="mt-8 rounded-3xl border bg-card p-5 sm:p-7">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">{standalone?'Classificação dos times':'Classificações'}</h2>{!standalone && <Link className="text-sm text-azul underline" to={`/${base}/${base==='admin'?'pontuacao':'ranking'}`}>Ver ranking completo</Link>}</div>
    <p className="mt-2 text-sm text-texto/60">Times classificados pelos próprios pontos. 1º: 20 pontos · 2º: 7 · 3º: 5 · do 4º em diante: 0 por partida concluída.</p>
    {perfil?.perfil==='admin_slark' && escolas.length>0 && <label className="mt-5 block text-sm">Escola de referência<select className="mt-2 w-full rounded-xl border bg-bg p-3" value={escola || data?.escolaId || ''} onChange={event=>{setEscola(event.target.value);setSala('');setData(null)}}><option value="" disabled>Selecione a escola</option>{escolas.map(row=><option value={row.id} key={row.id}>{row.nome}</option>)}</select></label>}
    <div className="mt-5 flex flex-wrap gap-2" aria-label="Abrangência do ranking">{[['turma','Sala'],['serie','Salas da mesma série'],['escola','Escola']].map(([key,label])=><button key={key} type="button" aria-pressed={scope===key} onClick={()=>setScope(key)} className={`rounded-full border px-4 py-2 text-sm ${scope===key?'bg-azul text-white':''}`}>{label}</button>)}</div>
    {!!data?.salas.length && <label className="mt-5 block text-sm">Sala<select aria-label="Selecionar sala" className="mt-2 w-full rounded-xl border bg-bg p-3" value={selected || ''} onChange={event=>setSala(event.target.value)}>{data.salas.map(row=><option key={row.id} value={row.id}>{row.nome} · {row.serie}</option>)}</select></label>}
    <p className="mt-3 text-xs text-texto/50">{scope==='turma'?'Times da sala selecionada.':scope==='serie'?'Times de todas as salas da mesma série e etapa.':'Times de toda a escola.'} Empates compartilham a posição.</p>
    {error?<p role="alert" className="mt-4 text-red-400">{error}</p>:!data?<p className="mt-4">Carregando classificação…</p>:<ol className="mt-4 space-y-2">{rows.map(row=><li className="flex items-center gap-3 rounded-xl border p-4" key={row.id}><strong className="w-9 text-azul">{row.position}º</strong><span className="min-w-0 flex-1"><span className="block font-semibold">{row.nome}</span>{scope!=='turma' && <small className="text-texto/60">{row.salaNome}</small>}</span><strong className="shrink-0">{row.pontos} <small>pts</small></strong></li>)}{!rows.length && <li className="py-5 text-texto/60">Nenhum time cadastrado neste recorte.</li>}</ol>}
  </section>
}
