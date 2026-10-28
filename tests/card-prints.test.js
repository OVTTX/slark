import test from 'node:test'
import assert from 'node:assert/strict'
import {montarColecao,salvarEstampa} from '../src/lib/card-prints.js'
const catalogo=[{id:'original',lancada:true},{id:'orbitas',lancada:true},{id:'ondas',lancada:false}]
test('Original is available without fabricated awards; upcoming prints cannot be equipped',()=>{
 const r=montarColecao(catalogo,[{estampa_id:'ondas'}],{estampa_id:'ondas'})
 assert.equal(r.selecionada,'original')
 assert.deepEqual(r.items.map(i=>i.disponivel),[true,false,false])
})
test('Only a released, owned print can be selected; unknown designs fail closed',()=>{
 const r=montarColecao([...catalogo,{id:'unknown',lancada:true}],[{estampa_id:'orbitas'}],{estampa_id:'orbitas'})
 assert.equal(r.selecionada,'orbitas');assert.equal(r.items.length,3)
})
test('Locked selection never sends a write',async()=>{
 let touched=false
 await assert.rejects(salvarEstampa({from(){touched=true}},'self','orbitas',[]))
 assert.equal(touched,false)
})
test('A missing save confirmation cannot be reported as success',async()=>{
 const client={from:()=>({upsert:()=>({select:()=>({single:async()=>({data:null,error:null})})})})}
 await assert.rejects(salvarEstampa(client,'self','original',[{id:'original',disponivel:true}]),/confirmar/)
})
test('Saving writes only the current account and the selected owned print',async()=>{
 let payload
 const client={from:()=>({upsert:value=>{payload=value;return {select:()=>({single:async()=>({data:{estampa_id:'orbitas'}})})}}})}
 assert.equal(await salvarEstampa(client,'self','orbitas',[{id:'orbitas',disponivel:true}]),'orbitas')
 assert.deepEqual(payload,{usuario_id:'self',estampa_id:'orbitas'})
})
