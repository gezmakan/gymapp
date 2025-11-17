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
import EditExerciseModal from '@/components/EditExerciseModal'
import Footer from '@/components/Footer'
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
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; title: string; exercise?: Exercise } | null>(null)
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const router = useRouter()
  const supabase = createClient()

  const EXERCISES_PER_PAGE = 30

  // Fuzzy match function - returns a score (higher is better, 0 means no match)
  const fuzzyMatch = (text: string, search: string): number => {
    text = text.toLowerCase()
    search = search.toLowerCase()

    // Exact match gets highest score
    if (text.includes(search)) {
      return 1000
    }

    // Fuzzy match - check if all characters appear in order
    let searchIndex = 0
    let textIndex = 0
    let consecutiveMatches = 0
    let score = 0

    while (textIndex < text.length && searchIndex < search.length) {
      if (text[textIndex] === search[searchIndex]) {
        searchIndex++
        consecutiveMatches++
        score += consecutiveMatches * 10 // Bonus for consecutive matches
      } else {
        consecutiveMatches = 0
      }
      textIndex++
    }

    // If we matched all search characters, return the score
    if (searchIndex === search.length) {
      return score
    }

    return 0 // No match
  }

  // Filter and sort exercises with fuzzy matching
  const filteredExercises = exercises
    .map(ex => ({
      exercise: ex,
      score: Math.max(
        fuzzyMatch(ex.name, searchQuery),
        fuzzyMatch(ex.muscle_groups || '', searchQuery)
      )
    }))
    .filter(({ score }) => score > 0 || searchQuery === '') // Show all if search is empty
    .sort((a, b) => {
      // If searching, sort by score first
      if (searchQuery) {
        if (b.score !== a.score) {
          return b.score - a.score
        }
      }
      // Then sort by name
      if (sortOrder === 'asc') {
        return a.exercise.name.localeCompare(b.exercise.name)
      } else {
        return b.exercise.name.localeCompare(a.exercise.name)
      }
    })
    .map(({ exercise }) => exercise)

  const displayedExercises = showAll ? filteredExercises : filteredExercises.slice(0, EXERCISES_PER_PAGE)

  useEffect(() => {
    checkUser()
    fetchExercises()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    // Allow viewing exercises even when not logged in
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
    <div className="min-h-screen bg-gray-50 md:p-8 flex flex-col">
      <div className="max-w-3xl mx-auto px-4 flex-1 w-full">
        <div className="mb-4 md:mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-lg md:text-xl font-bold text-gray-800 tracking-wide flex items-center gap-2 select-none">
              <span>🏋️</span>
              <span>SLMFIT</span>
            </h2>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              {!user && (
                <>
                  <Button onClick={() => router.push('/login?mode=signup')} variant="outline" size="sm" className="md:h-10">
                    Sign Up
                  </Button>
                  <Button onClick={() => router.push('/login')} size="sm" className="md:h-10">
                    Login
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl md:text-3xl font-bold">Exercise Library</h1>
            <div className="flex gap-2">
              {user && (
                <>
                  <Button onClick={() => router.push('/plans')} size="sm" className="md:h-10">
                    Workout Planner
                  </Button>
                  <Button onClick={() => router.push('/exercises/add')} size="sm" className="md:h-10">
                    <Plus className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Add Exercise</span>
                    <span className="md:hidden">Add</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mb-4">
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
          <div className="bg-white md:rounded-lg border-y md:border mx-4 md:mx-auto md:max-w-3xl">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[240px]">
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="flex items-center hover:text-gray-900"
                    >
                      Exercise Name
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[120px]">Muscle Groups</TableHead>
                  {user && <TableHead className="text-right w-[100px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedExercises.map((exercise) => (
                  <TableRow key={exercise.id}>
                    <TableCell className="font-medium max-w-[200px]">
                      {exercise.video_url ? (
                        <button
                          onClick={() => setSelectedVideo({ url: exercise.video_url!, title: exercise.name, exercise })}
                          className="text-indigo-600 hover:text-purple-600 hover:underline text-left truncate block w-full"
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
                    <TableCell>
                      <span className="truncate block" title={exercise.muscle_groups || '-'}>
                        {exercise.muscle_groups || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {user && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingExerciseId(exercise.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
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

      <Footer />

      {selectedVideo && (
        <VideoModal
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
          videoUrl={selectedVideo.url}
          title={selectedVideo.title}
          exercise={selectedVideo.exercise}
        />
      )}

      {editingExerciseId && (
        <EditExerciseModal
          isOpen={!!editingExerciseId}
          onClose={() => setEditingExerciseId(null)}
          exerciseId={editingExerciseId}
          onSuccess={() => {
            fetchExercises()
            setEditingExerciseId(null)
          }}
        />
      )}
    </div>
  )
}
