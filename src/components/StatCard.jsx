// Cartão de estatística no estilo "vidro" (glassmorphism) da nova identidade Slark:
// fundo translúcido com desfoque, borda fina de luz e um selo com o ícone no canto.
export default function StatCard({ icon: Icon, label, value, sub, valorCor = 'text-white' }) {
  return (
    <div className="relative rounded-3xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-7 min-h-[180px] flex flex-col justify-between overflow-hidden">
      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-azul/10 blur-2xl" />
      <div className="relative flex items-start justify-between gap-3">
        <span className="text-sm text-texto/60">{label}</span>
        {Icon && (
          <span className="shrink-0 w-10 h-10 rounded-full bg-black/30 border border-white/10 flex items-center justify-center text-white/90">
            <Icon size={17} />
          </span>
        )}
      </div>
      <div>
        <div className={`relative text-4xl font-bold ${valorCor}`}>{value}</div>
        {sub && <div className="relative mt-1.5 text-xs text-texto/45">{sub}</div>}
      </div>
    </div>
  )
}
