'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

type WorkoutPlan = {
  id: string
  name: string
}

export default function Navbar() {
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [user, setUser] = useState<any>(null)
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    fetchPlans()
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data } = await supabase.auth.getUser()
    setUser(data.user)
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
      console.error('Error fetching plans:', error)
    }
  }

  return (
    <nav className="bg-white border-b sticky top-0 md:static z-50 md:z-auto">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center gap-3 h-14 flex-nowrap overflow-x-auto">
          <Link
            href="/plans"
            className="flex items-center gap-1 md:gap-2 font-semibold text-gray-800 text-sm md:text-lg shrink-0"
          >
            <span role="img" aria-label="weight lifter" className="text-base md:text-xl">🏋️</span>
            <span>SLMFIT</span>
          </Link>

          <div className="flex items-center gap-2 overflow-x-auto flex-1 min-w-0 flex-nowrap justify-start md:justify-end">
            {user && !pathname.startsWith('/plans') && (
              <Link
                href="/plans"
                className="text-sm font-medium whitespace-nowrap px-4 py-1.5 rounded-full transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200 md:mr-4"
              >
                <span className="hidden md:inline">Plan your workout</span>
                <span className="md:hidden">Plan your workout</span>
              </Link>
            )}
            {!pathname.startsWith('/exercises') && plans.map((plan, index) => {
              const isActive = pathname.includes(`/plans/${plan.id}`)
              const colors = [
                { bg: 'bg-blue-100', hover: 'hover:bg-blue-200', active: 'bg-blue-300' },
                { bg: 'bg-green-100', hover: 'hover:bg-green-200', active: 'bg-green-300' },
                { bg: 'bg-purple-100', hover: 'hover:bg-purple-200', active: 'bg-purple-300' },
                { bg: 'bg-pink-100', hover: 'hover:bg-pink-200', active: 'bg-pink-300' },
                { bg: 'bg-yellow-100', hover: 'hover:bg-yellow-200', active: 'bg-yellow-300' },
              ]
              const colorSet = colors[index % colors.length]

              return (
                <Link
                  key={plan.id}
                  href={`/plans/${plan.id}/workout`}
                  className={`text-sm font-medium whitespace-nowrap px-4 py-1.5 rounded-full transition-colors text-gray-900 shrink-0 ${
                    isActive
                      ? colorSet.active
                      : `${colorSet.bg} ${colorSet.hover}`
                  }`}
                >
                  {plan.name}
                </Link>
              )
            })}
            {!user && (
              <>
                <Link
                  href="/signup"
                  className="text-sm font-medium whitespace-nowrap px-4 py-1.5 rounded-full transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Sign Up
                </Link>
                <Link
                  href="/login"
                  className="text-sm font-medium whitespace-nowrap px-4 py-1.5 rounded-full transition-colors bg-gray-900 text-white hover:bg-gray-800"
                >
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
