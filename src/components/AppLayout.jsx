import { usePersonalizacao } from '../context/PersonalizacaoContext'
import { useRef } from 'react'
import { useAppEntrance } from '../hooks/useAppEntrance'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import DemoSwitcher from './DemoSwitcher'
import BottomNav from './BottomNav'
import LogoSlark from './LogoSlark'
import '../styles/slark-app.css'
import '../styles/slark-entry.css'
import '../styles/slark-custom.css'
import '../styles/slark-bento.css'

const PERFIS = { admin_slark: 'Equipe Slark', diretor: 'Diretor', professor: 'Professor', aluno: 'Estudante' }

// Bento is the default application layout; learning paths and notifications keep their original layout.
export default function AppLayout({ children }) {
  const { perfil } = useAuth()
  const { preferencias } = usePersonalizacao()
  const content = useRef(null)
  const { pathname } = useLocation()
  const layoutBento = !/(?:^|\/)(?:trilhas|notificacoes)(?:\/|$)/.test(pathname)
  useAppEntrance(content, pathname)
  return (
    <div data-skin={preferencias.skin} data-texto={preferencias.texto} data-moldura={preferencias.moldura} className="slark-app min-h-screen bg-bg text-texto font-display overflow-x-clip relative isolate">
      <div className="app-universe" aria-hidden="true"><svg className="app-orbit-art" viewBox="0 0 1120 720" fill="none"><g transform="rotate(-28 560 360)"><ellipse className="slark-draw-ring" pathLength="1" cx="560" cy="360" rx="540" ry="300" /><ellipse className="slark-draw-ring" pathLength="1" cx="560" cy="360" rx="410" ry="225" /><ellipse className="slark-draw-ring" pathLength="1" cx="560" cy="360" rx="280" ry="150" /><circle className="slark-entry-planet" cx="150" cy="360" r="4" /></g></svg></div>
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
      <DemoSwitcher />
      <main key={perfil?.id} id="app-conteudo" className="w-full relative">
        <div ref={content} data-page-layout={layoutBento ? 'bento' : 'original'} className="app-content px-4 sm:px-8 pt-6 sm:pt-8 pb-28 sm:pb-32 max-w-[1500px] mx-auto">{children}</div>
      </main>
      <BottomNav />
    </div>
  )
}
