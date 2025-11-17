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
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 space-y-2">
        <div className="flex items-center justify-center gap-6 text-xs text-gray-500 flex-wrap">
          {pathname !== '/exercises' && (
            <Link
              href="/exercises"
              className="hover:text-indigo-600"
            >
              Exercise Library
            </Link>
          )}
          <Link
            href="/terms"
            className={`${
              pathname === '/terms' ? 'text-indigo-600' : 'hover:text-indigo-600'
            }`}
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className={`${
              pathname === '/privacy' ? 'text-indigo-600' : 'hover:text-indigo-600'
            }`}
          >
            Privacy
          </Link>
          <Link
            href="/about"
            className={`${
              pathname === '/about' ? 'text-indigo-600' : 'hover:text-indigo-600'
            }`}
          >
            About
          </Link>
          {user && (
            <button
              onClick={handleLogout}
              className="text-xs text-gray-500 hover:text-indigo-600"
            >
              Logout
            </button>
          )}
        </div>
        <div className="text-center text-xs text-gray-400">© SLMFIT</div>
      </div>
    </footer>
  )
}
