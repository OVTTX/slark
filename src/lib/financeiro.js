// Utilidades compartilhadas pelo módulo financeiro do diretor.

export function mesAtual() {
  return new Date().toISOString().slice(0, 7) // "YYYY-MM"
}

export function limitesDoMes(mesStr) {
  const [ano, mes] = mesStr.split('-').map(Number)
  const inicio = `${mesStr}-01`
  const fim = new Date(ano, mes, 0).toISOString().slice(0, 10) // último dia do mês
  return { inicio, fim }
}

export function formatarMes(mesStr) {
  const [ano, mes] = mesStr.split('-').map(Number)
  return new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export function formatarMoeda(v) {
  return `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const STATUS_COBRANCA = {
  pendente: { rotulo: 'Pendente', cor: '#F5C451' },
  pago: { rotulo: 'Pago', cor: '#3FD08A' },
  atrasado: { rotulo: 'Atrasado', cor: '#FF6B6B' },
}

// Status "de verdade", considerando o vencimento em relação a hoje (sem precisar de job agendado).
export function statusEfetivo(cobranca) {
  if (cobranca.status === 'pago') return 'pago'
  const hoje = new Date().toISOString().slice(0, 10)
  return cobranca.vencimento < hoje ? 'atrasado' : 'pendente'
}
