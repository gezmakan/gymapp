'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Edit, Trash2, LogOut, Video, Shield, Search, ArrowUpDown } from 'lucide-react'
import VideoModal from '@/components/VideoModal'
import { isAdmin } from '@/lib/admin'

type Exercise = {
  id: string
  name: string
  sets: number
  reps: string
  video_url: string | null
  muscle_groups: string | null
  rest_minutes: number
  rest_seconds: number
  is_private: boolean
  user_id: string | null
}

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; title: string } | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const router = useRouter()
  const supabase = createClient()

  const EXERCISES_PER_PAGE = 30

  // Filter and sort exercises
  const filteredExercises = exercises
    .filter(ex =>
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ex.muscle_groups?.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.name.localeCompare(b.name)
      } else {
        return b.name.localeCompare(a.name)
      }
    })

  const displayedExercises = showAll ? filteredExercises : filteredExercises.slice(0, EXERCISES_PER_PAGE)

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
    <div className="min-h-screen bg-gray-50 md:p-8">
      <div className="max-w-7xl mx-auto md:px-16">
        <div className="mb-4 md:mb-8 p-4 md:p-0">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Exercise Library</h1>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => router.push('/plans')} variant="outline" size="sm" className="md:h-10">
                <span className="hidden md:inline">Plans</span><span className="md:hidden">Plans</span>
              </Button>
              <Button onClick={() => router.push('/exercises/add')} size="sm" className="md:h-10">
                <Plus className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Add Exercise</span>
              </Button>
              <Button variant="outline" onClick={handleLogout} size="sm" className="md:h-10">
                <LogOut className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Logout</span>
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search exercises..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {exercises.length === 0 ? (
          <div className="text-center py-12 bg-white md:rounded-lg border-y md:border mx-4 md:mx-0">
            <p className="text-gray-600 mb-4">No exercises yet. Add your first exercise!</p>
            <Button onClick={() => router.push('/exercises/add')}>
              <Plus className="mr-2 h-4 w-4" /> Add Exercise
            </Button>
          </div>
        ) : (
          <div className="bg-white md:rounded-lg border-y md:border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="flex items-center hover:text-gray-900"
                    >
                      Exercise Name
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[50px]">Sets</TableHead>
                  <TableHead className="w-[60px]">Reps</TableHead>
                  <TableHead className="w-[120px]">Muscle Groups</TableHead>
                  <TableHead className="w-[70px]">Rest</TableHead>
                  <TableHead className="text-right w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedExercises.map((exercise) => (
                  <TableRow key={exercise.id}>
                    <TableCell className="font-medium max-w-[200px]">
                      {exercise.video_url ? (
                        <button
                          onClick={() => setSelectedVideo({ url: exercise.video_url!, title: exercise.name })}
                          className="text-blue-600 hover:text-blue-800 hover:underline text-left truncate block w-full"
                          title={exercise.name}
                        >
                          {exercise.name}
                        </button>
                      ) : (
                        <span className="truncate block" title={exercise.name}>
                          {exercise.name}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{exercise.sets}</TableCell>
                    <TableCell className="whitespace-nowrap">{exercise.reps}</TableCell>
                    <TableCell>
                      <span className="truncate block" title={exercise.muscle_groups || '-'}>
                        {exercise.muscle_groups || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {exercise.rest_minutes}m {exercise.rest_seconds}s
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
            {filteredExercises.length > EXERCISES_PER_PAGE && (
              <div className="p-4 border-t text-center">
                <Button
                  variant="outline"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll ? 'Show Less' : `Show All (${filteredExercises.length} exercises)`}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedVideo && (
        <VideoModal
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
          videoUrl={selectedVideo.url}
          title={selectedVideo.title}
        />
      )}
    </div>
  )
}
