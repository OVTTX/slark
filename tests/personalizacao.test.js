import test from 'node:test'
import assert from 'node:assert/strict'
import { CATALOGO,PADRAO,acessoCompleto,podeUsar,preferenciasValidas,progressoNivel } from '../src/lib/personalizacao.js'
test('admins and VTX accounts unlock the full catalog independently of points',()=>{
 for(const perfil of [{perfil:'admin_slark'},{perfil:'aluno',nome:'Conta VtX'},{perfil:'professor',email:'vtx@example.com'}]){
  assert.ok(acessoCompleto(perfil));for(const item of CATALOGO)assert.ok(podeUsar(item,0,acessoCompleto(perfil)))
 }
 assert.equal(acessoCompleto({perfil:'aluno',nome:'Ana'}),false)
})
test('Gold unlocks at 1500, never before',()=>{const gold=CATALOGO.find(i=>i.tipo==='skin'&&i.id==='ouro');assert.equal(podeUsar(gold,1499),false);assert.equal(podeUsar(gold,1500),true)})
test('unknown or locked stored selections fall back to accessible originals',()=>{
 assert.deepEqual(preferenciasValidas({skin:'ouro',texto:'inexistente',moldura:'ouro'},0,false),PADRAO)
 assert.deepEqual(preferenciasValidas({skin:'ouro',texto:'dourado',moldura:'ouro'},0,true),{skin:'ouro',texto:'dourado',moldura:'ouro'})
})
test('thresholds and style levels handle invalid and negative points',()=>{assert.equal(podeUsar(CATALOGO.find(i=>i.id==='aurora'),99),false);assert.equal(podeUsar(CATALOGO.find(i=>i.id==='aurora'),100),true);assert.equal(progressoNivel(-1).nivel,1);assert.equal(progressoNivel(1500).nivel,16);assert.equal(progressoNivel(NaN).progresso,0)})
test('every theme unlocks at its threshold and survives saved preference validation',()=>{
 const skins=CATALOGO.filter(i=>i.tipo==='skin')
 assert.equal(skins.length,12)
 for(const skin of skins){
  if(skin.pontos>0) assert.equal(podeUsar(skin,skin.pontos-1),false,skin.id)
  assert.equal(podeUsar(skin,skin.pontos),true,skin.id)
  assert.equal(preferenciasValidas({...PADRAO,skin:skin.id},skin.pontos,false).skin,skin.id)
  assert.equal(preferenciasValidas({...PADRAO,skin:skin.id},0,true).skin,skin.id)
 }
})

test('Noir is available from the start and can be restored without spending points',()=>{
 assert.equal(preferenciasValidas({...PADRAO,skin:'noir'},0,false).skin,'noir')
 assert.equal(CATALOGO.find(i=>i.id==='noir').fundo,'#000000')
})
