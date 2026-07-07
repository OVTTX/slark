import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Building2, Plus, X, Loader2, Users, Pencil, Power, MapPin,
} from 'lucide-react'

const ESTADOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
  'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]

const STATUS_ASSINATURA = [
  { valor: 'trial', rotulo: 'Trial', cor: '#F5C451' },
  { valor: 'ativa', rotulo: 'Ativa', cor: '#3FD08A' },
  { valor: 'inadimplente', rotulo: 'Inadimplente', cor: '#FF6B6B' },
  { valor: 'cancelada', rotulo: 'Cancelada', cor: '#8892B0' },
]

function badgeStatus(status) {
  const s = STATUS_ASSINATURA.find((x) => x.valor === status) || STATUS_ASSINATURA[0]
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: `${s.cor}22`, color: s.cor }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.cor }} />
      {s.rotulo}
    </span>
  )
}

const FORM_VAZIO = {
  nome: '', cidade: '', estado: 'SP',
  responsavel_nome: '', responsavel_email: '', responsavel_telefone: '',
  status: 'trial', preco_por_aluno: '18.00', qtd_alunos_contratada: '0',
}

export default function AdminEscolas() {
  const [escolas, setEscolas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [editandoId, setEditandoId] = useState(null) // null = criando nova
  const [form, setForm] = useState(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    setCarregando(true)
    setErro('')
    try {
      const [{ data: escolasData, error: e1 }, { data: assinaturasData, error: e2 }, { data: alunosData, error: e3 }] =
        await Promise.all([
          supabase.from('escolas').select('*').order('criada_em', { ascending: false }),
          supabase.from('assinaturas').select('*').order('criada_em', { ascending: false }),
          supabase.from('alunos').select('escola_id'),
        ])
      if (e1) throw e1
      if (e2) throw e2
      if (e3) throw e3

      const contagemAlunos = {}
      for (const a of alunosData || []) {
        contagemAlunos[a.escola_id] = (contagemAlunos[a.escola_id] || 0) + 1
      }

      const lista = (escolasData || []).map((esc) => {
        const assinatura = (assinaturasData || []).find((a) => a.escola_id === esc.id) || null
        return { ...esc, assinatura, qtdAlunos: contagemAlunos[esc.id] || 0 }
      })
      setEscolas(lista)
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar as escolas. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  function abrirNova() {
    setEditandoId(null)
    setForm(FORM_VAZIO)
    setModalAberto(true)
  }

  function abrirEdicao(escola) {
    setEditandoId(escola.id)
    setForm({
      nome: escola.nome || '',
      cidade: escola.cidade || '',
      estado: escola.estado || 'SP',
      responsavel_nome: escola.responsavel_nome || '',
      responsavel_email: escola.responsavel_email || '',
      responsavel_telefone: escola.responsavel_telefone || '',
      status: escola.assinatura?.status || 'trial',
      preco_por_aluno: escola.assinatura?.preco_por_aluno ?? '18.00',
      qtd_alunos_contratada: escola.assinatura?.qtd_alunos_contratada ?? '0',
    })
    setModalAberto(true)
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      let escolaId = editandoId

      if (editandoId) {
        const { error } = await supabase.from('escolas').update({
          nome: form.nome,
          cidade: form.cidade,
          estado: form.estado,
          responsavel_nome: form.responsavel_nome,
          responsavel_email: form.responsavel_email,
          responsavel_telefone: form.responsavel_telefone,
        }).eq('id', editandoId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('escolas').insert({
          nome: form.nome,
          cidade: form.cidade,
          estado: form.estado,
          responsavel_nome: form.responsavel_nome,
          responsavel_email: form.responsavel_email,
          responsavel_telefone: form.responsavel_telefone,
        }).select().single()
        if (error) throw error
        escolaId = data.id
      }

      // assinatura: atualiza a existente (se a escola já tinha) ou cria uma nova
      const escolaAtual = escolas.find((x) => x.id === escolaId)
      if (escolaAtual?.assinatura) {
        const { error } = await supabase.from('assinaturas').update({
          status: form.status,
          preco_por_aluno: Number(form.preco_por_aluno),
          qtd_alunos_contratada: Number(form.qtd_alunos_contratada),
        }).eq('id', escolaAtual.assinatura.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('assinaturas').insert({
          escola_id: escolaId,
          status: form.status,
          preco_por_aluno: Number(form.preco_por_aluno),
          qtd_alunos_contratada: Number(form.qtd_alunos_contratada),
        })
        if (error) throw error
      }

      setModalAberto(false)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível salvar. Confira os campos e tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  async function alternarAtiva(escola) {
    try {
      const { error } = await supabase.from('escolas').update({ ativa: !escola.ativa }).eq('id', escola.id)
      if (error) throw error
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível alterar o status da escola.')
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Escolas</h1>
          <p className="mt-2 text-texto/60">Gerencie as escolas clientes.</p>
        </div>
        <button
          onClick={abrirNova}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/30"
        >
          <Plus size={18} /> Nova escola
        </button>
      </div>

      {erro && (
        <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>
      )}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando escolas…</div>
      ) : escolas.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <Building2 className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">
            Nenhuma escola cadastrada ainda. Clique em "Nova escola" para começar.
          </p>
        </div>
      ) : (
        <div className="mt-8 rounded-2xl bg-card border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-texto/50 border-b">
                <th className="px-6 py-4 font-medium">Escola</th>
                <th className="px-6 py-4 font-medium">Responsável</th>
                <th className="px-6 py-4 font-medium">Assinatura</th>
                <th className="px-6 py-4 font-medium">Alunos</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {escolas.map((esc) => (
                <tr key={esc.id} className="border-b last:border-0 hover:bg-white/[0.02] transition">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-white">{esc.nome}</div>
                    {(esc.cidade || esc.estado) && (
                      <div className="flex items-center gap-1 text-texto/50 text-xs mt-0.5">
                        <MapPin size={12} /> {[esc.cidade, esc.estado].filter(Boolean).join(' - ')}
                      </div>
                    )}
                    {!esc.ativa && (
                      <span className="inline-block mt-1 text-xs text-red-400">Inativa</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-texto/70">
                    <div>{esc.responsavel_nome || '—'}</div>
                    <div className="text-xs text-texto/45">{esc.responsavel_email}</div>
                  </td>
                  <td className="px-6 py-4">
                    {esc.assinatura ? badgeStatus(esc.assinatura.status) : (
                      <span className="text-texto/40 text-xs">sem assinatura</span>
                    )}
                    {esc.assinatura && (
                      <div className="text-xs text-texto/45 mt-1">
                        R$ {Number(esc.assinatura.preco_por_aluno).toLocaleString('pt-BR')} / aluno
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-texto/70">
                    <div className="flex items-center gap-1.5">
                      <Users size={14} className="text-texto/40" />
                      {esc.qtdAlunos}
                      {esc.assinatura?.qtd_alunos_contratada ? (
                        <span className="text-texto/40"> / {esc.assinatura.qtd_alunos_contratada}</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => abrirEdicao(esc)}
                        title="Editar"
                        className="p-2 rounded-lg text-texto/60 hover:text-white hover:bg-white/5 transition"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => alternarAtiva(esc)}
                        title={esc.ativa ? 'Desativar' : 'Ativar'}
                        className={`p-2 rounded-lg transition ${esc.ativa ? 'text-texto/60 hover:text-red-400 hover:bg-red-400/10' : 'text-texto/60 hover:text-[#3FD08A] hover:bg-[#3FD08A]/10'}`}
                      >
                        <Power size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setModalAberto(false)}>
          <div
            className="w-full max-w-lg rounded-2xl bg-bg-2 border p-7 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{editandoId ? 'Editar escola' : 'Nova escola'}</h2>
              <button onClick={() => setModalAberto(false)} className="text-texto/50 hover:text-white transition">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={salvar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Nome da escola</label>
                <input
                  required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-texto/70 mb-1.5">Cidade</label>
                  <input
                    value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-texto/70 mb-1.5">UF</label>
                  <select
                    value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                  >
                    {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-texto/70 mb-1.5">Responsável</label>
                  <input
                    value={form.responsavel_nome} onChange={(e) => setForm({ ...form, responsavel_nome: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-texto/70 mb-1.5">Telefone</label>
                  <input
                    value={form.responsavel_telefone} onChange={(e) => setForm({ ...form, responsavel_telefone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">E-mail do responsável</label>
                <input
                  type="email" value={form.responsavel_email} onChange={(e) => setForm({ ...form, responsavel_email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                />
              </div>

              <div className="pt-2 border-t">
                <div className="text-sm font-semibold text-white/90 mt-4 mb-3">Assinatura</div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-texto/70 mb-1.5">Status</label>
                    <select
                      value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                    >
                      {STATUS_ASSINATURA.map((s) => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-texto/70 mb-1.5">R$ / aluno</label>
                    <input
                      type="number" step="0.01" min="0" value={form.preco_por_aluno}
                      onChange={(e) => setForm({ ...form, preco_por_aluno: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-texto/70 mb-1.5">Alunos contratados</label>
                    <input
                      type="number" min="0" value={form.qtd_alunos_contratada}
                      onChange={(e) => setForm({ ...form, qtd_alunos_contratada: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit" disabled={salvando}
                className="w-full mt-2 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {salvando && <Loader2 size={18} className="animate-spin" />}
                {salvando ? 'Salvando…' : editandoId ? 'Salvar alterações' : 'Cadastrar escola'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
