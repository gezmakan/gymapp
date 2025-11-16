'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Footer() {
  const pathname = usePathname()

  return (
    <footer className="bg-white border-t mt-auto">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
        <div className="flex items-center justify-center">
          <Link
            href="/exercises"
            className={`text-sm font-medium ${
              pathname === '/exercises' ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'
            }`}
          >
            Exercise List
          </Link>
        </div>
      </div>
    </footer>
  )
}
