import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { formatarMoeda, STATUS_COBRANCA, statusEfetivo } from '../../lib/financeiro'
import { Plus, X, Loader2, Check, AlertTriangle, School } from 'lucide-react'

// Componente genérico: usado tanto para "Mensalidades e Matrículas" (tipo=mensalidade)
// quanto para "Apostilas Runaway" (tipo=apostila_runaway). Muda só o rótulo e o texto.
export default function CobrancasAlunos({ tipo, titulo, descricaoVazio, descricaoGerar }) {
  const { perfil } = useAuth()
  const [cobrancas, setCobrancas] = useState([])
  const [alunos, setAlunos] = useState([])
  const [salas, setSalas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [modalGerar, setModalGerar] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [formGerar, setFormGerar] = useState({ alvo: 'todas', sala_id: 'todas', aluno_id: '', valor: '', vencimento: '', descricao: '' })

  async function carregar() {
    if (!perfil?.escola_id) return
    setCarregando(true)
    setErro('')
    try {
      const [{ data: cobData, error: e1 }, { data: alunosData, error: e2 }, { data: salasData, error: e3 }] = await Promise.all([
        supabase.from('cobrancas_alunos').select('*, alunos(nome, sala_id)').eq('escola_id', perfil.escola_id).eq('tipo', tipo).order('vencimento', { ascending: false }),
        supabase.from('alunos').select('id, nome, sala_id').eq('escola_id', perfil.escola_id),
        supabase.from('salas').select('id, nome').eq('escola_id', perfil.escola_id).order('nome'),
      ])
      if (e1) throw e1
      if (e2) throw e2
      if (e3) throw e3
      const salaPorId = Object.fromEntries((salasData || []).map((s) => [s.id, s]))
      setCobrancas((cobData || []).map((c) => ({ ...c, alunoNome: c.alunos?.nome || '—', salaNome: salaPorId[c.alunos?.sala_id]?.nome || '—' })))
      setAlunos(alunosData || [])
      setSalas(salasData || [])
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar as cobranças. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [perfil?.escola_id, tipo])

  const listaFiltrada = useMemo(() => {
    if (filtroStatus === 'todos') return cobrancas
    return cobrancas.filter((c) => statusEfetivo(c) === filtroStatus)
  }, [cobrancas, filtroStatus])

  const totais = useMemo(() => {
    const t = { pago: 0, pendente: 0, atrasado: 0 }
    for (const c of cobrancas) t[statusEfetivo(c)] += Number(c.valor)
    return t
  }, [cobrancas])

  function abrirGerar() {
    setFormGerar({ alvo: 'todas', sala_id: 'todas', aluno_id: alunos[0]?.id || '', valor: '', vencimento: '', descricao: '' })
    setModalGerar(true)
  }

  const alunosOrdenados = useMemo(() => {
    const salaPorId = Object.fromEntries(salas.map((s) => [s.id, s.nome]))
    return alunos
      .map((a) => ({ ...a, salaNome: salaPorId[a.sala_id] || 'Sem sala' }))
      .sort((a, b) => a.nome.localeCompare(b.nome))
  }, [alunos, salas])

  async function gerarCobrancas(e) {
    e.preventDefault()
    setGerando(true)
    setErro('')
    try {
      let alvoAlunos
      if (formGerar.alvo === 'aluno') {
        alvoAlunos = alunos.filter((a) => a.id === formGerar.aluno_id)
      } else if (formGerar.alvo === 'sala') {
        alvoAlunos = alunos.filter((a) => a.sala_id === formGerar.sala_id)
      } else {
        alvoAlunos = alunos
      }
      // Evita duplicar: pula quem já tem cobrança desse tipo com o mesmo vencimento.
      const jaTem = new Set(cobrancas.filter((c) => c.vencimento === formGerar.vencimento).map((c) => c.aluno_id))
      const novas = alvoAlunos.filter((a) => !jaTem.has(a.id)).map((a) => ({
        escola_id: perfil.escola_id,
        aluno_id: a.id,
        tipo,
        descricao: formGerar.descricao || null,
        valor: Number(formGerar.valor),
        vencimento: formGerar.vencimento,
        status: 'pendente',
      }))
      if (novas.length === 0) { setErro('Esse(s) aluno(s) já tem uma cobrança com esse vencimento.'); setGerando(false); return }
      const { error } = await supabase.from('cobrancas_alunos').insert(novas)
      if (error) throw error
      setModalGerar(false)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível gerar as cobranças.')
    } finally {
      setGerando(false)
    }
  }

  async function marcarComoPago(c) {
    try {
      const { error } = await supabase.from('cobrancas_alunos').update({ status: 'pago', pago_em: new Date().toISOString() }).eq('id', c.id)
      if (error) throw error
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível marcar como pago.')
    }
  }

  return (
    <div>
      <div className="mt-6 flex items-start justify-between gap-4 flex-wrap">
        <p className="text-sm text-texto/60 max-w-lg">{descricaoGerar}</p>
        <button onClick={abrirGerar} className="flex items-center gap-2 px-5 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/30 shrink-0">
          <Plus size={18} /> Gerar cobranças
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="rounded-2xl bg-card border p-6">
          <div className="text-sm text-texto/60">Recebido</div>
          <div className="mt-1 text-2xl font-bold text-[#3FD08A]">{formatarMoeda(totais.pago)}</div>
        </div>
        <div className="rounded-2xl bg-card border p-6">
          <div className="text-sm text-texto/60">Pendente</div>
          <div className="mt-1 text-2xl font-bold text-[#F5C451]">{formatarMoeda(totais.pendente)}</div>
        </div>
        <div className="rounded-2xl bg-card border p-6">
          <div className="text-sm text-texto/60">Atrasado</div>
          <div className="mt-1 text-2xl font-bold text-[#FF6B6B]">{formatarMoeda(totais.atrasado)}</div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition">
          <option value="todos">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
          <option value="atrasado">Atrasado</option>
        </select>
      </div>

      {erro && <p className="mt-4 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando…</div>
      ) : listaFiltrada.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <AlertTriangle className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">{descricaoVazio}</p>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl bg-card border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-texto/50 border-b">
                <th className="px-6 py-4 font-medium">Aluno</th>
                <th className="px-6 py-4 font-medium">Sala</th>
                <th className="px-6 py-4 font-medium">Vencimento</th>
                <th className="px-6 py-4 font-medium">Valor</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map((c) => {
                const s = STATUS_COBRANCA[statusEfetivo(c)]
                return (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-white/[0.02] transition">
                    <td className="px-6 py-4 font-semibold text-white">{c.alunoNome}</td>
                    <td className="px-6 py-4 text-texto/70"><div className="flex items-center gap-1.5"><School size={13} className="text-texto/40" />{c.salaNome}</div></td>
                    <td className="px-6 py-4 text-texto/70">{new Date(c.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4 text-texto/70">{formatarMoeda(c.valor)}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: `${s.cor}22`, color: s.cor }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.cor }} />{s.rotulo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {c.status !== 'pago' && (
                        <button onClick={() => marcarComoPago(c)} className="flex items-center gap-1.5 ml-auto text-xs px-3 py-1.5 rounded-full bg-[#3FD08A]/15 text-[#3FD08A] hover:bg-[#3FD08A]/25 transition">
                          <Check size={13} /> Marcar pago
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalGerar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setModalGerar(false)}>
          <div className="w-full max-w-md rounded-2xl bg-bg-2 border p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Gerar cobranças — {titulo}</h2>
              <button onClick={() => setModalGerar(false)} className="text-texto/50 hover:text-white transition"><X size={20} /></button>
            </div>
            <form onSubmit={gerarCobrancas} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Para quem</label>
                <div className="flex rounded-xl bg-card border border-azul/15 p-1 mb-2">
                  <button type="button" onClick={() => setFormGerar({ ...formGerar, alvo: 'todas' })} className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${formGerar.alvo === 'todas' ? 'bg-azul text-white' : 'text-texto/60'}`}>Escola inteira</button>
                  <button type="button" onClick={() => setFormGerar({ ...formGerar, alvo: 'sala' })} className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${formGerar.alvo === 'sala' ? 'bg-azul text-white' : 'text-texto/60'}`}>Uma sala</button>
                  <button type="button" onClick={() => setFormGerar({ ...formGerar, alvo: 'aluno' })} className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${formGerar.alvo === 'aluno' ? 'bg-azul text-white' : 'text-texto/60'}`}>Um aluno</button>
                </div>

                {formGerar.alvo === 'sala' && (
                  <select value={formGerar.sala_id} onChange={(e) => setFormGerar({ ...formGerar, sala_id: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition">
                    {salas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                )}

                {formGerar.alvo === 'aluno' && (
                  <>
                    <select value={formGerar.aluno_id} onChange={(e) => setFormGerar({ ...formGerar, aluno_id: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition">
                      {alunosOrdenados.length === 0 && <option value="">Nenhum aluno cadastrado</option>}
                      {alunosOrdenados.map((a) => <option key={a.id} value={a.id}>{a.nome} — {a.salaNome}</option>)}
                    </select>
                    <p className="mt-1.5 text-xs text-texto/45">Útil pra casos de bolsa: gera a cobrança só desse aluno, com o valor que você definir abaixo, sem mexer na do resto da turma.</p>
                  </>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Descrição (opcional)</label>
                <input value={formGerar.descricao} onChange={(e) => setFormGerar({ ...formGerar, descricao: e.target.value })} placeholder={tipo === 'mensalidade' ? 'Ex: Mensalidade agosto/2026' : 'Ex: Apostila Runaway 2º semestre'} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-texto/70 mb-1.5">Valor (R$)</label>
                  <input required type="number" step="0.01" min="0" value={formGerar.valor} onChange={(e) => setFormGerar({ ...formGerar, valor: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-texto/70 mb-1.5">Vencimento</label>
                  <input required type="date" value={formGerar.vencimento} onChange={(e) => setFormGerar({ ...formGerar, vencimento: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition" />
                </div>
              </div>
              <button type="submit" disabled={gerando} className="w-full mt-2 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2">
                {gerando && <Loader2 size={18} className="animate-spin" />}
                {gerando ? 'Gerando…' : 'Gerar cobranças'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
