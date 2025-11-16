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
    <nav className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-center gap-4 overflow-x-auto h-14">
          <Link
            href="/plans"
            className={`text-sm font-medium whitespace-nowrap ${
              pathname === '/plans' ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'
            }`}
          >
            Plans
          </Link>
          {plans.map((plan) => (
            <Link
              key={plan.id}
              href={`/plans#${plan.id}`}
              className="text-sm text-gray-600 hover:text-blue-600 whitespace-nowrap"
            >
              {plan.name}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
