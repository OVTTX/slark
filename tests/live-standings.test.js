import { test } from 'node:test'
import assert from 'node:assert/strict'
import { finalizeRoom, pointsForPlace } from '../server/live/standings.js'

function classic(scores=[4,3,2,1,0]) {
  const teams=Object.fromEntries(scores.map((_,i)=>[`t${i}`,{id:`t${i}`,name:`Quarteto ${i}`}]))
  return {rankingVersion:2,rankingId:'one-room',status:'closed',completed:true,teams,
    items:Array.from({length:4},()=>({type:'quiz'})),
    answers:Object.fromEntries(Array.from({length:4},(_,q)=>[q,Object.fromEntries(scores.map((score,i)=>[`t${i}`,{correct:q<score}]))]))}
}
test('20/7/5/0/0: one final podium, all per-round wins excluded',()=>{
 const room=classic();finalizeRoom(room)
 assert.deepEqual(room.standings.map(row=>row.points),[20,7,5,0,0])
 const snapshot=JSON.stringify(room.standings);finalizeRoom(room);assert.equal(JSON.stringify(room.standings),snapshot)
 assert.equal(pointsForPlace(40),0)
})
test('manual early close, empty room, slide-only and legacy never award',()=>{
 for(const room of [{...classic(),completed:false},{...classic(),answers:{}},{...classic(),items:[{type:'slide'}]},{...classic(),rankingVersion:1}]){
  finalizeRoom(room);assert.equal(room.standings,undefined)
 }
})
test('competition ties share the same place and skip the next position',()=>{
 const room=classic([4,3,3,2,1]);finalizeRoom(room)
 assert.deepEqual(room.standings.map(row=>[row.place,row.points]),[[1,20],[2,7],[2,7],[4,0],[5,0]])
})
test('teams that never answered do not receive a podium',()=>{
 const room=classic();for(const answers of Object.values(room.answers))delete answers.t0
 finalizeRoom(room);assert.equal(room.standings.some(row=>row.teamId==='t0'),false)
})
test('tournament champion and finalist rank above semifinal teams regardless of raw score',()=>{
 const room=classic([4,3,2,1]);room.tournament={phase:'completed',champion:'t3',rounds:[[{a:'t0',b:'t1',winner:'t1'},{a:'t2',b:'t3',winner:'t3'}],[{a:'t1',b:'t3',winner:'t3'}]]}
 finalizeRoom(room)
 assert.deepEqual(room.standings.map(row=>[row.teamId,row.place,row.points]),[['t3',1,20],['t1',2,7],['t0',3,5],['t2',4,0]])
})
