import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutGrid, School, Users, Eye, UsersRound, Award, Target, Trophy,
  BarChart3, BookOpen, ClipboardList, GraduationCap, DollarSign,
  Calendar, FileText, Building2, CreditCard, LogOut, ArrowLeft, ListChecks,
  Settings,
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

const ROTULO_PERFIL = {
  admin_slark: 'Equipe Slark',
  diretor: 'Diretor',
  professor: 'Professor',
  aluno: 'Aluno',
}

export default function Sidebar() {
  const { perfil, sair } = useAuth()
  const navigate = useNavigate()
  const menu = MENUS[perfil?.perfil] || []
  const landing = import.meta.env.VITE_LANDING_URL || '#'

  const handleSair = async () => {
    await sair()
    navigate('/login')
  }

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 bg-bg-2 border-r flex flex-col">
      {/* Logo */}
      <div className="px-6 py-6 border-b">
        <a href={landing} className="font-mono font-semibold text-xl text-white tracking-tight">
          SLARK<span className="text-azul">.</span>
        </a>
      </div>

      {/* Badge de perfil */}
      <div className="px-4 pt-4">
        <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-azul/20 text-azul">
          {ROTULO_PERFIL[perfil?.perfil] || 'Usuário'}
        </span>
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {menu.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                isActive
                  ? 'bg-azul text-white shadow-lg shadow-azul/30'
                  : 'text-texto/65 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Rodapé: usuário + ações */}
      <div className="border-t px-4 py-4 space-y-3">
        <NavLink to="/perfil" className="flex items-center gap-3 rounded-xl px-2 py-1.5 -mx-2 hover:bg-white/5 transition group">
          {perfil?.avatar_url ? (
            <img src={perfil.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-azul/30 flex items-center justify-center text-white text-sm font-mono shrink-0">
              {perfil?.nome?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-white truncate">{perfil?.nome || 'Usuário'}</div>
            <div className="text-xs text-texto/50 truncate">{perfil?.email}</div>
          </div>
          <Settings size={15} className="text-texto/40 group-hover:text-white transition shrink-0" />
        </NavLink>
        <div className="flex items-center justify-between">
          <button onClick={handleSair} className="flex items-center gap-2 text-sm text-texto/65 hover:text-white transition">
            <LogOut size={16} /> Sair
          </button>
          <a href={landing} className="flex items-center gap-1.5 text-xs text-texto/45 hover:text-azul transition">
            <ArrowLeft size={14} /> Site
          </a>
        </div>
      </div>
    </aside>
  )
}
