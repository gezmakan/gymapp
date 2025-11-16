'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Plus, Trash2, GripVertical, Search } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import VideoModal from '@/components/VideoModal'

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

type PlanExercise = Exercise & {
  plan_exercise_id: string
  order_index: number
}

type WorkoutPlan = {
  id: string
  name: string
  user_id: string
}

export default function PlanDetailPage() {
  const params = useParams()
  const [plan, setPlan] = useState<WorkoutPlan | null>(null)
  const [planExercises, setPlanExercises] = useState<PlanExercise[]>([])
  const [allExercises, setAllExercises] = useState<Exercise[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; title: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchPlan()
    fetchPlanExercises()
    fetchAllExercises()
  }, [])

  const fetchPlan = async () => {
    try {
      const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error
      setPlan(data)
    } catch (error) {
      console.error('Error fetching plan:', error)
    }
  }

  const fetchPlanExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('workout_plan_exercises')
        .select(`
          id,
          order_index,
          exercises (*)
        `)
        .eq('workout_plan_id', params.id)
        .order('order_index', { ascending: true })

      if (error) throw error

      const exercises: PlanExercise[] = (data || []).map((item: any) => ({
        ...item.exercises,
        plan_exercise_id: item.id,
        order_index: item.order_index,
      }))

      setPlanExercises(exercises)
    } catch (error) {
      console.error('Error fetching plan exercises:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAllExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setAllExercises(data || [])
    } catch (error) {
      console.error('Error fetching exercises:', error)
    }
  }

  const handleAddExercise = async (exerciseId: string) => {
    try {
      const nextOrder = planExercises.length

      const { error } = await supabase
        .from('workout_plan_exercises')
        .insert([
          {
            workout_plan_id: params.id,
            exercise_id: exerciseId,
            order_index: nextOrder,
          },
        ])

      if (error) throw error

      await fetchPlanExercises()
      setShowAddDialog(false)
      setSearchQuery('')
    } catch (error) {
      console.error('Error adding exercise:', error)
      alert('Failed to add exercise to plan')
    }
  }

  const handleRemoveExercise = async (planExerciseId: string) => {
    try {
      const { error } = await supabase
        .from('workout_plan_exercises')
        .delete()
        .eq('id', planExerciseId)

      if (error) throw error
      await fetchPlanExercises()
    } catch (error) {
      console.error('Error removing exercise:', error)
      alert('Failed to remove exercise')
    }
  }

  const handleMoveUp = async (index: number) => {
    if (index === 0) return

    const newExercises = [...planExercises]
    ;[newExercises[index - 1], newExercises[index]] = [newExercises[index], newExercises[index - 1]]

    await updateOrder(newExercises)
  }

  const handleMoveDown = async (index: number) => {
    if (index === planExercises.length - 1) return

    const newExercises = [...planExercises]
    ;[newExercises[index], newExercises[index + 1]] = [newExercises[index + 1], newExercises[index]]

    await updateOrder(newExercises)
  }

  const updateOrder = async (exercises: PlanExercise[]) => {
    try {
      const updates = exercises.map((ex, idx) => ({
        id: ex.plan_exercise_id,
        order_index: idx,
      }))

      for (const update of updates) {
        await supabase
          .from('workout_plan_exercises')
          .update({ order_index: update.order_index })
          .eq('id', update.id)
      }

      await fetchPlanExercises()
    } catch (error) {
      console.error('Error updating order:', error)
    }
  }

  const filteredExercises = allExercises.filter(ex =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (ex.muscle_groups?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Filter out exercises already in the plan
  const availableExercises = filteredExercises.filter(
    ex => !planExercises.some(pe => pe.id === ex.id)
  )

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 md:p-8">
      <div className="max-w-7xl mx-auto md:px-16">
        <div className="mb-4 md:mb-8 p-4 md:p-0">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{plan?.name}</h1>
              <p className="text-gray-600 text-sm md:text-base">
                {planExercises.length} exercises
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowAddDialog(true)}
                size="sm"
                className="md:h-10"
              >
                <Plus className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Add Exercise</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/plans')}
                size="sm"
                className="md:h-10"
              >
                <ArrowLeft className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Back</span>
              </Button>
            </div>
          </div>
        </div>

        {planExercises.length === 0 ? (
          <div className="text-center py-12 bg-white md:rounded-lg border-y md:border mx-4 md:mx-0">
            <p className="text-gray-600 mb-4">No exercises in this plan yet.</p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Exercise
            </Button>
          </div>
        ) : (
          <div className="bg-white md:rounded-lg border-y md:border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead className="w-[300px]">Exercise Name</TableHead>
                  <TableHead className="w-[50px]">Sets</TableHead>
                  <TableHead className="w-[60px]">Reps</TableHead>
                  <TableHead className="w-[120px]">Muscle Groups</TableHead>
                  <TableHead className="w-[70px]">Rest</TableHead>
                  <TableHead className="text-right w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {planExercises.map((exercise, index) => (
                  <TableRow key={exercise.plan_exercise_id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="h-5 w-5 p-0"
                        >
                          ▲
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === planExercises.length - 1}
                          className="h-5 w-5 p-0"
                        >
                          ▼
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveExercise(exercise.plan_exercise_id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add Exercise Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:!max-w-[1000px] w-[95vw] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Exercise to Plan</DialogTitle>
            <DialogDescription>
              Select an exercise from your library to add to this workout plan
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search exercises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="border rounded-lg max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Exercise Name</TableHead>
                    <TableHead className="w-[10%]">Sets</TableHead>
                    <TableHead className="w-[10%]">Reps</TableHead>
                    <TableHead className="w-[25%]">Muscle Groups</TableHead>
                    <TableHead className="text-right w-[15%]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableExercises.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500">
                        {searchQuery ? 'No exercises found' : 'All exercises have been added'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    availableExercises.map((exercise) => (
                      <TableRow key={exercise.id}>
                        <TableCell className="font-medium">{exercise.name}</TableCell>
                        <TableCell>{exercise.sets}</TableCell>
                        <TableCell>{exercise.reps}</TableCell>
                        <TableCell>
                          {exercise.muscle_groups || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => handleAddExercise(exercise.id)}
                          >
                            Add
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
