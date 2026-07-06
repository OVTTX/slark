import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { carregarPerfil } from '../lib/supabase'
import { HOME_POR_PERFIL } from '../lib/rotasPorPerfil'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function Login() {
  const { entrar } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const landing = import.meta.env.VITE_LANDING_URL || '#'

  const submeter = async (e) => {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      const { data, error } = await entrar(email, senha)
      if (error) throw error
      const perfil = await carregarPerfil(data.user.id)
      navigate(HOME_POR_PERFIL[perfil.perfil] || '/professor')
    } catch (err) {
      setErro('E-mail ou senha incorretos. Tente novamente.')
    } finally {
      setCarregando(false)
    }
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

          <h2 className="text-3xl font-bold text-white tracking-tight">Entrar no app</h2>
          <p className="mt-2 text-texto/60">Acesse o painel da sua escola.</p>

          <form onSubmit={submeter} className="mt-8 space-y-5">
            <div>
              <label className="block text-sm font-medium text-texto/70 mb-2">E-mail</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@escola.com.br"
                className="w-full px-4 py-3 rounded-xl bg-card border border-azul/15 text-white placeholder:text-texto/30 focus:outline-none focus:border-azul transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-texto/70 mb-2">Senha</label>
              <input
                type="password" required value={senha} onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-card border border-azul/15 text-white placeholder:text-texto/30 focus:outline-none focus:border-azul transition"
              />
            </div>

            {erro && <p className="text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

            <button
              type="submit" disabled={carregando}
              className="w-full py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {carregando && <Loader2 size={18} className="animate-spin" />}
              {carregando ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

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
