'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export default function Footer() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <footer className="bg-white border-t mt-auto">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
        <div className="flex items-center justify-center gap-6">
          <Link
            href="/exercises"
            className={`text-sm font-medium whitespace-nowrap px-4 py-1.5 rounded-full transition-colors ${
              pathname === '/exercises'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Exercise List
          </Link>

          <Link
            href="/terms"
            className={`text-sm ${
              pathname === '/terms' ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'
            }`}
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className={`text-sm ${
              pathname === '/privacy' ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'
            }`}
          >
            Privacy
          </Link>
          <Link
            href="/about"
            className={`text-sm ${
              pathname === '/about' ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'
            }`}
          >
            About
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-700 hover:text-blue-600"
          >
            Logout
          </button>
        </div>
      </div>
    </footer>
  )
}
