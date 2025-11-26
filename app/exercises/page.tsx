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
import Navbar from '@/components/Navbar'

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
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 text-2xl md:text-3xl font-semibold text-gray-700">
        <span role="img" aria-label="jump rope" className="mr-3">🤸‍♂️</span>
        Warming up exercises...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 flex-1 w-full md:p-8 pt-4">
        <div className="mb-4 md:mb-8">
          <div className="flex items-center justify-between gap-3 mt-2 md:mt-4">
            <h1 className="text-2xl md:text-3xl font-bold">Exercise Library</h1>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search exercises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            {user ? (
              <Button onClick={() => router.push('/exercises/add')} size="sm" variant="outline" className="md:h-10 flex-shrink-0">
                <Plus className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Add Exercise</span>
                <span className="md:hidden">Add</span>
              </Button>
            ) : (
              <Button onClick={() => router.push('/signup')} size="sm" className="md:h-10 flex-shrink-0 bg-orange-500 hover:bg-orange-600 text-white">
                <Plus className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Add More</span>
                <span className="md:hidden">Add</span>
              </Button>
            )}
          </div>
        </div>

        {exercises.length === 0 ? (
          <div className="text-center py-12 bg-white md:rounded-lg border-y md:border -mx-4 md:mx-0">
            <p className="text-gray-600 mb-4">No exercises yet. Add your first exercise!</p>
            <Button onClick={() => router.push('/exercises/add')} variant="outline">
              <Plus className="mr-2 h-4 w-4" /> Add Exercise
            </Button>
          </div>
        ) : (
          <div className="bg-white md:rounded-lg border-y md:border -mx-4 md:mx-0 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-50 to-orange-100/50 px-4 py-2.5 flex items-center justify-between sticky top-0 z-10">
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900"
              >
                <ArrowUpDown className="h-4 w-4" />
                Sort {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
              </button>
              <span className="text-sm text-gray-600">
                {filteredExercises.length} exercise{filteredExercises.length !== 1 ? 's' : ''}
              </span>
            </div>

            {displayedExercises.map((exercise) => (
              <div
                key={exercise.id}
                className="px-4 py-2.5 hover:bg-gray-50 transition-colors border-t first:border-t-0"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {exercise.video_url && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                        <Video className="h-4 w-4 text-orange-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {exercise.video_url ? (
                          <button
                            onClick={() => setSelectedVideo({ url: exercise.video_url!, title: exercise.name, exercise })}
                            className="text-gray-900 hover:text-orange-600 transition-colors"
                          >
                            {exercise.name}
                          </button>
                        ) : (
                          exercise.name
                        )}
                      </h3>
                    </div>
                    <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 flex-shrink-0">
                      {exercise.muscle_groups || 'No muscle group'}
                    </span>
                  </div>
                  {user && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingExerciseId(exercise.id)}
                      className="flex-shrink-0 hover:bg-orange-50 text-gray-600 hover:text-orange-600"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {filteredExercises.length > EXERCISES_PER_PAGE && (
              <div className="p-3 border-t bg-gray-50 text-center">
                <Button
                  variant="outline"
                  onClick={() => setShowAll(!showAll)}
                  size="sm"
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
