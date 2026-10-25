export function classificarTimes(data, salaId, scope) {
  const salas=data?.salas || []
  const sala=salas.find(item=>item.id===salaId)
  const porId=new Map(salas.map(item=>[item.id,item]))
  const times=data?.timesEscola || data?.times || []
  const filtered=times.filter(time=>{
    if(scope==='escola')return true
    const turma=porId.get(time.sala_id || salaId)
    return scope==='turma' ? (time.sala_id || salaId)===salaId
      : !!sala && turma?.serie===sala.serie && turma?.etapa===sala.etapa
  }).sort((a,b)=>b.pontos-a.pontos || a.nome.localeCompare(b.nome))
  let position=1
  return filtered.map((time,index)=>{
    if(index && filtered[index-1].pontos!==time.pontos)position=index+1
    return {...time,salaNome:porId.get(time.sala_id || salaId)?.nome || '',position}
  })
}
