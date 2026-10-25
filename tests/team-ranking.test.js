import {test} from 'node:test'
import assert from 'node:assert/strict'
import {classificarTimes} from '../src/lib/team-ranking.js'
const data={salas:[{id:'a',nome:'2A',serie:'2',etapa:'medio'},{id:'b',nome:'2B',serie:'2',etapa:'medio'},{id:'c',nome:'3A',serie:'3',etapa:'medio'},{id:'d',nome:'2 Fundamental',serie:'2',etapa:'fundamental'}],timesEscola:[{id:'t1',nome:'Bulls',sala_id:'a',pontos:20},{id:'t2',nome:'Eagles',sala_id:'b',pontos:30},{id:'t3',nome:'Rangers',sala_id:'c',pontos:40},{id:'t4',nome:'Pequenos',sala_id:'d',pontos:10},{id:'t5',nome:'Wolves',sala_id:'a',pontos:20}]}
test('Sala ranks only teams in the selected classroom, preserving ties',()=>{
 assert.deepEqual(classificarTimes(data,'a','turma').map(row=>[row.id,row.position]),[['t1',1],['t5',1]])
})
test('same series includes teams from parallel classes, excludes another stage',()=>{
 assert.deepEqual(classificarTimes(data,'a','serie').map(row=>row.id),['t2','t1','t5'])
})
test('school ranks individual teams instead of summing classroom totals',()=>{
 const ranking=classificarTimes(data,'a','escola')
 assert.deepEqual(ranking.map(row=>[row.id,row.position]),[['t3',1],['t2',2],['t1',3],['t5',3],['t4',5]])
 assert.equal(ranking[0].salaNome,'3A')
})
