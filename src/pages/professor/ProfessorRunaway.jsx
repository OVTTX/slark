import MateriaisRunaway from '../../components/runaway/MateriaisRunaway'

export default function ProfessorRunaway() {
  return (
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight">Apostilas Runaway</h1>
      <p className="mt-2 text-texto/60">Cadastre e organize o material das apostilas Runaway pros seus alunos.</p>
      <MateriaisRunaway gerencia />
    </div>
  )
}
