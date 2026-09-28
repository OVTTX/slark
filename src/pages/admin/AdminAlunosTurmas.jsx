import { useState } from 'react'
import { Users, School } from 'lucide-react'
import AdminAlunos from './AdminAlunos'
import AdminTurmas from './AdminTurmas'

// Menu único que junta Alunos e Turmas (antes "Turmas" nem tinha item no menu
// do Admin — só existia a rota). As duas telas continuam exatamente como
// eram, só ganharam esse seletor de aba por cima.
export default function AdminAlunosTurmas({ abaInicial = 'alunos' }) {
  const [aba, setAba] = useState(abaInicial)

  return (
    <div>
      <div className="inline-flex rounded-xl bg-card border p-1">
        <button
          onClick={() => setAba('alunos')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${aba === 'alunos' ? 'bg-azul text-white' : 'text-texto/60 hover:text-white'}`}
        >
          <Users size={14} /> Alunos
        </button>
        <button
          onClick={() => setAba('turmas')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${aba === 'turmas' ? 'bg-azul text-white' : 'text-texto/60 hover:text-white'}`}
        >
          <School size={14} /> Turmas
        </button>
      </div>

      <div className="mt-6">
        {aba === 'alunos' ? <AdminAlunos /> : <AdminTurmas />}
      </div>
    </div>
  )
}
