import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { FileSpreadsheet, X, Loader2, UploadCloud, Download, CheckCircle2, AlertTriangle } from 'lucide-react'

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Normaliza nomes de coluna: sem acento, minúsculo, sem espaço nas pontas.
function normalizarChave(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .trim().toLowerCase()
}

function encontrarValor(linha, candidatos) {
  const chaves = Object.keys(linha)
  for (const c of candidatos) {
    const achou = chaves.find((k) => normalizarChave(k) === c)
    if (achou) return linha[achou]
  }
  return ''
}

// Lê a planilha e devolve linhas normalizadas + validação, sem tocar o banco ainda.
function processarPlanilha(dados, salas) {
  const salaPorNome = new Map(salas.map((s) => [normalizarChave(s.nome), s.id]))
  const vistos = new Set()

  return dados.map((linha, i) => {
    const nome = String(encontrarValor(linha, ['nome', 'aluno', 'nome do aluno']) || '').trim()
    const email = String(encontrarValor(linha, ['email', 'e-mail', 'email do aluno']) || '').trim().toLowerCase()
    const salaNome = String(encontrarValor(linha, ['sala', 'turma']) || '').trim()
    const salaId = salaNome ? salaPorNome.get(normalizarChave(salaNome)) : undefined

    let motivo = ''
    if (!nome) motivo = 'Sem nome'
    else if (!email) motivo = 'Sem e-mail'
    else if (!REGEX_EMAIL.test(email)) motivo = 'E-mail inválido'
    else if (vistos.has(email)) motivo = 'E-mail repetido na planilha'
    else if (salaNome && !salaId) motivo = `Sala "${salaNome}" não encontrada`

    if (!motivo && email) vistos.add(email)

    return { linha: i + 2, nome, email, salaNome, sala_id: salaId || null, valido: !motivo, motivo }
  })
}

export default function ImportarAlunosModal({ salas = [], onImportado }) {
  const { perfil } = useAuth()
  const inputRef = useRef(null)
  const [aberto, setAberto] = useState(false)
  const [linhas, setLinhas] = useState([])
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [lendo, setLendo] = useState(false)
  const [importando, setImportando] = useState(false)
  const [erro, setErro] = useState('')
  const [resultado, setResultado] = useState(null) // { criados, falhas: [{nome,email,motivo}] }

  function abrir() {
    setLinhas([])
    setNomeArquivo('')
    setErro('')
    setResultado(null)
    setAberto(true)
  }

  function baixarModelo() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['nome', 'email', 'sala'],
      ['Maria Silva', 'maria.silva@email.com', salas[0]?.nome || '2A'],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Alunos')
    XLSX.writeFile(wb, 'modelo-importacao-alunos-slark.xlsx')
  }

  function aoSelecionarArquivo(e) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    setErro('')
    setResultado(null)
    setNomeArquivo(arquivo.name)
    setLendo(true)
    const leitor = new FileReader()
    leitor.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array' })
        const primeiraAba = wb.Sheets[wb.SheetNames[0]]
        const dados = XLSX.utils.sheet_to_json(primeiraAba, { defval: '' })
        if (dados.length === 0) {
          setErro('Essa planilha não tem nenhuma linha de dados.')
          setLinhas([])
        } else {
          setLinhas(processarPlanilha(dados, salas))
        }
      } catch (err) {
        console.error(err)
        setErro('Não conseguimos ler esse arquivo. Confira se é um .xlsx válido.')
      } finally {
        setLendo(false)
      }
    }
    leitor.onerror = () => { setErro('Não conseguimos ler esse arquivo.'); setLendo(false) }
    leitor.readAsArrayBuffer(arquivo)
  }

  const validas = linhas.filter((l) => l.valido)
  const invalidas = linhas.filter((l) => !l.valido)

  async function confirmarImportacao() {
    if (validas.length === 0) return
    setImportando(true)
    setErro('')
    const falhas = [...invalidas.map((l) => ({ nome: l.nome || '(sem nome)', email: l.email, motivo: l.motivo }))]
    let criados = 0

    for (const l of validas) {
      try {
        const { error } = await supabase.from('convites_aluno').insert({
          nome: l.nome,
          email: l.email,
          escola_id: perfil.escola_id,
          sala_id: l.sala_id,
          criado_por: perfil.id,
        })
        if (error) {
          if (error.code === '23505') {
            falhas.push({ nome: l.nome, email: l.email, motivo: 'Já existe convite ou conta com esse e-mail' })
          } else {
            falhas.push({ nome: l.nome, email: l.email, motivo: 'Erro ao importar' })
          }
        } else {
          criados++
        }
      } catch (e) {
        console.error(e)
        falhas.push({ nome: l.nome, email: l.email, motivo: 'Erro ao importar' })
      }
    }

    setResultado({ criados, falhas })
    setImportando(false)
    if (criados > 0) onImportado?.()
  }

  function fechar() {
    setAberto(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <>
      <button
        onClick={abrir}
        className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/10 hover:bg-white/15 border border-azul/20 text-white font-semibold transition"
      >
        <FileSpreadsheet size={18} /> Importar planilha
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={fechar}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-bg-2 border p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-white">Importar alunos por planilha</h2>
              <button onClick={fechar} className="text-texto/50 hover:text-white transition"><X size={20} /></button>
            </div>
            <p className="text-sm text-texto/60 leading-relaxed">
              Envie um .xlsx com as colunas <span className="text-white font-mono text-xs">nome</span>, <span className="text-white font-mono text-xs">email</span> e <span className="text-white font-mono text-xs">sala</span> (opcional). Cada aluno recebe um convite e cria a própria senha no primeiro login — igual ao "Convidar aluno".
            </p>

            {!resultado && (
              <button onClick={baixarModelo} className="mt-4 flex items-center gap-2 text-sm text-azul hover:text-white transition">
                <Download size={15} /> Baixar planilha modelo
              </button>
            )}

            {erro && <p className="mt-4 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

            {!resultado && (
              <div className="mt-5">
                <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-azul/25 hover:border-azul/50 bg-card/40 p-8 cursor-pointer transition text-center">
                  <UploadCloud size={28} className="text-azul/70" />
                  <span className="text-sm text-texto/70">
                    {nomeArquivo || 'Clique para escolher o arquivo .xlsx'}
                  </span>
                  <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={aoSelecionarArquivo} className="hidden" />
                </label>
              </div>
            )}

            {lendo && <div className="mt-4 text-sm text-texto/50 flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Lendo planilha…</div>}

            {!resultado && linhas.length > 0 && (
              <>
                <div className="mt-5 flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5 text-[#3FD08A]"><CheckCircle2 size={15} /> {validas.length} prontos para importar</span>
                  {invalidas.length > 0 && (
                    <span className="flex items-center gap-1.5 text-[#F5C451]"><AlertTriangle size={15} /> {invalidas.length} com problema</span>
                  )}
                </div>

                <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-bg-2">
                      <tr className="text-left text-texto/50 border-b">
                        <th className="px-3 py-2 font-medium">Linha</th>
                        <th className="px-3 py-2 font-medium">Nome</th>
                        <th className="px-3 py-2 font-medium">E-mail</th>
                        <th className="px-3 py-2 font-medium">Sala</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {linhas.map((l) => (
                        <tr key={l.linha} className="border-b last:border-0">
                          <td className="px-3 py-2 text-texto/40">{l.linha}</td>
                          <td className="px-3 py-2 text-white">{l.nome || '—'}</td>
                          <td className="px-3 py-2 text-texto/70">{l.email || '—'}</td>
                          <td className="px-3 py-2 text-texto/70">{l.salaNome || '—'}</td>
                          <td className="px-3 py-2">
                            {l.valido
                              ? <span className="text-[#3FD08A]">OK</span>
                              : <span className="text-[#F5C451]">{l.motivo}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={confirmarImportacao} disabled={importando || validas.length === 0}
                  className="w-full mt-5 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {importando && <Loader2 size={18} className="animate-spin" />}
                  {importando ? 'Importando…' : `Importar ${validas.length} aluno${validas.length === 1 ? '' : 's'}`}
                </button>
              </>
            )}

            {resultado && (
              <div className="mt-5">
                <div className="rounded-2xl bg-[#3FD08A]/10 border border-[#3FD08A]/25 p-5">
                  <div className="flex items-center gap-2 text-[#3FD08A] font-semibold">
                    <CheckCircle2 size={16} /> {resultado.criados} convite{resultado.criados === 1 ? '' : 's'} criado{resultado.criados === 1 ? '' : 's'}
                  </div>
                  <p className="mt-1.5 text-sm text-texto/70">
                    Cada aluno importado pode acessar o login com o e-mail cadastrado e criar a própria senha.
                  </p>
                </div>

                {resultado.falhas.length > 0 && (
                  <div className="mt-3 rounded-2xl bg-red-400/5 border border-red-400/15 p-5">
                    <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
                      <AlertTriangle size={15} /> {resultado.falhas.length} não importado{resultado.falhas.length === 1 ? '' : 's'}
                    </div>
                    <ul className="mt-2 space-y-1 text-xs text-texto/70 max-h-40 overflow-y-auto">
                      {resultado.falhas.map((f, i) => (
                        <li key={i}>{f.nome || '(sem nome)'} {f.email && `· ${f.email}`} — {f.motivo}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <button onClick={fechar} className="w-full mt-5 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition">
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
