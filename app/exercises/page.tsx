'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Edit, Trash2, LogOut, Video } from 'lucide-react'

type Exercise = {
  id: string
  name: string
  sets: number
  reps: string
  video_url: string | null
  muscle_groups: string | null
  rest_minutes: number
  rest_seconds: number
}

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
    fetchExercises()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    } else {
      setUser(user)
    }
  }

  const fetchExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setExercises(data || [])
    } catch (error) {
      console.error('Error fetching exercises:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this exercise?')) return

    try {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchExercises()
    } catch (error) {
      console.error('Error deleting exercise:', error)
      alert('Failed to delete exercise')
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Exercise Database</h1>
            <p className="text-gray-600 mt-1">Manage your exercise library</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => router.push('/exercises/add')}>
              <Plus className="mr-2 h-4 w-4" /> Add Exercise
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </div>
        </div>

        {exercises.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <p className="text-gray-600 mb-4">No exercises yet. Add your first exercise!</p>
            <Button onClick={() => router.push('/exercises/add')}>
              <Plus className="mr-2 h-4 w-4" /> Add Exercise
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exercise Name</TableHead>
                  <TableHead>Sets</TableHead>
                  <TableHead>Reps</TableHead>
                  <TableHead>Muscle Groups</TableHead>
                  <TableHead>Rest Time</TableHead>
                  <TableHead>Video</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exercises.map((exercise) => (
                  <TableRow key={exercise.id}>
                    <TableCell className="font-medium">{exercise.name}</TableCell>
                    <TableCell>{exercise.sets}</TableCell>
                    <TableCell>{exercise.reps}</TableCell>
                    <TableCell>{exercise.muscle_groups || '-'}</TableCell>
                    <TableCell>
                      {exercise.rest_minutes}m {exercise.rest_seconds}s
                    </TableCell>
                    <TableCell>
                      {exercise.video_url ? (
                        <a
                          href={exercise.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center"
                        >
                          <Video className="h-4 w-4" />
                        </a>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/exercises/edit/${exercise.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(exercise.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
