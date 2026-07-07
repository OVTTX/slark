import { useState } from 'react'
import { GraduationCap, Clock, Package } from 'lucide-react'

const CATEGORIAS = [
  {
    nome: 'Quebra-gelo',
    cor: '#F5C451',
    dinamicas: [
      { titulo: 'Verdade ou mentira', duracao: '10 min', material: 'Nenhum', descricao: 'Cada aluno conta 3 fatos sobre si, sendo um falso. A turma vota em qual é a mentira.' },
      { titulo: 'Bingo humano', duracao: '15 min', material: 'Cartelas impressas', descricao: 'Alunos circulam pela sala buscando colegas que se encaixem em características de uma cartela.' },
    ],
  },
  {
    nome: 'Trabalho em equipe',
    cor: '#2E5BFF',
    dinamicas: [
      { titulo: 'Torre de espaguete', duracao: '25 min', material: 'Espaguete cru, fita crepe, barbante', descricao: 'Times competem para construir a torre mais alta que sustente um marshmallow no topo.' },
      { titulo: 'Quebra-cabeça cooperativo', duracao: '20 min', material: 'Peças de quebra-cabeça divididas entre grupos', descricao: 'Cada time recebe parte das peças e precisa negociar trocas com outros times para completar sua imagem.' },
    ],
  },
  {
    nome: 'Fixação de conteúdo',
    cor: '#3FD08A',
    dinamicas: [
      { titulo: 'Roleta de perguntas', duracao: '15 min', material: 'Roleta física ou digital com temas', descricao: 'Gire a roleta para sortear o tema; o aluno sorteado responde uma pergunta sobre o conteúdo da aula.' },
      { titulo: 'Batalha de equipes (quiz)', duracao: '20 min', material: 'Kahoot! (integrado à Slark)', descricao: 'Use um quiz do Kahoot! vinculado à trilha da aula para revisar o conteúdo em formato de competição.' },
    ],
  },
  {
    nome: 'Avaliação formativa',
    cor: '#C44DFF',
    dinamicas: [
      { titulo: 'Semáforo da compreensão', duracao: '5 min', material: 'Cartões verde/amarelo/vermelho', descricao: 'Ao final da explicação, peça que levantem o cartão que representa o quanto entenderam o conteúdo.' },
      { titulo: 'Bilhete de saída', duracao: '5 min', material: 'Papel ou formulário digital', descricao: 'Cada aluno escreve uma coisa que aprendeu e uma dúvida que ainda tem, antes de sair da aula.' },
    ],
  },
]

export default function ProfessorAulaSlark() {
  const [categoriaAtiva, setCategoriaAtiva] = useState(CATEGORIAS[0].nome)
  const categoria = CATEGORIAS.find((c) => c.nome === categoriaAtiva)

  return (
    <div>
      <div className="flex items-center gap-3">
        <GraduationCap className="text-azul" size={28} />
        <h1 className="text-4xl font-bold text-white tracking-tight">Aula Slark</h1>
      </div>
      <p className="mt-2 text-texto/60">Dinâmicas prontas para deixar sua aula mais leve e participativa.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {CATEGORIAS.map((c) => (
          <button
            key={c.nome} onClick={() => setCategoriaAtiva(c.nome)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition"
            style={{
              background: categoriaAtiva === c.nome ? c.cor : 'rgba(255,255,255,0.04)',
              color: categoriaAtiva === c.nome ? '#0B0F1A' : 'rgba(255,255,255,0.65)',
            }}
          >
            {c.nome}
          </button>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
        {categoria.dinamicas.map((d) => (
          <div key={d.titulo} className="rounded-2xl bg-card border p-6">
            <div className="font-bold text-white text-lg">{d.titulo}</div>
            <p className="text-sm text-texto/60 mt-2 leading-relaxed">{d.descricao}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-texto/50">
              <div className="flex items-center gap-1.5"><Clock size={13} /> {d.duracao}</div>
              <div className="flex items-center gap-1.5"><Package size={13} /> {d.material}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
