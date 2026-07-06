import { Link } from 'react-router-dom'

export default function NaoEncontrada() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg text-texto font-display p-8">
      <div className="max-w-md text-center">
        <div className="font-mono font-semibold text-azul text-sm tracking-widest uppercase mb-4">Erro 404</div>
        <h1 className="text-4xl font-bold text-white tracking-tight">Página não encontrada.</h1>
        <p className="mt-4 text-texto/60 leading-relaxed">
          O endereço que você tentou acessar não existe no app da Slark.
        </p>
        <Link to="/login" className="inline-block mt-6 px-6 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition">
          Ir para o login
        </Link>
      </div>
    </div>
  )
}
