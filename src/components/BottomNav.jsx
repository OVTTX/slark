import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutGrid, School, Users, Eye, UsersRound, Award, Target, Trophy,
  BarChart3, BookOpen, ClipboardList, GraduationCap, DollarSign,
  Calendar, FileText, Building2, CreditCard, LogOut, ArrowLeft, ListChecks,
  Kanban, UserPlus,
} from 'lucide-react'

// Menus por perfil (espelham as telas do app real)
const MENUS = {
  admin_slark: [
    { to: '/admin', label: 'Visão Geral', icon: LayoutGrid, end: true },
    { to: '/admin/escolas', label: 'Escolas', icon: Building2 },
    { to: '/admin/alunos', label: 'Alunos', icon: Users },
    { to: '/admin/pontuacao', label: 'Pontuação Global', icon: Trophy },
    { to: '/admin/assinaturas', label: 'Assinaturas', icon: CreditCard },
    { to: '/admin/pagamentos', label: 'Pagamentos', icon: DollarSign },
    { to: '/admin/leads', label: 'Leads', icon: UserPlus },
    { to: '/admin/feceap', label: 'FeCEAP', icon: Kanban },
  ],
  diretor: [
    { to: '/diretor', label: 'Início', icon: LayoutGrid, end: true },
    { to: '/diretor/salas', label: 'Salas', icon: School },
    { to: '/diretor/professores', label: 'Professores', icon: Users },
    { to: '/diretor/financeiro', label: 'Financeiro', icon: DollarSign },
    { to: '/diretor/calendario', label: 'Calendário', icon: Calendar },
    { to: '/diretor/notas', label: 'Notas', icon: FileText },
    { to: '/diretor/ranking', label: 'Ranking', icon: Trophy },
  ],
  professor: [
    { to: '/professor', label: 'Dashboard', icon: LayoutGrid, end: true },
    { to: '/professor/salas', label: 'Salas', icon: School },
    { to: '/professor/alunos', label: 'Alunos', icon: Users },
    { to: '/professor/observacoes', label: 'Observações', icon: Eye },
    { to: '/professor/equipes', label: 'Equipes', icon: UsersRound },
    { to: '/professor/insignias', label: 'Insígnias', icon: Award },
    { to: '/professor/desafios', label: 'Desafios', icon: Target },
    { to: '/professor/placar', label: 'Placar Equipes', icon: Trophy },
    { to: '/professor/relatorios', label: 'Relatórios', icon: BarChart3 },
    { to: '/professor/trilhas', label: 'Trilhas', icon: BookOpen },
    { to: '/professor/gabaritos', label: 'Gabaritos', icon: ListChecks },
    { to: '/professor/notas', label: 'Notas', icon: ClipboardList },
    { to: '/professor/aula-slark', label: 'Aula Slark', icon: GraduationCap },
    { to: '/professor/ranking', label: 'Ranking', icon: Trophy },
  ],
  aluno: [
    { to: '/aluno', label: 'Meu Painel', icon: LayoutGrid, end: true },
    { to: '/aluno/competencias', label: 'Mapa de Competências', icon: Target },
    { to: '/aluno/atividades', label: 'Atividades', icon: ClipboardList },
    { to: '/aluno/trilhas', label: 'Trilhas', icon: BookOpen },
    { to: '/aluno/time', label: 'Meu Time', icon: UsersRound },
    { to: '/aluno/chat', label: 'Chat', icon: Eye },
    { to: '/aluno/ranking', label: 'Ranking', icon: Trophy },
  ],
}

const botaoBase = 'shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition'

export default function BottomNav() {
  const { perfil, sair } = useAuth()
  const navigate = useNavigate()
  const menu = MENUS[perfil?.perfil] || []
  const landing = import.meta.env.VITE_LANDING_URL || '#'

  const handleSair = async () => {
    await sair()
    navigate('/login')
  }

  return (
    <nav
      className="fixed left-1/2 -translate-x-1/2 z-50 max-w-[95vw]"
      style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center gap-0.5 sm:gap-1 px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-full bg-white/[0.06] backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 overflow-x-auto">
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

        <a href={landing} title="Voltar ao site" className={`${botaoBase} text-texto/50 hover:text-white hover:bg-white/10`}>
          <ArrowLeft size={17} />
        </a>

        <button onClick={handleSair} title="Sair" className={`${botaoBase} text-texto/50 hover:text-red-400 hover:bg-red-400/10`}>
          <LogOut size={17} />
        </button>
      </div>
    </nav>
  )
}
