'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import Link from 'next/link'

type WorkoutPlan = {
  id: string
  name: string
}

export default function Navbar() {
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const router = useRouter()
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Left side - Plan names */}
          <div className="flex items-center gap-4 overflow-x-auto">
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

          {/* Right side - Logout */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="ml-4"
          >
            <LogOut className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Logout</span>
          </Button>
        </div>
      </div>
    </nav>
  )
}
