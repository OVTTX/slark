export function planFeatures(plan, status) {
  const current = plan === 'live' ? 'live' : 'base'
  const active = ['ativa','trial'].includes(status)
  const live = current === 'live' && active
  return { plano:current, nomePlano:current === 'live' ? 'Plano Live' : 'Plano Base', temLive:live, personalizarEquipes:live, temMateriais:active }
}
