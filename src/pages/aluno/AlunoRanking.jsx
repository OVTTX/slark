import LiveRanking from "../live/LiveRanking"

export default function AlunoRanking() {
  return <div><h1 className="text-4xl font-bold tracking-tight">Ranking</h1><p className="mt-2 text-texto/60">Acompanhe os times da sala, das salas da mesma série e da escola.</p><LiveRanking standalone /></div>
}
