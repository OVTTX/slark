// Uniform integer sampling avoids modulo bias in classroom draws.
function randomIndex(limit) {
  const ceiling = Math.floor(0x100000000 / limit) * limit
  const value = new Uint32Array(1)
  do { globalThis.crypto.getRandomValues(value) } while (value[0] >= ceiling)
  return value[0] % limit
}

export function shuffleParticipants(participants) {
  const result = [...participants]
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function drawParticipant(participants, usedIds = [], withoutRepeat = true) {
  const used = new Set(usedIds)
  const available = withoutRepeat ? participants.filter(person => !used.has(person.id)) : participants
  return available.length ? available[randomIndex(available.length)] : null
}

export function makeActivityGroups(participants, amount, mode = 'count') {
  if (!Number.isInteger(amount) || amount < 1 || !participants.length || !['count', 'size'].includes(mode)) return []
  const count = mode === 'size' ? Math.ceil(participants.length / amount) : amount
  if (count > participants.length) return []
  const groups = Array.from({ length: count }, () => [])
  shuffleParticipants(participants).forEach((person, index) => groups[index % count].push(person))
  return groups
}

export function timerValue(timer, now) {
  const elapsed = timer.status === 'running' ? Math.max(0, now - timer.startedAt) : 0
  return Math.max(0, timer.offset + (timer.mode === 'countdown' ? -elapsed : elapsed))
}

export function formatTimer(milliseconds, mode = 'countdown') {
  const total = Math.max(0, mode === 'countdown' ? Math.ceil(milliseconds / 1000) : Math.floor(milliseconds / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor(total / 60) % 60
  const seconds = total % 60
  return [hours ? String(hours).padStart(2, '0') : null, String(minutes).padStart(2, '0'), String(seconds).padStart(2, '0')].filter(value => value !== null).join(':')
}
