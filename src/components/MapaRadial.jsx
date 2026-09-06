// Gráfico radial "de pétalas" — cópia fiel do formato de referência (diagrama
// tipo flor/coxcomb, gradiente teal, pétalas com um pequeno vão no centro,
// números e rótulos girados acompanhando o ângulo de cada pétala).
export default function MapaRadial({ dados, tamanho = 340 }) {
  const n = dados.length
  if (n === 0) return null

  const cx = tamanho / 2
  const cy = tamanho / 2
  const maxR = tamanho / 2 - 54 // espaço pra sobrar pro rótulo do lado de fora
  const r0 = maxR * 0.05 // pequeno vão no centro (as pétalas não se tocam num ponto só)
  const raioMinimoVisivel = maxR * 0.22 // toda pétala aparece um pouco, mesmo com valor baixo
  const maxValor = Math.max(...dados.map((d) => d.valor), 1)

  const anguloFatia = (2 * Math.PI) / n
  const anguloPetala = anguloFatia * 0.86 // pétalas quase se tocando nas vizinhas, igual referência
  const inicio = -Math.PI / 2 // primeira pétala começa no topo, sentido horário

  function polar(raio, angulo) {
    return [cx + raio * Math.cos(angulo), cy + raio * Math.sin(angulo)]
  }

  function caminhoPetala(angMid, raio) {
    const a0 = angMid - anguloPetala / 2
    const a1 = angMid + anguloPetala / 2
    const passos = 28
    let d = ''
    for (let i = 0; i <= passos; i++) {
      const t = i / passos
      const ang = a0 + (a1 - a0) * t
      const r = r0 + (raio - r0) * Math.sin(Math.PI * t) // r0 nas duas pontas, máximo no meio -> forma de pétala
      const [x, y] = polar(r, ang)
      d += `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `
    }
    return d + 'Z'
  }

  const petalas = dados.map((item, i) => {
    const angMid = inicio + anguloFatia * i + anguloFatia / 2
    const raio = raioMinimoVisivel + (maxR - raioMinimoVisivel) * (item.valor / maxValor)
    const [numX, numY] = polar(raio * 0.6, angMid)
    const [labelX, labelY] = polar(maxR + 22, angMid)
    const rotacaoGraus = (angMid * 180) / Math.PI + 90 // gira acompanhando o ângulo, sem "corrigir" pra ficar sempre legível — igual referência

    return { ...item, angMid, raio, numX, numY, labelX, labelY, rotacaoGraus, id: i }
  })

  const spokes = Array.from({ length: n }, (_, i) => inicio + anguloFatia * i)

  return (
    <svg viewBox={`0 0 ${tamanho} ${tamanho}`} width="100%" style={{ maxWidth: tamanho, display: 'block', margin: '0 auto' }}>
      <defs>
        <radialGradient id="petalaGradienteTeal" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="#F3FFFC" />
          <stop offset="45%" stopColor="#BFEBE4" />
          <stop offset="100%" stopColor="#4FB8AC" />
        </radialGradient>
      </defs>

      <circle cx={cx} cy={cy} r={maxR} fill="none" stroke="rgba(255,255,255,0.16)" strokeDasharray="2 7" strokeLinecap="round" />
      {spokes.map((ang, i) => {
        const [x, y] = polar(maxR, ang)
        const [x0, y0] = polar(r0, ang)
        return <line key={i} x1={x0} y1={y0} x2={x} y2={y} stroke="rgba(255,255,255,0.16)" strokeDasharray="2 7" strokeLinecap="round" />
      })}

      {petalas.map((p) => (
        <path key={p.id} d={caminhoPetala(p.angMid, p.raio)} fill="url(#petalaGradienteTeal)" />
      ))}

      {petalas.map((p) => (
        <text
          key={`n${p.id}`} x={p.numX} y={p.numY} textAnchor="middle" dominantBaseline="central"
          fontSize={tamanho * 0.065} fontWeight="700" fill="#134E48"
          transform={`rotate(${p.rotacaoGraus} ${p.numX} ${p.numY})`}
        >
          {p.valor}
        </text>
      ))}

      {petalas.map((p) => (
        <text
          key={`l${p.id}`} x={p.labelX} y={p.labelY} textAnchor="middle" dominantBaseline="central"
          fontSize={tamanho * 0.036} fill="rgba(232,230,255,0.8)" fontWeight="600"
          transform={`rotate(${p.rotacaoGraus} ${p.labelX} ${p.labelY})`}
        >
          {p.label.length > 16 ? `${p.label.slice(0, 15)}…` : p.label}
        </text>
      ))}
    </svg>
  )
}
