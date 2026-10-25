import { Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { liveRequest } from '../../lib/slark-live'
import './live-screen.css'

function ScoreList({ rows = [], title }) {
  return <section className="live-screen-panel"><h2>{title}</h2><ol className="live-score-list">{rows.map((row,index) => <li key={row.id || index}><span>{row.nome}</span><strong>{row.pontos}</strong></li>)}</ol>{!rows.length && <p className="live-muted">Aguardando os quartetos da turma.</p>}</section>
}
export default function LiveScreen() {
  const { pin } = useParams()
  const [room,setRoom] = useState(null)
  const [error,setError] = useState('')
  const [now,setNow] = useState(Date.now())
  useEffect(() => {
    let active=true, timer
    const controller = new AbortController()
    async function poll() {
      try { const value=await liveRequest('room',null,{pin},controller.signal,true); if(active) {setRoom(value);setError('')} }
      catch(error) { if(active && error.name !== 'AbortError') setError(error.message) }
      if(active) timer=setTimeout(poll,1500)
    }
    void poll()
    const clock=setInterval(() => setNow(Date.now()),250)
    return () => {active=false;clearTimeout(timer);clearInterval(clock);controller.abort()}
  },[pin])
  const seconds=room?.endsAt ? Math.max(0,Math.ceil((room.endsAt-now)/1000)) : 0
  const question=room?.status==='active' && room.item
  const history=room?.tournament?.history || []
  return <main className={`slark-live-screen ${question ? 'show-question' : ''}`}>
    <button className="live-fullscreen" onClick={async () => { try { if(document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen() } catch { setError('Use a opção de tela cheia do navegador.') } }}>Tela cheia ↗</button>
    {error && <p role="alert" className="live-screen-error">{error}</p>}
    {!room ? <p className="live-loading">{error || 'Conectando ao telão…'}</p> : <>
      {question ? <section className="live-screen-panel live-question">
        <div className="live-question-meta"><span>{room.chapter} · {room.tournament?.roundLabel || `${room.index+1} / ${room.total}`}</span><strong>{room.revealed ? 'Resposta revelada' : room.openedAt ? `${seconds}s` : 'Aguarde o professor'}</strong></div>
        <h1>{room.item.title}</h1>
        {room.item.type==='slide' ? <p className="live-slide-text">{room.item.text}</p> : <div className="live-options">{room.item.options.map((option,index) => <div className={room.revealed && room.item.correct===index ? 'is-correct' : ''} key={index}><b>{String.fromCharCode(65+index)}</b><span>{option}</span></div>)}</div>}
        {room.revealed && <p className="live-explanation">{room.item.explanation}</p>}
        <p className="live-muted">{room.responses} respostas recebidas</p>
      </section> : <>
        <ScoreList title="Classificação Geral" rows={room.screenRankings?.geral} />
        <ScoreList title={room.status==='closed' ? 'Resultado da partida' : 'Quartetos da turma'} rows={room.standings?.length ? room.standings.map(row => ({id:row.teamId,nome:`${row.place}º · ${row.name}`,pontos:`+${row.points}`})) : room.screenRankings?.turma} />
      </>}
      <aside className="live-screen-side">
        <section className="live-screen-panel live-pin-card"><span>{pin}</span><em>Live</em></section>
        <section className="live-bracket-panel"><h2>{room.tournament ? 'Mata-mata' : room.status==='closed' ? 'Conexões construídas.' : 'Sua turma, conectada.'}<Trophy aria-hidden="true" size={28} color="#67e8c2" /></h2><p className="live-muted">{room.teams.length} quartetos. {room.status==='closed' ? 'Partida encerrada.' : 'Um campeão.'}</p>
          {history.length ? <div className="live-rounds">{history.map((round,index) => <section key={index}><h3>{round.label}</h3>{round.matches.map((match,i) => <article className={index===history.length-1 && !match.winner ? 'live-match active' : 'live-match'} key={i}><small>{match.winner ? 'CONCLUÍDO' : index===history.length-1 ? '● AO VIVO' : 'A SEGUIR'}</small><p>{match.a}<strong>{match.scoreA}</strong></p><p>{match.b}<strong>{match.bye ? '—' : match.scoreB}</strong></p></article>)}</section>)}{room.status!=='closed' && history.at(-1).matches.length>1 && <section><h3>Próxima fase</h3><article className="live-match"><small>A DEFINIR</small><p>Vencedores da fase atual</p></article></section>}</div> : <><p className="live-join-instruction">No Slark App, abra <strong>Slark Live</strong> e digite o PIN.</p><div className="live-arrivals">{room.teams.filter(team => team.joined).map((team,index) => <p key={index}>✓ {team.name}</p>)}</div><p className="live-muted">{room.teams.filter(team => team.joined).length} quartetos conectados</p></>}
          <footer>{room.tournament?.champion ? `Campeão: ${room.tournament.champion}` : room.tournament ? 'Quem vencer avança para a final.' : room.name}</footer>
        </section>
      </aside>
    </>}
    <img className="live-screen-brand" src="/landing/logo.svg" alt="Slark" />
  </main>
}
