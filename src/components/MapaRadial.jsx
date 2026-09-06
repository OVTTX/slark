// Gráfico radial "de pétalas": cada categoria vira uma pétala saindo do centro,
// com comprimento proporcional ao valor. Inspirado num diagrama tipo
// "coxcomb"/flor, mas na paleta da marca Slark (glow azul) em vez de teal.
export default function MapaRadial({ dados, tamanho = 340 }) {
  const n = dados.length
  if (n === 0) return null

  const cx = tamanho / 2
  const cy = tamanho / 2
  const maxR = tamanho / 2 - 54 // espaço pra sobrar pro rótulo do lado de fora
  const raioMinimoVisivel = maxR * 0.18 // toda pétala aparece um pouco, mesmo com valor baixo
  const maxValor = Math.max(...dados.map((d) => d.valor), 1)

  const anguloFatia = (2 * Math.PI) / n
  const anguloPetala = anguloFatia * 0.66 // largura da pétala dentro da fatia (deixa gap pros vizinhos)
  const inicio = -Math.PI / 2 // primeira pétala começa no topo, sentido horário

  function polar(raio, angulo) {
    return [cx + raio * Math.cos(angulo), cy + raio * Math.sin(angulo)]
  }

  function caminhoPetala(angMid, raio) {
    const a0 = angMid - anguloPetala / 2
    const a1 = angMid + anguloPetala / 2
    const passos = 28
    let d = `M ${cx} ${cy} `
    for (let i = 0; i <= passos; i++) {
      const t = i / passos
      const ang = a0 + (a1 - a0) * t
      const r = raio * Math.sin(Math.PI * t) // 0 nas duas pontas, máximo no meio -> forma de pétala
      const [x, y] = polar(r, ang)
      d += `L ${x.toFixed(1)} ${y.toFixed(1)} `
    }
    return d + 'Z'
  }

  const petalas = dados.map((item, i) => {
    const angMid = inicio + anguloFatia * i + anguloFatia / 2
    const raio = raioMinimoVisivel + (maxR - raioMinimoVisivel) * (item.valor / maxValor)
    const [numX, numY] = polar(raio * 0.62, angMid)
    const [labelX, labelY] = polar(maxR + 24, angMid)

    // mantém o rótulo sempre legível (nunca de cabeça pra baixo)
    let rotacao = (angMid * 180) / Math.PI + 90
    if (rotacao > 90 && rotacao < 270) rotacao -= 180

    return { ...item, angMid, raio, numX, numY, labelX, labelY, rotacao, id: i }
  })

  const spokes = Array.from({ length: n }, (_, i) => inicio + anguloFatia * i)

  return (
    <svg viewBox={`0 0 ${tamanho} ${tamanho}`} width="100%" style={{ maxWidth: tamanho, display: 'block', margin: '0 auto' }}>
      <defs>
        <radialGradient id="petalaGradiente" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="#EAF2FF" stopOpacity="0.9" />
          <stop offset="55%" stopColor="#6FA8FF" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#2E5BFF" stopOpacity="0.95" />
        </radialGradient>
      </defs>

      <circle cx={cx} cy={cy} r={maxR} fill="none" stroke="rgba(255,255,255,0.14)" strokeDasharray="2 7" strokeLinecap="round" />
      {spokes.map((ang, i) => {
        const [x, y] = polar(maxR, ang)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.14)" strokeDasharray="2 7" strokeLinecap="round" />
      })}

      {petalas.map((p) => (
        <path key={p.id} d={caminhoPetala(p.angMid, p.raio)} fill="url(#petalaGradiente)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
      ))}

      {petalas.map((p) => (
        <text key={`n${p.id}`} x={p.numX} y={p.numY} textAnchor="middle" dominantBaseline="central" fontSize={tamanho * 0.062} fontWeight="700" fill="#03005B">
          {p.valor}
        </text>
      ))}

      {petalas.map((p) => (
        <text
          key={`l${p.id}`} x={p.labelX} y={p.labelY} textAnchor="middle" dominantBaseline="central"
          fontSize={tamanho * 0.036} fill="rgba(232,230,255,0.75)" fontWeight="600"
          transform={`rotate(${p.rotacao} ${p.labelX} ${p.labelY})`}
        >
          {p.label.length > 16 ? `${p.label.slice(0, 15)}…` : p.label}
        </text>
      ))}
    </svg>
  )
}
