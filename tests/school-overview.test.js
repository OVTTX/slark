import {test} from 'node:test'
import assert from 'node:assert/strict'
import {buildSchoolOverview,readAllPages} from '../src/lib/school-overview.js'
const now=new Date('2026-10-25T12:00:00Z')
const raw={
 salas:[{id:'a',nome:'2B',etapa:'ensino_medio'},{id:'b',nome:'8A',etapa:'fundamental_2'}],
 alunos:[{id:'1',sala_id:'a',caracteristica_id:'creative',criado_em:'2026-09-01T12:00:00Z',pontos:999},{id:'2',sala_id:'b',caracteristica_id:null,criado_em:'2026-10-02T12:00:00Z',pontos:999},{id:'3',sala_id:null,caracteristica_id:null,criado_em:null}],
 times:[{id:'t1',nome:'Bulls',sala_id:'a',pontos:20},{id:'t2',nome:'Eagles',sala_id:'b',pontos:7}],
 caracteristicas:[{id:'creative',nome:'Criativo'}],membros:[{aluno_id:'1'},{aluno_id:'1'}],professores:4,trilhas:5,materias:6,aulas:30,assinatura:null,eventos:[],
}
test('whole-school metrics include every room and count team points once',()=>{
 const summary=buildSchoolOverview(raw,now)
 assert.deepEqual(summary.counts,{alunos:3,salas:2,times:2,professores:4,pontos:27,trilhas:5,materias:6,aulas:30})
 assert.deepEqual(summary.classrooms.map(row=>row.alunos),[1,1])
 assert.equal(summary.withoutClass,1)
 assert.equal(summary.mapped,1)
 assert.equal(summary.membership,1)
 assert.deepEqual(summary.traits.map(row=>row.valor),[1,2])
})
test('history uses actual dates and stored school stages; no invented records',()=>{
 const summary=buildSchoolOverview(raw,now)
 assert.equal(summary.history.length,12)
 assert.deepEqual({...summary.history.at(-1),mes:undefined},{mes:undefined,medio:1,fundamental:1,outros:0,total:2})
 assert.equal(summary.missingDates,1)
 assert.equal(summary.history[0].total,0)
})
test('unavailable data remains unknown; an empty school correctly shows zero',()=>{
 const unavailable=buildSchoolOverview({...raw,alunos:null,times:null},now)
 assert.equal(unavailable.counts.alunos,null);assert.equal(unavailable.counts.pontos,null);assert.equal(unavailable.history,null)
 const empty=buildSchoolOverview({...raw,alunos:[],times:[],salas:[]},now)
 assert.equal(empty.counts.alunos,0);assert.equal(empty.counts.pontos,0)
})
test('ties between top teams share a position',()=>{
 const summary=buildSchoolOverview({...raw,times:[...raw.times,{id:'t3',nome:'Wolves',sala_id:'a',pontos:20}]},now)
 assert.deepEqual(summary.topTeams.map(row=>row.position),[1,1,3])
})
test('pagination includes records beyond 1000 and propagates failures',async()=>{
 const values=Array.from({length:2101},(_,id)=>({id}));const pages=[]
 const result=await readAllPages(()=>({range:(start,end)=>{pages.push([start,end]);return Promise.resolve({data:values.slice(start,end+1)})}}))
 assert.equal(result.length,2101);assert.deepEqual(pages,[[0,999],[1000,1999],[2000,2999]])
 await assert.rejects(()=>readAllPages(()=>({range:()=>Promise.resolve({error:Error('offline')})})),/offline/)
})
