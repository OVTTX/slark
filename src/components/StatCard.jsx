// Cartão de estatística no estilo "vidro" (glassmorphism) da nova identidade Slark:
// fundo translúcido com desfoque, borda fina de luz e um selo com o ícone no canto.
export default function StatCard({ icon: Icon, label, value, sub, valorCor = 'text-white' }) {
  return (
    <div className="relative rounded-3xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-6 overflow-hidden">
      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-azul/10 blur-2xl" />
      <div className="relative flex items-start justify-between gap-3">
        <span className="text-sm text-texto/60">{label}</span>
        {Icon && (
          <span className="shrink-0 w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-azul">
            <Icon size={15} />
          </span>
        )}
      </div>
      <div className={`relative mt-2 text-3xl font-bold ${valorCor}`}>{value}</div>
      {sub && <div className="relative mt-1 text-xs text-texto/45">{sub}</div>}
    </div>
  )
}
