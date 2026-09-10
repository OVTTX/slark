import { useId } from 'react'

// Moldura em forma de flor/selo recortado, extraída dos selos de característica
// (Criativo/Detalhista/Observador/Raciocínio) fornecidos pela equipe. Serve de
// base reutilizável pra qualquer selo — o conteúdo do meio (ícone, letra) entra
// via children.
export default function SeloFlor({ tamanho = 72, corBorda = 'rgba(255,255,255,0.9)', children, className = '' }) {
  const gradId = useId()

  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: tamanho, height: tamanho }}>
      <svg viewBox="0 0 111 111" width={tamanho} height={tamanho} className="absolute inset-0">
        <defs>
          <linearGradient id={gradId} x1="55.1075" y1="0" x2="55.1075" y2="146.595" gradientUnits="userSpaceOnUse">
            <stop stopColor="#A066FF" stopOpacity="0.03" />
            <stop offset="1" stopColor="#603D99" />
          </linearGradient>
        </defs>
        <path
          d="M55.1074 0.25C63.4569 0.25 70.3986 6.28 71.8145 14.2227L71.8828 14.6074L72.2031 14.3838C78.8204 9.7682 87.9934 10.4134 93.8975 16.3174C99.8014 22.2213 100.446 31.3934 95.8311 38.0107L95.6074 38.332L95.9922 38.4004C103.935 39.8166 109.965 46.758 109.965 55.1074C109.965 63.4568 103.935 70.3985 95.9922 71.8145L95.6074 71.8828L95.8301 72.2031C100.446 78.8204 99.8015 87.9934 93.8975 93.8975C87.9934 99.8015 78.8204 100.446 72.2031 95.8301L71.8828 95.6074L71.8145 95.9922C70.3985 103.935 63.4568 109.965 55.1074 109.965C46.7581 109.965 39.8164 103.935 38.4004 95.9922L38.332 95.6074L38.0107 95.8301C31.3934 100.446 22.2214 99.8015 16.3174 93.8975C10.4134 87.9934 9.7682 78.8204 14.3838 72.2031L14.6074 71.8828L14.2227 71.8145C6.28 70.3986 0.25 63.4569 0.25 55.1074C0.25004 46.758 6.28004 39.8167 14.2227 38.4004L14.6074 38.332L14.3838 38.0107C9.76891 31.3935 10.4135 22.2213 16.3174 16.3174C22.2213 10.4134 31.3935 9.76849 38.0107 14.3838L38.332 14.6074L38.4004 14.2227C39.8167 6.28004 46.758 0.25004 55.1074 0.25Z"
          fill={`url(#${gradId})`}
          fillOpacity="0.15"
          stroke={corBorda}
          strokeWidth="0.5"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}
