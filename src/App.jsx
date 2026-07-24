import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import RotaProtegida from './components/RotaProtegida'
import AppLayout from './components/AppLayout'
import Login from './pages/Login'
import Perfil from './pages/Perfil'
import AdminInicio from './pages/admin/AdminInicio'
import AdminMetricas from './pages/admin/AdminMetricas'
import AdminEscolas from './pages/admin/AdminEscolas'
import AdminAlunos from './pages/admin/AdminAlunos'
import AdminTurmas from './pages/admin/AdminTurmas'
import AdminProfessores from './pages/admin/AdminProfessores'
import AdminPontuacao from './pages/admin/AdminPontuacao'
import AdminFinanceiro from './pages/admin/AdminFinanceiro'
import AdminFeceap from './pages/admin/AdminFeceap'
import AdminLeads from './pages/admin/AdminLeads'
import AdminUsuarios from './pages/admin/AdminUsuarios'
import DiretorInicio from './pages/diretor/DiretorInicio'
import DiretorSalas from './pages/diretor/DiretorSalas'
import DiretorProfessores from './pages/diretor/DiretorProfessores'
import DiretorFinanceiro from './pages/diretor/DiretorFinanceiro'
import DiretorCalendario from './pages/diretor/DiretorCalendario'
import DiretorNotas from './pages/diretor/DiretorNotas'
import DiretorRanking from './pages/diretor/DiretorRanking'
import ProfessorInicio from './pages/professor/ProfessorInicio'
import ProfessorSalas from './pages/professor/ProfessorSalas'
import ProfessorAlunos from './pages/professor/ProfessorAlunos'
import ProfessorObservacoes from './pages/professor/ProfessorObservacoes'
import ProfessorEquipes from './pages/professor/ProfessorEquipes'
import ProfessorInsignias from './pages/professor/ProfessorInsignias'
import ProfessorDesafios from './pages/professor/ProfessorDesafios'
import ProfessorPlacar from './pages/professor/ProfessorPlacar'
import ProfessorRelatorios from './pages/professor/ProfessorRelatorios'
import ProfessorTrilhas from './pages/professor/ProfessorTrilhas'
import ProfessorGabaritos from './pages/professor/ProfessorGabaritos'
import ProfessorProjetos from './pages/professor/ProfessorProjetos'
import ProfessorAulaSlark from './pages/professor/ProfessorAulaSlark'
import ProfessorRanking from './pages/professor/ProfessorRanking'
import AlunoInicio from './pages/aluno/AlunoInicio'
import AlunoCompetencias from './pages/aluno/AlunoCompetencias'
import AlunoAtividades from './pages/aluno/AlunoAtividades'
import AlunoTrilhas from './pages/aluno/AlunoTrilhas'
import AlunoTime from './pages/aluno/AlunoTime'
import AlunoChat from './pages/aluno/AlunoChat'
import AlunoRanking from './pages/aluno/AlunoRanking'
import NaoEncontrada from './pages/NaoEncontrada'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/perfil" element={<RotaProtegida><Perfil /></RotaProtegida>} />

          {/* ---------- EQUIPE SLARK (admin) ---------- */}
          <Route path="/admin" element={<RotaProtegida perfilNecessario="admin_slark"><AppLayout><AdminInicio /></AppLayout></RotaProtegida>} />
          <Route path="/admin/metricas" element={<RotaProtegida perfilNecessario="admin_slark"><AppLayout><AdminMetricas /></AppLayout></RotaProtegida>} />
          <Route path="/admin/escolas" element={<RotaProtegida perfilNecessario="admin_slark"><AppLayout><AdminEscolas /></AppLayout></RotaProtegida>} />
          <Route path="/admin/alunos" element={<RotaProtegida perfilNecessario="admin_slark"><AppLayout><AdminAlunos /></AppLayout></RotaProtegida>} />
          <Route path="/admin/turmas" element={<RotaProtegida perfilNecessario="admin_slark"><AppLayout><AdminTurmas /></AppLayout></RotaProtegida>} />
          <Route path="/admin/professores" element={<RotaProtegida perfilNecessario="admin_slark"><AppLayout><AdminProfessores /></AppLayout></RotaProtegida>} />
          <Route path="/admin/pontuacao" element={<RotaProtegida perfilNecessario="admin_slark"><AppLayout><AdminPontuacao /></AppLayout></RotaProtegida>} />
          <Route path="/admin/financeiro" element={<RotaProtegida perfilNecessario="admin_slark"><AppLayout><AdminFinanceiro /></AppLayout></RotaProtegida>} />
          <Route path="/admin/feceap" element={<RotaProtegida perfilNecessario="admin_slark"><AppLayout><AdminFeceap /></AppLayout></RotaProtegida>} />
          <Route path="/admin/leads" element={<RotaProtegida perfilNecessario="admin_slark"><AppLayout><AdminLeads /></AppLayout></RotaProtegida>} />
          <Route path="/admin/usuarios" element={<RotaProtegida perfilNecessario="admin_slark"><AppLayout><AdminUsuarios /></AppLayout></RotaProtegida>} />

          {/* ---------- DIRETOR ---------- */}
          <Route path="/diretor" element={<RotaProtegida perfilNecessario="diretor"><AppLayout><DiretorInicio /></AppLayout></RotaProtegida>} />
          <Route path="/diretor/salas" element={<RotaProtegida perfilNecessario="diretor"><AppLayout><DiretorSalas /></AppLayout></RotaProtegida>} />
          <Route path="/diretor/professores" element={<RotaProtegida perfilNecessario="diretor"><AppLayout><DiretorProfessores /></AppLayout></RotaProtegida>} />
          <Route path="/diretor/financeiro" element={<RotaProtegida perfilNecessario="diretor"><AppLayout><DiretorFinanceiro /></AppLayout></RotaProtegida>} />
          <Route path="/diretor/calendario" element={<RotaProtegida perfilNecessario="diretor"><AppLayout><DiretorCalendario /></AppLayout></RotaProtegida>} />
          <Route path="/diretor/notas" element={<RotaProtegida perfilNecessario="diretor"><AppLayout><DiretorNotas /></AppLayout></RotaProtegida>} />
          <Route path="/diretor/ranking" element={<RotaProtegida perfilNecessario="diretor"><AppLayout><DiretorRanking /></AppLayout></RotaProtegida>} />

          {/* ---------- PROFESSOR ---------- */}
          <Route path="/professor" element={<RotaProtegida perfilNecessario="professor"><AppLayout><ProfessorInicio /></AppLayout></RotaProtegida>} />
          <Route path="/professor/salas" element={<RotaProtegida perfilNecessario="professor"><AppLayout><ProfessorSalas /></AppLayout></RotaProtegida>} />
          <Route path="/professor/alunos" element={<RotaProtegida perfilNecessario="professor"><AppLayout><ProfessorAlunos /></AppLayout></RotaProtegida>} />
          <Route path="/professor/observacoes" element={<RotaProtegida perfilNecessario="professor"><AppLayout><ProfessorObservacoes /></AppLayout></RotaProtegida>} />
          <Route path="/professor/equipes" element={<RotaProtegida perfilNecessario="professor"><AppLayout><ProfessorEquipes /></AppLayout></RotaProtegida>} />
          <Route path="/professor/insignias" element={<RotaProtegida perfilNecessario="professor"><AppLayout><ProfessorInsignias /></AppLayout></RotaProtegida>} />
          <Route path="/professor/desafios" element={<RotaProtegida perfilNecessario="professor"><AppLayout><ProfessorDesafios /></AppLayout></RotaProtegida>} />
          <Route path="/professor/placar" element={<RotaProtegida perfilNecessario="professor"><AppLayout><ProfessorPlacar /></AppLayout></RotaProtegida>} />
          <Route path="/professor/relatorios" element={<RotaProtegida perfilNecessario="professor"><AppLayout><ProfessorRelatorios /></AppLayout></RotaProtegida>} />
          <Route path="/professor/trilhas" element={<RotaProtegida perfilNecessario="professor"><AppLayout><ProfessorTrilhas /></AppLayout></RotaProtegida>} />
          <Route path="/professor/gabaritos" element={<RotaProtegida perfilNecessario="professor"><AppLayout><ProfessorGabaritos /></AppLayout></RotaProtegida>} />
          <Route path="/professor/projetos" element={<RotaProtegida perfilNecessario="professor"><AppLayout><ProfessorProjetos /></AppLayout></RotaProtegida>} />
          <Route path="/professor/aula-slark" element={<RotaProtegida perfilNecessario="professor"><AppLayout><ProfessorAulaSlark /></AppLayout></RotaProtegida>} />
          <Route path="/professor/ranking" element={<RotaProtegida perfilNecessario="professor"><AppLayout><ProfessorRanking /></AppLayout></RotaProtegida>} />

          {/* ---------- ALUNO ---------- */}
          <Route path="/aluno" element={<RotaProtegida perfilNecessario="aluno"><AppLayout><AlunoInicio /></AppLayout></RotaProtegida>} />
          <Route path="/aluno/competencias" element={<RotaProtegida perfilNecessario="aluno"><AppLayout><AlunoCompetencias /></AppLayout></RotaProtegida>} />
          <Route path="/aluno/atividades" element={<RotaProtegida perfilNecessario="aluno"><AppLayout><AlunoAtividades /></AppLayout></RotaProtegida>} />
          <Route path="/aluno/trilhas" element={<RotaProtegida perfilNecessario="aluno"><AppLayout><AlunoTrilhas /></AppLayout></RotaProtegida>} />
          <Route path="/aluno/time" element={<RotaProtegida perfilNecessario="aluno"><AppLayout><AlunoTime /></AppLayout></RotaProtegida>} />
          <Route path="/aluno/chat" element={<RotaProtegida perfilNecessario="aluno"><AppLayout><AlunoChat /></AppLayout></RotaProtegida>} />
          <Route path="/aluno/ranking" element={<RotaProtegida perfilNecessario="aluno"><AppLayout><AlunoRanking /></AppLayout></RotaProtegida>} />

          <Route path="*" element={<NaoEncontrada />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
