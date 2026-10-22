import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Check, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { NOME_DIA_SEMANA } from '../../lib/gerarGrade'

export default function ProfessorNotificacoes() {
  const { perfil } = useAuth()
  const [pedidos, setPedidos] = useState([])
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [ocupado, setOcupado] = useState(null)
  const [aviso, setAviso] = useState('')
  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('solicitacoes_grade')
      .select('*, materias(nome), salas(nome)').eq('professor_id', perfil.id)
      .order('criada_em', { ascending: false }).limit(100)
    if (error) setErro('Não foi possível carregar suas notificações. Tente novamente.')
    else { setPedidos(data || []); setErro('') }
    setCarregando(false)
  }, [perfil.id])
  useEffect(() => {
    void carregar()
    const atualizar = () => { void carregar() }
    const timer = setInterval(atualizar, 30000)
    window.addEventListener('focus', atualizar)
    return () => { clearInterval(timer); window.removeEventListener('focus', atualizar) }
  }, [carregar])
  async function responder(id, resposta) {
    setOcupado(id); setErro(''); setAviso('')
    try {
      const { error } = await supabase.rpc('responder_aula_slark', { p_id: id, p_resposta: resposta })
      if (error) throw error
      setAviso(resposta === 'aceitar' ? 'Horário aceito e atualizado na sua grade.' : 'Pedido recusado. Seu horário anterior foi mantido.')
      await carregar()
      window.dispatchEvent(new Event('slark-notificacoes-atualizadas'))
    } catch (e) { setErro(e.message || 'Não foi possível responder ao pedido.') }
    finally { setOcupado(null) }
  }
  return <div>
    <h1 className="flex items-center gap-3 text-3xl font-bold text-white"><Bell className="text-azul"/>Notificações</h1>
    <p className="mt-3 text-sm text-texto/60">A direção pode propor aulas fora da sua disponibilidade. Você escolhe aceitar ou recusar. A grade só muda com seu aceite.</p>
    <Link to="/professor/grade" className="inline-block mt-4 text-sm text-azul underline">Ver minha grade</Link>
    {erro && <div role="alert" className="mt-5 rounded-xl border p-4 text-sm text-red-400">{erro}<button className="ml-3 underline" onClick={carregar}>Atualizar</button></div>}
    {aviso && <p role="status" className="mt-4 text-sm text-texto">{aviso}</p>}
    {carregando ? <p className="mt-6">Buscando notificações…</p> : !pedidos.length ? <p className="mt-8 text-texto/60">Nenhuma solicitação de horário por enquanto.</p> : <div className="mt-6 space-y-4">
      {pedidos.map((r) => <article key={r.id} className="rounded-2xl bg-card border p-5">
        <div className="flex flex-wrap justify-between gap-3"><h2 className="font-semibold text-white">{r.materias?.nome} · {r.salas?.nome}</h2><span className="text-xs text-texto/70">{r.status === 'pendente' ? 'Aguardando sua resposta' : r.status}</span></div>
        <p className="mt-3 text-sm">Proposta: {NOME_DIA_SEMANA[r.dia_semana]}, {r.periodo}º período.</p>
        {r.grade_id ? <p className="mt-2 text-xs text-texto/60">Horário anterior: {NOME_DIA_SEMANA[r.origem_dia]}, {r.origem_periodo}º período.</p> : <p className="mt-2 text-xs text-texto/60">Nova aula para esta turma.</p>}
        <p className="mt-2 text-xs text-texto/50">{new Date(r.criada_em).toLocaleString('pt-BR')}</p>
        {r.status === 'pendente' && <div className="mt-4 flex flex-wrap gap-3">
          <button disabled={Boolean(ocupado)} onClick={() => responder(r.id, 'aceitar')} className="flex items-center gap-2 rounded-full bg-azul px-5 py-2.5 text-sm text-white disabled:opacity-50"><Check size={16}/>Aceitar horário</button>
          <button disabled={Boolean(ocupado)} onClick={() => responder(r.id, 'recusar')} className="flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm disabled:opacity-50"><X size={16}/>Recusar</button>
        </div>}
      </article>)}
    </div>}
  </div>
}
