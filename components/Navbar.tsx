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
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    fetchPlans()
  }, [])

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
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-center gap-2 overflow-x-auto h-14">
          <Link
            href="/plans"
            className={`text-sm font-medium whitespace-nowrap px-4 py-1.5 rounded-full transition-colors ${
              pathname === '/plans'
                ? 'bg-orange-300 text-gray-900'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="hidden md:inline">Workout Planner</span>
            <span className="md:hidden">Planner</span>
          </Link>
          {plans.map((plan) => {
            const isActive = pathname.includes(`/plans/${plan.id}`)
            return (
              <Link
                key={plan.id}
                href={`/plans/${plan.id}/workout`}
                className={`text-sm font-medium whitespace-nowrap px-4 py-1.5 rounded-full transition-colors ${
                  isActive
                    ? 'bg-orange-300 text-gray-900'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {plan.name}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
