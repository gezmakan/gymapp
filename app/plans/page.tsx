'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus, ArrowLeft, Edit, Trash2, Dumbbell } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type WorkoutPlan = {
  id: string
  user_id: string
  name: string
  created_at: string
  exercise_count?: number
}

export default function PlansPage() {
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  const MAX_PLANS = 7

  useEffect(() => {
    checkUser()
    fetchPlans()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    }
  }

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPlans(data || [])
    } catch (error) {
      console.error('Error fetching plans:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workout plan?')) return

    try {
      const { error } = await supabase
        .from('workout_plans')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchPlans()
    } catch (error) {
      console.error('Error deleting plan:', error)
      alert('Failed to delete workout plan')
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  const canAddMore = plans.length < MAX_PLANS

  return (
    <div className="min-h-screen bg-gray-50 md:p-8">
      <div className="max-w-7xl mx-auto md:px-16">
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
              <Button
                variant="outline"
                onClick={() => router.push('/exercises')}
                size="sm"
                className="md:h-10"
              >
                <ArrowLeft className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Back</span>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4 md:px-0">
            {plans.map((plan) => (
              <Card key={plan.id} className="border-0 md:border shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{plan.name}</span>
                  </CardTitle>
                  <CardDescription>
                    {plan.exercise_count || 0} exercises
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => router.push(`/plans/${plan.id}`)}
                    >
                      <Edit className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(plan.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
