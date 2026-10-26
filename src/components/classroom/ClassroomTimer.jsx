import { useEffect, useRef, useState } from 'react'
import { Timer, Play, Pause, RotateCcw, Maximize, Minimize } from 'lucide-react'
import { formatTimer, timerValue } from '../../lib/classroom-tools'

export default function ClassroomTimer() {
  const [minutes, setMinutes] = useState('5')
  const [seconds, setSeconds] = useState('0')
  const [title, setTitle] = useState('Tempo da atividade')
  const [timer, setTimer] = useState({ mode:'countdown', status:'idle', offset:300000, startedAt:0 })
  const [now, setNow] = useState(Date.now)
  const [full, setFull] = useState(false)
  const [error, setError] = useState('')
  const panel = useRef(null)
  const duration = (Number(minutes)*60 + Number(seconds))*1000
  const valid = Number.isInteger(Number(minutes)) && Number.isInteger(Number(seconds)) && Number(minutes)>=0 && Number(minutes)<=180 && Number(seconds)>=0 && Number(seconds)<=59 && duration>0
  const running = timer.status === 'running'
  const locked = running || timer.status === 'paused'
  const value = timerValue(timer, now)
  const progress = timer.mode === 'countdown' && duration > 0 ? Math.min(100, value/duration*100) : 0
  useEffect(() => {
    if (!running) return
    const update = () => {
      const time = Date.now()
      setNow(time)
      if (timer.mode === 'countdown' && timerValue(timer, time) === 0) setTimer(previous => ({ ...previous, status:'finished', offset:0 }))
    }
    const interval = setInterval(update, 200)
    document.addEventListener('visibilitychange', update)
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', update) }
  }, [running, timer])
  useEffect(() => {
    const update = () => setFull(document.fullscreenElement === panel.current)
    document.addEventListener('fullscreenchange', update)
    return () => document.removeEventListener('fullscreenchange', update)
  }, [])
  function reset(mode = timer.mode, nextDuration = duration) {
    setTimer({mode, status:'idle', offset:mode === 'countdown' && Number.isFinite(nextDuration) ? Math.max(0,nextDuration) : 0, startedAt:0})
    setNow(Date.now())
  }
  function toggle() {
    const time = Date.now()
    setNow(time)
    if (running) {
      const offset = timerValue(timer, time)
      setTimer({...timer, status:timer.mode === 'countdown' && offset === 0 ? 'finished' : 'paused', offset})
    } else setTimer({...timer, status:'running', offset:timer.status === 'finished' ? duration : timer.offset, startedAt:time})
  }
  async function fullscreen() {
    try {
      setError('')
      if (document.fullscreenElement === panel.current) await document.exitFullscreen()
      else await panel.current.requestFullscreen()
    } catch { setError('Tela cheia indisponível neste navegador. Você pode ampliar a guia para apresentar.') }
  }
  return <section ref={panel} className={`ct-panel ct-timer ${timer.status === 'finished' ? 'ct-finished' : ''}`} aria-labelledby="timer-title">
    <div className="ct-panel-heading"><div><span className="ct-eyebrow">UM RESPIRO PARA CONCENTRAR</span><h2 id="timer-title">Cada minuto conta.</h2></div><Timer size={25} aria-hidden="true" /></div>
    <div className="ct-segment" aria-label="Tipo de contagem"><button aria-pressed={timer.mode === 'countdown'} disabled={locked} onClick={()=>reset('countdown')}>Contagem regressiva</button><button aria-pressed={timer.mode === 'stopwatch'} disabled={locked} onClick={()=>reset('stopwatch')}>Cronômetro</button></div>
    <label className="ct-activity-label">Nome da atividade<input value={title} maxLength={80} placeholder="Ex.: Debate em grupos" onChange={event=>setTitle(event.target.value)} /></label>
    {timer.mode === 'countdown' && <div className="ct-duration"><label>Minutos<input aria-label="Minutos" type="number" inputMode="numeric" min="0" max="180" value={minutes} disabled={locked} onChange={event=>{setMinutes(event.target.value);reset(timer.mode,(Number(event.target.value)*60+Number(seconds))*1000)}} /></label><span>:</span><label>Segundos<input aria-label="Segundos" type="number" inputMode="numeric" min="0" max="59" value={seconds} disabled={locked} onChange={event=>{setSeconds(event.target.value);reset(timer.mode,(Number(minutes)*60+Number(event.target.value))*1000)}} /></label><div className="ct-presets">{[1,5,10,15].map(min=><button key={min} className="ct-button" disabled={locked} onClick={()=>{setMinutes(String(min));setSeconds('0');reset('countdown',min*60000)}}>{min} min</button>)}</div></div>}
    <div className="ct-clock-stage"><p>{title || 'Tempo da atividade'}</p><div role="timer" aria-label={formatTimer(value,timer.mode)} aria-live="off" className="ct-clock">{formatTimer(value,timer.mode)}</div><p role="status" aria-live="polite">{timer.status === 'finished' ? 'Tempo encerrado!' : running ? 'Em andamento' : timer.status === 'paused' ? 'Pausado' : 'No seu ritmo. Comece quando quiser.'}</p>{timer.mode === 'countdown' && <div className="ct-time-track" aria-hidden="true"><span style={{width:`${progress}%`}} /></div>}</div>
    <div className="ct-controls"><button className="ct-primary" disabled={timer.mode === 'countdown' && !valid} onClick={toggle}>{running ? <Pause size={18} /> : <Play size={18} />}{running ? 'Pausar' : timer.status === 'paused' ? 'Continuar' : timer.status === 'finished' ? 'Recomeçar' : 'Iniciar'}</button><button className="ct-button" onClick={()=>reset()}><RotateCcw size={16} />Reiniciar</button>{typeof document !== 'undefined' && document.documentElement.requestFullscreen && <button className="ct-button" onClick={fullscreen}>{full ? <Minimize size={16} /> : <Maximize size={16} />}{full ? 'Sair da tela cheia' : 'Tela cheia'}</button>}</div>
    {error && <p className="ct-error" role="alert">{error}</p>}
    <p className="ct-note ct-timer-note">A contagem continua ao trocar de ferramenta nesta página. Para apresentar à turma, use a tela cheia e espelhe esta guia.</p>
  </section>
}
