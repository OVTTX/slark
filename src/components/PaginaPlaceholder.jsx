// Placeholder padrão para telas ainda não construídas (fase a fase)
export default function PaginaPlaceholder({ titulo, subtitulo, descricao }) {
  return (
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight">{titulo}</h1>
      {subtitulo && <p className="mt-2 text-texto/60">{subtitulo}</p>}
      <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
        <div className="text-5xl mb-4">🚧</div>
        <p className="text-texto/70 max-w-md mx-auto leading-relaxed">
          {descricao || 'Esta tela faz parte da próxima fase de construção. A fundação e a navegação já estão prontas — o conteúdo entra em seguida.'}
        </p>
      </div>
    </div>
  )
}
