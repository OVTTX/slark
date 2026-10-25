import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function LiveRanking() {
  const { perfil } = useAuth()
  const [data, setData] = useState(null)
  const [sala, setSala] = useState('')
  const [scope, setScope] = useState('turma')
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    let active = true
    setError('')
    supabase.rpc('slark_live_ranking', { p_sala:sala || null }).then(({data, error}) => {
      if (!active) return
      if (error) { setError(error.message); return }
      setData(data)
    }).catch(error => { if (active) setError(error.message) })
    return () => { active = false }
  }, [perfil?.id, sala, refresh])
  useEffect(() => {
    const reload = () => setRefresh(value => value + 1)
    window.addEventListener('focus', reload)
    const timer = setInterval(reload, 15000)
    return () => { window.removeEventListener('focus', reload); clearInterval(timer) }
  }, [])
  const current = data?.salas.find(row => row.id === (sala || data.salaId))
  const rows = scope === 'turma' ? data?.times || [] : (data?.salas || []).filter(row => scope !== 'serie' || (row.serie === current?.serie && row.etapa === current?.etapa))
  const ordered = [...(rows || [])].sort((a,b) => b.pontos-a.pontos || a.nome.localeCompare(b.nome))
  const base = perfil?.perfil === 'admin_slark' ? 'admin' : perfil?.perfil
  let position = 1
  return <section className="mt-8 rounded-3xl border bg-card p-5 sm:p-7">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Classificações</h2><Link className="text-sm text-azul underline" to={`/${base}/${base === 'admin' ? 'pontuacao' : 'ranking'}`}>Ver pontuação do App</Link></div>
    <p className="mt-2 text-sm text-texto/60">1º: 20 pontos · 2º: 7 pontos · 3º: 5 pontos · do 4º em diante: 0. Somados aos alunos e ao quarteto ao concluir a partida.</p>
    {!!data?.salas.length && <label className="mt-5 block text-sm">Turma de referência<select className="mt-2 w-full rounded-xl border bg-bg p-3" value={sala || data.salaId || ''} onChange={event => setSala(event.target.value)}>{data.salas.map(row => <option key={row.id} value={row.id}>{row.nome} · {row.serie}</option>)}</select></label>}
    <div className="mt-5 flex flex-wrap gap-2" aria-label="Abrangência do ranking">{[['turma','Minha turma'],['serie','Mesma série'],['escola','Toda a escola']].map(([key,label]) => <button key={key} type="button" aria-pressed={scope === key} onClick={() => setScope(key)} className={`rounded-full border px-4 py-2 text-sm ${scope === key ? 'bg-azul text-white' : ''}`}>{label}</button>)}</div>
    <p className="mt-3 text-xs text-texto/50">{scope === 'turma' ? 'Quartetos da turma selecionada.' : 'Soma dos pontos dos quartetos de cada turma.'} Empates compartilham a posição.</p>
    {error ? <p role="alert" className="mt-4 text-red-400">{error}</p> : !data ? <p className="mt-4">Carregando classificação…</p> : <ol className="mt-4 space-y-2">{ordered.map((row,index) => {
      if (index && ordered[index-1].pontos !== row.pontos) position = index+1
      return <li className="flex items-center gap-3 rounded-xl border p-4" key={row.id}><strong className="w-9 text-azul">{position}º</strong><span className="flex-1">{row.nome}</span><strong>{row.pontos} <small>pts</small></strong></li>
    })}{!ordered.length && <li className="py-5 text-texto/60">Nenhum quarteto cadastrado para esta turma.</li>}</ol>}
  </section>
}
