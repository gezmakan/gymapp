import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'

type ExerciseRow = {
  user_id: string | null
  created_at: string | null
}

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    // Get ALL users from auth system using database function
    const { data: allUsers, error: usersError } = await supabase
      .rpc('get_all_users_admin')

    if (usersError) throw usersError

    // Get exercise counts for each user
    const { data: exercises } = await supabase
      .from('exercises')
      .select('user_id')
      .not('user_id', 'is', null)

    // Count exercises per user
    const exerciseCounts: Record<string, number> = {}
    exercises?.forEach((ex) => {
      if (ex.user_id) {
        exerciseCounts[ex.user_id] = (exerciseCounts[ex.user_id] || 0) + 1
      }
    })

    // Format the response with emails
    const payload = allUsers?.map((u: any) => ({
      id: u.user_id,
      email: u.email,
      created_at: u.created_at,
      exercise_count: exerciseCounts[u.user_id] || 0
    })) || []

    return NextResponse.json({ users: payload })
  } catch (routeError) {
    console.error('Admin users API error:', routeError)
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 })
  }
}
