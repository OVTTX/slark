import { faixaTermometro } from '../lib/engajamento'

// Linha compacta de termômetro — usada em listas (alunos, equipes, salas, escolas).
export function TermometroBarra({ nome, sub, valor, semDados }) {
  const faixa = faixaTermometro(valor)
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="w-32 sm:w-44 shrink-0">
        <div className="text-sm font-medium text-white truncate">{nome}</div>
        {sub && <div className="text-xs text-texto/45 truncate">{sub}</div>}
      </div>
      <div className="flex-1 h-2.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${semDados ? 0 : Math.max(3, valor)}%`, background: faixa.cor }}
        />
      </div>
      <div className="w-24 sm:w-28 shrink-0 text-right">
        {semDados ? (
          <span className="text-xs text-texto/40">sem dados</span>
        ) : (
          <span className="text-xs font-semibold" style={{ color: faixa.cor }}>{valor}% · {faixa.nome}</span>
        )}
      </div>
    </div>
  )
}

// Termômetro grande (tubo + bulbo) — usado como resumo geral no topo da página.
export function TermometroGrande({ valor, label = 'Geral', semDados = false }) {
  const faixa = faixaTermometro(valor)
  const alturaTubo = 110
  const preenchido = semDados ? 0 : Math.max(6, (valor / 100) * alturaTubo)

  return (
    <div className="flex items-center gap-4">
      <svg width="40" height="150" viewBox="0 0 40 150" className="shrink-0">
        <rect x="12" y="8" width="16" height={alturaTubo} rx="8" fill="rgb(var(--c-onbg) / .08)" />
        <rect x="12" y={8 + (alturaTubo - preenchido)} width="16" height={preenchido} rx="8" fill={faixa.cor} style={{ transition: 'height .3s, y .3s' }} />
        <circle cx="20" cy="128" r="16" fill={semDados ? 'rgb(var(--c-onbg) / .12)' : faixa.cor} />
        <circle cx="20" cy="128" r="8" fill="rgb(var(--c-bg))" opacity="0.3" />
      </svg>
      <div>
        <div className="text-3xl font-bold text-white">{semDados ? '—' : `${valor}%`}</div>
        <div className="text-sm font-semibold mt-0.5" style={{ color: semDados ? 'rgb(var(--c-texto) / .45)' : faixa.cor }}>
          {semDados ? 'Sem dados ainda' : faixa.nome}
        </div>
        <div className="text-xs text-texto/45 mt-0.5">{label}</div>
      </div>
    </div>
  )
}
