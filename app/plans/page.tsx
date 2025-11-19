'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, ArrowLeft, Trash2, Dumbbell, GripVertical, Search, EyeOff } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import VideoModal from '@/components/VideoModal'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
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
  user_id: string
  name: string
  created_at: string
  exercises: PlanExercise[]
  hiddenExercises: PlanExercise[]
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
      <TableCell className="w-[40px] p-2">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none">
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
      </TableCell>
      <TableCell className="font-medium p-2">
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
      <TableCell className="p-2 text-sm">{exercise.sets}x{exercise.reps}</TableCell>
      <TableCell className="text-right p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onHide}
          className="h-7 w-7 p-0"
          title="Hide exercise"
        >
          <EyeOff className="h-3 w-3 text-gray-500" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

export default function PlansPage() {
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [allExercises, setAllExercises] = useState<Exercise[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPlanForAdd, setSelectedPlanForAdd] = useState<string | null>(null)
  const [hiddenDialogPlanId, setHiddenDialogPlanId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; title: string } | null>(null)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [editingPlanName, setEditingPlanName] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const MAX_PLANS = 7

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    checkUser()
    fetchPlans()
    fetchAllExercises()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    }
  }

  const fetchPlans = async () => {
    try {
      const { data: plansData, error: plansError } = await supabase
        .from('workout_plans')
        .select('*')
        .order('created_at', { ascending: false })

      if (plansError) throw plansError

      // Fetch exercises for each plan
      const plansWithExercises = await Promise.all(
        (plansData || []).map(async (plan) => {
          const { data: exercisesData, error: exercisesError } = await supabase
            .from('workout_plan_exercises')
            .select(`
              id,
              order_index,
              is_hidden,
              exercises (*)
            `)
            .eq('workout_plan_id', plan.id)
            .order('order_index', { ascending: true })

          if (exercisesError) throw exercisesError

          const exercises: PlanExercise[] = (exercisesData || []).map((item: any) => ({
            ...item.exercises,
            plan_exercise_id: item.id,
            order_index: item.order_index,
            is_hidden: item.is_hidden,
          }))

          return {
            ...plan,
            exercises: exercises.filter(ex => !ex.is_hidden),
            hiddenExercises: exercises.filter(ex => ex.is_hidden),
          }
        })
      )

      setPlans(plansWithExercises)
    } catch (error) {
      console.error('Error fetching plans:', error)
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

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workout plan?')) return

    try {
      const { error } = await supabase
        .from('workout_plans')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Plan deleted')
      fetchPlans()
    } catch (error) {
      console.error('Error deleting plan:', error)
      toast.error('Failed to delete workout plan')
    }
  }

  const handleStartEditingPlanName = (planId: string, currentName: string) => {
    setEditingPlanId(planId)
    setEditingPlanName(currentName)
  }

  const handleSavePlanName = async (planId: string) => {
    if (!editingPlanName.trim()) {
      toast.error('Plan name cannot be empty')
      return
    }

    try {
      const { error } = await supabase
        .from('workout_plans')
        .update({ name: editingPlanName.trim() })
        .eq('id', planId)

      if (error) throw error

      toast.success('Plan name updated')
      setEditingPlanId(null)
      setEditingPlanName('')
      await fetchPlans()
    } catch (error) {
      console.error('Error updating plan name:', error)
      toast.error('Failed to update plan name')
    }
  }

  const handleCancelEditingPlanName = () => {
    setEditingPlanId(null)
    setEditingPlanName('')
  }

  const handleAddExercise = async (planId: string, exerciseId: string) => {
    try {
      const plan = plans.find(p => p.id === planId)
      if (!plan) return

      // Check if exercise already exists in the plan
      const alreadyExists = plan.exercises.some(pe => pe.id === exerciseId) || plan.hiddenExercises.some(pe => pe.id === exerciseId)
      if (alreadyExists) {
        toast.error('This exercise is already in this plan')
        return
      }

      const nextOrder = plan.exercises.length

      const { error } = await supabase
        .from('workout_plan_exercises')
        .insert([
          {
            workout_plan_id: planId,
            exercise_id: exerciseId,
            order_index: nextOrder,
          },
        ])

      if (error) throw error

      const exercise = allExercises.find(ex => ex.id === exerciseId)
      toast.success(`Added ${exercise?.name || 'exercise'} to plan`)

      setSearchQuery('')
      await fetchPlans()
    } catch (error) {
      console.error('Error adding exercise:', error)
      toast.error('Failed to add exercise to plan')
    }
  }

  const handleRemoveExercise = async (planId: string, planExerciseId: string) => {
    try {
      const { error } = await supabase
        .from('workout_plan_exercises')
        .delete()
        .eq('id', planExerciseId)

      if (error) throw error
      toast.success('Exercise removed')
      await fetchPlans()
    } catch (error) {
      console.error('Error removing exercise:', error)
      toast.error('Failed to remove exercise')
    }
  }

  const handleHideExercise = async (planId: string, planExerciseId: string) => {
    try {
      const { error } = await supabase
        .from('workout_plan_exercises')
        .update({ is_hidden: true })
        .eq('id', planExerciseId)

      if (error) throw error
      toast.success('Exercise hidden')
      await fetchPlans()
    } catch (error) {
      console.error('Error hiding exercise:', error)
      toast.error('Failed to hide exercise')
    }
  }

  const handleUnhideExercise = async (planId: string, planExerciseId: string) => {
    try {
      const { error } = await supabase
        .from('workout_plan_exercises')
        .update({ is_hidden: false })
        .eq('id', planExerciseId)

      if (error) throw error
      toast.success('Exercise restored')
      await fetchPlans()
    } catch (error) {
      console.error('Error unhiding exercise:', error)
      toast.error('Failed to unhide exercise')
    }
  }

  const handleDragEnd = async (planId: string, event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const plan = plans.find(p => p.id === planId)
    if (!plan) return

    const oldIndex = plan.exercises.findIndex(ex => ex.plan_exercise_id === active.id)
    const newIndex = plan.exercises.findIndex(ex => ex.plan_exercise_id === over.id)

    const newExercises = arrayMove(plan.exercises, oldIndex, newIndex)

    // Optimistically update UI
    setPlans(plans.map(p => p.id === planId ? { ...p, exercises: newExercises } : p))

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
      await fetchPlans()
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  const canAddMore = plans.length < MAX_PLANS
  const hiddenPlan = hiddenDialogPlanId ? plans.find(p => p.id === hiddenDialogPlanId) : null

  const filteredExercises = allExercises.filter(ex =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (ex.muscle_groups?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const getAvailableExercises = (planId: string) => {
    const plan = plans.find(p => p.id === planId)
    if (!plan) return filteredExercises

    return filteredExercises.filter(
      ex => !plan.exercises.some(pe => pe.id === ex.id) && !plan.hiddenExercises.some(pe => pe.id === ex.id)
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <div className="flex-1 md:p-8">
        <div className="max-w-4xl mx-auto md:px-16">
          <div className="mb-4 md:mb-8 p-4 md:p-0">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Workout Plans</h1>
                <p className="text-gray-600 text-sm md:text-base">
                  {plans.length} of {MAX_PLANS} plans created
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => router.push('/plans/create')}
                  disabled={!canAddMore}
                  size="sm"
                  className="md:h-10"
                >
                  <Plus className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">New Plan</span>
                </Button>
              </div>
            </div>

          {!canAddMore && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded text-sm">
              You've reached the maximum of {MAX_PLANS} workout plans.
            </div>
          )}
        </div>

        {plans.length === 0 ? (
          <div className="text-center py-12 bg-white md:rounded-lg border-y md:border mx-4 md:mx-0">
            <Dumbbell className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">No workout plans yet. Create your first plan!</p>
            <Button onClick={() => router.push('/plans/create')}>
              <Plus className="mr-2 h-4 w-4" /> Create Plan
            </Button>
          </div>
        ) : (
          <div className="space-y-4 px-4 md:px-0">
            {plans.map((plan, index) => {
              const colors = ['bg-blue-100', 'bg-green-100', 'bg-purple-100', 'bg-pink-100', 'bg-yellow-100']
              const bgColor = colors[index % colors.length]

              return (
              <Card key={plan.id} className="border-0 md:border shadow-sm !py-0 !pb-4 !rounded-none md:!rounded-lg">
                <CardHeader className={`p-4 ${bgColor}`}>
                  <div className="flex items-center justify-between gap-2 -my-2">
                    {editingPlanId === plan.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editingPlanName}
                          onChange={(e) => setEditingPlanName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSavePlanName(plan.id)
                            } else if (e.key === 'Escape') {
                              handleCancelEditingPlanName()
                            }
                          }}
                          className="text-xl font-semibold h-9"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSavePlanName(plan.id)}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEditingPlanName}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <CardTitle
                        className="text-xl cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => handleStartEditingPlanName(plan.id, plan.name)}
                        title="Click to edit"
                      >
                        {plan.name}
                      </CardTitle>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePlan(plan.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {plan.exercises.length === 0 ? (
                    <div className="py-6 border-2 border-dashed rounded-lg">
                      <p className="text-center text-gray-500 text-sm mb-3">No exercises yet</p>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPlanForAdd(plan.id)}
                        >
                          <Plus className="h-4 w-4 mr-2" /> Add Exercise
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/plans/${plan.id}/workout`)}
                        >
                          Open Tracker
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="-mt-4">
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event) => handleDragEnd(plan.id, event)}
                      >
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[40px]"></TableHead>
                              <TableHead>Exercise</TableHead>
                              <TableHead className="w-[100px]">Sets x Reps</TableHead>
                              <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <SortableContext
                              items={plan.exercises.map(ex => ex.plan_exercise_id)}
                              strategy={verticalListSortingStrategy}
                            >
                              {plan.exercises.map((exercise) => (
                                <SortableExerciseRow
                                  key={exercise.plan_exercise_id}
                                  exercise={exercise}
                                  onHide={() => handleHideExercise(plan.id, exercise.plan_exercise_id)}
                                  onVideoClick={() => setSelectedVideo({ url: exercise.video_url!, title: exercise.name })}
                                />
                              ))}
                            </SortableContext>
                          </TableBody>
                        </Table>
                      </DndContext>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPlanForAdd(plan.id)}
                        >
                          <Plus className="h-4 w-4 mr-2" /> Add Exercise
                        </Button>
                        {plan.hiddenExercises.length > 0 && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setHiddenDialogPlanId(plan.id)}
                          >
                            Hidden ({plan.hiddenExercises.length})
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/plans/${plan.id}/workout`)}
                        >
                          Open Tracker
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              )
            })}
          </div>
        )}
        </div>
      </div>

      <Footer />

  {/* Add Exercise Dialog */}
  <Dialog open={!!selectedPlanForAdd} onOpenChange={(open) => !open && setSelectedPlanForAdd(null)}>
        <DialogContent className="sm:!max-w-[800px] w-[95vw] max-h-[80vh] overflow-y-auto">
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
                  {selectedPlanForAdd && getAvailableExercises(selectedPlanForAdd).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-gray-500">
                        {searchQuery ? 'No exercises found' : 'All exercises have been added'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    selectedPlanForAdd && getAvailableExercises(selectedPlanForAdd).map((exercise) => (
                      <TableRow key={exercise.id}>
                        <TableCell className="font-medium">{exercise.name}</TableCell>
                        <TableCell>
                          {exercise.muscle_groups || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => handleAddExercise(selectedPlanForAdd, exercise.id)}
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

      {/* Hidden Exercises Dialog */}
      <Dialog open={!!hiddenDialogPlanId} onOpenChange={(open) => !open && setHiddenDialogPlanId(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Hidden Exercises</DialogTitle>
          </DialogHeader>
          {hiddenPlan && hiddenPlan.hiddenExercises.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {hiddenPlan.hiddenExercises.map((exercise) => (
                <div key={exercise.plan_exercise_id} className="flex items-center justify-between border rounded-lg p-3 bg-gray-50">
                  <div>
                    <p className="font-semibold">{exercise.name}</p>
                    <p className="text-sm text-gray-600">{exercise.sets} x {exercise.reps} • {exercise.muscle_groups || '—'}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleUnhideExercise(hiddenPlan.id, exercise.plan_exercise_id)
                        setHiddenDialogPlanId(hiddenPlan.id)
                      }}
                    >
                      Unhide
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveExercise(hiddenPlan.id, exercise.plan_exercise_id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600">No hidden exercises.</p>
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
