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
        <div className="flex items-center justify-between">
          <Link
            href="/exercises"
            className={`text-sm font-medium ${
              pathname === '/exercises' ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'
            }`}
          >
            Exercise List
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Logout</span>
          </Button>
        </div>
      </div>
    </footer>
  )
}
