import { useEffect, useState } from 'react'
import { Check, Crown, Eye, LockKeyhole, Sparkles } from 'lucide-react'
import { usePersonalizacao } from '../context/PersonalizacaoContext'
import { CATALOGO, podeUsar, progressoNivel } from '../lib/personalizacao'
const CATEGORIAS=[['skin','Temas'],['texto','Cores de títulos'],['moldura','Molduras']]
const numero=n=>n.toLocaleString('pt-BR')
export default function LojaPersonalizacao() {
  const { pontos,preferencias,completo,carregando,erro,salvando,aplicar,recarregar }=usePersonalizacao()
  const [tipo,setTipo]=useState('skin'),[preview,setPreview]=useState(preferencias),[aviso,setAviso]=useState('')
  useEffect(()=>setPreview(preferencias),[preferencias.skin,preferencias.texto,preferencias.moldura])
  useEffect(()=>{ void recarregar() },[recarregar])
  const nivel=progressoNivel(pontos)
  const tema=CATALOGO.find(i=>i.tipo==='skin' && i.id===preview.skin)
  const gold=preview.skin==='ouro',noir=preview.skin==='noir'
  const titulo=noir?'#D1D1D1':preview.texto==='padrao' ? (gold?'#332A19':'#FFFFFF') : preview.texto==='dourado' ? (gold?'#805B13':'#E8C878') : gold?'#235379':preview.texto==='gelo'?'#BDEEFF':'#9BC5FF'
  async function usar(item) {
    setAviso('')
    try {await aplicar(item.tipo,item.id);setAviso(`${item.nome} aplicado à sua conta.`)} catch(e) {setAviso(e.message)}
  }
  return <section className="loja-estilos" aria-labelledby="loja-titulo">
    <div className="loja-intro"><p className="text-xs text-azul flex items-center gap-2"><Sparkles size={14}/> SEU UNIVERSO, DO SEU JEITO</p><h2 id="loja-titulo" className="mt-3 text-3xl font-bold italic text-white tracking-tight">Loja de estilos</h2><p className="mt-3 text-sm text-texto/60 leading-relaxed">Aprenda, evolua e desbloqueie novas formas de deixar a Slark com a sua cara. Seus pontos continuam com você.</p></div>
    {erro ? <div role="alert" className="slark-panel mt-5 p-5"><p>{erro}</p><button onClick={recarregar} className="mt-4 rounded-full bg-azul px-5 py-3 text-sm">Tentar novamente</button></div> : <>
    <div className="loja-progresso slark-panel mt-6 p-5"><div className="flex flex-wrap justify-between gap-4"><div><p className="text-xs text-texto/60">{completo?'Tudo liberado para sua conta':'Sua pontuação'}</p><strong className="text-2xl text-white">{completo?'Acervo completo':`${numero(pontos)} pts`}</strong></div><div className="text-right"><p className="text-xs text-texto/60">{completo?'Admins e contas VTX':'Nível de estilo'}</p><strong className="text-xl text-azul">{completo?<Crown aria-label="Acesso completo"/>:`${nivel.nivel}`}</strong></div></div>{!completo && <><div className="mt-4 h-1.5 bg-white/10 rounded-full overflow-hidden" role="progressbar" aria-label="Progresso para o próximo nível de estilo" aria-valuemin={0} aria-valuemax={100} aria-valuenow={nivel.progresso}><div className="h-full bg-azul rounded-full" style={{width:`${nivel.progresso}%`}}/></div><p className="mt-2 text-xs text-texto/50">Mais {nivel.faltam} pontos para o próximo nível de estilo. Slark Gold aos 1.500 pontos.</p></>}</div>
    <div className="loja-preview mt-6 rounded-3xl p-6 sm:p-8" style={{background:tema.fundo,color:noir?'#D1D1D1':gold?'#332A19':'#FFFFFF',borderColor:`${tema.cor}55`}} aria-label={`Prévia do tema ${tema.nome}`}>
      <div className="flex justify-between items-center gap-4"><span className="text-[10px] tracking-widest opacity-70">PRÉVIA · {tema.nome.toUpperCase()}</span><Crown size={18} color={tema.cor}/></div>
      <div className="flex items-center gap-4 mt-6"><div className={`loja-avatar moldura-${preview.moldura}`} style={{color:tema.cor}}>S</div><div><h3 style={{color:titulo}} className="text-2xl font-bold italic">Seu próximo universo.</h3><p className="text-xs mt-2 opacity-70">Cada conquista abre novas possibilidades.</p></div></div>
      <div className="grid grid-cols-2 gap-3 mt-6">{['Suas conquistas','Seu progresso'].map((label,i)=><div key={label} className="rounded-xl p-4" style={{background:noir?'#000000':gold?'#FFFFFF':'#FFFFFF0C',border:`1px solid ${tema.cor}33`}}><p className="text-[10px] opacity-65">{label}</p><p className="text-xl mt-2 font-semibold" style={{color:titulo}}>{i?'82%':'150'}</p></div>)}</div><p className="mt-4 text-[10px] opacity-60">Dados ilustrativos. Só muda no seu aplicativo quando você aplica um estilo.</p>
    </div>
    <div role="tablist" aria-label="Categorias de estilos" className="loja-tabs mt-7 flex flex-wrap gap-2">{CATEGORIAS.map(([key,label],index)=><button role="tab" id={`estilo-tab-${key}`} aria-controls="estilos-catalogo" aria-selected={tipo===key} tabIndex={tipo===key?0:-1} key={key} onClick={()=>setTipo(key)} onKeyDown={e=>{const next=e.key==='ArrowRight'?(index+1)%3:e.key==='ArrowLeft'?(index+2)%3:null;if(next!==null){e.preventDefault();setTipo(CATEGORIAS[next][0]);e.currentTarget.parentElement.children[next].focus()}}} className={`rounded-full border px-4 py-2.5 text-xs ${tipo===key?'bg-azul text-white':'text-texto/60 hover:bg-white/5'}`}>{label}</button>)}</div>
    {carregando && <p role="status" className="text-sm mt-5 text-texto/60">Buscando seus estilos…</p>}
    <div id="estilos-catalogo" role="tabpanel" aria-labelledby={`estilo-tab-${tipo}`} className="loja-grid mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">{CATALOGO.filter(i=>i.tipo===tipo).map(item=>{
      const liberado=podeUsar(item,pontos,completo),ativo=preferencias[item.tipo]===item.id
      return <article key={item.id} className={`loja-item slark-panel p-5 ${ativo?'loja-item-ativo':''}`}>
        <div className="loja-amostra" style={{background:item.fundo||'var(--app-input)',color:tipo==='texto'&&preferencias.skin==='ouro'?(item.id==='padrao'?'#332A19':item.id==='dourado'?'#805B13':'#235379'):item.cor}} aria-hidden="true">{tipo==='skin'?<><span className="loja-mini-orbita"/><strong>Aa</strong></>:tipo==='texto'?<strong>Aa</strong>:<span className={`loja-avatar moldura-${item.id}`}>S</span>}</div>
        <div className="flex items-center justify-between gap-2 mt-4"><h3 className="font-semibold text-white text-sm">{item.nome}</h3>{ativo?<Check size={16} className="text-azul"/>:!liberado?<LockKeyhole size={14} className="text-texto/50"/>:null}</div>
        <p className="mt-2 min-h-8 text-xs text-texto/60 leading-relaxed">{item.descricao|| (tipo==='texto'?'Uma cor nova para seus títulos, mantendo a leitura confortável.':'Um detalhe para destacar seu avatar no app.')}</p>
        <p className="mt-3 text-[11px] text-texto/60">{completo?'Liberado para sua conta':item.pontos===0?'Disponível desde o começo':`${numero(item.pontos)} pontos para desbloquear`}</p>
        <button onClick={()=>setPreview(p=>({...p,[tipo]:item.id}))} className="mt-4 w-full flex items-center justify-center gap-2 rounded-full border py-2.5 text-xs text-texto/70"><Eye size={13}/> Ver prévia</button>
        <button onClick={()=>usar(item)} disabled={!liberado||ativo||salvando||carregando} className="mt-2 w-full rounded-full bg-azul py-2.5 text-xs font-semibold disabled:opacity-50">{ativo?'Em uso':!liberado?`Faltam ${numero(Math.max(0,item.pontos-pontos))} pts`:salvando?'Salvando…':'Usar estilo'}</button>
      </article>
    })}</div><p role="status" aria-live="polite" className="mt-5 text-sm text-azul min-h-6">{aviso}</p>
    </>}
  </section>
}
