'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export default function Footer() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
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
    <footer className="bg-white border-t mt-auto">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
        <div className="flex items-center justify-center gap-6">
          <Link
            href="/exercises"
            className={`text-sm font-medium whitespace-nowrap px-4 py-1.5 rounded-full transition-colors ${
              pathname === '/exercises'
                ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Exercise List
          </Link>

          <Link
            href="/terms"
            className={`text-sm ${
              pathname === '/terms' ? 'text-indigo-600' : 'text-gray-700 hover:text-indigo-600'
            }`}
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className={`text-sm ${
              pathname === '/privacy' ? 'text-indigo-600' : 'text-gray-700 hover:text-indigo-600'
            }`}
          >
            Privacy
          </Link>
          <Link
            href="/about"
            className={`text-sm ${
              pathname === '/about' ? 'text-indigo-600' : 'text-gray-700 hover:text-indigo-600'
            }`}
          >
            About
          </Link>
          {user ? (
            <button
              onClick={handleLogout}
              className="text-sm text-gray-700 hover:text-indigo-600"
            >
              Logout
            </button>
          ) : (
            <button
              onClick={handleLogin}
              className="text-sm text-gray-700 hover:text-indigo-600"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </footer>
  )
}
