'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import VideoModal from '@/components/VideoModal'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { Video } from 'lucide-react'

type Exercise = {
  id: string
  name: string
  sets: number
  reps: string
  muscle_groups: string | null
  video_url: string | null
}

type WorkoutSession = {
  id: string
  session_number: number
  session_date: string
}

type SessionSet = {
  id: string
  workout_session_id?: string
  exercise_id: string
  set_number: number
  reps: number | null
  weight: number | null
}

export default function WorkoutPage() {
  const params = useParams()
  const planId = params.id as string
  const supabase = createClient()

  const [planName, setPlanName] = useState('')
  const [planIndex, setPlanIndex] = useState(0)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [sessionSets, setSessionSets] = useState<Record<string, SessionSet[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [lastToastTime, setLastToastTime] = useState(0)
  const [editingDateSessionId, setEditingDateSessionId] = useState<string | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; title: string } | null>(null)
  const hasAutoCreatedRef = useRef(false)

  useEffect(() => {
    fetchWorkoutData()
  }, [planId])

  const fetchWorkoutData = async () => {
    try {
      // Get current plan name
      const { data: plan, error: planError } = await supabase
        .from('workout_plans')
        .select('name')
        .eq('id', planId)
        .single()

      if (planError) throw planError
      setPlanName(plan.name)

      // Get all plans to determine the index for color
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: allPlans } = await supabase
          .from('workout_plans')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        const index = allPlans?.findIndex(p => p.id === planId) ?? 0
        setPlanIndex(index)
      }

      const { data: planExercises, error: exercisesError } = await supabase
        .from('workout_plan_exercises')
        .select('exercise_id, order_index, exercises (id, name, sets, reps, muscle_groups, video_url)')
        .eq('workout_plan_id', planId)
        .order('order_index')

      if (exercisesError) throw exercisesError

      const exerciseList = planExercises.map((pe: any) => ({
        id: pe.exercises.id,
        name: pe.exercises.name,
        sets: pe.exercises.sets,
        reps: pe.exercises.reps,
        muscle_groups: pe.exercises.muscle_groups,
        video_url: pe.exercises.video_url,
      }))
      setExercises(exerciseList)

      const { data: sessionsData, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('workout_plan_id', planId)
        .order('created_at', { ascending: false })

      if (sessionsError) throw sessionsError

      if (sessionsData && sessionsData.length > 0) {
        const sessionIds = sessionsData.map((s: WorkoutSession) => s.id)
        const { data: setsData, error: setsError } = await supabase
          .from('workout_session_sets')
          .select('*')
          .in('workout_session_id', sessionIds)

        if (setsError) throw setsError

        const setsBySession: Record<string, SessionSet[]> = {}
        setsData?.forEach((set: SessionSet & { workout_session_id: string }) => {
          if (!setsBySession[set.workout_session_id]) {
            setsBySession[set.workout_session_id] = []
          }
          setsBySession[set.workout_session_id].push(set)
        })
        setSessionSets(setsBySession)
      }

      // Auto-create first session if none exist (and we haven't already done so)
      if ((!sessionsData || sessionsData.length === 0) && !hasAutoCreatedRef.current) {
        hasAutoCreatedRef.current = true
        await createNewSession(exerciseList, [])
        // Fetch again to get the newly created session
        const { data: newSessionsData } = await supabase
          .from('workout_sessions')
          .select('*')
          .eq('workout_plan_id', planId)
          .order('created_at', { ascending: false })

        setSessions(newSessionsData || [])
        if (newSessionsData && newSessionsData.length > 0) {
          setCurrentSessionId(newSessionsData[0].id)

          // Fetch sets for the new session
          const { data: setsData } = await supabase
            .from('workout_session_sets')
            .select('*')
            .eq('workout_session_id', newSessionsData[0].id)

          const setsBySession: Record<string, SessionSet[]> = {}
          setsData?.forEach((set: SessionSet & { workout_session_id: string }) => {
            if (!setsBySession[set.workout_session_id]) {
              setsBySession[set.workout_session_id] = []
            }
            setsBySession[set.workout_session_id].push(set)
          })
          setSessionSets(setsBySession)
        }
      } else {
        setSessions(sessionsData || [])
        // Set the most recent session (now first in list) as the current editable session
        if (sessionsData && sessionsData.length > 0) {
          const mostRecentSession = sessionsData[0]
          setCurrentSessionId(mostRecentSession.id)
        }
      }

    } catch (error) {
      console.error('Error fetching workout data:', error)
      toast.error('Failed to load workout data')
    } finally {
      setIsLoading(false)
    }
  }

  const createNewSession = async (exerciseList: Exercise[], existingSessions: WorkoutSession[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const nextSessionNumber = existingSessions.length + 1

      // Create new session - will appear at top because sorted by created_at desc
      const { data: newSession, error: sessionError } = await supabase
        .from('workout_sessions')
        .insert({
          workout_plan_id: planId,
          user_id: user.id,
          session_number: nextSessionNumber,
        })
        .select()
        .single()

      if (sessionError) throw sessionError

      setCurrentSessionId(newSession.id)

      // Get previous session (first in list = most recent before this one) for weight prefill
      let previousSets: SessionSet[] = []
      if (existingSessions.length > 0) {
        const previousSession = existingSessions[0]
        const { data: prevSets } = await supabase
          .from('workout_session_sets')
          .select('*')
          .eq('workout_session_id', previousSession.id)

        previousSets = prevSets || []
      }

      const newSets: Partial<SessionSet & { workout_session_id: string }>[] = []
      exerciseList.forEach((exercise) => {
        for (let setNum = 1; setNum <= 4; setNum++) {
          const prevSet = previousSets.find(
            s => s.exercise_id === exercise.id && s.set_number === setNum
          )

          newSets.push({
            workout_session_id: newSession.id,
            exercise_id: exercise.id,
            set_number: setNum,
            reps: null,
            weight: prevSet?.weight || null,
          })
        }
      })

      const { data: createdSets, error: setsError } = await supabase
        .from('workout_session_sets')
        .insert(newSets)
        .select()

      if (setsError) throw setsError

      // Add new session at the beginning (newest first)
      setSessions([newSession, ...existingSessions])
      setSessionSets(prev => ({
        ...prev,
        [newSession.id]: createdSets,
      }))

    } catch (error) {
      console.error('Error creating new session:', error)
      toast.error('Failed to create new session')
    }
  }

  const updateSetValue = async (
    sessionId: string,
    exerciseId: string,
    setNumber: number,
    field: 'reps' | 'weight',
    value: number | null
  ) => {
    try {
      const sets = sessionSets[sessionId] || []
      const setIndex = sets.findIndex(
        s => s.exercise_id === exerciseId && s.set_number === setNumber
      )

      if (setIndex === -1) {
        const { data: insertedSet, error: insertError } = await supabase
          .from('workout_session_sets')
          .insert({
            workout_session_id: sessionId,
            exercise_id: exerciseId,
            set_number: setNumber,
            reps: field === 'reps' ? value : null,
            weight: field === 'weight' ? value : null,
          })
          .select()
          .single()

        if (insertError) throw insertError

        setSessionSets(prev => ({
          ...prev,
          [sessionId]: [...(prev[sessionId] || []), insertedSet],
        }))

        return
      }

      const targetSet = sets[setIndex]

      setSessionSets(prev => ({
        ...prev,
        [sessionId]: (prev[sessionId] || []).map((s, idx) =>
          idx === setIndex ? { ...s, [field]: value } : s
        ),
      }))

      const { error } = await supabase
        .from('workout_session_sets')
        .update({ [field]: value })
        .eq('id', targetSet.id)

      if (error) throw error
    } catch (error) {
      console.error('Error updating set:', error)
      toast.error('Failed to update set')
    }
  }

  const updateSessionDate = async (sessionId: string, newDate: string) => {
    try {
      const { error } = await supabase
        .from('workout_sessions')
        .update({ session_date: newDate })
        .eq('id', sessionId)

      if (error) throw error

      setSessions(prev => prev.map(s =>
        s.id === sessionId ? { ...s, session_date: newDate } : s
      ))
      setEditingDateSessionId(null)
      toast.success('Date updated!')
    } catch (error) {
      console.error('Error updating date:', error)
      toast.error('Failed to update date')
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (exercises.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Toaster />
        <Navbar />
        <div className="flex-1 p-4 md:p-8 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold mb-4">{planName}</h1>
            <p className="text-gray-600 mb-4">No exercises in this workout plan yet.</p>
            <p className="text-gray-600 mb-6">Add exercises to this plan first to start tracking your workouts!</p>
            <Button onClick={() => window.location.href = '/plans'}>
              Go to Plans
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const handleStartNewWorkout = async () => {
    if (isCreatingSession) {
      return // Silently prevent multiple clicks without showing toast
    }

    // Check if there's already an empty session (no data filled in)
    if (sessions.length > 0) {
      const lastSession = sessions[sessions.length - 1]
      const lastSessionSets = sessionSets[lastSession.id] || []

      // Check if the last session has any reps filled in
      const hasData = lastSessionSets.some(set => set.reps !== null && set.reps > 0)

      if (!hasData) {
        // Only show toast if it's been more than 2 seconds since last toast
        const now = Date.now()
        if (now - lastToastTime > 2000) {
          toast.error('Please fill in the current workout before starting a new one!')
          setLastToastTime(now)
        }
        return
      }
    }

    setIsCreatingSession(true)
    try {
      await createNewSession(exercises, sessions)
      toast.success('New workout session created!')
    } finally {
      setIsCreatingSession(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Toaster />
      <Navbar />
      <div className="flex-1 md:p-8">
        <div className="max-w-full mx-auto">
          <div className={`flex items-center justify-between mb-6 sticky top-14 md:static z-40 md:z-auto py-2 px-4 rounded-lg ${
            (() => {
              const colors = ['bg-blue-100', 'bg-green-100', 'bg-purple-100', 'bg-pink-100', 'bg-yellow-100']
              return colors[planIndex % colors.length]
            })()
          }`}>
            <h1 className="text-2xl md:text-3xl font-bold">{planName}</h1>
            <Button onClick={handleStartNewWorkout} disabled={isCreatingSession} size="sm">
              {isCreatingSession ? 'Adding...' : 'Add Workout Day'}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white">
              <thead>
                <tr>
                  <th className={`p-2 min-w-[80px] sticky left-0 z-10 ${
                    (() => {
                      const colors = ['bg-blue-100', 'bg-green-100', 'bg-purple-100', 'bg-pink-100', 'bg-yellow-100']
                      return colors[planIndex % colors.length]
                    })()
                  }`}>
                    <div className="text-sm font-semibold">Date</div>
                  </th>
                  {exercises.map((exercise, exerciseIdx) => (
                    <th key={exercise.id} className={`p-2 min-w-[200px] max-w-[200px] border-l-8 border-white ${
                      (() => {
                        const colors = ['bg-blue-100', 'bg-green-100', 'bg-purple-100', 'bg-pink-100', 'bg-yellow-100']
                        return colors[planIndex % colors.length]
                      })()
                    }`}>
                      <div
                        className={`font-semibold text-sm md:text-lg ${exercise.video_url ? 'cursor-pointer hover:text-orange-600 transition-colors' : ''}`}
                        onClick={() => {
                          console.log('Clicked:', exercise.name, 'URL:', exercise.video_url)
                          if (exercise.video_url) {
                            setSelectedVideo({ url: exercise.video_url, title: exercise.name })
                          }
                        }}
                      >
                        {exercise.name}
                      </div>
                      <div className="text-sm font-normal mt-1">{exercise.sets} x {exercise.reps}</div>
                      <div className="grid grid-cols-4 gap-0 mt-1">
                        {Array.from({ length: 4 }).map((_, setIdx) => (
                          <div key={setIdx} className="text-xs text-gray-500 text-center">
                            Set {setIdx + 1}
                          </div>
                        ))}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.map((session, sessionIdx) => {
                  const sets = sessionSets[session.id] || []
                  const isCurrentSession = session.id === currentSessionId

                  return (
                    <tr key={session.id} className="bg-white">
                      <td className="p-2 sticky left-0 z-10 bg-inherit">
                        <div className="font-bold text-center">{session.session_number}</div>
                        {editingDateSessionId === session.id ? (
                          <Input
                            type="date"
                            defaultValue={new Date(session.session_date).toISOString().split('T')[0]}
                            onBlur={(e) => {
                              if (e.target.value) {
                                updateSessionDate(session.id, e.target.value)
                              } else {
                                setEditingDateSessionId(null)
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.currentTarget.value) {
                                updateSessionDate(session.id, e.currentTarget.value)
                              }
                              if (e.key === 'Escape') {
                                setEditingDateSessionId(null)
                              }
                            }}
                            className="text-xs text-center mt-1 h-6"
                            autoFocus
                          />
                        ) : (
                          <div
                            className="text-xs text-gray-500 text-center mt-1 cursor-pointer hover:text-gray-700"
                            onClick={() => setEditingDateSessionId(session.id)}
                          >
                            {(() => {
                              const date = new Date(session.session_date)
                              const day = date.getDate()
                              const month = date.toLocaleDateString('en-US', { month: 'short' })
                              const year = date.getFullYear().toString().slice(-2)
                              return `${day} ${month} ${year}`
                            })()}
                          </div>
                        )}
                      </td>
                      {exercises.map((exercise, exerciseIdx) => (
                        <td key={exercise.id} className={`p-2 ${exerciseIdx > 0 ? 'border-l-8 border-white' : ''}`}>
                          <div className="grid grid-cols-4 gap-0">
                            {Array.from({ length: 4 }).map((_, setIdx) => {
                              const setNumber = setIdx + 1
                              const setData = sets.find(
                                s => s.exercise_id === exercise.id && s.set_number === setNumber
                              )

                              return (
                                <div key={setNumber} className="text-center border border-gray-200 rounded-none">
                                  <input
                                    type="number"
                                    min="0"
                                    value={setData?.reps ?? ''}
                                    onChange={(e) => {
                                      const val = e.target.value === '' ? null : parseInt(e.target.value)
                                      if (val === null || val >= 0) {
                                        updateSetValue(session.id, exercise.id, setNumber, 'reps', val)
                                      }
                                    }}
                                    placeholder="R"
                                    className="h-8 w-full text-center border-0 outline-none focus:outline-none placeholder-gray-300"
                                  />
                                  <div className="border-t border-gray-200"></div>
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    value={setData?.weight ?? ''}
                                    onChange={(e) => {
                                      const val = e.target.value === '' ? null : parseFloat(e.target.value)
                                      if (val === null || val >= 0) {
                                        updateSetValue(session.id, exercise.id, setNumber, 'weight', val)
                                      }
                                    }}
                                    placeholder="W"
                                    className="h-8 w-full text-center border-0 outline-none focus:outline-none placeholder-gray-300"
                                  />
                                </div>
                              )
                            })}
                          </div>
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <Footer />
      {selectedVideo && (
        <VideoModal
          isOpen={true}
          videoUrl={selectedVideo.url}
          title={selectedVideo.title}
          onClose={() => setSelectedVideo(null)}
        />
      )}
    </div>
  )
}
