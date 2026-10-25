export const pointsForPlace = place => ({1:20,2:7,3:5}[place] || 0)

// Competition ranking: equal performances share a position; the next position skips.
export function roomStandings(room) {
  const teams = Object.values(room.teams).filter(team => Object.values(room.answers).some(answers => answers[team.id]))
  const correct = id => Object.values(room.answers).reduce((n, answers) => n + (answers[id]?.correct ? 1 : 0), 0)
  const tournament = room.tournament
  const final = tournament?.rounds.at(-1)?.[0]
  const runner = final && (final.a === tournament.champion ? final.b : final.a)
  const rows = teams.map(team => {
    let stage = 0
    if (tournament) {
      tournament.rounds.forEach((matches, index) => {
        if (matches.some(match => match.a === team.id || match.b === team.id)) stage = index + 1
      })
      if (team.id === tournament.champion) stage = 100
      else if (team.id === runner) stage = 99
    }
    return {teamId:team.id, name:team.name, correct:correct(team.id), stage}
  }).sort((a,b) => b.stage-a.stage || b.correct-a.correct || a.name.localeCompare(b.name))
  let place = 1
  return rows.map((row, index) => {
    const previous = rows[index-1]
    if (previous && (previous.stage !== row.stage || previous.correct !== row.correct)) place = index + 1
    return {teamId:row.teamId,name:row.name,correct:row.correct,place,points:pointsForPlace(place)}
  })
}

export function finalizeRoom(room) {
  if (room.rankingVersion !== 2 || room.standings || room.status !== 'closed') return
  if (room.tournament) room.completed = room.tournament.phase === 'completed' && !!room.tournament.champion
  if (!room.completed) return // Ending early never awards a podium.
  if (!room.items.some(item => item.type === 'quiz')) { room.completed = false; return }
  const participated = Object.values(room.answers).some(answers => Object.keys(answers).length)
  if (!participated) { room.completed = false; return }
  room.standings = roomStandings(room)
}
