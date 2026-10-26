import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowUpRight, BookOpen, CalendarDays, Check, CreditCard, GraduationCap, LayoutGrid, RefreshCw, School, Sparkles, Trophy, Users, UsersRound } from 'lucide-react'
import './school-bento.css'

type Metric = number | null
type Counts = Record<'alunos'|'salas'|'times'|'professores'|'pontos'|'trilhas'|'materias'|'aulas', Metric>
export interface SchoolBentoData {
  counts: Counts
  history: {mes:string;fundamental:number;medio:number;outros:number;total:number}[] | null
  classrooms: {id:string;nome:string;serie:string;alunos:Metric;times:Metric}[] | null
  traits: {id:string;nome:string;valor:number}[] | null
  mapped: Metric; membership: Metric; missingDates: Metric; withoutClass: Metric
  topTeams: {id:string;nome:string;pontos:number;salaNome:string;position:number}[] | null
  eventos: {id:string;titulo:string;inicio:string;tipo?:string}[] | null
  assinatura: {status:string;plano?:string;preco_por_aluno:number|string|null;qtd_alunos_contratada:number;proxima_cobranca?:string} | null
  unavailable: string[]; updatedAt: string
}
const number = (value: Metric) => value === null ? '—' : value.toLocaleString('pt-BR')
const ratio = (part: Metric,total: Metric) => part !== null && total ? Math.round(part/total*100) : null
const date = (value:string) => new Date(/^\d{4}-\d{2}-\d{2}$/.test(value)?value+'T12:00:00':value).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})
const traitColors = ['var(--sb-chart-1)','var(--sb-chart-2)','var(--sb-chart-3)','var(--sb-chart-4)','var(--sb-chart-muted)']
const labels: Record<string,string>={salas:'salas',alunos:'alunos',times:'times',caracteristicas:'características',membros:'integrantes dos times',professores:'professores',trilhas:'trilhas',materias:'matérias',aulas:'grade de aulas',assinatura:'assinatura',eventos:'agenda'}
const digits:Record<string,string[]>={
 '0':['01110','11011','11011','11011','11011','11011','01110'],
 '1':['00100','01100','00100','00100','00100','00100','01110'],
 '2':['01110','11011','00011','00110','01100','11000','11111'],
 '3':['11110','00011','00011','01110','00011','00011','11110'],
 '4':['00011','00111','01111','11011','11111','00011','00011'],
 '5':['11111','11000','11000','11110','00011','11011','01110'],
 '6':['01110','11000','11000','11110','11011','11011','01110'],
 '7':['11111','00011','00110','01100','01100','01100','01100'],
 '8':['01110','11011','11011','01110','11011','11011','01110'],
 '9':['01110','11011','11011','01111','00011','00011','01110'],
 '.':['0','0','0','0','0','1','1'],
}
function AnimatedNumber({ value, dotted = false }: {value:Metric;dotted?:boolean}) {
  const reduce=useReducedMotion()
  const [display,setDisplay]=useState(0)
  const previous=useRef(0)
  useEffect(()=>{
    if(value===null)return
    if(reduce){previous.current=value;setDisplay(value);return}
    const start=performance.now(),from=previous.current
    let frame:number
    function tick(now:number){
      const progress=Math.min(1,(now-start)/950)
      const next=Math.round(from+(value!-from)*(1-(1-progress)**3))
      previous.current=next;setDisplay(next)
      if(progress<1)frame=requestAnimationFrame(tick)
    }
    frame=requestAnimationFrame(tick)
    return ()=>cancelAnimationFrame(frame)
  },[value,reduce])
  if(value===null)return <span>—</span>
  const text=number(display)
  if(!dotted)return <span aria-label={number(value)}>{text}</span>
  let offset=0
  const cells:ReactNode[]=[]
  for(const [index,char] of Array.from(text).entries()){
    const glyph=digits[char] || digits['.']
    glyph.forEach((row,y)=>Array.from(row).forEach((on,x)=>cells.push(<circle key={`${index}-${x}-${y}`} cx={offset+x*7+3} cy={y*7+3} r={2.2} fill="currentColor" opacity={on==='1'?1:.1}/>)))
    offset+=(glyph[0].length+1)*7
  }
  return <svg className="sb-dot-number" role="img" aria-label={number(value)} viewBox={`0 0 ${Math.max(1,offset-7)} 49`} width={offset-7} height={49}>{cells}</svg>
}
function Card({children,className='',index=0,label}:{children:ReactNode;className?:string;index?:number;label:string}){
  const reduce=useReducedMotion()
  return <motion.section aria-label={label} className={`sb-card ${className}`} initial={reduce?false:{opacity:0,y:16,scale:.985}} animate={reduce?{opacity:1,y:0,scale:1}:undefined} whileInView={reduce?undefined:{opacity:1,y:0,scale:1}} viewport={{once:true,amount:.08}} transition={{duration:.72,delay:Math.min(index*.055,.35),ease:[.22,1,.36,1]}}>{children}</motion.section>
}
function CardHeader({title,to,children}:{title:string;to?:string;children?:ReactNode}){
  return <div className="sb-card-header"><h2>{title}</h2>{to?<Link className="sb-arrow" to={to} aria-label={`Abrir ${title.toLowerCase()}`}><ArrowUpRight size={18}/></Link>:children}</div>
}
function ChartTip({active,payload,label}:{active?:boolean;payload?:{name?:string;value?:unknown;payload?:{nome?:string}}[];label?:ReactNode}){
  if(!active || !payload?.length)return null
  return <div className="sb-tooltip"><strong>{payload[0].payload?.nome || label}</strong>{payload.map((row,index)=><p key={index}><span>{row.name}</span><b>{Number(row.value).toLocaleString('pt-BR')}</b></p>)}</div>
}
function MappingGauge({traits,total,mapped}:{traits:SchoolBentoData['traits'];total:Metric;mapped:Metric}){
  const reduce=useReducedMotion()
  const progress=ratio(mapped,total)
  const cumulative:number[]=[]
  let sum=0
  for(const trait of traits || []){sum+=trait.valor;cumulative.push(total?sum/total:0)}
  return <>
    <div className="sb-gauge"><svg viewBox="-150 -150 300 160" role="img" aria-label={progress===null?'Mapeamento sem dados':`${progress}% dos alunos com características mapeadas`}>
      {Array.from({length:57},(_,index)=>{
        const angle=Math.PI+index/56*Math.PI
        const fraction=(index+.5)/57
        const category=total && traits?cumulative.findIndex(value=>fraction<=value):-1
        const inner=index%7===0?110:120
        return <motion.line key={index} x1={Math.cos(angle)*138} y1={Math.sin(angle)*138} x2={Math.cos(angle)*inner} y2={Math.sin(angle)*inner} stroke={category<0?'var(--sb-chart-muted)':traitColors[category%traitColors.length]} strokeWidth={3.4} strokeLinecap="round" initial={reduce?false:{opacity:0}} animate={reduce?{opacity:1}:undefined} whileInView={reduce?undefined:{opacity:1}} viewport={{once:true}} transition={{delay:reduce?0:index*.009,duration:.25}}/>
      })}
      <text className="sb-gauge-value" y={-23} textAnchor="middle">{progress===null?'—':`${progress}%`}</text><text className="sb-gauge-caption" y={0} textAnchor="middle">alunos mapeados</text>
    </svg></div>
    {traits?<ul className="sb-trait-list">{traits.map((trait,index)=><li key={trait.id}><i style={{background:traitColors[index%traitColors.length]}}/><span>{trait.nome}</span><b>{number(trait.valor)}</b></li>)}</ul>:<p className="sb-muted">Mapeamento indisponível.</p>}
  </>
}
function ProgressTicks({value}:{value:Metric}){
  return <div className="sb-ticks" aria-hidden="true">{Array.from({length:36},(_,index)=><i key={index} className={value!==null && index/36<value/100?'on':''} style={{transitionDelay:`${index*10}ms`}}/>)}</div>
}

export default function SchoolBento({data,schoolName,refreshing=false,onRefresh}:{data:SchoolBentoData;schoolName:string;refreshing?:boolean;onRefresh:()=>void}){
  const [period,setPeriod]=useState(6)
  const reduce=useReducedMotion()
  const chartId=useId().replace(/:/g,'')
  const history=useMemo(()=>data.history?.slice(-period) || [],[data.history,period])
  const classes=useMemo(()=>[...(data.classrooms || [])].sort((a,b)=>a.nome.localeCompare(b.nome, 'pt-BR',{numeric:true})),[data.classrooms])
  const mappedRate=ratio(data.mapped,data.counts.alunos)
  const memberRate=ratio(data.membership,data.counts.alunos)
  const hasNoStudents=data.counts.alunos===0
  const subscription=data.assinatura
  const subscriptionStatus=subscription?({trial:'Em demonstração',ativa:'Ativa',inadimplente:'Pagamento pendente',cancelada:'Cancelada'}[subscription.status] || subscription.status):'Sem assinatura cadastrada'
  return <div className="school-bento">
    <header className="sb-heading-row"><div><p className="sb-eyebrow">DIRETORIA / VISÃO INTEGRAL</p><h1 className="sb-heading">Sua escola, por inteiro<span className="sb-heading-dot">.</span></h1><p className="sb-subtitle">{schoolName} <span>· Atualizado às {new Date(data.updatedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span></p></div><button className="sb-refresh" disabled={refreshing} onClick={onRefresh}><RefreshCw size={15} className={refreshing?'sb-spinning':''}/>{refreshing?'Atualizando…':'Atualizar resumo'}</button></header>
    {data.unavailable.length>0 && <div className="sb-warning" role="status">Alguns dados estão indisponíveis: {data.unavailable.map(key=>labels[key] || key).join(', ')}. Use “Atualizar resumo” para tentar novamente.</div>}
    <div className="sb-grid">
      <Card className="sb-history sb-blue" label="Cadastros da escola" index={0}>
        <div className="sb-card-header"><div><p className="sb-cap">ALUNOS CADASTRADOS</p><div className="sb-hero-value"><AnimatedNumber value={data.counts.alunos} dotted /></div></div><div className="sb-period" role="group" aria-label="Período dos cadastros">{[3,6,12].map(months=><button key={months} aria-pressed={period===months} onClick={()=>setPeriod(months)}>{months}M</button>)}</div></div>
        <div className="sb-history-summary"><span><Sparkles size={13}/> Uma escola. Muitos universos.</span><span>{number(data.counts.salas)} salas · {number(data.counts.times)} times</span></div>
        <div className="sb-legend"><span><i style={{background:'var(--sb-chart-1)'}}/>Fundamental 2</span><span><i style={{background:'var(--sb-chart-2)'}}/>Ensino Médio</span><span><i style={{background:'var(--sb-chart-3)'}}/>Outros / sem sala</span></div>
        {data.history && !hasNoStudents?<div className="sb-history-chart" role="img" aria-label={`Alunos atualmente cadastrados por data de entrada, últimos ${period} meses`}><ResponsiveContainer width="100%" height="100%"><AreaChart data={history} margin={{top:14,right:2,left:0,bottom:0}}><defs><linearGradient id={`${chartId}-area`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--sb-chart-2)" stopOpacity={.95}/><stop offset="100%" stopColor="var(--sb-chart-2)" stopOpacity={.2}/></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--sb-chart-grid)"/><XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fill:'var(--sb-tinted-muted)',fontSize:11}} minTickGap={16}/><YAxis hide domain={[0,'auto']}/><Tooltip content={<ChartTip/>}/><Area name="Fundamental 2" dataKey="fundamental" type="monotone" stackId="school" stroke="var(--sb-chart-1)" fill="var(--sb-chart-1)" fillOpacity={.85} isAnimationActive={!reduce} animationDuration={1100}/><Area name="Ensino Médio" dataKey="medio" type="monotone" stackId="school" stroke="var(--sb-chart-2)" fill={`url(#${chartId}-area)`} isAnimationActive={!reduce} animationDuration={1100}/><Area name="Outros / sem sala" dataKey="outros" type="monotone" stackId="school" stroke="var(--sb-chart-3)" fill="var(--sb-chart-3)" fillOpacity={.8} isAnimationActive={!reduce} animationDuration={1100}/></AreaChart></ResponsiveContainer></div>:<div className="sb-chart-empty">{hasNoStudents?'O próximo universo começa com o primeiro aluno.':'Histórico de cadastros indisponível.'}</div>}
        <p className="sb-chart-note">Cadastros atuais agrupados pela data de entrada.{!!data.missingDates && ` ${number(data.missingDates)} sem data cadastrada.`}</p>
        {data.history && <details className="sb-chart-data"><summary>Ver dados do gráfico</summary><div><table><caption>Cadastros acumulados no recorte</caption><thead><tr><th>Mês</th><th>Fundamental 2</th><th>Médio</th><th>Outros</th></tr></thead><tbody>{history.map(row=><tr key={row.mes}><td>{row.mes}</td><td>{row.fundamental}</td><td>{row.medio}</td><td>{row.outros}</td></tr>)}</tbody></table></div></details>}
      </Card>
      <Card className="sb-mapping sb-graph" label="Características da escola" index={1}><CardHeader title="Jeitos de aprender" to="/diretor/alunos"/><MappingGauge traits={data.traits} mapped={data.mapped} total={data.counts.alunos}/></Card>
      <Card className="sb-kpi sb-pop" label="Total de alunos" index={2}><div className="sb-kpi-top"><span className="sb-cap">ALUNOS</span><Users size={20}/></div><div className="sb-kpi-value"><AnimatedNumber value={data.counts.alunos}/></div><Link to="/diretor/alunos" className="sb-kpi-link">Conhecer cada universo <ArrowUpRight size={14}/></Link></Card>
      <Card className="sb-kpi sb-glass" label="Salas da escola" index={3}><div className="sb-kpi-top"><span className="sb-cap">SALAS</span><School size={20}/></div><div className="sb-kpi-value"><AnimatedNumber value={data.counts.salas}/></div><Link to="/diretor/salas" className="sb-kpi-link">Todas as turmas <ArrowUpRight size={14}/></Link></Card>
      <Card className="sb-kpi sb-glass" label="Professores da escola" index={4}><div className="sb-kpi-top"><span className="sb-cap">PROFESSORES ATIVOS</span><GraduationCap size={20}/></div><div className="sb-kpi-value"><AnimatedNumber value={data.counts.professores}/></div><Link to="/diretor/professores" className="sb-kpi-link">Equipe pedagógica <ArrowUpRight size={14}/></Link></Card>
      <Card className="sb-kpi sb-glass" label="Times da escola" index={5}><div className="sb-kpi-top"><span className="sb-cap">TIMES</span><UsersRound size={20}/></div><div className="sb-kpi-value"><AnimatedNumber value={data.counts.times}/></div><Link to="/diretor/ranking" className="sb-kpi-link">{number(data.counts.pontos)} pontos dos times <ArrowUpRight size={14}/></Link></Card>
      <Card className="sb-classrooms sb-rose" label="Alunos por sala" index={6}><CardHeader title="Cada sala, uma constelação" to="/diretor/salas"/><p className="sb-tinted-muted">Distribuição dos alunos em todas as salas</p>{classes.length && data.counts.alunos!==null?<div className="sb-class-chart"><ResponsiveContainer width="100%" height={Math.max(185,classes.length*34)}><BarChart data={classes} layout="vertical" margin={{left:0,right:22,top:15,bottom:0}}><XAxis type="number" hide allowDecimals={false}/><YAxis type="category" dataKey="nome" axisLine={false} tickLine={false} width={95} interval={0} tick={{fill:'var(--sb-tinted-text)',fontSize:11}} tickFormatter={value=>String(value).length>16?String(value).slice(0,14)+'…':String(value)}/><Tooltip content={<ChartTip/>} cursor={{fill:'var(--sb-chart-grid)'}}/><Bar name="Alunos" dataKey="alunos" fill="var(--sb-chart-1)" radius={[0,5,5,0]} barSize={12} isAnimationActive={!reduce} animationDuration={1000}/></BarChart></ResponsiveContainer></div>:<p className="sb-empty">{data.classrooms===null || data.counts.alunos===null?'Dados das salas indisponíveis.':'As salas cadastradas aparecerão aqui.'}</p>}<p className="sb-chart-note">{data.withoutClass===null?'—':hasNoStudents?'Nenhum aluno cadastrado ainda.':data.withoutClass?`${number(data.withoutClass)} alunos ainda sem sala vinculada.`:'Todos os alunos cadastrados estão vinculados a uma sala.'}</p></Card>
      <Card className="sb-teams sb-green" label="Times em destaque" index={7}><CardHeader title="Conquistas em conjunto" to="/diretor/ranking"/><div className="sb-points-total"><Trophy size={20}/><AnimatedNumber value={data.counts.pontos}/><small>pontos dos times</small></div><ol className="sb-team-list">{data.topTeams?.map(team=><li key={team.id}><span className="sb-team-number">{team.position}º</span><div><strong>{team.nome}</strong><small>{team.salaNome}</small></div><b>{number(team.pontos)}<small>pts</small></b></li>)}</ol>{!data.topTeams?.length && <p className="sb-empty">{data.topTeams===null?'Ranking indisponível.':'Os primeiros times aparecerão aqui.'}</p>}<p className="sb-chart-note">Times da escola com maior pontuação.</p></Card>
      <Card className="sb-agenda sb-copper" label="Próximos eventos" index={8}><CardHeader title="O que vem por aí" to="/diretor/calendario"/><div className="sb-agenda-icon"><CalendarDays size={28}/></div><ul className="sb-event-list">{data.eventos?.map(event=><li key={event.id}><time dateTime={event.inicio}>{date(event.inicio)}</time><div><strong>{event.titulo}</strong><small>{new Date(event.inicio).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</small></div></li>)}</ul>{!data.eventos?.length && <p className="sb-empty">{data.eventos===null?'Agenda indisponível.':'Por enquanto, nada agendado. Um bom espaço para novas ideias.'}</p>}</Card>
      <Card className="sb-structure sb-glass" label="Aprendizagem e organização" index={9}><CardHeader title="Aprender, conectar, organizar"/><div className="sb-structure-grid"><div><BookOpen size={18}/><strong><AnimatedNumber value={data.counts.trilhas}/></strong><span>trilhas criadas</span></div><Link to="/diretor/materias"><LayoutGrid size={18}/><strong><AnimatedNumber value={data.counts.materias}/></strong><span>matérias</span></Link><Link to="/diretor/cronograma"><CalendarDays size={18}/><strong><AnimatedNumber value={data.counts.aulas}/></strong><span>aulas na grade semanal</span></Link></div></Card>
      <Card className="sb-coverage sb-glass" label="Participação e mapeamento" index={10}><CardHeader title="Escola conectada"/><div className="sb-progress-row"><span>Características mapeadas</span><strong>{mappedRate===null?'—':`${mappedRate}%`}</strong></div><ProgressTicks value={mappedRate}/><div className="sb-progress-row"><span>Alunos em times</span><strong>{memberRate===null?'—':`${memberRate}%`}</strong></div><ProgressTicks value={memberRate}/><p className="sb-muted">{data.membership===null?'Vínculos dos times indisponíveis.':`${number(data.membership)} de ${number(data.counts.alunos)} alunos fazem parte de um time.`}</p></Card>
      <Card className="sb-subscription sb-glass" label="Assinatura da escola" index={11}><CardHeader title="Seu acesso à Slark" to="/diretor/financeiro"/><div className="sb-plan"><CreditCard size={20}/><span>{data.unavailable.includes('assinatura')?'Indisponível':subscriptionStatus}</span>{subscription?.status==='ativa' && <Check size={16}/>}</div>{subscription?<><p className="sb-plan-name">{subscription.plano === 'live' ? 'Plano Live' : 'Plano Base'}</p><p className="sb-muted">{number(subscription.qtd_alunos_contratada)} alunos contratados · {subscription.preco_por_aluno===null?'Valor por aluno não cadastrado':`${Number(subscription.preco_por_aluno).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} por aluno`}</p>{subscription.proxima_cobranca && <p className="sb-muted">Próxima cobrança: {date(subscription.proxima_cobranca)}</p>}</>:<p className="sb-muted">Consulte a gestão financeira para acompanhar o acesso da escola.</p>}</Card>
    </div>
    <p className="sb-footer">Cada mente é um universo. Todos fazem parte desta escola.</p>
  </div>
}
