import { useState } from 'react'
import { UsersRound, Shuffle, Copy, Check } from 'lucide-react'
import { makeActivityGroups } from '../../lib/classroom-tools'

export default function GroupTool({ participants, busy }) {
  const [mode, setMode] = useState('count')
  const [amount, setAmount] = useState('4')
  const [groups, setGroups] = useState([])
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const valid = Number.isInteger(Number(amount)) && Number(amount) >= 1 && participants.length > 0 && (mode === 'size' || Number(amount) <= participants.length)
  function generate() {
    setMessage(''); setCopied(false)
    try { setGroups(makeActivityGroups(participants, Number(amount), mode)) }
    catch { setMessage('Não foi possível formar os grupos. Tente novamente.') }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(groups.map((group, index) => `Grupo ${index+1}\n${group.map(person => person.nome).join('\n')}`).join('\n\n'))
      setCopied(true); setMessage('Lista copiada.')
    } catch { setMessage('Não foi possível copiar automaticamente. Selecione os nomes abaixo para copiar.') }
  }
  return <section className="ct-panel" aria-labelledby="groups-title">
    <div className="ct-panel-heading"><div><span className="ct-eyebrow">NOVAS CONEXÕES</span><h2 id="groups-title">Juntos nesta atividade.</h2></div><UsersRound size={25} aria-hidden="true" /></div>
    <div className="ct-group-form"><label>Como dividir?<select value={mode} onChange={event => { setMode(event.target.value); setGroups([]); setMessage(''); setCopied(false) }}><option value="count">Quantidade de grupos</option><option value="size">Máximo de pessoas por grupo</option></select></label><label>{mode === 'count' ? 'Grupos' : 'Pessoas'}<input type="number" inputMode="numeric" min="1" max={mode === 'count' ? participants.length || 1 : undefined} step="1" value={amount} onChange={event => { setAmount(event.target.value); setGroups([]); setMessage(''); setCopied(false) }} /></label></div>
    <p className="ct-note">Os participantes são distribuídos aleatoriamente, com tamanhos equilibrados. Grupos temporários para esta atividade.</p>
    {!valid && participants.length > 0 && <p className="ct-note">{mode === 'count' ? `Escolha um número inteiro entre 1 e ${participants.length}.` : 'Escolha um número inteiro maior que zero.'}</p>}
    <div className="ct-controls"><button className="ct-primary" disabled={busy || !valid} onClick={generate}><Shuffle size={17} />{groups.length ? 'Sortear novamente' : 'Formar grupos'}</button>{groups.length > 0 && <button className="ct-button" onClick={copy}>{copied ? <Check size={16} /> : <Copy size={16} />}Copiar grupos</button>}</div>
    <p role="status" className="ct-note">{message}</p>
    {groups.length ? <div className="ct-groups" aria-live="polite">{groups.map((group, index) => <article className="ct-group" key={index}><h3><span>Grupo {String(index+1).padStart(2,'0')}</span><small>{group.length} {group.length === 1 ? 'pessoa' : 'pessoas'}</small></h3><ul>{group.map(person => <li key={person.id}>{person.nome}</li>)}</ul></article>)}</div> : <div className="ct-empty"><UsersRound size={36} aria-hidden="true" /><h3>Cada encontro, uma troca.</h3><p>Escolha os participantes e forme os grupos da atividade.</p></div>}
  </section>
}
