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

const HEADER_VARIANTS = [
  {
    gradient: 'from-blue-100 via-blue-50 to-white',
    text: 'text-blue-900',
    accent: 'from-blue-300/40 via-transparent to-transparent',
    cards: [
      'bg-gradient-to-br from-blue-100/80 via-blue-50/70 to-blue-200/60 border-blue-200/70',
      'bg-gradient-to-br from-blue-300/50 via-blue-100/60 to-blue-200/50 border-blue-300/60',
    ],
  },
  {
    gradient: 'from-green-100 via-green-50 to-white',
    text: 'text-green-900',
    accent: 'from-green-300/40 via-transparent to-transparent',
    cards: [
      'bg-gradient-to-br from-emerald-100/80 via-emerald-50/70 to-emerald-200/60 border-emerald-200/70',
      'bg-gradient-to-br from-emerald-300/50 via-emerald-100/60 to-emerald-200/50 border-emerald-300/60',
    ],
  },
  {
    gradient: 'from-purple-100 via-purple-50 to-white',
    text: 'text-purple-900',
    accent: 'from-purple-300/40 via-transparent to-transparent',
    cards: [
      'bg-gradient-to-br from-purple-100/80 via-indigo-50/70 to-purple-200/60 border-purple-200/70',
      'bg-gradient-to-br from-purple-300/50 via-purple-100/60 to-purple-200/50 border-purple-300/60',
    ],
  },
  {
    gradient: 'from-pink-100 via-pink-50 to-white',
    text: 'text-pink-900',
    accent: 'from-pink-300/40 via-transparent to-transparent',
    cards: [
      'bg-gradient-to-br from-rose-100/80 via-pink-50/70 to-rose-200/60 border-rose-200/70',
      'bg-gradient-to-br from-rose-300/50 via-rose-100/60 to-rose-200/50 border-rose-300/60',
    ],
  },
  {
    gradient: 'from-yellow-100 via-yellow-50 to-white',
    text: 'text-yellow-900',
    accent: 'from-yellow-300/40 via-transparent to-transparent',
    cards: [
      'bg-gradient-to-br from-amber-100/80 via-yellow-50/70 to-amber-200/60 border-amber-200/70',
      'bg-gradient-to-br from-amber-300/50 via-amber-100/60 to-amber-200/50 border-amber-300/60',
    ],
  },
]

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
  const saveTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const headerVariant = HEADER_VARIANTS[planIndex % HEADER_VARIANTS.length]
  const dateColumnWidth = 120
  const exerciseColumnWidth = 220
  const gridMinWidth = Math.max(600, dateColumnWidth + exercises.length * exerciseColumnWidth)

  useEffect(() => {
    fetchWorkoutData()
  }, [planId])

  // Cleanup: flush all pending saves on unmount
  useEffect(() => {
    return () => {
      saveTimeoutsRef.current.forEach(timeout => clearTimeout(timeout))
      saveTimeoutsRef.current.clear()
    }
  }, [])

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
        .eq('is_hidden', false)
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

      // Update local state IMMEDIATELY for responsive UI
      if (setIndex === -1) {
        // Create temporary set with placeholder ID
        const tempSet: SessionSet = {
          id: `temp-${sessionId}-${exerciseId}-${setNumber}`,
          workout_session_id: sessionId,
          exercise_id: exerciseId,
          set_number: setNumber,
          reps: field === 'reps' ? value : null,
          weight: field === 'weight' ? value : null,
        }

        setSessionSets(prev => ({
          ...prev,
          [sessionId]: [...(prev[sessionId] || []), tempSet],
        }))

        // Debounce the database insert
        const timeoutKey = `${sessionId}-${exerciseId}-${setNumber}`
        const existingTimeout = saveTimeoutsRef.current.get(timeoutKey)
        if (existingTimeout) clearTimeout(existingTimeout)

        const timeout = setTimeout(async () => {
          try {
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

            // Replace temp set with real set from database
            setSessionSets(prev => ({
              ...prev,
              [sessionId]: (prev[sessionId] || []).map(s =>
                s.id === tempSet.id ? insertedSet : s
              ),
            }))
          } catch (error) {
            console.error('Error inserting set:', error)
            // Revert on error
            setSessionSets(prev => ({
              ...prev,
              [sessionId]: (prev[sessionId] || []).filter(s => s.id !== tempSet.id),
            }))
          }
          saveTimeoutsRef.current.delete(timeoutKey)
        }, 500)

        saveTimeoutsRef.current.set(timeoutKey, timeout)
        return
      }

      const targetSet = sets[setIndex]

      // Update local state IMMEDIATELY
      setSessionSets(prev => ({
        ...prev,
        [sessionId]: (prev[sessionId] || []).map((s, idx) =>
          idx === setIndex ? { ...s, [field]: value } : s
        ),
      }))

      // Debounce the database update
      const timeoutKey = `${sessionId}-${exerciseId}-${setNumber}-${field}`
      const existingTimeout = saveTimeoutsRef.current.get(timeoutKey)
      if (existingTimeout) clearTimeout(existingTimeout)

      const timeout = setTimeout(async () => {
        try {
          const { error } = await supabase
            .from('workout_session_sets')
            .update({ [field]: value })
            .eq('id', targetSet.id)

          if (error) throw error
        } catch (error) {
          console.error('Error updating set:', error)
          // Could revert here, but usually not necessary for updates
        }
        saveTimeoutsRef.current.delete(timeoutKey)
      }, 500)

      saveTimeoutsRef.current.set(timeoutKey, timeout)
    } catch (error) {
      console.error('Error updating set:', error)
      toast.error('Failed to update set')
    }
  }

  const handleSessionFocus = (sessionId: string) => {
    setCurrentSessionId(sessionId)
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
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 text-2xl md:text-3xl font-semibold text-gray-700">
        <span role="img" aria-label="flexed biceps" className="mr-3">💪</span>
        Working things out...
      </div>
    )
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
      <div className="flex-1">
        {/* Title row - full width and sticky */}
        <div
          className={`relative flex items-center justify-center z-30 py-2 px-4 md:px-8 border-b border-white/60 shadow-sm overflow-hidden bg-linear-to-r ${headerVariant.gradient} ${headerVariant.text} sticky top-14`}
        >
          <div
            className={`absolute inset-0 bg-linear-to-br ${headerVariant.accent} opacity-70 pointer-events-none`}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-full mx-auto text-center">
            <h1 className="text-xl md:text-2xl font-bold drop-shadow-sm">{planName}</h1>
          </div>
        </div>

        {/* Content area */}
        <div className="pt-4 md:px-8 pb-4">
            <div className="max-w-full mx-auto">
            <div className="overflow-x-auto md:overflow-visible bg-white/50 backdrop-blur">
              <table className="w-full border-collapse bg-transparent" style={{ minWidth: `${gridMinWidth}px` }}>
                <thead>
                  <tr>
                    <th className="px-2 py-1 min-w-20 w-20 sticky left-0 z-20 bg-white shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                      <button
                        type="button"
                        onClick={handleStartNewWorkout}
                        disabled={isCreatingSession}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline disabled:text-gray-400 disabled:no-underline transition-colors"
                        title="Add a new workout day"
                      >
                        {isCreatingSession ? 'Adding...' : '+ Add'}
                      </button>
                    </th>
                    {exercises.map((exercise, exerciseIdx) => {
                      const cardVariant = headerVariant.cards[exerciseIdx % headerVariant.cards.length]

                      return (
                        <th
                          key={exercise.id}
                          className="px-2 py-1 bg-transparent align-top"
                          style={{ width: `${exerciseColumnWidth}px` }}
                        >
                          <div
                            className={`w-full h-full border border-transparent backdrop-blur-2xl px-3 pt-1 pb-0 transition-all flex flex-col items-center justify-center gap-1.5 min-h-[105px] ${cardVariant}`}
                          >
                            <div
                              className={`font-semibold text-sm md:text-lg leading-snug text-center ${exercise.video_url ? 'cursor-pointer hover:text-blue-700 transition-colors' : ''}`}
                              onClick={() => {
                                if (exercise.video_url) {
                                  setSelectedVideo({ url: exercise.video_url, title: exercise.name })
                                }
                              }}
                            >
                              {exercise.name}
                            </div>
                            <div className="grid grid-cols-4 gap-0 w-full">
                              {Array.from({ length: 4 }).map((_, setIdx) => (
                                <div key={setIdx} className="text-xs text-gray-600 text-center">
                                  {setIdx + 1}
                                </div>
                              ))}
                            </div>
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session, sessionIdx) => {
                    const sets = sessionSets[session.id] || []
                    const isCurrentSession = session.id === currentSessionId

                    return (
                      <tr key={session.id} className="bg-transparent">
                        <td
                          className="px-2 py-1 min-w-20 w-20 sticky left-0 z-10 bg-white/70 backdrop-blur shadow-[4px_0_8px_-4px_rgba(0,0,0,0.06)] cursor-pointer"
                          onClick={() => handleSessionFocus(session.id)}
                        >
                          <div className="font-bold text-center">{session.session_number}</div>
                          {editingDateSessionId === session.id ? (
                            <Input
                              type="date"
                              defaultValue={new Date(session.session_date).toISOString().split('T')[0]}
                              onFocus={() => handleSessionFocus(session.id)}
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
                              onClick={() => {
                                handleSessionFocus(session.id)
                                setEditingDateSessionId(session.id)
                              }}
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
                        {exercises.map((exercise) => (
                          <td
                            key={exercise.id}
                            className="px-2 py-1 align-top"
                            style={{ width: `${exerciseColumnWidth}px` }}
                          >
                            <div
                              className="w-full grid grid-cols-4 gap-x-0 gap-y-3 border border-gray-200/70 bg-white"
                              onClick={() => handleSessionFocus(session.id)}
                            >
                              {Array.from({ length: 4 }).map((_, setIdx) => {
                                const setNumber = setIdx + 1
                                const setData = sets.find(
                                  s => s.exercise_id === exercise.id && s.set_number === setNumber
                                )

                                return (
                                  <div
                                    key={setNumber}
                                    className={`border border-gray-200/70 ${isCurrentSession ? 'bg-white' : 'bg-gray-50'}`}
                                  >
                                    <div className="flex items-center h-8 px-1">
                                      <span className={`text-[10px] font-semibold w-3 text-left ${isCurrentSession ? 'text-gray-400' : 'text-gray-300'}`}>
                                        R
                                      </span>
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
                                        placeholder="Reps"
                                        className={`h-8 w-full text-center border-0 outline-none focus:outline-none placeholder-transparent focus:placeholder-gray-400 ${
                                          isCurrentSession ? 'text-gray-900 bg-white' : 'text-gray-400 bg-transparent'
                                        }`}
                                        onFocus={() => handleSessionFocus(session.id)}
                                      />
                                    </div>
                                    <div className="border-t border-gray-200"></div>
                                    <div className="flex items-center h-8 px-1">
                                      <span className={`text-[10px] font-semibold w-3 text-left ${isCurrentSession ? 'text-gray-400' : 'text-gray-300'}`}>
                                        W
                                      </span>
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
                                        placeholder="Weight"
                                        className={`h-8 w-full text-center border-0 outline-none focus:outline-none placeholder-transparent focus:placeholder-gray-400 ${
                                          isCurrentSession ? 'text-gray-900 bg-white' : 'text-gray-400 bg-transparent'
                                        }`}
                                        onFocus={() => handleSessionFocus(session.id)}
                                      />
                                    </div>
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
