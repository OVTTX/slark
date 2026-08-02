import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { mesAtual, limitesDoMes, formatarMes, formatarMoeda } from '../../lib/financeiro'
import ImportarPontoModal from './ImportarPontoModal'
import { Wallet, Plus, X, Loader2, Pencil, Trash2, GraduationCap, Briefcase } from 'lucide-react'

const FUNC_VAZIO = { nome: '', cargo: '', tipo_remuneracao: 'fixo', valor_fixo: '0', valor_hora: '0' }

export default function FolhaPagamento() {
  const { perfil } = useAuth()
  const [mes, setMes] = useState(mesAtual())
  const [professores, setProfessores] = useState([])
  const [remuneracoes, setRemuneracoes] = useState({}) // professor_id -> {modo, valor}
  const [funcionarios, setFuncionarios] = useState([])
  const [presencas, setPresencas] = useState([])
  const [ponto, setPonto] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [modalFunc, setModalFunc] = useState(false)
  const [editandoFunc, setEditandoFunc] = useState(null)
  const [formFunc, setFormFunc] = useState(FUNC_VAZIO)
  const [salvandoFunc, setSalvandoFunc] = useState(false)
  const [editandoRemProf, setEditandoRemProf] = useState(null)
  const [formRem, setFormRem] = useState({ modo: 'por_aula', valor: '0' })

  async function carregar() {
    if (!perfil?.escola_id) return
    setCarregando(true)
    setErro('')
    try {
      const { inicio, fim } = limitesDoMes(mes)
      const [
        { data: profData, error: e1 },
        { data: remData, error: e2 },
        { data: funcData, error: e3 },
        { data: salasData, error: e4 },
        { data: pontoData, error: e5 },
      ] = await Promise.all([
        supabase.from('usuarios').select('id, nome, email').eq('escola_id', perfil.escola_id).eq('perfil', 'professor').order('nome'),
        supabase.from('professor_remuneracao').select('*').eq('escola_id', perfil.escola_id),
        supabase.from('funcionarios').select('*').eq('escola_id', perfil.escola_id).order('nome'),
        supabase.from('salas').select('id').eq('escola_id', perfil.escola_id),
        supabase.from('registros_ponto').select('*').eq('escola_id', perfil.escola_id).gte('data', inicio).lte('data', fim),
      ])
      if (e1) throw e1
      if (e2) throw e2
      if (e3) throw e3
      if (e4) throw e4
      if (e5) throw e5

      const salaIds = (salasData || []).map((s) => s.id)
      let presencasData = []
      if (salaIds.length > 0) {
        const { data, error } = await supabase.from('presencas').select('professor_id, sala_id, data').in('sala_id', salaIds).gte('data', inicio).lte('data', fim)
        if (error) throw error
        presencasData = data || []
      }

      setProfessores(profData || [])
      setRemuneracoes(Object.fromEntries((remData || []).map((r) => [r.professor_id, r])))
      setFuncionarios(funcData || [])
      setPresencas(presencasData)
      setPonto(pontoData || [])
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar a folha de pagamento. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [perfil?.escola_id, mes])

  // Aulas ministradas no mês = dias distintos de chamada por sala em que o professor lançou presença.
  const aulasPorProfessor = useMemo(() => {
    const mapa = {}
    for (const p of presencas) {
      if (!p.professor_id) continue
      if (!mapa[p.professor_id]) mapa[p.professor_id] = new Set()
      mapa[p.professor_id].add(`${p.sala_id}_${p.data}`)
    }
    return Object.fromEntries(Object.entries(mapa).map(([id, set]) => [id, set.size]))
  }, [presencas])

  const horasPorProfessor = useMemo(() => {
    const mapa = {}
    for (const r of ponto) {
      if (!r.professor_id) continue
      mapa[r.professor_id] = (mapa[r.professor_id] || 0) + Number(r.horas)
    }
    return mapa
  }, [ponto])

  const horasPorFuncionario = useMemo(() => {
    const mapa = {}
    for (const r of ponto) {
      if (!r.funcionario_id) continue
      mapa[r.funcionario_id] = (mapa[r.funcionario_id] || 0) + Number(r.horas)
    }
    return mapa
  }, [ponto])

  const linhasProfessores = professores.map((p) => {
    const rem = remuneracoes[p.id]
    const aulas = aulasPorProfessor[p.id] || 0
    const horas = horasPorProfessor[p.id] || 0
    const total = !rem ? null : rem.modo === 'por_aula' ? aulas * Number(rem.valor) : horas * Number(rem.valor)
    return { ...p, rem, aulas, horas, total }
  })

  const linhasFuncionarios = funcionarios.map((f) => {
    const horas = horasPorFuncionario[f.id] || 0
    const total = f.tipo_remuneracao === 'fixo' ? Number(f.valor_fixo) : horas * Number(f.valor_hora)
    return { ...f, horas, total }
  })

  const totalFolha = [...linhasProfessores.map((l) => l.total || 0), ...linhasFuncionarios.map((l) => l.total || 0)].reduce((s, v) => s + v, 0)

  function abrirRemuneracao(p) {
    setEditandoRemProf(p.id)
    setFormRem({ modo: p.rem?.modo || 'por_aula', valor: String(p.rem?.valor ?? '0') })
  }

  async function salvarRemuneracao(professorId) {
    try {
      const { error } = await supabase.from('professor_remuneracao').upsert({
        professor_id: professorId,
        escola_id: perfil.escola_id,
        modo: formRem.modo,
        valor: Number(formRem.valor),
      }, { onConflict: 'professor_id' })
      if (error) throw error
      setEditandoRemProf(null)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível salvar a remuneração desse professor.')
    }
  }

  function abrirNovoFunc() { setEditandoFunc(null); setFormFunc(FUNC_VAZIO); setModalFunc(true) }
  function abrirEdicaoFunc(f) {
    setEditandoFunc(f.id)
    setFormFunc({ nome: f.nome, cargo: f.cargo || '', tipo_remuneracao: f.tipo_remuneracao, valor_fixo: String(f.valor_fixo ?? '0'), valor_hora: String(f.valor_hora ?? '0') })
    setModalFunc(true)
  }

  async function salvarFuncionario(e) {
    e.preventDefault()
    setSalvandoFunc(true)
    try {
      const payload = {
        nome: formFunc.nome.trim(),
        cargo: formFunc.cargo.trim() || null,
        tipo_remuneracao: formFunc.tipo_remuneracao,
        valor_fixo: Number(formFunc.valor_fixo || 0),
        valor_hora: Number(formFunc.valor_hora || 0),
      }
      if (editandoFunc) {
        const { error } = await supabase.from('funcionarios').update(payload).eq('id', editandoFunc)
        if (error) throw error
      } else {
        const { error } = await supabase.from('funcionarios').insert({ ...payload, escola_id: perfil.escola_id })
        if (error) throw error
      }
      setModalFunc(false)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível salvar o funcionário.')
    } finally {
      setSalvandoFunc(false)
    }
  }

  async function excluirFuncionario(id) {
    try {
      const { error } = await supabase.from('funcionarios').delete().eq('id', id)
      if (error) throw error
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível excluir o funcionário.')
    }
  }

  return (
    <div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition" />
          <span className="text-sm text-texto/60 capitalize">{formatarMes(mes)}</span>
        </div>
        <ImportarPontoModal professores={professores} funcionarios={funcionarios} onImportado={carregar} />
      </div>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando folha…</div>
      ) : (
        <>
          <div className="mt-6 rounded-2xl bg-card border p-6">
            <div className="flex items-center gap-2 text-sm text-texto/60"><Wallet size={15} /> Total da folha em {formatarMes(mes)}</div>
            <div className="mt-1 text-3xl font-bold text-white">{formatarMoeda(totalFolha)}</div>
          </div>

          <div className="mt-8 flex items-center gap-2 text-white font-bold"><GraduationCap size={18} /> Professores</div>
          {professores.length === 0 ? (
            <p className="mt-3 text-sm text-texto/50">Nenhum professor cadastrado.</p>
          ) : (
            <div className="mt-3 rounded-2xl bg-card border overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-texto/50 border-b">
                    <th className="px-6 py-4 font-medium">Professor</th>
                    <th className="px-6 py-4 font-medium">Remuneração</th>
                    <th className="px-6 py-4 font-medium">Aulas no mês</th>
                    <th className="px-6 py-4 font-medium">Horas no mês</th>
                    <th className="px-6 py-4 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {linhasProfessores.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-white/[0.02] transition">
                      <td className="px-6 py-4 font-semibold text-white">{p.nome}</td>
                      <td className="px-6 py-4">
                        {editandoRemProf === p.id ? (
                          <div className="flex items-center gap-2">
                            <select value={formRem.modo} onChange={(e) => setFormRem({ ...formRem, modo: e.target.value })} className="px-2 py-1.5 rounded-lg bg-white/[0.03] border border-azul/15 text-white text-xs">
                              <option value="por_aula">Por aula</option>
                              <option value="por_hora">Por hora</option>
                            </select>
                            <input type="number" step="0.01" min="0" value={formRem.valor} onChange={(e) => setFormRem({ ...formRem, valor: e.target.value })} className="w-24 px-2 py-1.5 rounded-lg bg-white/[0.03] border border-azul/15 text-white text-xs" />
                            <button onClick={() => salvarRemuneracao(p.id)} className="text-xs text-azul hover:text-white transition">Salvar</button>
                          </div>
                        ) : p.rem ? (
                          <button onClick={() => abrirRemuneracao(p)} className="text-texto/70 hover:text-white transition text-left">
                            {formatarMoeda(p.rem.valor)} {p.rem.modo === 'por_aula' ? '/ aula' : '/ hora'}
                          </button>
                        ) : (
                          <button onClick={() => abrirRemuneracao(p)} className="text-azul hover:text-white transition text-xs">Definir valor</button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-texto/70">{p.aulas}</td>
                      <td className="px-6 py-4 text-texto/70">{p.horas || '—'}</td>
                      <td className="px-6 py-4 text-right font-bold text-white">{p.total != null ? formatarMoeda(p.total) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-white font-bold"><Briefcase size={18} /> Funcionários</div>
            <button onClick={abrirNovoFunc} className="flex items-center gap-2 px-4 py-2 rounded-full bg-azul hover:bg-azul-puro text-white text-sm font-semibold transition">
              <Plus size={15} /> Novo funcionário
            </button>
          </div>
          {funcionarios.length === 0 ? (
            <p className="mt-3 text-sm text-texto/50">Nenhum funcionário cadastrado.</p>
          ) : (
            <div className="mt-3 rounded-2xl bg-card border overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-texto/50 border-b">
                    <th className="px-6 py-4 font-medium">Funcionário</th>
                    <th className="px-6 py-4 font-medium">Cargo</th>
                    <th className="px-6 py-4 font-medium">Remuneração</th>
                    <th className="px-6 py-4 font-medium">Horas no mês</th>
                    <th className="px-6 py-4 font-medium text-right">Total</th>
                    <th className="px-6 py-4 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {linhasFuncionarios.map((f) => (
                    <tr key={f.id} className="border-b last:border-0 hover:bg-white/[0.02] transition">
                      <td className="px-6 py-4 font-semibold text-white">{f.nome}</td>
                      <td className="px-6 py-4 text-texto/70">{f.cargo || '—'}</td>
                      <td className="px-6 py-4 text-texto/70">
                        {f.tipo_remuneracao === 'fixo' ? `${formatarMoeda(f.valor_fixo)} fixo` : `${formatarMoeda(f.valor_hora)} / hora`}
                      </td>
                      <td className="px-6 py-4 text-texto/70">{f.tipo_remuneracao === 'hora' ? f.horas : '—'}</td>
                      <td className="px-6 py-4 text-right font-bold text-white">{formatarMoeda(f.total)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => abrirEdicaoFunc(f)} className="p-2 rounded-lg text-texto/60 hover:text-white hover:bg-white/5 transition"><Pencil size={15} /></button>
                          <button onClick={() => excluirFuncionario(f.id)} className="p-2 rounded-lg text-texto/60 hover:text-red-400 hover:bg-red-400/10 transition"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {modalFunc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setModalFunc(false)}>
          <div className="w-full max-w-md rounded-2xl bg-bg-2 border p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{editandoFunc ? 'Editar funcionário' : 'Novo funcionário'}</h2>
              <button onClick={() => setModalFunc(false)} className="text-texto/50 hover:text-white transition"><X size={20} /></button>
            </div>
            <form onSubmit={salvarFuncionario} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Nome</label>
                <input required value={formFunc.nome} onChange={(e) => setFormFunc({ ...formFunc, nome: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Cargo (opcional)</label>
                <input value={formFunc.cargo} onChange={(e) => setFormFunc({ ...formFunc, cargo: e.target.value })} placeholder="Ex: Secretária" className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Tipo de remuneração</label>
                <div className="flex rounded-xl bg-card border border-azul/15 p-1">
                  <button type="button" onClick={() => setFormFunc({ ...formFunc, tipo_remuneracao: 'fixo' })} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${formFunc.tipo_remuneracao === 'fixo' ? 'bg-azul text-white' : 'text-texto/60'}`}>Salário fixo</button>
                  <button type="button" onClick={() => setFormFunc({ ...formFunc, tipo_remuneracao: 'hora' })} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${formFunc.tipo_remuneracao === 'hora' ? 'bg-azul text-white' : 'text-texto/60'}`}>Por hora</button>
                </div>
              </div>
              {formFunc.tipo_remuneracao === 'fixo' ? (
                <div>
                  <label className="block text-sm font-medium text-texto/70 mb-1.5">Salário fixo mensal (R$)</label>
                  <input type="number" step="0.01" min="0" value={formFunc.valor_fixo} onChange={(e) => setFormFunc({ ...formFunc, valor_fixo: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition" />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-texto/70 mb-1.5">Valor por hora (R$)</label>
                  <input type="number" step="0.01" min="0" value={formFunc.valor_hora} onChange={(e) => setFormFunc({ ...formFunc, valor_hora: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition" />
                </div>
              )}
              <button type="submit" disabled={salvandoFunc} className="w-full mt-2 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2">
                {salvandoFunc && <Loader2 size={18} className="animate-spin" />}
                {salvandoFunc ? 'Salvando…' : editandoFunc ? 'Salvar alterações' : 'Criar funcionário'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
