import { Check, Lock } from 'lucide-react'

// Caminho sinuoso estilo "trilha de jogo": nós numerados conectados por uma
// linha curva, alternando esquerda/direita. Usado tanto no preview compacto
// da Home do aluno quanto na tela cheia de uma trilha.
export default function CaminhoTrilha({ blocos, concluidos, atual, onSelecionar, compacto = false }) {
  if (!blocos.length) return null

  const raio = compacto ? 17 : 27
  const espacoY = compacto ? 54 : 92
  const largura = compacto ? 190 : 280
  const xEsquerda = largura * 0.3
  const xDireita = largura * 0.7

  const pontos = blocos.map((b, i) => ({
    bloco: b,
    i,
    x: i % 2 === 0 ? xEsquerda : xDireita,
    y: espacoY / 2 + i * espacoY,
  }))
  const altura = pontos[pontos.length - 1].y + espacoY / 2

  const idxAtual = atual ?? blocos.findIndex((b) => !concluidos.has(b.id))

  function curva(p0, p1) {
    const midY = (p0.y + p1.y) / 2
    return `M ${p0.x} ${p0.y} C ${p0.x} ${midY}, ${p1.x} ${midY}, ${p1.x} ${p1.y}`
  }

  return (
    <svg viewBox={`0 0 ${largura} ${altura}`} width="100%" style={{ maxWidth: largura }} className="mx-auto block select-none">
      {pontos.slice(1).map((p, i) => (
        <path
          key={`linha-${p.bloco.id}`}
          d={curva(pontos[i], p)}
          fill="none"
          stroke="rgb(var(--c-texto) / .25)"
          strokeWidth={compacto ? 3 : 4}
          strokeDasharray={compacto ? '2 7' : '3 10'}
          strokeLinecap="round"
        />
      ))}

      {pontos.map((p) => {
        const feito = concluidos.has(p.bloco.id)
        const ehAtual = idxAtual !== -1 && p.i === idxAtual
        const bloqueado = !feito && !ehAtual && (idxAtual === -1 || p.i > idxAtual)
        const clicavel = !bloqueado && !compacto

        return (
          <g
            key={p.bloco.id}
            transform={`translate(${p.x}, ${p.y})`}
            onClick={() => clicavel && onSelecionar?.(p.bloco, p.i)}
            style={{ cursor: clicavel ? 'pointer' : 'default' }}
          >
            {ehAtual && !compacto && (
              <circle r={raio + 8} fill="none" stroke="#2E5BFF" strokeWidth={2} opacity={0.35}>
                <animate attributeName="r" values={`${raio + 4};${raio + 12};${raio + 4}`} dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0;0.4" dur="1.8s" repeatCount="indefinite" />
              </circle>
            )}
            <circle
              r={raio}
              fill={feito ? '#3FD08A' : ehAtual ? '#2E5BFF' : 'rgb(var(--c-card))'}
              stroke={feito ? '#3FD08A' : ehAtual ? '#2E5BFF' : 'rgba(120,130,255,.35)'}
              strokeWidth={2}
            />
            {feito ? (
              <Check x={-raio * 0.42} y={-raio * 0.42} size={raio * 0.85} color="white" strokeWidth={3} />
            ) : bloqueado ? (
              <Lock x={-raio * 0.36} y={-raio * 0.36} size={raio * 0.72} color="rgb(var(--c-texto) / .45)" strokeWidth={2} />
            ) : (
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={compacto ? 13 : 18}
                fontWeight="700"
                fill={ehAtual ? '#fff' : 'rgb(var(--c-texto) / .6)'}
              >
                {p.i + 1}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
