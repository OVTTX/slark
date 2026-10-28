import { useState } from 'react'
import { Check, Lock, Loader2, Sparkles } from 'lucide-react'
import { useEstampasCartao } from '../context/EstampasCartaoContext'
import CarteirinhaAluno from './CarteirinhaAluno'
import './estampas-cartao.css'

export function ColecaoEstampas({ colecao, onPreview }) {
  const {items,selecionada,loading,error,saving,reload,aplicar} = colecao
  const [preview,setPreview] = useState(null)
  const [feedback,setFeedback] = useState('')
  const [failed,setFailed] = useState(false)
  const selected = preview || selecionada
  const item = items.find(row => row.id === selected)
  async function save() {
    setFeedback('');setFailed(false)
    try {await aplicar(selected);setFeedback('Estampa aplicada à sua carteirinha!')}
    catch {setFailed(true);setFeedback('Não foi possível salvar a estampa. Tente novamente.')}
  }
  return <section className="slark-print-collection" aria-labelledby="estampas-title">
    <div className="slark-print-heading"><span><Sparkles size={15}/> SUA COLEÇÃO</span><h2 id="estampas-title">Estampas do cartão</h2><p>Escolha entre as estampas que você conquistar para deixar a carteirinha com a sua cara.</p></div>
    <p className="slark-print-coming">Novas estampas e conquistas pelo Slark Live vêm em uma próxima atualização.</p>
    {loading ? <p className="slark-print-status" role="status"><Loader2 size={18} className="animate-spin"/>Carregando coleção…</p> : error ? <div role="alert" className="slark-print-status">{error}<button type="button" onClick={reload}>Tentar novamente</button></div> : <>
      <div className="slark-print-grid" aria-label="Catálogo de estampas">{items.map(row => <button key={row.id} type="button" className={`slark-print-option${selected === row.id ? ' is-selected' : ''}`} aria-pressed={selected === row.id} onClick={()=>{setPreview(row.id);setFeedback('');onPreview?.(row.id)}}>
        <span className="slark-print-swatch" data-estampa={row.id} aria-hidden="true"><span className="slark-stamp-art" data-estampa={row.id}/><strong>SLARK</strong></span>
        <span className="slark-print-name">{row.nome}{selecionada === row.id && <Check size={14}/>}</span>
        <small>{row.disponivel ? selecionada === row.id ? 'Em uso' : 'Na sua coleção' : row.lancada ? <><Lock size={11}/>Ainda não conquistada</> : <><Lock size={11}/>Em breve</>}</small>
      </button>)}</div>
      {item && <div className="slark-print-selection"><div><strong>{item.nome}</strong><p>{item.descricao}</p>{!item.disponivel && <small>Você está vendo uma prévia. Esta estampa ainda não pode ser aplicada.</small>}</div><button type="button" disabled={!item.disponivel || saving || selecionada === selected} onClick={save}>{saving ? <Loader2 size={16} className="animate-spin"/> : <Check size={16}/>} {selecionada === selected ? 'Em uso' : 'Aplicar estampa'}</button></div>}
      {feedback && <p className="slark-print-status" role={failed ? 'alert' : 'status'}>{feedback}</p>}
    </>}
  </section>
}
export default function EstampasCartao({ perfil }) {
  const colecao = useEstampasCartao()
  const [preview,setPreview] = useState(null)
  return <div className="space-y-5"><ColecaoEstampas colecao={colecao} onPreview={setPreview}/>{preview && <div><p className="slark-print-preview-label">Prévia da estampa · sua carteirinha só muda ao aplicar.</p><CarteirinhaAluno perfil={perfil} estampaPreview={preview}/></div>}</div>
}
