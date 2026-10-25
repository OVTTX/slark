import { useEffect, useState } from 'react'
import { liveRequest } from '../../lib/slark-live'

export default function LiveSolo() {
  const [decks,setDecks]=useState(null)
  const [deck,setDeck]=useState(null)
  const [index,setIndex]=useState(0)
  const [result,setResult]=useState(null)
  const [card,setCard]=useState(null)
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  useEffect(() => {
    let active=true
    liveRequest('solo-catalog').then(value => {if(active)setDecks(value)}).catch(error => {if(active)setError(error.message)})
    return () => {active=false}
  },[])
  async function act(fn) {
    if(busy)return
    setBusy(true);setError('')
    try{await fn()}catch(error){setError(error.message)}finally{setBusy(false)}
  }
  const button='rounded-xl border px-5 py-3 text-sm disabled:opacity-40'
  return <section className="mt-7 rounded-3xl border bg-card p-6"><h2 className="text-2xl font-bold">Live Solo</h2><p className="mt-3 text-sm text-texto/60">Revise suas trilhas com flashcards e quizzes. O bot é uma simulação de treino; esta prática não distribui pontos de competição.</p>
    {error && <p className="mt-4 text-red-400" role="alert">{error}</p>}
    {!deck ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{decks?.map(item => <button className={`${button} text-left`} key={item.id} disabled={busy} onClick={() => void act(async () => {setDeck(await liveRequest('solo-deck',null,{deck:item.id}));setIndex(0);setResult(null);setCard(null)})}><strong>{item.title}</strong><span className="mt-2 block text-texto/60">{item.chapter} · {item.total} perguntas</span></button>)}{decks && !decks.length && <p className="text-texto/60">O professor ainda não publicou práticas nas suas trilhas.</p>}{!decks && !error && <p>Carregando práticas…</p>}</div> : <>
      <p className="mt-5 text-sm text-azul">{deck.title} · {index+1}/{deck.items.length}</p><h3 className="mt-4 text-2xl font-semibold">{deck.items[index].title}</h3><div className="mt-5 grid gap-3 sm:grid-cols-2">{deck.items[index].options.map((option,i) => <button className={`${button} text-left ${result?.answer===i ? 'border-green-400' : ''}`} key={i} disabled={busy || !!result || !!card} onClick={() => void act(async () => setResult(await liveRequest('solo-answer',{deckId:deck.id,index,option:i})))}>{String.fromCharCode(65+i)} · {option}</button>)}</div>
      <div className="mt-5 flex flex-wrap gap-3"><button className={button} disabled={busy || !!card || !!result} onClick={() => void act(async () => setCard(await liveRequest('solo-card',null,{deck:deck.id,index:String(index)})))}>Virar flashcard</button><button className={button} onClick={() => {setDeck(null);setResult(null);setCard(null)}}>Voltar às práticas</button></div>
      {(card || result) && <div role="status" className="mt-5 rounded-2xl border p-5"><strong>{card ? card.back : result.correct ? 'Você acertou!' : 'Vamos revisar.'}</strong><p className="mt-3 text-texto/60">{card?.explanation || result.explanation}</p>{result && <p className="mt-2 text-sm">Bot de treino: {result.botCorrect ? 'acertou' : 'errou'}.</p>}<button className={`${button} mt-4 bg-azul text-white`} onClick={() => {if(index<deck.items.length-1)setIndex(index+1);else setDeck(null);setResult(null);setCard(null)}}>{index<deck.items.length-1 ? 'Próximo item' : 'Concluir prática'}</button></div>}
    </>}
  </section>
}
