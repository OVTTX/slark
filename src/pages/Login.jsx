import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase, carregarPerfil } from '../lib/supabase'
import { HOME_POR_PERFIL } from '../lib/rotasPorPerfil'
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'

const EMAIL_DEMO_SUFIXO = '@slarkdemo.com.br'

export default function Login() {
  const { entrar } = useAuth()
  const navigate = useNavigate()
  const landing = import.meta.env.VITE_LANDING_URL || '#'

  // etapa: 'email' -> 'senha' (conta existente) -> 'criar_senha' (convite pendente)
  const [etapa, setEtapa] = useState('email')
  const [email, setEmail] = useState('')
  const [nomeConvite, setNomeConvite] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [carregando, setCarregando] = useState(false)

  const ehEmailDemo = email.trim().toLowerCase().endsWith(EMAIL_DEMO_SUFIXO)

  async function continuarComEmail(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      const emailNormalizado = email.trim().toLowerCase()
      const { data, error } = await supabase.rpc('verificar_email', { p_email: emailNormalizado })
      if (error) throw error
      const resultado = data?.[0]
      if (resultado?.situacao === 'tem_conta') {
        setEtapa('senha')
      } else if (resultado?.situacao === 'convite_pendente') {
        setNomeConvite(resultado.nome || '')
        setEtapa('criar_senha')
      } else {
        setErro('Não encontramos esse e-mail. Peça para seu professor ou diretor te cadastrar antes.')
      }
    } catch (err) {
      console.error(err)
      setErro('Não conseguimos verificar esse e-mail agora. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  async function entrarComSenha(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      const { data, error } = await entrar(email.trim().toLowerCase(), senha)
      if (error) throw error
      const perfil = await carregarPerfil(data.user.id)
      navigate(HOME_POR_PERFIL[perfil.perfil] || '/professor')
    } catch (err) {
      setErro('E-mail ou senha incorretos. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  async function criarSenha(e) {
    e.preventDefault()
    setErro('')
    if (senha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.')
      return
    }
    if (senha !== confirmarSenha) {
      setErro('As senhas não são iguais.')
      return
    }
    setCarregando(true)
    try {
      const emailNormalizado = email.trim().toLowerCase()
      const { error: erroCriar } = await supabase.rpc('criar_conta_aluno', { p_email: emailNormalizado, p_senha: senha })
      if (erroCriar) throw erroCriar

      const { data, error } = await entrar(emailNormalizado, senha)
      if (error) throw error
      const perfil = await carregarPerfil(data.user.id)
      navigate(HOME_POR_PERFIL[perfil.perfil] || '/aluno')
    } catch (err) {
      console.error(err)
      setErro(err.message?.includes('já existe') ? err.message : 'Não foi possível criar sua senha. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  async function esqueciSenha() {
    setErro('')
    setAviso('')
    if (ehEmailDemo) {
      setAviso('Contas de demonstração não podem redefinir senha. Use a senha demo informada pela equipe Slark.')
      return
    }
    setCarregando(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase())
      if (error) throw error
      setAviso('Enviamos um link de redefinição de senha para o seu e-mail.')
    } catch (err) {
      console.error(err)
      setErro('Não foi possível enviar o e-mail de redefinição agora.')
    } finally {
      setCarregando(false)
    }
  }

  function voltar() {
    setEtapa('email')
    setSenha('')
    setConfirmarSenha('')
    setErro('')
    setAviso('')
  }

  return (
    <div className="min-h-screen bg-bg text-texto font-display flex">
      {/* Coluna esquerda: marca */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-bg-2 flex-col justify-between p-12">
        <div className="absolute -top-32 -right-24 w-[40vw] h-[40vw] rounded-full blur-3xl"
             style={{ background: 'radial-gradient(circle, rgba(46,91,255,.4), transparent 65%)' }} />
        <a href={landing} className="font-mono font-semibold text-2xl text-white tracking-tight relative">
          SLARK<span className="text-azul">.</span>
        </a>
        <div className="relative">
          <h1 className="text-5xl font-bold text-white leading-tight tracking-tight">
            A educação que<br />enxerga cada<br />
            <span className="font-serif italic font-normal text-azul">aluno</span>.
          </h1>
          <p className="mt-6 text-texto/65 max-w-md leading-relaxed">
            Entre no ecossistema Slark e acompanhe o desenvolvimento real de cada estudante — personalização, Times e gamificação num só lugar.
          </p>
        </div>
        <div className="relative font-mono text-[.6rem] tracking-[.2em] uppercase text-texto/40">
          Uma marca Moorning Group
        </div>
      </div>

      {/* Coluna direita: formulário */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <a href={landing} className="inline-flex items-center gap-2 text-sm text-texto/50 hover:text-azul transition mb-10">
            <ArrowLeft size={16} /> Voltar ao site
          </a>

          {etapa === 'email' && (
            <>
              <h2 className="text-3xl font-bold text-white tracking-tight">Entrar no app</h2>
              <p className="mt-2 text-texto/60">Digite seu e-mail para continuar.</p>

              <form onSubmit={continuarComEmail} className="mt-8 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-texto/70 mb-2">E-mail</label>
                  <input
                    type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@escola.com.br"
                    className="w-full px-4 py-3 rounded-xl bg-card border border-azul/15 text-white placeholder:text-texto/30 focus:outline-none focus:border-azul transition"
                  />
                </div>

                {erro && <p className="text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

                <button
                  type="submit" disabled={carregando}
                  className="w-full py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {carregando && <Loader2 size={18} className="animate-spin" />}
                  {carregando ? 'Verificando…' : 'Continuar'}
                </button>
              </form>
            </>
          )}

          {etapa === 'senha' && (
            <>
              <h2 className="text-3xl font-bold text-white tracking-tight">Digite sua senha</h2>
              <p className="mt-2 text-texto/60 truncate">{email}</p>

              <form onSubmit={entrarComSenha} className="mt-8 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-texto/70 mb-2">Senha</label>
                  <input
                    type="password" required autoFocus value={senha} onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-xl bg-card border border-azul/15 text-white placeholder:text-texto/30 focus:outline-none focus:border-azul transition"
                  />
                </div>

                {erro && <p className="text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}
                {aviso && <p className="text-sm text-[#3FD08A] bg-[#3FD08A]/10 px-4 py-3 rounded-xl">{aviso}</p>}

                <button
                  type="submit" disabled={carregando}
                  className="w-full py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {carregando && <Loader2 size={18} className="animate-spin" />}
                  {carregando ? 'Entrando…' : 'Entrar'}
                </button>

                <div className="flex items-center justify-between text-sm">
                  <button type="button" onClick={voltar} className="text-texto/50 hover:text-white transition">Trocar e-mail</button>
                  <button type="button" onClick={esqueciSenha} className="text-azul hover:underline">Esqueci minha senha</button>
                </div>
              </form>
            </>
          )}

          {etapa === 'criar_senha' && (
            <>
              <h2 className="text-3xl font-bold text-white tracking-tight">
                Olá{nomeConvite ? `, ${nomeConvite.split(' ')[0]}` : ''}!
              </h2>
              <p className="mt-2 text-texto/60">É a sua primeira vez aqui — crie uma senha.</p>

              <form onSubmit={criarSenha} className="mt-8 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-texto/70 mb-2">Nova senha</label>
                  <input
                    type="password" required autoFocus value={senha} onChange={(e) => setSenha(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-4 py-3 rounded-xl bg-card border border-azul/15 text-white placeholder:text-texto/30 focus:outline-none focus:border-azul transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-texto/70 mb-2">Confirmar senha</label>
                  <input
                    type="password" required value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)}
                    placeholder="Repita a senha"
                    className="w-full px-4 py-3 rounded-xl bg-card border border-azul/15 text-white placeholder:text-texto/30 focus:outline-none focus:border-azul transition"
                  />
                </div>

                {erro && <p className="text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

                <button
                  type="submit" disabled={carregando}
                  className="w-full py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {carregando ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                  {carregando ? 'Criando…' : 'Criar senha e entrar'}
                </button>

                <button type="button" onClick={voltar} className="w-full text-sm text-texto/50 hover:text-white transition">
                  Trocar e-mail
                </button>
              </form>
            </>
          )}

          <p className="mt-8 text-sm text-texto/50 text-center">
            Sua escola ainda não usa a Slark?{' '}
            <a href={`https://wa.me/5511945699915`} target="_blank" rel="noopener" className="text-azul hover:underline">
              Fale conosco
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
