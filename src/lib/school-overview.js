// Fetch every page: a whole-school summary must not stop at Supabase's row limit.
export async function readAllPages(factory, signal, pageSize = 1000) {
  const rows=[]
  for(let offset=0;;offset+=pageSize){
    signal?.throwIfAborted()
    let query=factory().range(offset,offset+pageSize-1)
    if(signal)query=query.abortSignal(signal)
    const result=await query
    if(result.error)throw result.error
    const page=result.data || []
    rows.push(...page)
    if(page.length<pageSize)return rows
  }
}

export async function loadSchoolOverview(client, schoolId, signal) {
  if(!schoolId)throw Error('Sua conta ainda não está vinculada a uma escola.')
  const count=async(table,configure=query=>query)=>{
    let query=configure(client.from(table).select('id',{count:'exact',head:true}).eq('escola_id',schoolId))
    if(signal)query=query.abortSignal(signal)
    const result=await query
    if(result.error)throw result.error
    return result.count
  }
  const one=async query=>{
    if(signal)query=query.abortSignal(signal)
    const result=await query
    if(result.error)throw result.error
    return result.data
  }
  const tasks={
    salas:()=>readAllPages(()=>client.from('salas').select('id,nome,serie,etapa').eq('escola_id',schoolId).order('id'),signal),
    alunos:()=>readAllPages(()=>client.from('alunos').select('id,sala_id,caracteristica_id,criado_em').eq('escola_id',schoolId).order('id'),signal),
    times:()=>readAllPages(()=>client.from('times').select('id,nome,pontos,sala_id,salas!inner(nome,escola_id)').eq('salas.escola_id',schoolId).order('id'),signal),
    caracteristicas:()=>readAllPages(()=>client.from('caracteristicas').select('id,nome').order('id'),signal),
    membros:()=>readAllPages(()=>client.from('time_membros').select('aluno_id,time_id,alunos!inner(escola_id)').eq('alunos.escola_id',schoolId).order('aluno_id').order('time_id'),signal),
    professores:()=>count('usuarios',query=>query.eq('perfil','professor').or('ativo.eq.true,ativo.is.null')),
    trilhas:()=>count('trilhas',query=>query.or('eh_template.eq.false,eh_template.is.null')),
    materias:()=>count('materias'),
    aulas:()=>count('grade_horarios'),
    assinatura:()=>one(client.from('assinaturas').select('status,plano,preco_por_aluno,qtd_alunos_contratada,proxima_cobranca').eq('escola_id',schoolId).order('criada_em',{ascending:false}).limit(1).maybeSingle()),
    eventos:()=>one(client.from('eventos').select('id,titulo,inicio,tipo').eq('escola_id',schoolId).gte('inicio',new Date().toISOString()).order('inicio').limit(4)),
  }
  const entries=Object.entries(tasks)
  const results=await Promise.allSettled(entries.map(([,load])=>load()))
  signal?.throwIfAborted()
  const raw={};const unavailable=[]
  results.forEach((result,index)=>{
    const key=entries[index][0]
    raw[key]=result.status==='fulfilled'?result.value:null
    if(result.status==='rejected')unavailable.push(key)
  })
  return {...buildSchoolOverview(raw),unavailable,updatedAt:new Date().toISOString()}
}

export function buildSchoolOverview(raw, now = new Date()) {
  const alunos=raw.alunos, salas=raw.salas, times=raw.times
  const rooms=new Map((salas || []).map(sala=>[sala.id,sala]))
  const alunosPorSala=new Map(), timesPorSala=new Map()
  for(const aluno of alunos || [])alunosPorSala.set(aluno.sala_id,(alunosPorSala.get(aluno.sala_id)||0)+1)
  for(const time of times || [])timesPorSala.set(time.sala_id,(timesPorSala.get(time.sala_id)||0)+1)
  const classrooms=salas?.map(sala=>({...sala,alunos:alunos?alunosPorSala.get(sala.id)||0:null,times:times?timesPorSala.get(sala.id)||0:null})) || null
  const validDates=(alunos || []).map(aluno=>({...aluno,date:aluno.criado_em?new Date(aluno.criado_em):null})).filter(aluno=>aluno.date && !Number.isNaN(aluno.date.getTime()))
  const history=alunos && salas ? Array.from({length:12},(_,index)=>{
    const start=new Date(now.getFullYear(),now.getMonth()-11+index,1)
    const end=new Date(start.getFullYear(),start.getMonth()+1,1)
    const counts={fundamental:0,medio:0,outros:0}
    for(const aluno of validDates){
      if(aluno.date>=end || aluno.date>now)continue
      const etapa=rooms.get(aluno.sala_id)?.etapa
      counts[['fundamental','fundamental_2'].includes(etapa)?'fundamental':['medio','ensino_medio'].includes(etapa)?'medio':'outros']++
    }
    return {mes:start.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}),...counts,total:counts.fundamental+counts.medio+counts.outros}
  }) : null
  const traitCounts=new Map()
  for(const aluno of alunos || [])if(aluno.caracteristica_id)traitCounts.set(aluno.caracteristica_id,(traitCounts.get(aluno.caracteristica_id)||0)+1)
  const mapped=alunos?alunos.filter(aluno=>aluno.caracteristica_id).length:null
  const traits=alunos && raw.caracteristicas ? raw.caracteristicas.map(trait=>({id:trait.id,nome:trait.nome,valor:traitCounts.get(trait.id)||0})) : null
  if(traits && alunos.length>mapped)traits.push({id:'sem-mapeamento',nome:'Ainda não mapeados',valor:alunos.length-mapped})
  const memberIds=raw.membros?new Set(raw.membros.map(member=>member.aluno_id)):null
  const membership=alunos && memberIds ? alunos.filter(aluno=>memberIds.has(aluno.id)).length : null
  let position=1
  const topTeams=times?[...times].sort((a,b)=>(b.pontos||0)-(a.pontos||0)||a.nome.localeCompare(b.nome)).slice(0,4).map((time,index,all)=>{if(index && (all[index-1].pontos||0)!==(time.pontos||0))position=index+1;return {...time,position,salaNome:rooms.get(time.sala_id)?.nome || ''}}):null
  return {
    counts:{alunos:alunos?.length??null,salas:salas?.length??null,times:times?.length??null,professores:raw.professores??null,pontos:times?times.reduce((sum,time)=>sum+(time.pontos||0),0):null,trilhas:raw.trilhas??null,materias:raw.materias??null,aulas:raw.aulas??null},
    history,classrooms,traits,mapped,membership,topTeams,
    missingDates:alunos?alunos.length-validDates.length:null,
    withoutClass:alunos && salas ? alunos.filter(aluno=>!rooms.has(aluno.sala_id)).length:null,
    assinatura:raw.assinatura??null,eventos:raw.eventos??null,
  }
}
