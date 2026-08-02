import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase, carregarPerfil } from '../lib/supabase'
import { HOME_POR_PERFIL } from '../lib/rotasPorPerfil'
import { ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'

const EMAIL_DEMO_SUFIXO = '@slarkdemo.com.br'

// Fundo em degradê nas cores da marca (profundo → azul → quase-branco), com um
// feixe curvo mais claro cruzando a tela — mesma linguagem visual do mockup.
function FundoLogin() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 1280 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true"
    >
      <defs>
        <linearGradient id="baseLogin" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#03002E" />
          <stop offset="30%" stopColor="#03005B" />
          <stop offset="62%" stopColor="#0B39D6" />
          <stop offset="100%" stopColor="#2E5BFF" />
        </linearGradient>
        <radialGradient id="glowLogin" cx="88%" cy="92%" r="65%">
          <stop offset="0%" stopColor="#F3FAFF" stopOpacity="1" />
          <stop offset="40%" stopColor="#9FD6FF" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#2E5BFF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="poolLogin" cx="8%" cy="4%" r="45%">
          <stop offset="0%" stopColor="#010026" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#010026" stopOpacity="0" />
        </radialGradient>
        <filter id="blurLogin1" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="45" />
        </filter>
        <filter id="blurLogin2" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
      </defs>
      <rect width="1280" height="800" fill="url(#baseLogin)" />
      <rect width="1280" height="800" fill="url(#poolLogin)" />
      <rect width="1280" height="800" fill="url(#glowLogin)" />
      <path
        d="M -80 60 C 180 220, 300 380, 520 620 C 600 720, 700 780, 900 800"
        stroke="#BFE6FF" strokeOpacity="0.5" strokeWidth="70" fill="none" strokeLinecap="round"
        filter="url(#blurLogin1)"
      />
      <path
        d="M -80 60 C 180 220, 300 380, 520 620"
        stroke="#EAF7FF" strokeOpacity="0.55" strokeWidth="14" fill="none" strokeLinecap="round"
        filter="url(#blurLogin2)"
      />
    </svg>
  )
}

// Wordmark "SLARK" com o traço diagonal característico da marca cruzando o "A".
function LogoSlark({ className = '' }) {
  return (
    <span className={`relative inline-block font-mono font-medium tracking-tight ${className}`}>
      SLARK
      <span
        className="absolute left-[6%] top-1/2 w-[92%] h-[10%] bg-white/95 pointer-events-none"
        style={{ transform: 'translateY(-50%) rotate(-16deg)' }}
      />
    </span>
  )
}

// Input em formato de pílula + botão circular de enviar, no mesmo estilo "vidro"
// da referência visual — usado em cada etapa de um único campo.
function CampoComBotao({ tipo = 'text', valor, onChange, placeholder, carregando, autoFocus }) {
  return (
    <div className="mt-4 flex items-center gap-3">
      <input
        type={tipo} required autoFocus={autoFocus} value={valor} onChange={onChange}
        placeholder={placeholder}
        className="flex-1 min-w-0 h-14 px-6 rounded-full bg-white/25 backdrop-blur-md border border-white/30 text-white placeholder:text-white/70 focus:outline-none focus:bg-white/35 focus:border-white/50 transition"
      />
      <button
        type="submit" disabled={carregando}
        className="shrink-0 w-14 h-14 rounded-full bg-white/25 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:bg-white/35 transition disabled:opacity-60"
      >
        {carregando ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} />}
      </button>
    </div>
  )
}

export default function Login() {
  const { entrar } = useAuth()
  const navigate = useNavigate()

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
    <div className="min-h-screen w-full relative font-display overflow-hidden">
      <FundoLogin />

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">
        {/* Coluna esquerda: chamada de marca (some em telas pequenas) */}
        <div className="hidden lg:flex w-1/2 flex-col justify-end p-16">
          <h1 className="text-5xl xl:text-6xl font-medium text-white leading-[1.05] tracking-tight">
            O método que<br />enxega cada aluno.
          </h1>
        </div>

        {/* Coluna direita: marca + formulário */}
        <div className="flex-1 flex flex-col justify-between p-8 sm:p-12 lg:p-16">
          <div>
            <p className="text-3xl sm:text-4xl font-medium text-white leading-tight">Conheça a</p>
            <LogoSlark className="text-6xl sm:text-7xl text-white -mt-1" />
          </div>

          <div className="w-full max-w-md lg:ml-auto">
          {etapa === 'email' && (
            <>
              <p className="text-lg font-medium text-white/90">Faça Log-in</p>
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
              <p className="text-lg font-medium text-white/90 truncate">{email}</p>
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
              <p className="text-lg font-medium text-white/90">
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

          {erro && <p className="mt-3 text-sm text-white bg-red-500/25 backdrop-blur-md border border-red-200/30 px-4 py-3 rounded-2xl">{erro}</p>}
          {aviso && <p className="mt-3 text-sm text-white bg-[#3FD08A]/25 backdrop-blur-md border border-white/20 px-4 py-3 rounded-2xl">{aviso}</p>}

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
