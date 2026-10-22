import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BottomNav from './BottomNav'
import LogoSlark from './LogoSlark'
import '../styles/slark-app.css'

const PERFIS = { admin_slark: 'Equipe Slark', diretor: 'Diretor', professor: 'Professor', aluno: 'Estudante' }

// All application routes share the same visual system; page grids and actions stay in place.
export default function AppLayout({ children }) {
  const { perfil } = useAuth()
  return (
    <div className="slark-app min-h-screen bg-bg text-texto font-display overflow-x-clip relative isolate">
      <div className="app-universe" aria-hidden="true"><span /><span /><span /></div>
      <a href="#app-conteudo" className="app-skip">Pular para o conteúdo</a>
      <header className="app-topbar">
        <Link to={perfil?.perfil === 'admin_slark' ? '/admin' : `/${perfil?.perfil || 'aluno'}`} aria-label="Slark Educação, início" className="app-wordmark">
          <LogoSlark className="w-28 h-auto" /><span>Educação</span>
        </Link>
        <p className="app-signature">Cada mente é um <strong>universo.</strong></p>
        <Link to="/perfil" className="app-profile-chip" aria-label="Abrir meu perfil">
          <span className="app-profile-dot" aria-hidden="true" />{PERFIS[perfil?.perfil] || 'Meu perfil'}
          <span className="app-profile-avatar" aria-hidden="true">{perfil?.avatar_url ? <img src={perfil.avatar_url} alt="" /> : perfil?.nome?.[0]?.toUpperCase() || 'U'}</span>
        </Link>
      </header>
      <main id="app-conteudo" className="w-full relative">
        <div className="app-content px-4 sm:px-8 pt-6 sm:pt-8 pb-28 sm:pb-32 max-w-[1500px] mx-auto">{children}</div>
      </main>
      <BottomNav />
    </div>
  )
}
