'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

export default function EditExercisePage() {
  const params = useParams()
  const [formData, setFormData] = useState({
    name: '',
    sets: '',
    reps: '',
    video_url: '',
    muscle_groups: '',
    rest_minutes: '1',
    rest_seconds: '30',
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchExercise()
  }, [])

  const fetchExercise = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error

      setFormData({
        name: data.name,
        sets: data.sets.toString(),
        reps: data.reps,
        video_url: data.video_url || '',
        muscle_groups: data.muscle_groups || '',
        rest_minutes: data.rest_minutes.toString(),
        rest_seconds: data.rest_seconds.toString(),
      })
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('exercises')
        .update({
          name: formData.name,
          sets: parseInt(formData.sets),
          reps: formData.reps,
          video_url: formData.video_url || null,
          muscle_groups: formData.muscle_groups || null,
          rest_minutes: parseInt(formData.rest_minutes),
          rest_seconds: parseInt(formData.rest_seconds),
        })
        .eq('id', params.id)

      if (error) throw error

      router.push('/exercises')
      router.refresh()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 md:p-8">
      <div className="max-w-2xl mx-auto p-4 md:p-0">
        <Button
          variant="ghost"
          onClick={() => router.push('/exercises')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Exercises
        </Button>

        <Card className="border-0 md:border shadow-none md:shadow-sm">
          <CardHeader>
            <CardTitle>Edit Exercise</CardTitle>
            <CardDescription>
              Update exercise details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Exercise Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Push Ups"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sets">Sets *</Label>
                  <Input
                    id="sets"
                    type="number"
                    min="1"
                    placeholder="e.g., 4"
                    value={formData.sets}
                    onChange={(e) => setFormData({ ...formData, sets: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reps">Reps *</Label>
                  <Input
                    id="reps"
                    placeholder="e.g., 8-12 or 10"
                    value={formData.reps}
                    onChange={(e) => setFormData({ ...formData, reps: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="muscle_groups">Muscle Groups</Label>
                <Input
                  id="muscle_groups"
                  placeholder="e.g., chest, shoulder and triceps"
                  value={formData.muscle_groups}
                  onChange={(e) => setFormData({ ...formData, muscle_groups: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="video_url">Video URL (YouTube)</Label>
                <Input
                  id="video_url"
                  type="url"
                  placeholder="e.g., https://www.youtube.com/watch?v=..."
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rest_minutes">Rest Minutes</Label>
                  <Input
                    id="rest_minutes"
                    type="number"
                    min="0"
                    value={formData.rest_minutes}
                    onChange={(e) => setFormData({ ...formData, rest_minutes: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rest_seconds">Rest Seconds</Label>
                  <Input
                    id="rest_seconds"
                    type="number"
                    min="0"
                    max="59"
                    value={formData.rest_seconds}
                    onChange={(e) => setFormData({ ...formData, rest_seconds: e.target.value })}
                  />
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/exercises')}
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
