// Mapa de competências: radar poligonal (losango pra 4 eixos) que mostra o
// PERFIL DE CARACTERÍSTICAS do aluno — não é sobre pontos, é sobre o quanto
// cada traço (Criativo, Detalhista, Observador, Raciocínio...) foi observado
// nele. Eixos igualmente espaçados a partir do topo, forma preenchida ligando
// os valores com linhas retas, grade guia tracejada por trás.
export default function MapaRadial({ dados, tamanho = 340 }) {
  const n = dados.length
  if (n < 3) return null

  const cx = tamanho / 2
  const cy = tamanho / 2
  const maxR = tamanho / 2 - 56 // espaço pra sobrar pro rótulo do lado de fora
  const inicio = -Math.PI / 2 // primeiro eixo no topo
  const anguloPasso = (2 * Math.PI) / n

  function polar(raio, angulo) {
    return [cx + raio * Math.cos(angulo), cy + raio * Math.sin(angulo)]
  }

  const eixos = dados.map((item, i) => {
    const ang = inicio + anguloPasso * i
    const raioValor = Math.max(8, (item.valor / 100) * maxR)
    const [vx, vy] = polar(raioValor, ang)
    const [gx, gy] = polar(maxR, ang)
    const [lx, ly] = polar(maxR + 28, ang)
    return { ...item, vx, vy, gx, gy, lx, ly, id: i }
  })

  const pontosGuia = eixos.map((e) => `${e.gx.toFixed(1)},${e.gy.toFixed(1)}`).join(' ')
  const pontosValor = eixos.map((e) => `${e.vx.toFixed(1)},${e.vy.toFixed(1)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${tamanho} ${tamanho}`} width="100%" style={{ maxWidth: tamanho, display: 'block', margin: '0 auto' }}>
      <defs>
        <linearGradient id="tracoGradiente" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6FA8FF" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#0033FF" stopOpacity="0.92" />
        </linearGradient>
      </defs>

      {/* grade guia: contorno externo + raios até cada eixo */}
      <polygon points={pontosGuia} fill="none" stroke="rgba(255,255,255,0.16)" strokeDasharray="2 6" strokeLinecap="round" />
      {eixos.map((e) => (
        <line key={`g${e.id}`} x1={cx} y1={cy} x2={e.gx} y2={e.gy} stroke="rgba(255,255,255,0.16)" strokeDasharray="2 6" strokeLinecap="round" />
      ))}

      {/* forma preenchida com o perfil de características do aluno */}
      <polygon points={pontosValor} fill="url(#tracoGradiente)" stroke="#8FBBFF" strokeWidth="1.5" strokeLinejoin="round" />
      {eixos.map((e) => (
        <circle key={`p${e.id}`} cx={e.vx} cy={e.vy} r="3.5" fill="#EAF2FF" />
      ))}

      {/* rótulo de cada característica */}
      {eixos.map((e) => (
        <text
          key={`l${e.id}`} x={e.lx} y={e.ly} textAnchor="middle" dominantBaseline="central"
          fontSize={tamanho * 0.042} fill="rgba(232,230,255,0.8)" fontWeight="600"
        >
          {e.label}
        </text>
      ))}
    </svg>
  )
}
