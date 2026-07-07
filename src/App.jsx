import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import RotaProtegida from './components/RotaProtegida'
import AppLayout from './components/AppLayout'
import PaginaPlaceholder from './components/PaginaPlaceholder'
import Login from './pages/Login'
import AdminInicio from './pages/admin/AdminInicio'
import AdminEscolas from './pages/admin/AdminEscolas'
import AdminAlunos from './pages/admin/AdminAlunos'
import AdminPontuacao from './pages/admin/AdminPontuacao'
import AdminAssinaturas from './pages/admin/AdminAssinaturas'
import AdminPagamentos from './pages/admin/AdminPagamentos'
import DiretorInicio from './pages/diretor/DiretorInicio'
import DiretorSalas from './pages/diretor/DiretorSalas'
import DiretorProfessores from './pages/diretor/DiretorProfessores'
import DiretorFinanceiro from './pages/diretor/DiretorFinanceiro'
import DiretorCalendario from './pages/diretor/DiretorCalendario'
import DiretorNotas from './pages/diretor/DiretorNotas'
import DiretorRanking from './pages/diretor/DiretorRanking'
import NaoEncontrada from './pages/NaoEncontrada'

// Helper para telas ainda não construídas, já dentro do layout do app
const Tela = (props) => (
  <AppLayout><PaginaPlaceholder {...props} /></AppLayout>
)

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />

          {/* ---------- EQUIPE SLARK (admin) ---------- */}
          <Route path="/admin" element={<RotaProtegida perfilNecessario="admin_slark"><AppLayout><AdminInicio /></AppLayout></RotaProtegida>} />
          <Route path="/admin/escolas" element={<RotaProtegida perfilNecessario="admin_slark"><AppLayout><AdminEscolas /></AppLayout></RotaProtegida>} />
          <Route path="/admin/alunos" element={<RotaProtegida perfilNecessario="admin_slark"><AppLayout><AdminAlunos /></AppLayout></RotaProtegida>} />
          <Route path="/admin/pontuacao" element={<RotaProtegida perfilNecessario="admin_slark"><AppLayout><AdminPontuacao /></AppLayout></RotaProtegida>} />
          <Route path="/admin/assinaturas" element={<RotaProtegida perfilNecessario="admin_slark"><AppLayout><AdminAssinaturas /></AppLayout></RotaProtegida>} />
          <Route path="/admin/pagamentos" element={<RotaProtegida perfilNecessario="admin_slark"><AppLayout><AdminPagamentos /></AppLayout></RotaProtegida>} />

          {/* ---------- DIRETOR ---------- */}
          <Route path="/diretor" element={<RotaProtegida perfilNecessario="diretor"><AppLayout><DiretorInicio /></AppLayout></RotaProtegida>} />
          <Route path="/diretor/salas" element={<RotaProtegida perfilNecessario="diretor"><AppLayout><DiretorSalas /></AppLayout></RotaProtegida>} />
          <Route path="/diretor/professores" element={<RotaProtegida perfilNecessario="diretor"><AppLayout><DiretorProfessores /></AppLayout></RotaProtegida>} />
          <Route path="/diretor/financeiro" element={<RotaProtegida perfilNecessario="diretor"><AppLayout><DiretorFinanceiro /></AppLayout></RotaProtegida>} />
          <Route path="/diretor/calendario" element={<RotaProtegida perfilNecessario="diretor"><AppLayout><DiretorCalendario /></AppLayout></RotaProtegida>} />
          <Route path="/diretor/notas" element={<RotaProtegida perfilNecessario="diretor"><AppLayout><DiretorNotas /></AppLayout></RotaProtegida>} />
          <Route path="/diretor/ranking" element={<RotaProtegida perfilNecessario="diretor"><AppLayout><DiretorRanking /></AppLayout></RotaProtegida>} />

          {/* ---------- PROFESSOR ---------- */}
          <Route path="/professor" element={<RotaProtegida perfilNecessario="professor"><Tela titulo="Dashboard" subtitulo="Visão geral das suas turmas." /></RotaProtegida>} />
          <Route path="/professor/salas" element={<RotaProtegida perfilNecessario="professor"><Tela titulo="Salas" /></RotaProtegida>} />
          <Route path="/professor/alunos" element={<RotaProtegida perfilNecessario="professor"><Tela titulo="Alunos" /></RotaProtegida>} />
          <Route path="/professor/observacoes" element={<RotaProtegida perfilNecessario="professor"><Tela titulo="Observações" /></RotaProtegida>} />
          <Route path="/professor/equipes" element={<RotaProtegida perfilNecessario="professor"><Tela titulo="Equipes" /></RotaProtegida>} />
          <Route path="/professor/insignias" element={<RotaProtegida perfilNecessario="professor"><Tela titulo="Insígnias" /></RotaProtegida>} />
          <Route path="/professor/desafios" element={<RotaProtegida perfilNecessario="professor"><Tela titulo="Desafios" /></RotaProtegida>} />
          <Route path="/professor/placar" element={<RotaProtegida perfilNecessario="professor"><Tela titulo="Placar Equipes" /></RotaProtegida>} />
          <Route path="/professor/relatorios" element={<RotaProtegida perfilNecessario="professor"><Tela titulo="Relatórios" /></RotaProtegida>} />
          <Route path="/professor/planos-ia" element={<RotaProtegida perfilNecessario="professor"><Tela titulo="Planos de Aula IA" /></RotaProtegida>} />
          <Route path="/professor/trilhas" element={<RotaProtegida perfilNecessario="professor"><Tela titulo="Trilhas de Aprendizado" subtitulo="Crie trilhas com textos, PDFs, links e artes do Canva." /></RotaProtegida>} />
          <Route path="/professor/gabaritos" element={<RotaProtegida perfilNecessario="professor"><Tela titulo="Gabaritos" subtitulo="Cadastre respostas e a IA gera o passo a passo." /></RotaProtegida>} />
          <Route path="/professor/notas" element={<RotaProtegida perfilNecessario="professor"><Tela titulo="Notas" /></RotaProtegida>} />
          <Route path="/professor/aula-slark" element={<RotaProtegida perfilNecessario="professor"><Tela titulo="Aula Slark" /></RotaProtegida>} />
          <Route path="/professor/ranking" element={<RotaProtegida perfilNecessario="professor"><Tela titulo="Ranking" /></RotaProtegida>} />

          {/* ---------- ALUNO ---------- */}
          <Route path="/aluno" element={<RotaProtegida perfilNecessario="aluno"><Tela titulo="Meu Painel" subtitulo="Seus pontos, selos e progresso." /></RotaProtegida>} />
          <Route path="/aluno/competencias" element={<RotaProtegida perfilNecessario="aluno"><Tela titulo="Mapa de Competências" /></RotaProtegida>} />
          <Route path="/aluno/atividades" element={<RotaProtegida perfilNecessario="aluno"><Tela titulo="Atividades" subtitulo="Entregue tarefas e veja o feedback da IA." /></RotaProtegida>} />
          <Route path="/aluno/trilhas" element={<RotaProtegida perfilNecessario="aluno"><Tela titulo="Trilhas" /></RotaProtegida>} />
          <Route path="/aluno/time" element={<RotaProtegida perfilNecessario="aluno"><Tela titulo="Meu Time" /></RotaProtegida>} />
          <Route path="/aluno/chat" element={<RotaProtegida perfilNecessario="aluno"><Tela titulo="Chat com o Professor" /></RotaProtegida>} />
          <Route path="/aluno/ranking" element={<RotaProtegida perfilNecessario="aluno"><Tela titulo="Ranking" /></RotaProtegida>} />

          <Route path="*" element={<NaoEncontrada />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
