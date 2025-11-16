'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

export default function CreatePlanPage() {
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Check if user already has 7 plans
      const { data: existingPlans, error: countError } = await supabase
        .from('workout_plans')
        .select('id')
        .eq('user_id', user.id)

      if (countError) throw countError

      if (existingPlans && existingPlans.length >= 7) {
        throw new Error('You have reached the maximum of 7 workout plans')
      }

      const { data, error } = await supabase
        .from('workout_plans')
        .insert([
          {
            user_id: user.id,
            name: name,
          },
        ])
        .select()
        .single()

      if (error) throw error

      // Redirect to the plan edit page to add exercises
      router.push(`/plans/${data.id}`)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 md:p-8">
      <div className="max-w-2xl mx-auto p-4 md:p-0">
        <Button
          variant="ghost"
          onClick={() => router.push('/plans')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Plans
        </Button>

        <Card className="border-0 md:border shadow-none md:shadow-sm">
          <CardHeader>
            <CardTitle>Create Workout Plan</CardTitle>
            <CardDescription>
              Give your workout plan a name
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Plan Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Push Day, Pull Day, Leg Day"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={50}
                />
                <p className="text-xs text-gray-500">
                  Choose a descriptive name for your workout plan
                </p>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Plan'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/plans')}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
