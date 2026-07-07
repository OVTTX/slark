import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  UserPlus, Plus, X, Loader2, Trash2, Phone, Mail, MapPin, Users, TrendingUp,
  Target, CheckCircle2, Send, Building2, Calendar, ChevronLeft, ChevronRight,
} from 'lucide-react'

const COLUNAS = [
  { valor: 'novo', rotulo: 'Novo', cor: '#8892B0' },
  { valor: 'contatado', rotulo: 'Contatado', cor: '#2E5BFF' },
  { valor: 'negociando', rotulo: 'Negociando', cor: '#F5C451' },
  { valor: 'convertido', rotulo: 'Convertido', cor: '#3FD08A' },
  { valor: 'perdido', rotulo: 'Perdido', cor: '#FF6B6B' },
]

const ORIGENS = ['Indicação', 'Instagram', 'Evento', 'Site', 'Outro']

function formatarMoeda(v) {
  if (v == null) return '—'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

export default function AdminLeads() {
  const { perfil } = useAuth()
  const [leads, setLeads] = useState([])
  const [responsaveis, setResponsaveis] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [modalNovo, setModalNovo] = useState(false)
  const [leadAberto, setLeadAberto] = useState(null)
  const [arrastando, setArrastando] = useState(null)
  const [colunaSobrevoada, setColunaSobrevoada] = useState(null)

  async function carregar() {
    setCarregando(true)
    setErro('')
    try {
      const [{ data: leadsData, error: eLeads }, { data: respData, error: eResp }] = await Promise.all([
        supabase.from('leads').select('*, usuarios!leads_responsavel_id_fkey(nome)').order('criado_em', { ascending: false }),
        supabase.from('usuarios').select('id, nome').eq('perfil', 'admin_slark').order('nome'),
      ])
      if (eLeads) throw eLeads
      if (eResp) throw eResp
      setLeads((leadsData || []).map((l) => ({ ...l, responsavelNome: l.usuarios?.nome || null })))
      setResponsaveis(respData || [])
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar os leads. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  async function moverPara(lead, novoStatus) {
    if (lead.status === novoStatus) return
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status: novoStatus } : l)))
    try {
      const { error } = await supabase.from('leads').update({ status: novoStatus, atualizado_em: new Date().toISOString() }).eq('id', lead.id)
      if (error) throw error
    } catch (e) {
      console.error(e)
      setErro('Não foi possível mover o lead.')
      await carregar()
    }
  }

  async function excluir(id) {
    try {
      const { error } = await supabase.from('leads').delete().eq('id', id)
      if (error) throw error
      setLeadAberto(null)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível excluir o lead.')
    }
  }

  const kpis = useMemo(() => {
    const total = leads.length
    const emNegociacao = leads.filter((l) => l.status === 'negociando' || l.status === 'contatado').length
    const convertidos = leads.filter((l) => l.status === 'convertido').length
    const potencial = leads
      .filter((l) => l.status !== 'perdido' && l.status !== 'convertido')
      .reduce((s, l) => s + (Number(l.valor_estimado) || 0), 0)
    return { total, emNegociacao, convertidos, potencial }
  }, [leads])

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <UserPlus className="text-azul" size={28} />
            <h1 className="text-4xl font-bold text-white tracking-tight">Gestão de Leads</h1>
          </div>
          <p className="mt-2 text-texto/60">Funil comercial de escolas em prospecção.</p>
        </div>
        <button
          onClick={() => setModalNovo(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/30"
        >
          <Plus size={18} /> Novo lead
        </button>
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="rounded-2xl bg-card border p-6">
          <div className="flex items-center gap-2 text-sm text-texto/60"><Users size={15} /> Total de leads</div>
          <div className="mt-1 text-3xl font-bold text-white">{kpis.total}</div>
        </div>
        <div className="rounded-2xl bg-card border p-6">
          <div className="flex items-center gap-2 text-sm text-texto/60"><Target size={15} /> Em negociação</div>
          <div className="mt-1 text-3xl font-bold text-white">{kpis.emNegociacao}</div>
        </div>
        <div className="rounded-2xl bg-card border p-6">
          <div className="flex items-center gap-2 text-sm text-texto/60"><CheckCircle2 size={15} /> Convertidos</div>
          <div className="mt-1 text-3xl font-bold text-[#3FD08A]">{kpis.convertidos}</div>
        </div>
        <div className="rounded-2xl bg-card border p-6">
          <div className="flex items-center gap-2 text-sm text-texto/60"><TrendingUp size={15} /> Potencial em aberto</div>
          <div className="mt-1 text-2xl font-bold text-white">{formatarMoeda(kpis.potencial)}</div>
        </div>
      </div>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando leads…</div>
      ) : (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {COLUNAS.map((col, colIndex) => {
            const itens = leads.filter((l) => l.status === col.valor)
            const sobrevoada = colunaSobrevoada === col.valor
            return (
              <div
                key={col.valor}
                onDragOver={(e) => { e.preventDefault(); setColunaSobrevoada(col.valor) }}
                onDragLeave={() => setColunaSobrevoada((c) => (c === col.valor ? null : c))}
                onDrop={(e) => {
                  e.preventDefault()
                  setColunaSobrevoada(null)
                  if (arrastando) moverPara(arrastando, col.valor)
                }}
                className={`rounded-2xl border p-3 min-h-[200px] transition ${sobrevoada ? 'bg-azul/10 border-azul/50' : 'bg-card/60'}`}
              >
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: col.cor }} />
                  <span className="text-sm font-semibold text-white">{col.rotulo}</span>
                  <span className="text-xs text-texto/45">{itens.length}</span>
                </div>

                <div className="mt-2 space-y-2">
                  {itens.map((l) => (
                    <div
                      key={l.id}
                      draggable
                      onDragStart={() => setArrastando(l)}
                      onDragEnd={() => setArrastando(null)}
                      onClick={() => setLeadAberto(l)}
                      className="rounded-xl bg-card border p-3.5 cursor-pointer transition hover:border-azul/40 active:cursor-grabbing"
                    >
                      <div className="text-sm font-semibold text-white/90 leading-snug">{l.nome_escola}</div>
                      {l.nome_contato && <div className="text-xs text-texto/50 mt-1">{l.nome_contato}</div>}
                      {(l.cidade || l.estado) && (
                        <div className="flex items-center gap-1 text-[11px] text-texto/40 mt-1.5">
                          <MapPin size={10} /> {[l.cidade, l.estado].filter(Boolean).join(' - ')}
                        </div>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs font-semibold text-white/80">{formatarMoeda(l.valor_estimado)}</span>
                        {l.responsavelNome && (
                          <span className="w-6 h-6 rounded-full bg-azul/30 flex items-center justify-center text-[10px] font-bold text-white shrink-0" title={l.responsavelNome}>
                            {l.responsavelNome[0]}
                          </span>
                        )}
                      </div>

                      {/* Setas para mover entre colunas — essenciais no celular, onde arrastar não funciona */}
                      <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => colIndex > 0 && moverPara(l, COLUNAS[colIndex - 1].valor)}
                          disabled={colIndex === 0}
                          className="p-1 rounded-lg text-texto/40 hover:text-white hover:bg-white/10 transition disabled:opacity-20 disabled:pointer-events-none"
                          title={colIndex > 0 ? `Mover para ${COLUNAS[colIndex - 1].rotulo}` : undefined}
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button
                          onClick={() => colIndex < COLUNAS.length - 1 && moverPara(l, COLUNAS[colIndex + 1].valor)}
                          disabled={colIndex === COLUNAS.length - 1}
                          className="p-1 rounded-lg text-texto/40 hover:text-white hover:bg-white/10 transition disabled:opacity-20 disabled:pointer-events-none"
                          title={colIndex < COLUNAS.length - 1 ? `Mover para ${COLUNAS[colIndex + 1].rotulo}` : undefined}
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {itens.length === 0 && <div className="text-center text-xs text-texto/35 py-6">Arraste leads aqui</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalNovo && (
        <ModalNovoLead
          responsaveis={responsaveis}
          criadoPor={perfil?.id}
          onFechar={() => setModalNovo(false)}
          onCriado={() => { setModalNovo(false); carregar() }}
        />
      )}

      {leadAberto && (
        <ModalLead
          lead={leadAberto}
          responsaveis={responsaveis}
          perfilId={perfil?.id}
          onFechar={() => setLeadAberto(null)}
          onAtualizado={carregar}
          onExcluir={() => excluir(leadAberto.id)}
        />
      )}
    </div>
  )
}

function ModalNovoLead({ responsaveis, criadoPor, onFechar, onCriado }) {
  const [form, setForm] = useState({
    nome_escola: '', nome_contato: '', email: '', telefone: '', cidade: '', estado: '',
    origem: 'Indicação', qtd_alunos_estimada: '', valor_estimado: '', responsavel_id: '', proximo_contato: '',
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function criar(e) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      const { error } = await supabase.from('leads').insert({
        nome_escola: form.nome_escola,
        nome_contato: form.nome_contato || null,
        email: form.email || null,
        telefone: form.telefone || null,
        cidade: form.cidade || null,
        estado: form.estado || null,
        origem: form.origem || null,
        qtd_alunos_estimada: form.qtd_alunos_estimada ? Number(form.qtd_alunos_estimada) : null,
        valor_estimado: form.valor_estimado ? Number(form.valor_estimado) : null,
        responsavel_id: form.responsavel_id || null,
        proximo_contato: form.proximo_contato || null,
        criado_por: criadoPor || null,
      })
      if (error) throw error
      onCriado()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível criar o lead.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onFechar}>
      <div className="w-full max-w-lg rounded-2xl bg-bg-2 border p-7 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Novo lead</h2>
          <button onClick={onFechar} className="text-texto/50 hover:text-white transition"><X size={20} /></button>
        </div>
        <form onSubmit={criar} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-texto/70 mb-1.5">Nome da escola</label>
            <input required value={form.nome_escola} onChange={(e) => setForm({ ...form, nome_escola: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-texto/70 mb-1.5">Contato</label>
              <input value={form.nome_contato} onChange={(e) => setForm({ ...form, nome_contato: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-texto/70 mb-1.5">Telefone</label>
              <input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-texto/70 mb-1.5">E-mail</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-texto/70 mb-1.5">Cidade</label>
              <input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-texto/70 mb-1.5">Estado</label>
              <input value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} placeholder="Ex: SP" maxLength={2} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition uppercase" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-texto/70 mb-1.5">Origem</label>
              <select value={form.origem} onChange={(e) => setForm({ ...form, origem: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition">
                {ORIGENS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-texto/70 mb-1.5">Responsável</label>
              <select value={form.responsavel_id} onChange={(e) => setForm({ ...form, responsavel_id: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition">
                <option value="">Ninguém</option>
                {responsaveis.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-texto/70 mb-1.5">Alunos estimados</label>
              <input type="number" min={0} value={form.qtd_alunos_estimada} onChange={(e) => setForm({ ...form, qtd_alunos_estimada: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-texto/70 mb-1.5">Valor estimado (R$)</label>
              <input type="number" min={0} value={form.valor_estimado} onChange={(e) => setForm({ ...form, valor_estimado: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-texto/70 mb-1.5">Próximo contato (opcional)</label>
            <input type="date" value={form.proximo_contato} onChange={(e) => setForm({ ...form, proximo_contato: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition" />
          </div>
          {erro && <p className="text-sm text-red-400 bg-red-400/10 px-4 py-2.5 rounded-xl">{erro}</p>}
          <button type="submit" disabled={salvando} className="w-full mt-2 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2">
            {salvando && <Loader2 size={18} className="animate-spin" />}
            {salvando ? 'Criando…' : 'Criar lead'}
          </button>
        </form>
      </div>
    </div>
  )
}

function ModalLead({ lead, responsaveis, perfilId, onFechar, onAtualizado, onExcluir }) {
  const [form, setForm] = useState({
    status: lead.status,
    responsavel_id: lead.responsavel_id || '',
    valor_estimado: lead.valor_estimado || '',
    proximo_contato: lead.proximo_contato || '',
    observacoes: lead.observacoes || '',
  })
  const [salvando, setSalvando] = useState(false)
  const [convertendo, setConvertendo] = useState(false)
  const [erro, setErro] = useState('')
  const [interacoes, setInteracoes] = useState([])
  const [novaInteracao, setNovaInteracao] = useState('')
  const [enviandoInteracao, setEnviandoInteracao] = useState(false)
  const [carregandoInteracoes, setCarregandoInteracoes] = useState(true)

  async function carregarInteracoes() {
    setCarregandoInteracoes(true)
    try {
      const { data, error } = await supabase.from('leads_interacoes').select('*').eq('lead_id', lead.id).order('criado_em', { ascending: false })
      if (error) throw error
      setInteracoes(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setCarregandoInteracoes(false)
    }
  }

  useEffect(() => { carregarInteracoes() }, [lead.id])

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      const { error } = await supabase.from('leads').update({
        status: form.status,
        responsavel_id: form.responsavel_id || null,
        valor_estimado: form.valor_estimado ? Number(form.valor_estimado) : null,
        proximo_contato: form.proximo_contato || null,
        observacoes: form.observacoes || null,
        atualizado_em: new Date().toISOString(),
      }).eq('id', lead.id)
      if (error) throw error
      await onAtualizado()
      onFechar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível salvar as alterações.')
    } finally {
      setSalvando(false)
    }
  }

  async function adicionarInteracao(e) {
    e.preventDefault()
    if (!novaInteracao.trim()) return
    setEnviandoInteracao(true)
    try {
      const { error } = await supabase.from('leads_interacoes').insert({ lead_id: lead.id, texto: novaInteracao.trim(), criado_por: perfilId || null })
      if (error) throw error
      setNovaInteracao('')
      await carregarInteracoes()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível registrar a interação.')
    } finally {
      setEnviandoInteracao(false)
    }
  }

  async function converterEmEscola() {
    setConvertendo(true)
    setErro('')
    try {
      const { error: eEscola } = await supabase.from('escolas').insert({
        nome: lead.nome_escola,
        cidade: lead.cidade || null,
        estado: lead.estado || null,
        responsavel_nome: lead.nome_contato || null,
        responsavel_email: lead.email || null,
        responsavel_telefone: lead.telefone || null,
      })
      if (eEscola) throw eEscola

      const { error: eLead } = await supabase.from('leads').update({ status: 'convertido', atualizado_em: new Date().toISOString() }).eq('id', lead.id)
      if (eLead) throw eLead

      await onAtualizado()
      onFechar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível converter o lead em escola.')
    } finally {
      setConvertendo(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onFechar}>
      <div className="w-full max-w-2xl rounded-2xl bg-bg-2 border p-7 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="text-xl font-bold text-white">{lead.nome_escola}</h2>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-texto/50">
              {lead.nome_contato && <span>{lead.nome_contato}</span>}
              {lead.email && <span className="flex items-center gap-1"><Mail size={11} /> {lead.email}</span>}
              {lead.telefone && <span className="flex items-center gap-1"><Phone size={11} /> {lead.telefone}</span>}
              {(lead.cidade || lead.estado) && <span className="flex items-center gap-1"><MapPin size={11} /> {[lead.cidade, lead.estado].filter(Boolean).join(' - ')}</span>}
            </div>
          </div>
          <button onClick={onFechar} className="text-texto/50 hover:text-white transition shrink-0"><X size={20} /></button>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={salvar} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition">
                  {COLUNAS.map((c) => <option key={c.valor} value={c.valor}>{c.rotulo}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Responsável</label>
                <select value={form.responsavel_id} onChange={(e) => setForm({ ...form, responsavel_id: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition">
                  <option value="">Ninguém</option>
                  {responsaveis.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Valor estimado (R$)</label>
                <input type="number" min={0} value={form.valor_estimado} onChange={(e) => setForm({ ...form, valor_estimado: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Próximo contato</label>
                <input type="date" value={form.proximo_contato} onChange={(e) => setForm({ ...form, proximo_contato: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-texto/70 mb-1.5">Observações</label>
              <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={4} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition resize-none" />
            </div>

            {erro && <p className="text-sm text-red-400 bg-red-400/10 px-4 py-2.5 rounded-xl">{erro}</p>}

            <button type="submit" disabled={salvando} className="w-full py-2.5 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2">
              {salvando && <Loader2 size={16} className="animate-spin" />}
              {salvando ? 'Salvando…' : 'Salvar alterações'}
            </button>

            <div className="flex items-center gap-2 pt-2">
              {lead.status !== 'convertido' && (
                <button type="button" onClick={converterEmEscola} disabled={convertendo} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full bg-[#3FD08A]/15 text-[#3FD08A] font-semibold text-sm hover:bg-[#3FD08A]/25 transition disabled:opacity-60">
                  {convertendo ? <Loader2 size={14} className="animate-spin" /> : <Building2 size={14} />}
                  {convertendo ? 'Convertendo…' : 'Converter em escola'}
                </button>
              )}
              <button type="button" onClick={onExcluir} className="p-2.5 rounded-full text-texto/40 hover:text-red-400 hover:bg-red-400/10 transition">
                <Trash2 size={16} />
              </button>
            </div>
          </form>

          <div>
            <div className="text-sm font-semibold text-texto/50 uppercase tracking-wide mb-3">Histórico de interações</div>
            <form onSubmit={adicionarInteracao} className="flex gap-2 mb-4">
              <input
                value={novaInteracao} onChange={(e) => setNovaInteracao(e.target.value)}
                placeholder="Registrar contato…"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-card border border-azul/15 text-white text-sm placeholder:text-texto/30 focus:outline-none focus:border-azul transition"
              />
              <button type="submit" disabled={enviandoInteracao} className="px-4 rounded-xl bg-azul hover:bg-azul-puro text-white transition disabled:opacity-60 flex items-center">
                {enviandoInteracao ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </form>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {carregandoInteracoes ? (
                <p className="text-sm text-texto/45">Carregando…</p>
              ) : interacoes.length === 0 ? (
                <p className="text-sm text-texto/45">Nenhuma interação registrada ainda.</p>
              ) : (
                interacoes.map((i) => (
                  <div key={i.id} className="rounded-xl bg-white/[0.03] p-3.5">
                    <p className="text-sm text-white/85 leading-relaxed">{i.texto}</p>
                    <div className="flex items-center gap-1 mt-1.5 text-[11px] text-texto/40">
                      <Calendar size={10} /> {new Date(i.criado_em).toLocaleString('pt-BR')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
