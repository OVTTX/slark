import LogoSlark from './LogoSlark'
import '../styles/slark-entry.css'

// Real loading time only: this component never postpones displaying ready data.
export function SlarkLoading({ compact = false, fullPage = false }) {
  return <div role="status" aria-label="Abrindo seu espaço na Slark" className={`slark-entry ${compact ? 'slark-entry-compact' : ''} ${fullPage ? 'slark-entry-full' : ''}`}>
    <span className="sr-only">Abrindo seu espaço na Slark.</span>
    <div className="slark-entry-mark" aria-hidden="true">
      <svg className="slark-entry-orbits" viewBox="0 0 260 180" fill="none">
        <g transform="rotate(-24 130 90)">
          <ellipse className="slark-draw-ring" pathLength="1" cx="130" cy="90" rx="122" ry="66" />
          <ellipse className="slark-draw-ring" pathLength="1" cx="130" cy="90" rx="96" ry="48" />
          <ellipse className="slark-draw-ring" pathLength="1" cx="130" cy="90" rx="70" ry="30" />
          <circle className="slark-entry-planet" cx="220" cy="45" r="4" />
        </g>
      </svg>
      <LogoSlark className="slark-entry-logo" />
    </div>
  </div>
}

export function PainelLoading({ withTitle = false, columns = 4, count = 4, withDetails = true }) {
  return <div role="status" aria-label="Organizando seu painel" className="slark-panel-skeleton" style={{ '--skeleton-columns': columns }}>
    <span className="sr-only">Organizando seu painel.</span>
    <div aria-hidden="true">
      {withTitle && <div className="slark-skeleton-heading" />}
      <div className="slark-skeleton-grid">{Array.from({ length: count }, (_, index) => <div className="slark-skeleton-card" key={index} style={{ '--entry-index': index }}><span /><span /><span /></div>)}</div>
      {withDetails && <div className="slark-skeleton-bottom"><div /><div /></div>}
    </div>
  </div>
}
