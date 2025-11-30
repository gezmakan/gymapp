'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Plus, Trash2, GripVertical, Search, Check, Loader2, EyeOff } from 'lucide-react'
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
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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
  is_hidden: boolean
}

type WorkoutPlan = {
  id: string
  name: string
  user_id: string
}

// Sortable Row Component
function SortableExerciseRow({
  exercise,
  onHide,
  onVideoClick
}: {
  exercise: PlanExercise
  onHide: () => void
  onVideoClick: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.plan_exercise_id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <TableRow ref={setNodeRef} style={style} className="select-none">
      <TableCell className="w-[50px]">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none">
          <GripVertical className="h-5 w-5 text-gray-400" />
        </div>
      </TableCell>
      <TableCell className="font-medium">
        {exercise.video_url ? (
          <button
            onClick={onVideoClick}
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
          onClick={onHide}
          title="Hide exercise"
        >
          <EyeOff className="h-4 w-4 text-gray-500" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

export default function PlanDetailPage() {
  const params = useParams()
  const [plan, setPlan] = useState<WorkoutPlan | null>(null)
  const [planExercises, setPlanExercises] = useState<PlanExercise[]>([])
  const [hiddenExercises, setHiddenExercises] = useState<PlanExercise[]>([])
  const [allExercises, setAllExercises] = useState<Exercise[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; title: string } | null>(null)
  const [addingExerciseId, setAddingExerciseId] = useState<string | null>(null)
  const [addedExerciseIds, setAddedExerciseIds] = useState<Set<string>>(new Set())
  const [showHiddenDialog, setShowHiddenDialog] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before dragging starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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
          is_hidden,
          exercises (*)
        `)
        .eq('workout_plan_id', params.id)
        .order('order_index', { ascending: true })

      if (error) throw error

      const exercises: PlanExercise[] = (data || []).map((item: any) => ({
        ...item.exercises,
        plan_exercise_id: item.id,
        order_index: item.order_index,
        is_hidden: item.is_hidden,
      }))

      setPlanExercises(exercises.filter(ex => !ex.is_hidden))
      setHiddenExercises(exercises.filter(ex => ex.is_hidden))
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
    // Prevent multiple clicks
    if (addingExerciseId === exerciseId || addedExerciseIds.has(exerciseId)) {
      return
    }

    try {
      setAddingExerciseId(exerciseId)

      // Check if exercise already exists in the plan
      const alreadyExists = planExercises.some(pe => pe.id === exerciseId) || hiddenExercises.some(pe => pe.id === exerciseId)
      if (alreadyExists) {
        toast.error('This exercise is already in your plan')
        setAddingExerciseId(null)
        return
      }

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

      // Ensure existing workout sessions get default set rows for the new exercise
      const { data: existingSessions, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('workout_plan_id', params.id)

      if (sessionsError) throw sessionsError

      if (existingSessions && existingSessions.length > 0) {
        // Workout tracking grid expects 4 set rows per exercise (see WorkoutPage)
        const totalSetsPerExercise = 4

        const setsToInsert = existingSessions.flatMap((session: { id: string }) =>
          Array.from({ length: totalSetsPerExercise }, (_, idx) => ({
            workout_session_id: session.id,
            exercise_id: exerciseId,
            set_number: idx + 1,
            reps: null,
            weight: null,
          }))
        )

        if (setsToInsert.length > 0) {
          const { error: setsInsertError } = await supabase
            .from('workout_session_sets')
            .insert(setsToInsert)

          if (setsInsertError) throw setsInsertError
        }
      }

      await fetchPlanExercises()

      // Mark as added
      setAddedExerciseIds(prev => new Set([...prev, exerciseId]))

      // Get the exercise name for the toast
      const exercise = allExercises.find(ex => ex.id === exerciseId)
      toast.success(`Added ${exercise?.name || 'exercise'} to plan`)

      // Don't close the modal, keep it open for more additions
    } catch (error) {
      console.error('Error adding exercise:', error)
      toast.error('Failed to add exercise to plan')
    } finally {
      setAddingExerciseId(null)
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

  const handleHideExercise = async (planExerciseId: string) => {
    // Optimistically update local state immediately
    const exerciseToHide = planExercises.find(ex => ex.plan_exercise_id === planExerciseId)

    if (!exerciseToHide) {
      // Exercise not found or already hidden
      return
    }

    setPlanExercises(prev => prev.filter(ex => ex.plan_exercise_id !== planExerciseId))
    setHiddenExercises(prev => [...prev, { ...exerciseToHide, is_hidden: true }])
    toast.success('Exercise hidden')

    try {
      const { error } = await supabase
        .from('workout_plan_exercises')
        .update({ is_hidden: true })
        .eq('id', planExerciseId)

      if (error) throw error
    } catch (error) {
      console.error('Error hiding exercise:', error)
      toast.error('Failed to hide exercise')
      // Revert on error
      await fetchPlanExercises()
    }
  }

  const handleUnhideExercise = async (planExerciseId: string) => {
    // Optimistically update local state immediately
    const exerciseToUnhide = hiddenExercises.find(ex => ex.plan_exercise_id === planExerciseId)

    if (!exerciseToUnhide) {
      // Exercise not found or already visible
      return
    }

    setHiddenExercises(prev => prev.filter(ex => ex.plan_exercise_id !== planExerciseId))
    // Add back to planExercises in correct order based on order_index
    setPlanExercises(prev => [...prev, { ...exerciseToUnhide, is_hidden: false }].sort((a, b) => a.order_index - b.order_index))
    toast.success('Exercise restored')

    try {
      const { error } = await supabase
        .from('workout_plan_exercises')
        .update({ is_hidden: false })
        .eq('id', planExerciseId)

      if (error) throw error
    } catch (error) {
      console.error('Error unhiding exercise:', error)
      toast.error('Failed to unhide exercise')
      // Revert on error
      await fetchPlanExercises()
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = planExercises.findIndex(ex => ex.plan_exercise_id === active.id)
    const newIndex = planExercises.findIndex(ex => ex.plan_exercise_id === over.id)

    const newExercises = arrayMove(planExercises, oldIndex, newIndex)

    // Optimistically update UI
    setPlanExercises(newExercises)

    // Update in database
    try {
      const updates = newExercises.map((ex, idx) => ({
        id: ex.plan_exercise_id,
        order_index: idx,
      }))

      for (const update of updates) {
        await supabase
          .from('workout_plan_exercises')
          .update({ order_index: update.order_index })
          .eq('id', update.id)
      }
    } catch (error) {
      console.error('Error updating order:', error)
      toast.error('Failed to reorder exercises')
      // Revert on error
      await fetchPlanExercises()
    }
  }

  const filteredExercises = allExercises.filter(ex =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (ex.muscle_groups?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Show all exercises, but we'll mark already added ones as "Added"
  const availableExercises = filteredExercises

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 md:p-8">
      <div className="max-w-7xl mx-auto md:px-16">
        <div className="mb-4 md:mb-8 p-4 md:p-0">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{plan?.name}</h1>
              <p className="text-gray-600 text-sm md:text-base">
                {planExercises.length} exercises
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
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
              {hiddenExercises.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="md:h-10"
                  onClick={() => setShowHiddenDialog(true)}
                >
                  Hidden ({hiddenExercises.length})
                </Button>
              )}
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
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
                  <SortableContext
                    items={planExercises.map(ex => ex.plan_exercise_id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {planExercises.map((exercise) => (
                      <SortableExerciseRow
                        key={exercise.plan_exercise_id}
                        exercise={exercise}
                        onHide={() => handleHideExercise(exercise.plan_exercise_id)}
                        onVideoClick={() => setSelectedVideo({ url: exercise.video_url!, title: exercise.name })}
                      />
                    ))}
                  </SortableContext>
                </TableBody>
              </Table>
            </DndContext>
          </div>
        )}
      </div>

      {/* Add Exercise Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => {
        setShowAddDialog(open)
        if (!open) {
          // Reset added state when closing dialog
          setAddedExerciseIds(new Set())
        }
      }}>
        <DialogContent className="sm:max-w-[800px]! w-[95vw] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Exercise to Plan</DialogTitle>
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
                  <TableRow className="bg-orange-100 hover:bg-orange-100">
                    <TableHead className="w-[60%] font-semibold">Exercise Name</TableHead>
                    <TableHead className="w-[25%] font-semibold">Muscle Groups</TableHead>
                    <TableHead className="text-right w-[15%] font-semibold">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableExercises.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-gray-500">
                        {searchQuery ? 'No exercises found' : 'All exercises have been added'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    availableExercises.map((exercise) => {
                      const isAdding = addingExerciseId === exercise.id
                      const isAlreadyInPlan = planExercises.some(pe => pe.id === exercise.id) || hiddenExercises.some(pe => pe.id === exercise.id)
                      const isAdded = addedExerciseIds.has(exercise.id) || isAlreadyInPlan

                      return (
                        <TableRow key={exercise.id}>
                          <TableCell className="font-medium">{exercise.name}</TableCell>
                          <TableCell>
                            {exercise.muscle_groups || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => handleAddExercise(exercise.id)}
                              disabled={isAdding || isAdded}
                              className={isAdded ? 'bg-green-600 hover:bg-green-700' : ''}
                            >
                              {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              {isAdded && <Check className="mr-2 h-4 w-4" />}
                              {isAdding ? 'Adding...' : isAdded ? 'Added' : 'Add'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden Exercises Dialog */}
      <Dialog open={showHiddenDialog} onOpenChange={setShowHiddenDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Hidden Exercises</DialogTitle>
          </DialogHeader>
          {hiddenExercises.length === 0 ? (
            <p className="text-sm text-gray-600">No hidden exercises.</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {hiddenExercises.map((exercise) => (
                <div key={exercise.plan_exercise_id} className="flex items-center justify-between border rounded-lg p-3 bg-gray-50">
                  <div>
                    <p className="font-semibold">{exercise.name}</p>
                    <p className="text-sm text-gray-600">{exercise.sets} x {exercise.reps} • {exercise.muscle_groups || '—'}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnhideExercise(exercise.plan_exercise_id)}
                    >
                      Unhide
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveExercise(exercise.plan_exercise_id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
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

      <Toaster />
    </div>
  )
}
