import test from 'node:test'
import assert from 'node:assert/strict'
import { drawParticipant, makeActivityGroups, shuffleParticipants, timerValue, formatTimer } from '../src/lib/classroom-tools.js'
const people = Array.from({length:31},(_,index)=>({id:String(index),nome:index<2?'Ana':`Pessoa ${index}`}))
test('draw excludes everyone already called and distinguishes people with equal names',()=>{
 const used=people.slice(0,-1).map(person=>person.id)
 assert.equal(drawParticipant(people,used).id,'30')
 assert.equal(drawParticipant(people,people.map(person=>person.id)),null)
 assert.equal(drawParticipant([],[],false),null)
 assert.equal(drawParticipant(people.slice(0,2),['0']).id,'1')
 assert.ok(drawParticipant(people,people.map(person=>person.id),false))
})
test('groups include every participant exactly once, stay balanced and leave the source intact',()=>{
 const before=structuredClone(people)
 for(let count=1;count<=31;count++){
  const groups=makeActivityGroups(people,count)
  assert.equal(groups.length,count)
  assert.equal(new Set(groups.flat().map(person=>person.id)).size,31)
  assert.ok(Math.max(...groups.map(group=>group.length))-Math.min(...groups.map(group=>group.length))<=1)
 }
 assert.deepEqual(people,before)
 assert.deepEqual(shuffleParticipants([]),[])
})
test('maximum group size handles remainders and small classes',()=>{
 for(const size of [1,2,4,6,40]){
  const groups=makeActivityGroups(people,size,'size')
  assert.ok(groups.every(group=>group.length<=size && group.length>0))
  assert.equal(groups.flat().length,31)
 }
 for(const amount of [0,-1,NaN,1.5,32])assert.deepEqual(makeActivityGroups(people,amount),[])
})
test('clock catches up after delayed ticks, freezes when paused, and never becomes negative',()=>{
 const timer={mode:'countdown',status:'running',offset:60000,startedAt:1000}
 assert.equal(timerValue(timer,11000),50000)
 assert.equal(timerValue(timer,121000),0)
 assert.equal(timerValue({...timer,status:'paused',offset:25000},900000),25000)
 assert.equal(timerValue({...timer,mode:'stopwatch',offset:7000},11000),17000)
})
test('countdown rounds upward, stopwatch downward and hours stay readable',()=>{
 assert.equal(formatTimer(1),'00:01')
 assert.equal(formatTimer(999,'stopwatch'),'00:00')
 assert.equal(formatTimer(0),'00:00')
 assert.equal(formatTimer(3661000),'01:01:01')
})
