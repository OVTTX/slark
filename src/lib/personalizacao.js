export const PADRAO = Object.freeze({ skin: 'slark', texto: 'padrao', moldura: 'padrao' })
export const CATALOGO = [
  { id:'slark', tipo:'skin', nome:'Slark Original', pontos:0, cor:'#0651C3', fundo:'#000026', descricao:'O seu universo em azul-noite.' },
  { id:'aurora', tipo:'skin', nome:'Aurora', pontos:100, cor:'#3FD08A', fundo:'#052823', descricao:'Novas conexões em verde e azul.' },
  { id:'oceano', tipo:'skin', nome:'Oceano', pontos:300, cor:'#45BDEB', fundo:'#051C35', descricao:'Azul profundo para explorar ideias.' },
  { id:'ametista', tipo:'skin', nome:'Ametista', pontos:750, cor:'#BF88FF', fundo:'#200E38', descricao:'Uma atmosfera violeta para criar.' },
  { id:'rosa', tipo:'skin', nome:'Rosa Nebulosa', pontos:450, cor:'#F4A5D0', fundo:'#210F23', descricao:'Rosa e ameixa para iluminar suas ideias.' },
  { id:'solar', tipo:'skin', nome:'Pôr do Sol', pontos:600, cor:'#FFBD8F', fundo:'#26130F', descricao:'Terracota e laranja no ritmo de novas descobertas.' },
  { id:'floresta', tipo:'skin', nome:'Floresta', pontos:900, cor:'#96D7A7', fundo:'#0D2019', descricao:'Verde-musgo e tons naturais para se concentrar.' },
  { id:'cosmos', tipo:'skin', nome:'Cosmos', pontos:1200, cor:'#BDB5FF', fundo:'#14102C', descricao:'Índigo e lavanda para explorar além do óbvio.' },
  { id:'grafite', tipo:'skin', nome:'Grafite', pontos:1800, cor:'#C3D1DC', fundo:'#14171B', descricao:'Carvão e prata em uma edição minimalista.' },
  { id:'rubi', tipo:'skin', nome:'Rubi', pontos:2100, cor:'#FFA4B8', fundo:'#250E18', descricao:'Vinho e rubi para celebrar sua trajetória.' },
  { id:'ouro', tipo:'skin', nome:'Slark Gold', pontos:1500, cor:'#8A6318', fundo:'#FFFCF5', descricao:'Edição especial em branco, marfim e dourado.' },
  { id:'padrao', tipo:'texto', nome:'Texto original', pontos:0, cor:'#FFFFFF' },
  { id:'gelo', tipo:'texto', nome:'Gelo', pontos:100, cor:'#BDEEFF' },
  { id:'azul', tipo:'texto', nome:'Azul celeste', pontos:300, cor:'#9BC5FF' },
  { id:'dourado', tipo:'texto', nome:'Luz dourada', pontos:1000, cor:'#E8C878' },
  { id:'padrao', tipo:'moldura', nome:'Sem moldura', pontos:0, cor:'#7182A3' },
  { id:'orbita', tipo:'moldura', nome:'Órbita', pontos:200, cor:'#6FA8FF' },
  { id:'constelacao', tipo:'moldura', nome:'Constelação', pontos:500, cor:'#BF88FF' },
  { id:'ouro', tipo:'moldura', nome:'Moldura Gold', pontos:1500, cor:'#C79D42' },
]
export function acessoCompleto(perfil) {
  return perfil?.perfil === 'admin_slark' || /vtx/i.test(`${perfil?.nome || ''} ${perfil?.email || ''}`)
}
export function podeUsar(item, pontos = 0, completo = false) {
  return Boolean(item) && (completo || Math.max(0, Number(pontos) || 0) >= item.pontos)
}
export function preferenciasValidas(preferencias, pontos, completo) {
  return Object.fromEntries(Object.entries(PADRAO).map(([tipo, fallback]) => {
    const item = CATALOGO.find(i => i.tipo === tipo && i.id === preferencias?.[tipo])
    return [tipo, podeUsar(item, pontos, completo) ? item.id : fallback]
  }))
}
export function progressoNivel(pontos) {
  const total = Math.max(0, Number(pontos) || 0)
  return { nivel: Math.floor(total / 100) + 1, progresso: total % 100, faltam: 100 - total % 100 }
}
