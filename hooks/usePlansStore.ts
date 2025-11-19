'use client'

import { useEffect, useRef } from 'react'
import { useSyncExternalStore } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WorkoutPlanSummary, PlanExercise } from '@/types/plans'

type StoreState = {
  plans: WorkoutPlanSummary[] | null
  isLoading: boolean
  error: string | null
}

type Snapshot = StoreState

const store: StoreState = {
  plans: null,
  isLoading: true,
  error: null,
}

const subscribers = new Set<() => void>()
const notify = () => subscribers.forEach((cb) => cb())

let initialized = false
let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null
let pendingFetch: Promise<void> | null = null

const formatPlans = (data: any[] | null): WorkoutPlanSummary[] => {
  if (!data) return []

  return data.map((plan: any) => {
    const { workout_plan_exercises = [], ...rest } = plan
    const rawExercises: PlanExercise[] = workout_plan_exercises.map((item: any) => ({
      ...item.exercises,
      plan_exercise_id: item.id,
      order_index: item.order_index,
      is_hidden: item.is_hidden,
    }))

    return {
      ...rest,
      exercises: rawExercises.filter((ex) => !ex.is_hidden),
      hiddenExercises: rawExercises.filter((ex) => ex.is_hidden),
    }
  })
}

const subscribeStore = (callback: () => void) => {
  subscribers.add(callback)
  return () => subscribers.delete(callback)
}

const getSnapshot = (() => {
  const cached: Snapshot = {
    plans: store.plans,
    isLoading: store.isLoading,
    error: store.error,
  }

  return (): Snapshot => {
    if (
      cached.plans !== store.plans ||
      cached.isLoading !== store.isLoading ||
      cached.error !== store.error
    ) {
      cached.plans = store.plans
      cached.isLoading = store.isLoading
      cached.error = store.error
    }
    return cached
  }
})()

const getServerSnapshot = (() => {
  const cached: Snapshot = {
    plans: null,
    isLoading: true,
    error: null,
  }
  return () => cached
})()

const fetchPlans = async (supabase: ReturnType<typeof createClient>) => {
  if (pendingFetch) {
    return pendingFetch
  }

  store.isLoading = true
  notify()

  pendingFetch = supabase
    .from('workout_plans')
    .select(
      `
      *,
      workout_plan_exercises (
        id,
        order_index,
        is_hidden,
        exercises (*)
      )
    `
    )
    .order('created_at', { ascending: false })
    .order('order_index', { foreignTable: 'workout_plan_exercises', ascending: true })
    .then(({ data, error }) => {
      if (error) {
        store.error = error.message
      } else {
        store.error = null
        store.plans = formatPlans(data)
      }
    })
    .catch((err) => {
      store.error = err.message || 'Failed to load plans'
    })
    .finally(() => {
      store.isLoading = false
      pendingFetch = null
      notify()
    })

  return pendingFetch
}

export function usePlansStore() {
  const supabaseRef = useRef<ReturnType<typeof createClient>>()
  if (!supabaseRef.current) {
    supabaseRef.current = createClient()
  }
  const supabase = supabaseRef.current

  useEffect(() => {
    if (!initialized) {
      initialized = true
      fetchPlans(supabase)
      channel = supabase
        .channel('plans-updates')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'workout_plans' },
          () => fetchPlans(supabase)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'workout_plan_exercises' },
          () => fetchPlans(supabase)
        )
        .subscribe()
    }

    return () => {
      // Keep subscription alive globally; no cleanup needed per component
    }
  }, [])

  const snapshot = useSyncExternalStore(subscribeStore, getSnapshot, getServerSnapshot)

  return {
    plans: snapshot.plans ?? [],
    isLoading: snapshot.isLoading,
    error: snapshot.error,
    refresh: () => fetchPlans(supabase),
  }
}
