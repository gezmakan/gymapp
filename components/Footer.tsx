'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'

type WorkoutPlan = {
  id: string
  name: string
}

export default function Footer() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [plans, setPlans] = useState<WorkoutPlan[]>([])

  useEffect(() => {
    checkUser()
    fetchPlans()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('workout_plans')
        .select('id, name')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPlans(data || [])
    } catch (error) {
      console.error('Error fetching plans in footer:', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleLogin = () => {
    router.push('/login')
  }

  return (
    <footer className="bg-slate-900 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-4">
        <div className="flex flex-col items-center gap-2 text-sm text-slate-200">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/plans"
              className={`${
                pathname === '/plans' ? 'text-white' : 'hover:text-white/80'
              }`}
            >
              Workout Planner
            </Link>
            <Link
              href="/exercises"
              className={`${
                pathname === '/exercises' ? 'text-white' : 'hover:text-white/80'
              }`}
            >
              Exercise Library
            </Link>
            <Link
              href={user ? '/exercises/add' : '/signup'}
              className={`${
                pathname === '/exercises/add' ? 'text-white' : 'hover:text-white/80'
              }`}
            >
              Add Exercise
            </Link>
          </div>
          <div className="flex items-center justify-center gap-6 flex-wrap pt-3">
            <Link
              href="/terms"
              className={`${
                pathname === '/terms' ? 'text-white' : 'hover:text-white/80'
              }`}
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className={`${
                pathname === '/privacy' ? 'text-white' : 'hover:text-white/80'
              }`}
            >
              Privacy
            </Link>
            <Link
              href="/about"
              className={`${
                pathname === '/about' ? 'text-white' : 'hover:text-white/80'
              }`}
            >
              About
            </Link>
            {user && (
              <button
                onClick={handleLogout}
                className="text-xs text-slate-300 hover:text-white"
              >
                Logout
              </button>
            )}
          </div>
        </div>
        <div className="text-center text-sm md:text-base text-white font-semibold tracking-wide py-2">
          © Gym Tracker 4
        </div>
      </div>
    </footer>
  )
}
