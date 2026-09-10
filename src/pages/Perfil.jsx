import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import AppLayout from '../components/AppLayout'
import SeloFlor from '../components/SeloFlor'
import {
  Camera, Loader2, Save, KeyRound, Check, User, ShieldCheck,
  Award, Crown, Brain, Lightbulb, MessageCircle, HeartHandshake, Eye, Search,
} from 'lucide-react'
import seloCriativo from '../assets/selos/criativo.svg'
import seloDetalhista from '../assets/selos/detalhista.svg'
import seloObservador from '../assets/selos/observador.svg'
import seloRaciocinio from '../assets/selos/raciocinio.svg'

const ROTULO_PERFIL = {
  admin_slark: 'Equipe Slark',
  diretor: 'Diretor',
  professor: 'Professor',
  aluno: 'Aluno',
}

// Selo de característica (o mesmo selo em formato de flor, com a letra da
// característica) que aparece sobreposto na foto de perfil do aluno.
const SELO_CARACTERISTICA = {
  Criativo: seloCriativo,
  Detalhista: seloDetalhista,
  Observador: seloObservador,
  Raciocínio: seloRaciocinio,
}

// selos antigos guardam um emoji em "icone" (ex: 🏆); os selos ligados a
// características guardam o nome de um ícone lucide (ex: "Lightbulb").
const ICONES_LUCIDE = { Crown, Brain, Lightbulb, MessageCircle, HeartHandshake, Eye, Search }
function IconeSelo({ icone, size = 24 }) {
  const Comp = icone && ICONES_LUCIDE[icone]
  if (Comp) return <Comp size={size} className="text-white" />
  if (!icone) return <Award size={size} className="text-white" />
  return <span style={{ fontSize: size * 0.85, lineHeight: 1 }}>{icone}</span>
}

function mesesDesde(dataIso) {
  if (!dataIso) return null
  const inicio = new Date(dataIso)
  const agora = new Date()
  let meses = (agora.getFullYear() - inicio.getFullYear()) * 12 + (agora.getMonth() - inicio.getMonth())
  if (agora.getDate() < inicio.getDate()) meses -= 1
  return Math.max(0, meses)
}

export default function Perfil() {
  const { perfil, recarregarPerfil } = useAuth()
  const inputArquivoRef = useRef(null)
  const ehAluno = perfil?.perfil === 'aluno'

  const [aba, setAba] = useState('geral') // 'geral' | 'seguranca'

  const [nome, setNome] = useState(perfil?.nome || '')
  const [salvandoNome, setSalvandoNome] = useState(false)
  const [avisoNome, setAvisoNome] = useState('')
  const [erroNome, setErroNome] = useState('')

  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const [erroFoto, setErroFoto] = useState('')

  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [erroSenha, setErroSenha] = useState('')
  const [avisoSenha, setAvisoSenha] = useState('')

  const [aluno, setAluno] = useState(null)
  const [selosGanhos, setSelosGanhos] = useState([])
  const [carregandoSelos, setCarregandoSelos] = useState(false)

  useEffect(() => {
    if (!ehAluno || !perfil?.id) return
    async function carregarDadosAluno() {
      setCarregandoSelos(true)
      try {
        const { data: alunoData } = await supabase
          .from('alunos').select('id, caracteristicas(nome)').eq('usuario_id', perfil.id).maybeSingle()
        setAluno(alunoData)
        if (alunoData) {
          const { data: selosData } = await supabase
            .from('aluno_selos')
            .select('concedido_em, selos(id, nome, descricao, icone, caracteristicas(cor))')
            .eq('aluno_id', alunoData.id)
            .order('concedido_em', { ascending: false })
          setSelosGanhos(selosData || [])
        }
      } catch (e) {
        console.error(e)
      } finally {
        setCarregandoSelos(false)
      }
    }
    carregarDadosAluno()
  }, [perfil?.id, ehAluno])

  async function salvarNome(e) {
    e.preventDefault()
    setErroNome('')
    setAvisoNome('')
    if (!nome.trim()) return
    setSalvandoNome(true)
    try {
      const { error } = await supabase.rpc('atualizar_meu_perfil', { p_nome: nome.trim() })
      if (error) throw error
      await recarregarPerfil()
      setAvisoNome('Nome atualizado!')
    } catch (e) {
      console.error(e)
      setErroNome('Não foi possível atualizar seu nome.')
    } finally {
      setSalvandoNome(false)
    }
  }

  async function trocarFoto(e) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    setErroFoto('')
    setEnviandoFoto(true)
    try {
      const extensao = arquivo.name.split('.').pop()
      const caminho = `${perfil.id}/avatar-${Date.now()}.${extensao}`
      const { error: eUpload } = await supabase.storage.from('avatars').upload(caminho, arquivo, { upsert: true })
      if (eUpload) throw eUpload

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(caminho)
      const { error: eUpdate } = await supabase.rpc('atualizar_meu_perfil', { p_avatar_url: publicUrlData.publicUrl })
      if (eUpdate) throw eUpdate

      await recarregarPerfil()
    } catch (e) {
      console.error(e)
      setErroFoto('Não foi possível enviar sua foto. Tente uma imagem menor (até 2MB).')
    } finally {
      setEnviandoFoto(false)
      if (inputArquivoRef.current) inputArquivoRef.current.value = ''
    }
  }

  async function trocarSenha(e) {
    e.preventDefault()
    setErroSenha('')
    setAvisoSenha('')

    if (novaSenha.length < 6) { setErroSenha('A nova senha precisa ter pelo menos 6 caracteres.'); return }
    if (novaSenha !== confirmarSenha) { setErroSenha('As senhas não coincidem.'); return }

    setSalvandoSenha(true)
    try {
      // Verifica a senha atual reautenticando o usuário com ela
      const { error: eVerifica } = await supabase.auth.signInWithPassword({ email: perfil.email, password: senhaAtual })
      if (eVerifica) { setErroSenha('Senha atual incorreta.'); return }

      const { error: eAtualiza } = await supabase.auth.updateUser({ password: novaSenha })
      if (eAtualiza) throw eAtualiza

      setSenhaAtual(''); setNovaSenha(''); setConfirmarSenha('')
      setAvisoSenha('Senha alterada com sucesso!')
    } catch (e) {
      console.error(e)
      setErroSenha('Não foi possível alterar sua senha.')
    } finally {
      setSalvandoSenha(false)
    }
  }

  const seloUrl = SELO_CARACTERISTICA[aluno?.caracteristicas?.nome]
  const meses = mesesDesde(perfil?.criado_em)
  const admitidoEm = perfil?.criado_em
    ? new Date(perfil.criado_em).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    : null

  return (
    <AppLayout>
      <div>
        <h1 className="text-4xl font-bold text-white tracking-tight">Meu Perfil</h1>
        <p className="mt-2 text-texto/60">{ehAluno ? 'Sua jornada de aprendizado.' : 'Gerencie seus dados de acesso.'}</p>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 items-start">
          {/* Coluna esquerda: foto + selo de característica + menu + tempo de plataforma + selos ganhos */}
          <div className="space-y-5">
            <div className="rounded-2xl bg-card border p-6 flex flex-col items-center text-center">
              <div className="relative">
                {perfil?.avatar_url ? (
                  <img src={perfil.avatar_url} alt="Sua foto" className="w-32 h-32 rounded-full object-cover border" />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-azul/30 flex items-center justify-center text-white text-4xl font-mono">
                    {perfil?.nome?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => inputArquivoRef.current?.click()}
                  disabled={enviandoFoto}
                  title="Trocar foto"
                  className="absolute top-0 right-0 w-9 h-9 rounded-full bg-azul hover:bg-azul-puro text-white flex items-center justify-center shadow-lg transition disabled:opacity-60"
                >
                  {enviandoFoto ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                </button>
                <input ref={inputArquivoRef} type="file" accept="image/*" onChange={trocarFoto} className="hidden" />

                {seloUrl && (
                  <img
                    src={seloUrl}
                    alt={`Selo ${aluno.caracteristicas.nome}`}
                    className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 drop-shadow-lg"
                  />
                )}
              </div>

              <div className={seloUrl ? 'mt-6' : 'mt-4'}>
                <div className="font-bold text-white text-lg">{perfil?.nome}</div>
                <div className="text-sm text-texto/50">{perfil?.email}</div>
                <span className="inline-flex mt-2 items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-azul/20 text-azul">
                  {ROTULO_PERFIL[perfil?.perfil] || 'Usuário'}
                </span>
              </div>
              {erroFoto && <p className="mt-4 text-sm text-red-400 bg-red-400/10 px-4 py-2.5 rounded-xl">{erroFoto}</p>}
            </div>

            <div className="rounded-2xl bg-card border p-2">
              <button
                onClick={() => setAba('geral')}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition ${aba === 'geral' ? 'bg-azul/15 text-white' : 'text-texto/60 hover:text-white hover:bg-white/5'}`}
              >
                <User size={16} /> Dados Gerais
              </button>
              <button
                onClick={() => setAba('seguranca')}
                className={`mt-1 w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition ${aba === 'seguranca' ? 'bg-azul/15 text-white' : 'text-texto/60 hover:text-white hover:bg-white/5'}`}
              >
                <ShieldCheck size={16} /> Segurança
              </button>
            </div>

            {meses != null && (
              <div className="rounded-2xl bg-card border p-6">
                <div className="text-sm text-texto/50">Tempo de Plataforma</div>
                <div className="mt-1 text-3xl font-bold text-white">{meses} {meses === 1 ? 'Mês' : 'Meses'}</div>
                {admitidoEm && <div className="mt-0.5 text-xs text-texto/45">Admitido em {admitidoEm}</div>}
              </div>
            )}

            {ehAluno && (
              <div className="rounded-2xl bg-card border p-6">
                <div className="text-sm font-semibold text-white mb-4">Selos conquistados</div>
                {carregandoSelos ? (
                  <div className="text-xs text-texto/40">Carregando…</div>
                ) : selosGanhos.length === 0 ? (
                  <p className="text-xs text-texto/45 leading-relaxed">Ainda sem selos. Continue participando das atividades pra conquistar os primeiros!</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {selosGanhos.map(({ selos: selo }) => (
                      <div key={selo.id} title={selo.descricao} className="flex flex-col items-center gap-1.5">
                        <SeloFlor tamanho={64} corBorda={selo.caracteristicas?.cor || 'rgba(255,255,255,0.6)'}>
                          <IconeSelo icone={selo.icone} size={22} />
                        </SeloFlor>
                        <span className="text-[11px] text-texto/60 text-center leading-tight">{selo.nome}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Coluna direita: conteúdo da aba selecionada */}
          <div className="space-y-5">
            {aba === 'geral' ? (
              <div className="rounded-2xl bg-card border p-6">
                <div className="text-lg font-bold text-white">Informações da Conta</div>
                <p className="text-sm text-texto/50 mt-1">Seus dados de identificação na Slark.</p>
                <div className="mt-5 pt-5 border-t space-y-4">
                  <form onSubmit={salvarNome} className="space-y-1.5">
                    <label className="block text-sm font-medium text-texto/70">Nome</label>
                    <div className="flex gap-2">
                      <input
                        value={nome} onChange={(e) => setNome(e.target.value)}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                      />
                      <button
                        type="submit" disabled={salvandoNome}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-azul hover:bg-azul-puro text-white font-medium transition disabled:opacity-60"
                      >
                        {salvandoNome ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      </button>
                    </div>
                    {avisoNome && <p className="text-sm text-[#3FD08A] flex items-center gap-1.5"><Check size={14} /> {avisoNome}</p>}
                    {erroNome && <p className="text-sm text-red-400">{erroNome}</p>}
                  </form>

                  <div>
                    <label className="block text-sm font-medium text-texto/70 mb-1.5">E-mail</label>
                    <div className="px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-texto/60">{perfil?.email}</div>
                  </div>

                  {perfil?.escolas?.nome && (
                    <div>
                      <label className="block text-sm font-medium text-texto/70 mb-1.5">Escola</label>
                      <div className="px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-texto/60">{perfil.escolas.nome}</div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-card border p-6">
                <div className="flex items-center gap-2 text-white font-semibold"><KeyRound size={18} className="text-azul" /> Alterar senha</div>
                <form onSubmit={trocarSenha} className="mt-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-texto/70 mb-1.5">Senha atual</label>
                    <input
                      type="password" required value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-texto/70 mb-1.5">Nova senha</label>
                    <input
                      type="password" required value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-texto/70 mb-1.5">Confirmar nova senha</label>
                    <input
                      type="password" required value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                    />
                  </div>

                  {erroSenha && <p className="text-sm text-red-400 bg-red-400/10 px-4 py-2.5 rounded-xl">{erroSenha}</p>}
                  {avisoSenha && <p className="text-sm text-[#3FD08A] bg-[#3FD08A]/10 px-4 py-2.5 rounded-xl flex items-center gap-1.5"><Check size={14} /> {avisoSenha}</p>}

                  <button
                    type="submit" disabled={salvandoSenha}
                    className="w-full py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {salvandoSenha && <Loader2 size={18} className="animate-spin" />}
                    {salvandoSenha ? 'Alterando…' : 'Alterar senha'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
