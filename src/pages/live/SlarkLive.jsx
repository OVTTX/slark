import LiveSolo from './LiveSolo'
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { liveRequest } from '../../lib/slark-live'
import LiveRanking from './LiveRanking'

const button = 'rounded-xl bg-azul px-5 py-3 text-sm font-semibold text-white disabled:opacity-40'
const field = 'mt-2 w-full rounded-xl border bg-bg p-3 text-texto'
const freshItem = type => type === 'slide' ? {type,title:'',text:''} : {type:'quiz',title:'',options:['','','',''],correct:0,seconds:30,explanation:''}

export default function SlarkLive() {
  const { perfil, demoAtiva } = useAuth()
  const [params, setParams] = useSearchParams()
  const pin = params.get('pin') || ''
  const staff = perfil?.perfil !== 'aluno'
  const [rooms,setRooms] = useState([])
  const [trails,setTrails] = useState([])
  const [room,setRoom] = useState(null)
  const [error,setError] = useState('')
  const [busy,setBusy] = useState(false)
  const [activity,setActivity] = useState('live')
  const [creating,setCreating] = useState(false)
  const [items,setItems] = useState([freshItem('quiz')])
  const [now,setNow] = useState(Date.now())
  const [token,setToken] = useState(() => sessionStorage.getItem(`slark-live:${perfil.id}:${pin}`) || '')
  const revision = useRef(0)
  const base = perfil.perfil === 'admin_slark' ? 'admin' : perfil.perfil

  async function perform(task) {
    if (busy) return
    setBusy(true); setError('')
    try { await task() } catch (error) { setError(error.message) } finally { setBusy(false) }
  }
  useEffect(() => {
    setToken(sessionStorage.getItem(`slark-live:${perfil.id}:${pin}`) || '')
    setRoom(null); setError('')
  }, [perfil.id,pin])
  useEffect(() => {
    if (!staff || pin || demoAtiva) return
    let active = true
    Promise.all([liveRequest('rooms'),liveRequest('catalog')]).then(([rooms,trails]) => {
      if (active) { setRooms(rooms); setTrails(trails) }
    }).catch(error => { if (active) setError(error.message) })
    return () => { active = false }
  }, [staff,pin,demoAtiva,creating])
  useEffect(() => {
    if (!pin || (!staff && !token) || demoAtiva) return
    let disposed = false
    const controller = new AbortController()
    const requestRevision = ++revision.current
    async function poll() {
      try {
        const value = await liveRequest(staff ? 'teacher' : 'state', null, {pin,...(!staff ? {token} : {})}, controller.signal)
        if (!disposed && revision.current === requestRevision) { setRoom(value); setError('') }
      } catch(error) { if (!disposed && error.name !== 'AbortError') setError(error.message) }
      if (!disposed) timer = setTimeout(poll, 1500)
    }
    let timer
    void poll()
    return () => { disposed = true; clearTimeout(timer); controller.abort() }
  }, [pin,staff,token,demoAtiva])
  useEffect(() => { const timer=setInterval(() => setNow(Date.now()),500); return () => clearInterval(timer) }, [])
  async function control(command) {
    const value = await liveRequest('control',{pin,command})
    setRoom(value)
  }
  function changeItem(index,patch) { setItems(items => items.map((item,i) => i === index ? {...item,...patch} : item)) }
  const seconds = room?.endsAt ? Math.max(0,Math.ceil((room.endsAt-now)/1000)) : 0
  const waiting = room?.nextQuestionAt > now
  const tournament = room?.tournament
  const canAnswer = room?.status === 'active' && room.item?.type === 'quiz' && room.openedAt && !room.revealed && seconds > 0 && !room.answered && (!tournament || tournament.own?.eligible)

  return <div className="text-texto">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-azul">Dentro do seu universo Slark</p><h1 className="mt-2 text-4xl font-bold tracking-tight">Slark Live</h1><p className="mt-3 text-texto/60">Slides, quizzes e desafios com os quartetos da sua turma.</p></div>{pin && <button className={button} onClick={() => { setParams({}); setRoom(null) }}>Voltar ao Slark Live</button>}</div>
    {demoAtiva && <p role="status" className="mt-6 rounded-2xl border p-5">Você está visualizando um perfil de demonstração. Para conduzir ou jogar uma partida, use o seu perfil administrativo ou uma conta de teste autenticada.</p>}
    {error && <p role="alert" className="mt-6 rounded-xl bg-red-400/10 p-4 text-red-400">{error}</p>}
    {!pin && <div className="mt-6 flex gap-3">{[['live','Live Room'],['solo','Live Solo']].map(([key,label]) => <button key={key} className={activity===key ? button : 'rounded-xl border px-5 py-3 text-sm'} aria-pressed={activity===key} onClick={() => setActivity(key)}>{label}</button>)}</div>}
    {!pin && activity==='solo' && !demoAtiva && <LiveSolo />}
    {!pin && activity==='live' && !demoAtiva && <>
      {staff ? <section className="mt-7 rounded-3xl border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-xl font-bold">Minhas partidas</h2><button className={button} onClick={() => setCreating(value => !value)}>{creating ? 'Fechar criação' : 'Criar Slark Live Room'}</button></div>
        {creating && <form className="mt-5 space-y-5" onSubmit={event => { event.preventDefault(); const form=new FormData(event.currentTarget); const solo=event.nativeEvent.submitter?.value==='solo'; void perform(async () => {
          if(solo) { await liveRequest('solo-publish',{title:form.get('name'),chapter:form.get('chapter'),trailId:form.get('trailId'),items});setCreating(false);setActivity('solo');return }
          const value=await liveRequest('create',{name:form.get('name'),chapter:form.get('chapter'),trailId:form.get('trailId'),mode:form.get('mode'),items})
          setCreating(false); setParams({pin:value.pin}); setRoom(value)
        }) }}>
          <label className="block text-sm">Nome da partida<input name="name" required maxLength={100} className={field} placeholder="Missão do capítulo" /></label>
          <label className="block text-sm">Trilha e turma<select name="trailId" required className={field}><option value="">Selecione a trilha</option>{trails.map(trail => <option value={trail.id} key={trail.id}>{trail.titulo}</option>)}</select></label>
          {!trails.length && <p className="text-sm text-texto/60">Crie uma trilha vinculada a uma turma e cadastre quartetos com quatro integrantes para começar. <Link className="text-azul underline" to={`/${base}/trilhas`}>Abrir trilhas</Link></p>}
          <label className="block text-sm">Capítulo<input name="chapter" required maxLength={100} className={field} /></label>
          <label className="block text-sm">Formato<select name="mode" className={field}><option value="classic">Quiz e apresentação</option><option value="tournament">Mata-mata · cinco perguntas por fase</option></select></label>
          {items.map((item,index) => <fieldset key={index} className="space-y-3 rounded-2xl border p-4"><legend className="px-2 text-sm">{index+1}. {item.type === 'quiz' ? 'Pergunta' : 'Slide'}</legend>
            <label className="block text-sm">Título<input required maxLength={200} value={item.title} onChange={event => changeItem(index,{title:event.target.value})} className={field} /></label>
            {item.type === 'slide' ? <label className="block text-sm">Conteúdo<textarea maxLength={6000} value={item.text} onChange={event => changeItem(index,{text:event.target.value})} className={field} /></label> : <>
              {item.options.map((option,i) => <label key={i} className="block text-sm">Alternativa {String.fromCharCode(65+i)}<input required maxLength={300} value={option} onChange={event => changeItem(index,{options:item.options.map((text,j) => i === j ? event.target.value : text)})} className={field} /></label>)}
              <label className="block text-sm">Alternativa correta<select className={field} value={item.correct} onChange={event => changeItem(index,{correct:Number(event.target.value)})}>{item.options.map((_,i) => <option key={i} value={i}>{String.fromCharCode(65+i)}</option>)}</select></label>
              <label className="block text-sm">Tempo em segundos<input className={field} type="number" min={5} max={300} required value={item.seconds} onChange={event => changeItem(index,{seconds:Number(event.target.value)})} /></label>
              <label className="block text-sm">Explicação<textarea className={field} maxLength={2000} value={item.explanation} onChange={event => changeItem(index,{explanation:event.target.value})} /></label>
            </>}
            {items.length > 1 && <button type="button" className="text-sm text-red-400" onClick={() => setItems(items => items.filter((_,i) => i !== index))}>Remover item</button>}
          </fieldset>)}
          <div className="flex flex-wrap gap-3"><button className="rounded-xl border px-4 py-2" type="button" disabled={items.length>=80} onClick={() => setItems(items => [...items,freshItem('quiz')])}>+ Pergunta</button><button className="rounded-xl border px-4 py-2" type="button" disabled={items.length>=80} onClick={() => setItems(items => [...items,freshItem('slide')])}>+ Slide</button><button className={button} type="submit" disabled={busy || !trails.length}>{busy ? 'Salvando…' : 'Gerar PIN'}</button><button className="rounded-xl border px-4 py-2" type="submit" value="solo" disabled={busy || !trails.length}>Publicar para Live Solo</button></div>
        </form>}
        <div className="mt-5 space-y-3">{rooms.map(room => <button key={room.pin} onClick={() => setParams({pin:room.pin})} className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 text-left"><span><strong>{room.name}</strong><small className="mt-1 block text-texto/60">{room.status === 'ready' ? 'Aguardando turma' : room.status === 'active' ? 'Em andamento' : 'Encerrada'}</small></span><span className="font-bold tracking-widest text-azul">{room.pin} →</span></button>)}{!rooms.length && <p className="text-texto/60">Suas partidas aparecerão aqui.</p>}</div>
      </section> : <form className="mt-7 rounded-3xl border bg-card p-6" onSubmit={event => { event.preventDefault(); setParams({pin:String(new FormData(event.currentTarget).get('pin')).trim()}) }}><h2 className="text-xl font-bold">Entrar na partida</h2><label className="mt-4 block text-sm">PIN exibido no telão<input name="pin" className={field} inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} placeholder="000000" required /></label><button type="submit" className={`${button} mt-4`}>Continuar</button></form>}
    </>}
    {pin && !staff && !token && !demoAtiva && <form className="mt-7 rounded-3xl border bg-card p-6" onSubmit={event => { event.preventDefault(); const form=new FormData(event.currentTarget); void perform(async () => {
      const value=await liveRequest('join',{pin,teamCode:form.get('teamCode')})
      sessionStorage.setItem(`slark-live:${perfil.id}:${pin}`,value.token); setToken(value.token)
    }) }}><h2 className="text-xl font-bold">Partida {pin}</h2><p className="mt-3 text-sm text-texto/60">Um dispositivo por quarteto. Use o código fixo entregue pelo professor.</p><label className="mt-4 block text-sm">Código do seu quarteto<input className={field} name="teamCode" required autoComplete="off" /></label><button className={`${button} mt-4`} disabled={busy} type="submit">Conectar quarteto</button></form>}
    {room && <section className="mt-7 rounded-3xl border bg-card p-6 sm:p-8">
      {staff && <><h2 className="text-xl font-bold">{room.name}</h2><p className="mt-2 text-texto/60">Clique no PIN para abrir o telão sem login em outra guia.</p><a className="my-5 inline-block text-5xl font-bold tracking-widest text-azul" href={`/slark-live/telao/${pin}`} target="_blank" rel="noopener noreferrer">{pin} ↗</a><p className="mb-5 text-sm text-texto/60">Espelhe a guia do telão e mantenha esta aba para conduzir a partida.</p></>}
      {room.status === 'ready' ? <p className="text-xl">{staff ? 'Tudo pronto para começar.' : 'Seu quarteto está conectado. Aguarde o professor.'}</p> : room.status === 'closed' ? <><h2 className="text-2xl font-bold">{room.completed ? 'Resultado final' : 'Partida encerrada'}</h2>{!room.completed && <p className="mt-3 text-texto/60">Encerrada sem premiação final.</p>}<ol className="mt-4 space-y-2">{room.standings?.map(row => <li key={row.teamId} className="flex gap-3 rounded-xl border p-4"><strong>{row.place}º</strong><span className="flex-1">{row.name} · {row.correct} acertos</span><strong>+{row.points} pts</strong></li>)}</ol></> : <>
        {tournament && <p className="mb-3 text-sm text-azul">{tournament.roundLabel} · Pergunta {tournament.question} de 5{tournament.tiebreak ? ' · Desempate' : ''}</p>}
        {room.answered && !room.revealed && !staff ? <h2 role="status" className="py-10 text-center text-4xl font-bold">Respondido!</h2> : <>
          <h2 className="text-2xl font-bold sm:text-3xl">{room.item?.title}</h2>
          {room.item?.type === 'slide' ? <p className="mt-5 whitespace-pre-wrap text-lg">{room.item.text}</p> : <><p className="my-5 font-bold">{room.revealed ? 'Resposta revelada' : room.openedAt ? `${seconds}s` : 'Aguarde a abertura da pergunta'}</p><div className="grid gap-3 sm:grid-cols-2">{room.item?.options.map((option,index) => <button key={index} className={`rounded-2xl border p-5 text-left disabled:cursor-default ${room.revealed && room.item.correct === index ? 'border-green-400 bg-green-400/10' : 'bg-bg'}`} disabled={staff || !canAnswer || busy} onClick={() => void perform(async () => { await liveRequest('answer',{pin,token,option:index}); setRoom(room => ({...room,answered:true})) })}><strong className="mr-3 text-azul">{String.fromCharCode(65+index)}</strong>{option}</button>)}</div>{room.revealed && <p className="mt-4 text-texto/60">{room.item?.explanation}</p>}</>}
        </>}
        {!staff && tournament?.own && <p className="mt-5 text-sm text-texto/60">{tournament.own.label} · {tournament.own.status === 'eliminated' ? 'Seu quarteto foi eliminado. Acompanhe pelo telão.' : tournament.own.status === 'qualified' ? 'Classificado! Aguarde a próxima fase.' : 'Combine a resposta com seu quarteto.'}</p>}
      </>}
      {staff && room.status !== 'closed' && <div className="mt-6 flex flex-wrap gap-3">
        {room.status === 'ready' ? <button className={button} disabled={busy} onClick={() => void perform(() => control('start'))}>Iniciar partida</button> : <>
          {room.item?.type === 'quiz' && !room.openedAt && <button className={button} disabled={busy || waiting} onClick={() => void perform(() => control('open'))}>Abrir pergunta</button>}
          {room.item?.type === 'quiz' && room.openedAt && !room.revealed && <button className={button} disabled={busy} onClick={() => void perform(() => control('reveal'))}>Revelar resposta</button>}
          {(room.revealed || room.item?.type === 'slide') && <button className={button} disabled={busy || waiting} onClick={() => void perform(() => control(tournament?.phase === 'round-complete' ? 'advance-round' : 'next'))}>{waiting ? `Próximo item em ${Math.ceil((room.nextQuestionAt-now)/1000)}s` : tournament?.phase === 'round-complete' ? 'Avançar fase' : 'Próximo item / finalizar'}</button>}
        </>}
        <button className="rounded-xl border border-red-400/40 px-4 py-3 text-sm text-red-400" disabled={busy} onClick={() => { if(window.confirm('Encerrar esta partida sem premiação final?')) void perform(() => control('close')) }}>Encerrar partida</button>
      </div>}
      {staff && <details className="mt-7"><summary className="cursor-pointer font-semibold">Quartetos e códigos fixos</summary><div className="mt-4 grid gap-3 sm:grid-cols-2">{room.teams.map(team => <div className="rounded-xl border p-4" key={team.id}><strong>{team.name}</strong><p className="mt-2 text-xl tracking-widest text-azul">{team.code}</p><p className="mt-2 text-xs text-texto/60">{team.members?.map(member => member.name).join(' · ')}</p><p className="mt-2 text-sm">{team.joined ? 'Conectado ✓' : 'Aguardando entrada'}</p></div>)}</div></details>}
    </section>}
    {!pin && <LiveRanking />}
  </div>
}
