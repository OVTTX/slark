import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Clock, X, Loader2, UploadCloud, Download, CheckCircle2, AlertTriangle } from 'lucide-react'

function normalizarChave(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
}

function encontrarValor(linha, candidatos) {
  const chaves = Object.keys(linha)
  for (const c of candidatos) {
    const achou = chaves.find((k) => normalizarChave(k) === c)
    if (achou) return linha[achou]
  }
  return ''
}

function paraDataISO(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  const s = String(v || '').trim()
  // aceita dd/mm/aaaa ou aaaa-mm-dd
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (br) return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  return null
}

// Cruza as linhas da planilha com professores e funcionários já cadastrados na escola.
function processarPlanilha(dados, professores, funcionarios) {
  const profPorEmail = new Map(professores.map((p) => [normalizarChave(p.email), p]))
  const profPorNome = new Map(professores.map((p) => [normalizarChave(p.nome), p]))
  const funcPorNome = new Map(funcionarios.map((f) => [normalizarChave(f.nome), f]))

  return dados.map((linha, i) => {
    const tipo = normalizarChave(encontrarValor(linha, ['tipo']))
    const nome = String(encontrarValor(linha, ['nome']) || '').trim()
    const email = String(encontrarValor(linha, ['email', 'e-mail']) || '').trim().toLowerCase()
    const dataRaw = encontrarValor(linha, ['data'])
    const horasRaw = encontrarValor(linha, ['horas', 'horas trabalhadas'])
    const data = paraDataISO(dataRaw)
    const horas = Number(horasRaw)

    let pessoa = null
    let pessoaTipo = null
    if (email && profPorEmail.has(email)) { pessoa = profPorEmail.get(email); pessoaTipo = 'professor' }
    else if (tipo === 'funcionario' && funcPorNome.has(normalizarChave(nome))) { pessoa = funcPorNome.get(normalizarChave(nome)); pessoaTipo = 'funcionario' }
    else if (tipo === 'professor' && profPorNome.has(normalizarChave(nome))) { pessoa = profPorNome.get(normalizarChave(nome)); pessoaTipo = 'professor' }
    else if (profPorNome.has(normalizarChave(nome))) { pessoa = profPorNome.get(normalizarChave(nome)); pessoaTipo = 'professor' }
    else if (funcPorNome.has(normalizarChave(nome))) { pessoa = funcPorNome.get(normalizarChave(nome)); pessoaTipo = 'funcionario' }

    let motivo = ''
    if (!nome) motivo = 'Sem nome'
    else if (!pessoa) motivo = 'Pessoa não encontrada (confira nome/e-mail)'
    else if (!data) motivo = 'Data inválida'
    else if (!horasRaw && horasRaw !== 0) motivo = 'Sem horas'
    else if (Number.isNaN(horas) || horas < 0) motivo = 'Horas inválidas'

    return {
      linha: i + 2, nome, data, horas, pessoaTipo, pessoaId: pessoa?.id || null,
      valido: !motivo, motivo,
    }
  })
}

export default function ImportarPontoModal({ professores = [], funcionarios = [], onImportado }) {
  const { perfil } = useAuth()
  const inputRef = useRef(null)
  const [aberto, setAberto] = useState(false)
  const [linhas, setLinhas] = useState([])
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [lendo, setLendo] = useState(false)
  const [importando, setImportando] = useState(false)
  const [erro, setErro] = useState('')
  const [resultado, setResultado] = useState(null)

  function abrir() {
    setLinhas([]); setNomeArquivo(''); setErro(''); setResultado(null); setAberto(true)
  }

  function baixarModelo() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['tipo', 'nome', 'email', 'data', 'horas'],
      ['professor', professores[0]?.nome || 'Professor Exemplo', professores[0]?.email || 'professor@email.com', '01/07/2026', 5],
      ['funcionario', funcionarios[0]?.nome || 'Funcionário Exemplo', '', '01/07/2026', 8],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Ponto')
    XLSX.writeFile(wb, 'modelo-importacao-ponto-slark.xlsx')
  }

  function aoSelecionarArquivo(e) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    setErro(''); setResultado(null); setNomeArquivo(arquivo.name); setLendo(true)
    const leitor = new FileReader()
    leitor.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array' })
        const dados = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })
        if (dados.length === 0) { setErro('Essa planilha não tem nenhuma linha de dados.'); setLinhas([]) }
        else setLinhas(processarPlanilha(dados, professores, funcionarios))
      } catch (err) {
        console.error(err)
        setErro('Não conseguimos ler esse arquivo. Confira se é um .xlsx válido.')
      } finally { setLendo(false) }
    }
    leitor.onerror = () => { setErro('Não conseguimos ler esse arquivo.'); setLendo(false) }
    leitor.readAsArrayBuffer(arquivo)
  }

  const validas = linhas.filter((l) => l.valido)
  const invalidas = linhas.filter((l) => !l.valido)

  async function confirmarImportacao() {
    if (validas.length === 0) return
    setImportando(true); setErro('')
    const falhas = [...invalidas.map((l) => ({ nome: l.nome || '(sem nome)', motivo: l.motivo }))]
    let criados = 0

    for (const l of validas) {
      try {
        const { error } = await supabase.from('registros_ponto').insert({
          escola_id: perfil.escola_id,
          professor_id: l.pessoaTipo === 'professor' ? l.pessoaId : null,
          funcionario_id: l.pessoaTipo === 'funcionario' ? l.pessoaId : null,
          data: l.data,
          horas: l.horas,
          origem: 'planilha',
        })
        if (error) falhas.push({ nome: l.nome, motivo: 'Erro ao importar' })
        else criados++
      } catch (e) {
        console.error(e)
        falhas.push({ nome: l.nome, motivo: 'Erro ao importar' })
      }
    }

    setResultado({ criados, falhas })
    setImportando(false)
    if (criados > 0) onImportado?.()
  }

  function fechar() { setAberto(false); if (inputRef.current) inputRef.current.value = '' }

  return (
    <>
      <button
        onClick={abrir}
        className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/10 hover:bg-white/15 border border-azul/20 text-white font-semibold transition"
      >
        <Clock size={18} /> Importar ponto
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={fechar}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-bg-2 border p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-white">Importar registros de ponto</h2>
              <button onClick={fechar} className="text-texto/50 hover:text-white transition"><X size={20} /></button>
            </div>
            <p className="text-sm text-texto/60 leading-relaxed">
              Envie o .xlsx exportado do relógio de ponto da escola com as colunas <span className="text-white font-mono text-xs">tipo</span> (professor/funcionario), <span className="text-white font-mono text-xs">nome</span>, <span className="text-white font-mono text-xs">email</span> (opcional, ajuda a achar o professor certo), <span className="text-white font-mono text-xs">data</span> e <span className="text-white font-mono text-xs">horas</span> trabalhadas naquele dia.
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
                  <span className="text-sm text-texto/70">{nomeArquivo || 'Clique para escolher o arquivo .xlsx'}</span>
                  <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={aoSelecionarArquivo} className="hidden" />
                </label>
              </div>
            )}

            {lendo && <div className="mt-4 text-sm text-texto/50 flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Lendo planilha…</div>}

            {!resultado && linhas.length > 0 && (
              <>
                <div className="mt-5 flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5 text-[#3FD08A]"><CheckCircle2 size={15} /> {validas.length} prontos para importar</span>
                  {invalidas.length > 0 && <span className="flex items-center gap-1.5 text-[#F5C451]"><AlertTriangle size={15} /> {invalidas.length} com problema</span>}
                </div>
                <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-bg-2">
                      <tr className="text-left text-texto/50 border-b">
                        <th className="px-3 py-2 font-medium">Linha</th>
                        <th className="px-3 py-2 font-medium">Nome</th>
                        <th className="px-3 py-2 font-medium">Data</th>
                        <th className="px-3 py-2 font-medium">Horas</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {linhas.map((l) => (
                        <tr key={l.linha} className="border-b last:border-0">
                          <td className="px-3 py-2 text-texto/40">{l.linha}</td>
                          <td className="px-3 py-2 text-white">{l.nome || '—'}</td>
                          <td className="px-3 py-2 text-texto/70">{l.data || '—'}</td>
                          <td className="px-3 py-2 text-texto/70">{l.horas || '—'}</td>
                          <td className="px-3 py-2">{l.valido ? <span className="text-[#3FD08A]">OK</span> : <span className="text-[#F5C451]">{l.motivo}</span>}</td>
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
                  {importando ? 'Importando…' : `Importar ${validas.length} registro${validas.length === 1 ? '' : 's'}`}
                </button>
              </>
            )}

            {resultado && (
              <div className="mt-5">
                <div className="rounded-2xl bg-[#3FD08A]/10 border border-[#3FD08A]/25 p-5">
                  <div className="flex items-center gap-2 text-[#3FD08A] font-semibold">
                    <CheckCircle2 size={16} /> {resultado.criados} registro{resultado.criados === 1 ? '' : 's'} importado{resultado.criados === 1 ? '' : 's'}
                  </div>
                </div>
                {resultado.falhas.length > 0 && (
                  <div className="mt-3 rounded-2xl bg-red-400/5 border border-red-400/15 p-5">
                    <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
                      <AlertTriangle size={15} /> {resultado.falhas.length} não importado{resultado.falhas.length === 1 ? '' : 's'}
                    </div>
                    <ul className="mt-2 space-y-1 text-xs text-texto/70 max-h-40 overflow-y-auto">
                      {resultado.falhas.map((f, i) => <li key={i}>{f.nome} — {f.motivo}</li>)}
                    </ul>
                  </div>
                )}
                <button onClick={fechar} className="w-full mt-5 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition">Fechar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
