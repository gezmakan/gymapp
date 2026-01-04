'use client'

import { ReactNode, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { usePlansStore } from '@/hooks/usePlansStore'

type NavbarProps = {
  timerContent?: ReactNode
}

export default function Navbar({ timerContent }: NavbarProps) {
  const { plans } = usePlansStore()
  const [user, setUser] = useState<any>(null)
  const [userChecked, setUserChecked] = useState(false)
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data } = await supabase.auth.getUser()
    setUser(data.user)
    setUserChecked(true)
  }

  return (
    <nav className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-full mx-auto px-6 md:px-12">
        {/* First row: Logo, Timer (desktop only), Plans */}
        <div className="flex items-center justify-between gap-3 h-14">
          <Link
            href="/plans"
            className="flex items-center gap-1 md:gap-2 font-semibold text-gray-800 text-sm md:text-lg shrink-0"
          >
            <Image
              src="/gymloggerx.png"
              alt="GymTrack4 logo"
              width={36}
              height={36}
              className="h-8 w-8 md:h-10 md:w-10 rounded-full object-cover"
              priority
            />
            <span
              className="hidden md:inline text-base md:text-lg tracking-wide"
              style={{ fontFamily: 'Impact, Haettenschweiler, \"Arial Narrow Bold\", sans-serif', letterSpacing: '0.12em' }}
            >
              GYMTRACKER4
            </span>
          </Link>

          {/* Timer - centered on desktop, hidden on mobile */}
          {timerContent && (
            <div className="hidden md:flex items-center gap-2 absolute left-1/2 transform -translate-x-1/2">
              {timerContent}
            </div>
          )}

          <div className="flex items-center gap-2 overflow-x-auto flex-1 min-w-0 flex-nowrap justify-start md:justify-end">
            {plans.map((plan, index) => {
              const isActive = pathname.includes(`/plans/${plan.id}`)
              const colors = [
                'bg-blue-300',
                'bg-green-300',
                'bg-purple-300',
                'bg-pink-300',
                'bg-yellow-300',
              ]
              const activeColor = colors[index % colors.length]

              return (
                <Link
                  key={plan.id}
                  href={`/plans/${plan.id}/workout`}
                  className={`text-sm font-medium whitespace-nowrap px-4 py-1.5 rounded-full transition-colors text-gray-900 shrink-0 flex items-center gap-2 ${
                    isActive
                      ? activeColor
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <span>{plan.name}</span>
                  {(plan.session_count ?? 0) > 0 && (
                    <span className="text-xs opacity-70 bg-white/40 px-2 py-0.5 rounded-full">
                      {plan.session_count}
                    </span>
                  )}
                </Link>
              )
            })}
            {userChecked && !user && (
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

        {/* Second row: Timer on mobile only */}
        {timerContent && (
          <div className="md:hidden flex items-center justify-center py-2 border-t border-gray-200">
            {timerContent}
          </div>
        )}
      </div>
    </nav>
  )
}
