import {test} from 'node:test'
import assert from 'node:assert/strict'
import {planFeatures} from '../src/lib/school-plan.js'
test('only an active or trial Live contract unlocks Live and team names',()=>{
 for(const status of ['ativa','trial']){
  assert.equal(planFeatures('live',status).temLive,true)
  assert.equal(planFeatures('live',status).personalizarEquipes,true)
 }
 for(const plan of ['base','pro',null,undefined,'LIVE','unknown']){
  assert.equal(planFeatures(plan,'ativa').temLive,false)
  assert.equal(planFeatures(plan,'ativa').personalizarEquipes,false)
 }
 for(const status of ['cancelada','inadimplente',null,undefined])assert.equal(planFeatures('live',status).temLive,false)
})
test('only Base and Live are presented; app materials belong to both active plans',()=>{
 for(const plan of ['base','live'])assert.equal(planFeatures(plan,'ativa').temMateriais,true)
 assert.equal(planFeatures('base','cancelada').temMateriais,false)
 assert.equal(planFeatures('pro','ativa').plano,'base')
 assert.equal(planFeatures('base','ativa').nomePlano,'Plano Base')
 assert.equal(planFeatures('live','ativa').nomePlano,'Plano Live')
})
