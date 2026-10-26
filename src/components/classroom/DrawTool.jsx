import { prefersSlarkReducedMotion } from '../../lib/motion'
import { useEffect, useRef, useState } from 'react'
import { Dices, RotateCcw, Sparkles } from 'lucide-react'
import { drawParticipant } from '../../lib/classroom-tools'

export default function DrawTool({ participants, busy }) {
  const [withoutRepeat, setWithoutRepeat] = useState(true)
  const [history, setHistory] = useState([])
  const [result, setResult] = useState(null)
  const [drawing, setDrawing] = useState(false)
  const [error, setError] = useState('')
  const timeout = useRef(null)
  useEffect(() => () => clearTimeout(timeout.current), [])
  const remaining = participants.filter(person => !history.some(item => item.id === person.id)).length

  function draw() {
    if (drawing || busy) return
    try {
      const chosen = drawParticipant(participants, history.map(item => item.id), withoutRepeat)
      if (!chosen) return
      setError('')
      setDrawing(true)
      const finish = () => { setResult(chosen); setHistory(previous => [chosen, ...previous]); setDrawing(false) }
      if (prefersSlarkReducedMotion()) finish()
      else timeout.current = setTimeout(finish, 650)
    } catch { setError('Não foi possível realizar o sorteio. Tente novamente.') }
  }

  function reset() { setHistory([]); setResult(null); setError('') }
  return <section className="ct-panel ct-draw" aria-labelledby="draw-title">
    <div className="ct-panel-heading"><div><span className="ct-eyebrow">UM NOME, UMA POSSIBILIDADE</span><h2 id="draw-title">Quem vai ser?</h2></div><Dices size={25} aria-hidden="true" /></div>
    <label className="ct-check"><input type="checkbox" checked={withoutRepeat} disabled={drawing} onChange={event => setWithoutRepeat(event.target.checked)} />Não repetir nesta rodada</label>
    <div className={`ct-draw-stage ${drawing ? 'is-drawing' : ''}`} aria-busy={drawing}>
      <span className="ct-draw-orbit" aria-hidden="true" /><span className="ct-draw-orbit second" aria-hidden="true" />
      <Sparkles size={27} className="ct-result-symbol" aria-hidden="true" />
      <div role="status" aria-live="polite" aria-atomic="true"><span className="ct-eyebrow">{drawing ? 'SORTEANDO…' : result ? 'NOME SORTEADO' : 'PRONTO PARA COMEÇAR'}</span><strong key={drawing ? 'drawing' : history.length}>{drawing ? 'Quem será?' : result?.nome || 'A vez de participar.'}</strong><p>{withoutRepeat && participants.length && !remaining ? 'Todos participaram. Reinicie para uma nova rodada.' : `${withoutRepeat ? remaining : participants.length} ${withoutRepeat ? (remaining === 1 ? 'disponível nesta rodada' : 'disponíveis nesta rodada') : 'participantes no sorteio'}`}</p></div>
    </div>
    {error && <p className="ct-error" role="alert">{error}</p>}
    <div className="ct-controls"><button className="ct-primary" onClick={draw} disabled={busy || drawing || !participants.length || (withoutRepeat && !remaining)}><Dices size={18} />{drawing ? 'Sorteando…' : 'Sortear nome'}</button><button className="ct-button" onClick={reset} disabled={!history.length || drawing}><RotateCcw size={16} />Nova rodada</button></div>
    <div className="ct-history"><h3>Já participaram <span>{history.length}</span></h3>{history.length ? <ol>{history.map((person, index) => <li key={`${person.id}-${history.length-index}`}><span>{String(history.length-index).padStart(2, '0')}</span>{person.nome}</li>)}</ol> : <p>Os nomes sorteados aparecem aqui.</p>}</div>
  </section>
}
