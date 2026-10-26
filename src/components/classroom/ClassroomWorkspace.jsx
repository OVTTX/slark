import { useMemo, useState } from 'react'
import { Dices, UsersRound, Timer, School, List, ArrowUpRight, RefreshCw } from 'lucide-react'
import DrawTool from './DrawTool'
import GroupTool from './GroupTool'
import ClassroomTimer from './ClassroomTimer'
import './classroom-tools.css'

const TOOLS = [
  { id:'draw', title:'Sorteio', description:'Uma nova voz em cada rodada.', icon:Dices, number:'01' },
  { id:'groups', title:'Formar grupos', description:'Conexões para aprender juntos.', icon:UsersRound, number:'02' },
  { id:'timer', title:'Cronômetro', description:'Tempo para pensar e criar.', icon:Timer, number:'03' },
]

export default function ClassroomWorkspace({ rooms, roomId, onRoomChange, students, loading, error, onRetry }) {
  const [tool, setTool] = useState('draw')
  const [source, setSource] = useState('class')
  const [manual, setManual] = useState('')
  const [excluded, setExcluded] = useState(new Set())
  const all = useMemo(() => source === 'class' ? students : manual.split(/\r?\n/).map((nome, index)=>({id:`manual-${index}`,nome:nome.trim()})).filter(person=>person.nome), [source, students, manual])
  const participants = all.filter(person => !excluded.has(person.id))
  const version = JSON.stringify([source, source === 'class' ? roomId : '', participants.map(person=>[person.id,person.nome])])
  const busy = source === 'class' && loading
  function changeSource(next) { setSource(next); setExcluded(new Set()) }
  function toggle(id) { setExcluded(previous=>{const next=new Set(previous); if(next.has(id))next.delete(id);else next.add(id);return next}) }
  return <div className="classroom-tools">
    <header className="ct-heading"><div><span className="ct-eyebrow">SLARK · APOIO AO PROFESSOR</span><h1>Ferramentas de aula</h1><p>Mais espaço para ensinar. Menos tempo organizando.</p></div><span className="ct-heading-mark" aria-hidden="true"><SparkleMark /></span></header>
    <div className="ct-tools" aria-label="Escolher ferramenta">{TOOLS.map(({id,title,description,icon:Icon,number})=><button className="ct-tool-card" key={id} aria-pressed={tool===id} aria-controls={`ct-tool-${id}`} onClick={()=>setTool(id)}><span className="ct-tool-top"><Icon size={23} aria-hidden="true" /><span>{number}</span></span><span className="ct-tool-title">{title}<ArrowUpRight size={16} aria-hidden="true" /></span><span className="ct-tool-description">{description}</span></button>)}</div>
    <div className="ct-workspace" data-tool={tool}>
      {tool!=='timer' && <aside className="ct-panel ct-participants" aria-labelledby="ct-participants-title">
        <div className="ct-panel-heading"><div><span className="ct-eyebrow">QUEM PARTICIPA?</span><h2 id="ct-participants-title">Sua lista.</h2></div><span className="ct-count">{participants.length}</span></div>
        <div className="ct-segment"><button aria-pressed={source==='class'} onClick={()=>changeSource('class')}><School size={14} />Minha turma</button><button aria-pressed={source==='manual'} onClick={()=>changeSource('manual')}><List size={14} />Digitar lista</button></div>
        {source==='class' ? <><label className="ct-field">Turma<select value={roomId} disabled={loading && !rooms.length} onChange={event=>{onRoomChange(event.target.value);setExcluded(new Set())}}><option value="">Selecione uma turma</option>{rooms.map(room=><option key={room.id} value={room.id}>{room.nome}</option>)}</select></label>{error && <div className="ct-error" role="alert"><p>{error}</p><button className="ct-button" onClick={onRetry}><RefreshCw size={14} />Tentar novamente</button></div>}{loading ? <p className="ct-note" role="status">Carregando participantes…</p> : !error && !rooms.length ? <p className="ct-note">Você ainda não tem turmas vinculadas. Use uma lista digitada ou peça à direção para vincular suas turmas.</p> : !error && roomId && !students.length ? <p className="ct-note">Esta turma ainda não tem alunos cadastrados.</p> : null}</> : <label className="ct-field">Nomes, um por linha<textarea value={manual} maxLength={20000} rows={6} placeholder="Digite ou cole os nomes aqui" onChange={event=>{setManual(event.target.value);setExcluded(new Set())}} /><small>Nomes iguais em linhas diferentes contam como pessoas diferentes.</small></label>}
        {all.length>0 && !busy && <><div className="ct-list-heading"><span>{participants.length} de {all.length} participam</span><button onClick={()=>setExcluded(excluded.size ? new Set() : new Set(all.map(person=>person.id)))}>{excluded.size ? 'Marcar todos' : 'Desmarcar todos'}</button></div><div className="ct-roster">{all.map((person,index)=><label key={person.id} className="ct-person"><input type="checkbox" checked={!excluded.has(person.id)} onChange={()=>toggle(person.id)} /><span className="ct-person-number">{String(index+1).padStart(2,'0')}</span><span>{person.nome}</span></label>)}</div><p className="ct-note">Desmarque quem não participa desta atividade. Alterar a lista inicia uma nova rodada.</p></>}
        {!participants.length && !busy && <p className="ct-note">Adicione ou marque participantes para começar.</p>}
      </aside>}
      <div className="ct-tool-content">
        <div id="ct-tool-draw" hidden={tool!=='draw'}><DrawTool key={`draw-${version}`} participants={participants} busy={busy} /></div>
        <div id="ct-tool-groups" hidden={tool!=='groups'}><GroupTool key={`groups-${version}`} participants={participants} busy={busy} /></div>
        <div id="ct-tool-timer" hidden={tool!=='timer'}><ClassroomTimer /></div>
      </div>
    </div>
    <p className="ct-footer">Pequenos recursos. Mais possibilidades para cada aula.</p>
  </div>
}
function SparkleMark() { return <svg viewBox="0 0 80 80" fill="none"><ellipse cx="40" cy="40" rx="35" ry="14" transform="rotate(-35 40 40)" stroke="currentColor" /><ellipse cx="40" cy="40" rx="35" ry="14" transform="rotate(35 40 40)" stroke="currentColor" /><circle cx="40" cy="40" r="6" fill="currentColor" /><circle cx="12" cy="58" r="3" fill="currentColor" /></svg> }
