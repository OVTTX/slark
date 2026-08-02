import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase, carregarPerfil } from '../lib/supabase'
import { HOME_POR_PERFIL } from '../lib/rotasPorPerfil'
import { ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'

const EMAIL_DEMO_SUFIXO = '@slarkdemo.com.br'

// Fundo em degradê nas cores da marca (profundo → azul → quase-branco), com um
// feixe curvo mais claro cruzando a tela — mesma linguagem visual do mockup.
// Fica dentro do cartão arredondado (glassmorphism retangular) que envolve a tela toda.
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

// Wordmark oficial "SLARK" (SVG da marca)
function LogoSlark({ className = '' }) {
  return (
    <svg viewBox="0 0 409 86" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M0 57.064H14.6822C15.1205 60.3561 16.4718 63.2459 18.7363 65.7333C21.0737 68.2207 24.1417 70.1594 27.94 71.5494C31.7384 72.8663 36.1212 73.5247 41.0883 73.5247C48.4659 73.5247 54.3096 72.3908 58.6193 70.1228C62.929 67.7818 65.0839 64.6359 65.0839 60.6853C65.0839 57.4664 63.8421 55.0521 61.3585 53.4426C58.875 51.8331 54.3826 50.626 47.8816 49.8212L30.1314 47.5167C20.1972 46.1999 12.9656 43.749 8.4368 40.1643C3.981 36.5063 1.7531 31.3486 1.7531 24.6911C1.7531 19.6432 3.25054 15.2902 6.24542 11.6323C9.31335 7.90117 13.6231 5.04797 19.1745 3.07268C24.726 1.02423 31.2271 0 38.6778 0C46.0554 0 52.593 1.09739 58.2906 3.29216C63.9882 5.48692 68.517 8.5596 71.8771 12.5102C75.3103 16.3876 77.173 20.96 77.4651 26.2275H62.7829C62.4177 23.3011 61.1759 20.7771 59.0576 18.6555C57.0123 16.5339 54.2366 14.8878 50.7304 13.7173C47.2242 12.4736 43.0971 11.8518 38.3491 11.8518C31.6289 11.8518 26.26 12.9491 22.2425 15.1439C18.2249 17.3387 16.2162 20.3382 16.2162 24.1425C16.2162 27.0688 17.3849 29.3367 19.7224 30.9462C22.1329 32.4826 26.2965 33.6531 32.2132 34.4579L50.1825 36.9818C57.5601 38.0061 63.3673 39.3961 67.604 41.1519C71.9137 42.8346 74.9816 45.1391 76.8077 48.0654C78.6339 50.9186 79.547 54.6132 79.547 59.149C79.547 64.4164 77.9399 69.0255 74.7259 72.976C71.5119 76.9266 66.9831 79.9993 61.1394 82.1941C55.3688 84.3157 48.612 85.3765 40.8692 85.3765C32.9802 85.3765 26.0043 84.2059 19.9415 81.8649C13.9518 79.4506 9.20378 76.1219 5.69758 71.8787C2.19138 67.6354 0.292183 62.6972 0 57.064Z" fill="white"/>
      <path d="M98.6924 1.53634V77.3656L92.2278 71.1105H154.134V83.8401H84.2293V1.53634H98.6924Z" fill="white"/>
      <path d="M123.781 63.2701V50.9186H197.352L210.355 63.1044L123.781 63.2701ZM205.443 1.53634L244.888 83.8401H229.439L193.61 7.02326H199.198L163.369 83.8401H147.92L187.364 1.53634H205.443Z" fill="white"/>
      <path d="M184.758 39.3342L289.637 38.6279C294.458 38.6279 298.257 37.5305 301.033 35.3358C303.881 33.141 305.306 30.1415 305.306 26.3372C305.306 22.4598 303.881 19.4603 301.033 17.3387C298.257 15.1439 294.458 14.0465 289.637 14.0465H268.09H260.602V83.8401H246.139V1.53634H290.952C296.723 1.53634 301.763 2.59714 306.073 4.71876C310.455 6.76721 313.852 9.65698 316.263 13.3881C318.746 17.046 319.988 21.3624 319.988 26.3372C319.988 31.1657 318.746 35.4455 316.263 39.1766C313.852 42.8346 310.455 45.7243 306.073 47.8459C301.763 49.8944 296.723 50.9186 290.952 50.9186H197.352L184.758 39.3342ZM272.435 45.322H289.418L322.07 83.8401H304.758L272.435 45.322Z" fill="white"/>
      <path d="M326.184 83.8401V1.53634H340.647V71.6592L336.264 68.9157L391.268 1.53634H406.936L339.113 83.8401H326.184ZM365.3 42.4688L375.49 32.4826L408.141 83.8401H391.596L365.3 42.4688Z" fill="white"/>
    </svg>
  )
}

// Input em formato de pílula + botão circular de enviar, no mesmo estilo "vidro"
// da referência visual — usado em cada etapa de um único campo.
function CampoComBotao({ tipo = 'text', valor, onChange, placeholder, carregando, autoFocus }) {
  return (
    <div className="mt-5 flex items-center gap-3">
      <input
        type={tipo} required autoFocus={autoFocus} value={valor} onChange={onChange}
        placeholder={placeholder}
        className="flex-1 min-w-0 h-16 px-7 text-lg rounded-full bg-white/25 backdrop-blur-md border border-white/30 text-white placeholder:text-white/70 focus:outline-none focus:bg-white/35 focus:border-white/50 transition"
      />
      <button
        type="submit" disabled={carregando}
        className="shrink-0 w-16 h-16 rounded-full bg-white/25 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:bg-white/35 transition disabled:opacity-60"
      >
        {carregando ? <Loader2 size={24} className="animate-spin" /> : <ArrowRight size={24} />}
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
        {/* Coluna esquerda: chamada de marca (some em telas pequenas), sobre o degradê cru */}
        <div className="hidden lg:flex w-1/2 flex-col justify-end p-16">
          <h1 className="font-mono text-5xl xl:text-6xl font-medium text-white leading-[1.05] tracking-tight">
            O método que<br />enxega cada aluno.
          </h1>
        </div>

        {/* Coluna direita: painel retangular em glassmorphism — a "divisória" entre as duas metades */}
        <div className="flex-1 flex flex-col justify-between p-8 sm:p-12 lg:p-16 bg-white/10 backdrop-blur-2xl border-l border-white/20">
          <div>
            <p className="font-mono text-4xl sm:text-5xl font-medium text-white leading-tight">Conheça a</p>
            <LogoSlark className="w-72 sm:w-96 h-auto -mt-1" />
          </div>

          <div className="w-full max-w-lg lg:ml-auto">
          {etapa === 'email' && (
            <>
              <p className="font-mono text-2xl sm:text-3xl font-medium text-white/90">Faça Log-in</p>
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
