import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import {
  LayoutGrid, School, Users, Eye, UsersRound, Target, Trophy,
  BarChart3, BookOpen, GraduationCap, DollarSign,
  Calendar, FileText, Building2, CreditCard, LogOut, ListChecks,
  Kanban, UserPlus, Wallet, ShieldCheck, Sun, Moon,
  ClipboardList, Bell,
} from 'lucide-react'

// Menus por perfil (espelham as telas do app real)
const MENUS = {
  admin_slark: [
    { to: '/admin', label: 'Visão Geral', icon: LayoutGrid, end: true },
    { to: '/admin/metricas', label: 'Métricas', icon: BarChart3 },
    { to: '/admin/escolas', label: 'Escolas', icon: Building2 },
    { to: '/admin/turmas', label: 'Turmas', icon: School },
    { to: '/admin/professores', label: 'Professores', icon: GraduationCap },
    { to: '/admin/alunos', label: 'Alunos', icon: Users },
    { to: '/admin/pontuacao', label: 'Pontuação Global', icon: Trophy },
    { to: '/admin/financeiro', label: 'Financeiro', icon: Wallet },
    { to: '/admin/leads', label: 'Leads', icon: UserPlus },
    { to: '/admin/feceap', label: 'FeCEAP', icon: Kanban },
    { to: '/admin/usuarios', label: 'Usuários Admin', icon: ShieldCheck },
  ],
  diretor: [
    { to: '/diretor', label: 'Início', icon: LayoutGrid, end: true },
    { to: '/diretor/alunos', label: 'Alunos', icon: Users },
    { to: '/diretor/salas', label: 'Salas', icon: School },
    { to: '/diretor/professores', label: 'Professores', icon: Users },
    { to: '/diretor/materias', label: 'Matérias', icon: BookOpen },
    { to: '/diretor/financeiro', label: 'Financeiro', icon: DollarSign },
    { to: '/diretor/calendario', label: 'Calendário', icon: Calendar },
    { to: '/diretor/aprendizado', label: 'Aprendizado', icon: FileText },
    { to: '/diretor/ranking', label: 'Ranking', icon: Trophy },
  ],
  professor: [
    { to: '/professor', label: 'Dashboard', icon: LayoutGrid, end: true },
    { to: '/professor/salas', label: 'Salas', icon: School },
    { to: '/professor/alunos', label: 'Alunos', icon: Users },
    { to: '/professor/observacoes', label: 'Observações', icon: Eye },
    { to: '/professor/equipes', label: 'Equipes', icon: UsersRound },
    { to: '/professor/desafios', label: 'Desafios', icon: Target },
    { to: '/professor/relatorios', label: 'Relatórios', icon: BarChart3 },
    { to: '/professor/trilhas', label: 'Trilhas', icon: BookOpen },
    { to: '/professor/gabaritos', label: 'Gabaritos', icon: ListChecks },
    { to: '/professor/aprendizado', label: 'Aprendizado', icon: ClipboardList },
    { to: '/professor/aula-slark', label: 'Aula Slark', icon: GraduationCap },
    { to: '/professor/ranking', label: 'Ranking', icon: Trophy },
  ],
  aluno: [
    { to: '/aluno', label: 'Meu Painel', icon: LayoutGrid, end: true },
    { to: '/aluno/notificacoes', label: 'Notificações', icon: Bell },
    { to: '/aluno/boletim', label: 'Boletim', icon: ClipboardList },
    { to: '/aluno/competencias', label: 'Mapa de Competências', icon: Target },
    { to: '/aluno/trilhas', label: 'Trilhas', icon: BookOpen },
    { to: '/aluno/time', label: 'Meu Time', icon: UsersRound },
    { to: '/aluno/ranking', label: 'Ranking', icon: Trophy },
  ],
}

const botaoBase = 'shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition'

export default function BottomNav() {
  const { perfil, sair } = useAuth()
  const { tema, alternarTema } = useTheme()
  const navigate = useNavigate()
  const menu = MENUS[perfil?.perfil] || []
  const landing = import.meta.env.VITE_LANDING_URL || '#'
  const [aberto, setAberto] = useState(false)

  const handleSair = async () => {
    setAberto(false)
    await sair()
    navigate('/login')
  }

  return (
    <>
      {/* Desktop/tablet: menu em pílula, como antes */}
      <nav
        className="hidden sm:block fixed left-1/2 -translate-x-1/2 z-50 max-w-[95vw]"
        style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center gap-1 px-2.5 py-2 rounded-full bg-white/[0.06] backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 overflow-x-auto">
          {/* Logo pequeno */}
          <a
            href={landing}
            title="Site da Slark"
            className={`${botaoBase} font-mono font-bold text-white/80 hover:text-white hover:bg-white/10`}
          >
            S
          </a>

          <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />

          {menu.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={label}
              className={({ isActive }) =>
                `${botaoBase} ${isActive ? 'bg-azul text-white shadow-lg shadow-azul/40' : 'text-texto/60 hover:text-white hover:bg-white/10'}`
              }
            >
              <Icon size={18} />
            </NavLink>
          ))}

          <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />

          <NavLink
            to="/perfil"
            title={perfil?.nome || 'Perfil'}
            className={({ isActive }) =>
              `shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center overflow-hidden transition ${isActive ? 'ring-2 ring-azul' : 'hover:ring-2 hover:ring-white/20'}`
            }
          >
            {perfil?.avatar_url ? (
              <img src={perfil.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="w-full h-full bg-azul/30 flex items-center justify-center text-white text-xs font-mono">
                {perfil?.nome?.[0]?.toUpperCase() || 'U'}
              </span>
            )}
          </NavLink>

          <button
            onClick={alternarTema}
            title={tema === 'claro' ? 'Mudar para modo escuro' : 'Mudar para modo claro'}
            className={`${botaoBase} text-texto/50 hover:text-white hover:bg-white/10`}
          >
            {tema === 'claro' ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          <button onClick={handleSair} title="Sair" className={`${botaoBase} text-texto/50 hover:text-red-400 hover:bg-red-400/10`}>
            <LogOut size={17} />
          </button>
        </div>
      </nav>

      {/* Mobile: bolinha no canto que abre um menu retrátil, só com texto */}
      <button
        onClick={() => setAberto((v) => !v)}
        className="sm:hidden fixed right-4 z-[60] w-14 h-14 rounded-full bg-azul text-white font-display font-semibold text-[13px] tracking-tight shadow-2xl shadow-azul/40 border border-white/10 flex items-center justify-center active:scale-95 transition"
        style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        {aberto ? 'Fechar' : 'Menu'}
      </button>

      {aberto && (
        <div className="sm:hidden fixed inset-0 z-50 bg-bg/97 backdrop-blur-xl flex flex-col" onClick={() => setAberto(false)}>
          <div className="flex-1 overflow-y-auto px-8 pt-20 pb-8" onClick={(e) => e.stopPropagation()}>
            <a href={landing} className="block text-texto/40 font-mono text-sm mb-8" onClick={() => setAberto(false)}>
              Slark
            </a>

            <div className="flex flex-col gap-1">
              {menu.map(({ to, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setAberto(false)}
                  className={({ isActive }) =>
                    `py-3 text-3xl font-display font-semibold tracking-tight transition ${isActive ? 'text-azul' : 'text-white/90'}`
                  }
                >
                  {label}
                </NavLink>
              ))}

              <NavLink
                to="/perfil"
                onClick={() => setAberto(false)}
                className={({ isActive }) => `py-3 text-3xl font-display font-semibold tracking-tight transition ${isActive ? 'text-azul' : 'text-white/90'}`}
              >
                Perfil
              </NavLink>
            </div>
          </div>

          <div
            className="px-8 pb-8 flex items-center gap-3"
            style={{ paddingBottom: 'max(2rem, calc(env(safe-area-inset-bottom) + 1.5rem))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={alternarTema}
              className="flex-1 py-3.5 rounded-full bg-white/5 border border-white/10 text-texto/70 font-semibold text-sm"
            >
              {tema === 'claro' ? 'Modo escuro' : 'Modo claro'}
            </button>
            <button
              onClick={handleSair}
              className="flex-1 py-3.5 rounded-full bg-white/10 border border-white/10 text-white font-semibold text-sm"
            >
              Sair
            </button>
          </div>
        </div>
      )}
    </>
  )
}
