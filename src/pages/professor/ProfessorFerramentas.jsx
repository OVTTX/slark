import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { salasDoProfessor } from '../../lib/salasProfessor'
import ClassroomWorkspace from '../../components/classroom/ClassroomWorkspace'

async function loadStudents(roomId, schoolId) {
  const students = []
  for (let start = 0; ; start += 500) {
    const { data, error } = await supabase.from('alunos').select('id,nome').eq('escola_id', schoolId).eq('sala_id', roomId).order('nome').order('id').range(start, start+499)
    if (error) throw error
    students.push(...(data || []))
    if (!data || data.length < 500) return students
  }
}

export default function ProfessorFerramentas() {
  const { perfil } = useAuth()
  const [rooms, setRooms] = useState([])
  const [roomId, setRoomId] = useState('')
  const [roomsLoading, setRoomsLoading] = useState(true)
  const [roomsError, setRoomsError] = useState('')
  const [roster, setRoster] = useState({ roomId:'', students:[], loading:false, error:'' })
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let cancelled = false
    setRooms([]); setRoomId(''); setRoomsLoading(true); setRoomsError('')
    async function load() {
      try {
        if (!perfil?.id || !perfil?.escola_id) throw new Error('school-required')
        const { data, error } = await salasDoProfessor(perfil.id, 'id,nome,escola_id')
        if (error) throw error
        if (cancelled) return
        const next = (data || []).filter(room=>room.escola_id === perfil.escola_id)
        setRooms(next); setRoomId(next[0]?.id || '')
      } catch { if (!cancelled) setRoomsError('Não foi possível carregar suas turmas. Você pode usar uma lista digitada.') }
      finally { if (!cancelled) setRoomsLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [perfil?.id, perfil?.escola_id, revision])
  useEffect(() => {
    let cancelled = false
    if (!roomId || !perfil?.escola_id) { setRoster({roomId:'',students:[],loading:false,error:''}); return }
    setRoster({ roomId, students:[], loading:true, error:'' })
    loadStudents(roomId, perfil.escola_id).then(students=>{
      if (!cancelled) setRoster({ roomId, students, loading:false, error:'' })
    }).catch(()=>{
      if (!cancelled) setRoster({ roomId, students:[], loading:false, error:'Não foi possível carregar os alunos desta turma. Tente novamente ou use uma lista digitada.' })
    })
    return () => { cancelled = true }
  }, [roomId, perfil?.escola_id, revision])
  const current = roster.roomId === roomId
  return <ClassroomWorkspace rooms={rooms} roomId={roomId} onRoomChange={setRoomId} students={current ? roster.students : []} loading={roomsLoading || Boolean(roomId && (!current || roster.loading))} error={roomsError || (current ? roster.error : '')} onRetry={()=>setRevision(value=>value+1)} />
}
