import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase, carregarPerfil } from '../lib/supabase'
import { HOME_POR_PERFIL } from '../lib/rotasPorPerfil'
import { ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'
import LogoSlark from '../components/LogoSlark'
import '../styles/slark-login.css'

const EMAIL_DEMO_SUFIXO = '@slarkdemo.com.br'

// Fundo em degradê nas cores da marca (profundo → azul → quase-branco), com um
// feixe curvo mais claro cruzando a tela — mesma linguagem visual do mockup.
// Fica dentro do cartão arredondado (glassmorphism retangular) que envolve a tela toda.
function FundoLogin() {
  return <div className="login-universe" aria-hidden="true"><div className="login-orbit orbit-one" /><div className="login-orbit orbit-two" /><div className="login-orbit orbit-three" /><span className="login-planet planet-one" /><span className="login-planet planet-two" /></div>
}

// Input em formato de pílula + botão circular de enviar, no mesmo estilo "vidro"
// da referência visual — usado em cada etapa de um único campo.
function CampoComBotao({ tipo = 'text', valor, onChange, placeholder, carregando, autoFocus }) {
  return (
    <div className="mt-5 flex items-center gap-3">
      <input
        aria-label={tipo === 'email' ? 'Seu e-mail' : 'Sua senha'} autoComplete={tipo === 'email' ? 'email' : 'current-password'}
        type={tipo} required autoFocus={autoFocus} value={valor} onChange={onChange}
        placeholder={placeholder}
        className="flex-1 min-w-0 h-16 px-7 text-lg rounded-full bg-white/25 backdrop-blur-md border border-white/30 text-white placeholder:text-white/70 focus:outline-none focus:bg-white/35 focus:border-white/50 transition"
      />
      <button
        type="submit" disabled={carregando} aria-label="Continuar" aria-busy={carregando}
        className="shrink-0 w-16 h-16 rounded-full bg-white/25 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:bg-white/35 transition disabled:opacity-60"
      >
        {carregando ? <Loader2 size={24} className="animate-spin" /> : <ArrowRight size={24} />}
      </button>
    </div>
  )
}

// Intro exclusiva do mobile: mostra a logo em tela cheia, um instante de fundo
// limpo e então revela o painel de login (que já está pronto por baixo).
// Roda uma única vez ao entrar na tela; não interfere na lógica de login.
function IntroMobile() {
  const [fase, setFase] = useState('splash')

  useEffect(() => {
    const reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduz) {
      setFase('removida')
      return
    }
    const t1 = setTimeout(() => setFase('blank'), 1400)
    const t2 = setTimeout(() => setFase('revelada'), 2200)
    const t3 = setTimeout(() => setFase('removida'), 2900)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])

  if (fase === 'removida') return null

  const conteudoVisivel = fase !== 'blank' && fase !== 'revelada'

  return (
    <div
      className="lg:hidden fixed inset-0 z-30 transition-opacity duration-700 ease-out"
      style={{ opacity: fase === 'revelada' ? 0 : 1, pointerEvents: fase === 'revelada' ? 'none' : 'auto' }}
      aria-hidden="true"
    >
      <FundoLogin />
      <div className="relative z-10 h-full flex flex-col p-8">
        <div className="transition-opacity duration-500" style={{ opacity: conteudoVisivel ? 1 : 0 }}>
          <p className="font-mono text-4xl font-medium text-white leading-tight">Conheça a</p>
          <LogoSlark className="w-64 h-auto -mt-1" />
        </div>
        <div className="mt-auto transition-opacity duration-500" style={{ opacity: conteudoVisivel ? 1 : 0 }}>
          <div className="h-16 rounded-full bg-white/25 backdrop-blur-md border border-white/30 flex items-center justify-center">
            <span className="font-mono text-lg font-medium text-white/90">Entre no seu espaço</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Login() {
  const { entrar } = useAuth()
  const navigate = useNavigate()

  // A tela de login tem identidade visual própria (degradê escuro fixo) e não
  // deve mudar com o tema claro/escuro do resto do app — força o fundo do
  // <body> pra escuro enquanto essa tela estiver montada, e devolve ao sair.
  useEffect(() => {
    const anterior = document.body.style.background
    document.body.style.background = '#03002E'
    return () => { document.body.style.background = anterior }
  }, [])

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
    <div className="slark-login min-h-screen w-full relative font-display overflow-hidden text-[#FFFFFF]" style={{ '--c-onbg': '255 255 255' }}>
      <FundoLogin />
      <IntroMobile />

      <div className="login-split relative z-10 min-h-screen flex flex-col lg:flex-row">
        {/* Coluna esquerda: chamada de marca (some em telas pequenas), sobre o degradê cru */}
        <div className="login-story hidden lg:flex w-1/2 flex-col justify-end p-16">
          <p className="login-kicker">SLARK EDUCAÇÃO</p>
          <h1 className="text-5xl xl:text-6xl font-light text-white leading-[1.05] tracking-tight">
            Cada mente<br />é um <strong className="font-bold italic">universo.</strong>
          </h1>
          <p className="login-story-copy">Diferentes caminhos. Novas conexões.<br />Um espaço para evoluir juntos.</p>
        </div>

        {/* Coluna direita: painel retangular em glassmorphism — a "divisória" entre as duas metades */}
        <div className="login-panel flex-1 flex flex-col justify-between p-8 sm:p-12 lg:p-16">
          <div>
            <p className="login-kicker">BEM-VINDO AO SEU UNIVERSO</p>
            <div className="login-brand"><LogoSlark className="w-56 h-auto" /><span>Educação</span></div>
          </div>

          <div className="w-full max-w-lg lg:ml-auto">
          {etapa === 'email' && (
            <>
              <p className="font-mono text-2xl sm:text-3xl font-medium text-white/90">Entre no seu espaço</p>
              <form onSubmit={continuarComEmail}>
                <CampoComBotao
                  tipo="email" valor={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@slark.com" carregando={carregando} autoFocus
                />
              </form>
            </>
          )}

          {etapa === 'senha' && (
            <>
              <p className="font-mono text-2xl sm:text-3xl font-medium text-white/90 truncate">{email}</p>
              <form onSubmit={entrarComSenha}>
                <CampoComBotao
                  tipo="password" valor={senha} onChange={(e) => setSenha(e.target.value)}
                  placeholder="Sua Senha" carregando={carregando} autoFocus
                />
                <div className="mt-3 flex items-center justify-between text-sm px-1">
                  <button type="button" onClick={voltar} className="text-white/70 hover:text-white transition">Trocar e-mail</button>
                  <button type="button" onClick={esqueciSenha} className="text-white/90 hover:text-white hover:underline transition">Esqueci minha senha</button>
                </div>
              </form>
            </>
          )}

          {etapa === 'criar_senha' && (
            <>
              <p className="font-mono text-2xl sm:text-3xl font-medium text-white/90">
                Olá{nomeConvite ? `, ${nomeConvite.split(' ')[0]}` : ''}! Crie sua senha
              </p>
              <form onSubmit={criarSenha} className="mt-4 space-y-3">
                <input
                  type="password" required autoFocus value={senha} onChange={(e) => setSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full h-14 px-6 rounded-full bg-white/25 backdrop-blur-md border border-white/30 text-white placeholder:text-white/70 focus:outline-none focus:bg-white/35 focus:border-white/50 transition"
                />
                <input
                  type="password" required value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a senha"
                  className="w-full h-14 px-6 rounded-full bg-white/25 backdrop-blur-md border border-white/30 text-white placeholder:text-white/70 focus:outline-none focus:bg-white/35 focus:border-white/50 transition"
                />
                <button
                  type="submit" disabled={carregando}
                  className="w-full h-14 rounded-full bg-white/25 backdrop-blur-md border border-white/30 text-white font-semibold hover:bg-white/35 transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {carregando ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                  {carregando ? 'Criando…' : 'Criar senha e entrar'}
                </button>
                <button type="button" onClick={voltar} className="w-full text-sm text-white/70 hover:text-white transition">
                  Trocar e-mail
                </button>
              </form>
            </>
          )}

          {erro && <p role="alert" className="mt-3 text-sm text-white bg-red-500/25 backdrop-blur-md border border-red-200/30 px-4 py-3 rounded-2xl">{erro}</p>}
          {aviso && <p role="status" className="mt-3 text-sm text-white bg-[#3FD08A]/25 backdrop-blur-md border border-white/20 px-4 py-3 rounded-2xl">{aviso}</p>}

          <Link to="/" className="mt-5 inline-block text-sm text-white/80 hover:text-white">← Voltar ao início</Link>
          <p className="mt-4 text-sm text-white/80">
            Quer ser Slark?{' '}
            <a href="https://wa.me/5511945699915" target="_blank" rel="noopener" className="text-white hover:underline font-medium">
              Entre em contato.
            </a>
          </p>
          </div>
        </div>
      </div>
    </div>
  )
}
