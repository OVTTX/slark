import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Calendar, Plus, X, Loader2, Trash2 } from 'lucide-react'

const TIPOS = [
  { valor: 'prova', rotulo: 'Prova', cor: '#FF6B6B' },
  { valor: 'reuniao', rotulo: 'Reunião', cor: '#2E5BFF' },
  { valor: 'feriado', rotulo: 'Feriado', cor: '#3FD08A' },
  { valor: 'evento', rotulo: 'Evento', cor: '#C44DFF' },
]

function corTipo(tipo) {
  return TIPOS.find((t) => t.valor === tipo)?.cor || '#8892B0'
}

const FORM_VAZIO = { titulo: '', descricao: '', tipo: 'evento', inicio: '', fim: '' }

export default function DiretorCalendario() {
  const { perfil } = useAuth()
  const [eventos, setEventos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    if (!perfil?.escola_id) return
    setCarregando(true)
    setErro('')
    try {
      const { data, error } = await supabase.from('eventos').select('*').eq('escola_id', perfil.escola_id).order('inicio')
      if (error) throw error
      setEventos(data || [])
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar o calendário. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [perfil?.escola_id])

  async function criar(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      const { error } = await supabase.from('eventos').insert({
        escola_id: perfil.escola_id,
        titulo: form.titulo,
        descricao: form.descricao,
        tipo: form.tipo,
        inicio: new Date(form.inicio).toISOString(),
        fim: form.fim ? new Date(form.fim).toISOString() : null,
      })
      if (error) throw error
      setModalAberto(false)
      setForm(FORM_VAZIO)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível criar o evento.')
    } finally {
      setSalvando(false)
    }
  }

  async function remover(id) {
    try {
      const { error } = await supabase.from('eventos').delete().eq('id', id)
      if (error) throw error
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível remover o evento.')
    }
  }

  const agrupados = eventos.reduce((acc, ev) => {
    const chave = new Date(ev.inicio).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    acc[chave] = [...(acc[chave] || []), ev]
    return acc
  }, {})

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Calendário</h1>
          <p className="mt-2 text-texto/60">Provas, reuniões, feriados e eventos da escola.</p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/30"
        >
          <Plus size={18} /> Novo evento
        </button>
      </div>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando calendário…</div>
      ) : eventos.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <Calendar className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Nenhum evento cadastrado ainda.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {Object.entries(agrupados).map(([mes, lista]) => (
            <div key={mes}>
              <div className="text-sm font-semibold text-texto/50 uppercase tracking-wide mb-3">{mes}</div>
              <div className="space-y-2">
                {lista.map((ev) => (
                  <div key={ev.id} className="rounded-xl bg-card border p-4 flex items-center gap-4">
                    <div className="w-2 h-10 rounded-full shrink-0" style={{ background: corTipo(ev.tipo) }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white">{ev.titulo}</div>
                      {ev.descricao && <div className="text-xs text-texto/50 truncate">{ev.descricao}</div>}
                    </div>
                    <div className="text-right shrink-0 text-sm text-texto/60">
                      {new Date(ev.inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </div>
                    <button onClick={() => remover(ev.id)} className="p-2 rounded-lg text-texto/40 hover:text-red-400 hover:bg-red-400/10 transition">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setModalAberto(false)}>
          <div className="w-full max-w-md rounded-2xl bg-bg-2 border p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Novo evento</h2>
              <button onClick={() => setModalAberto(false)} className="text-texto/50 hover:text-white transition"><X size={20} /></button>
            </div>
            <form onSubmit={criar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Título</label>
                <input
                  required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Tipo</label>
                <select
                  value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                >
                  {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-texto/70 mb-1.5">Início</label>
                  <input
                    required type="datetime-local" value={form.inicio}
                    onChange={(e) => setForm({ ...form, inicio: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-texto/70 mb-1.5">Fim (opcional)</label>
                  <input
                    type="datetime-local" value={form.fim}
                    onChange={(e) => setForm({ ...form, fim: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Descrição (opcional)</label>
                <textarea
                  value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition resize-none"
                />
              </div>
              <button
                type="submit" disabled={salvando}
                className="w-full mt-2 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {salvando && <Loader2 size={18} className="animate-spin" />}
                {salvando ? 'Criando…' : 'Criar evento'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
