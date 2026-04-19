'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { CheckSquare, Calendar, Settings, LogOut, Home, Users, Package } from 'lucide-react'

const navGroups = [
  {
    label: '家居管理',
    items: [
      { href: '/inventory', icon: Package, label: '家居存貨' },
      { href: '/tasks', icon: CheckSquare, label: '家務任務' },
      { href: '/calendar', icon: Calendar, label: '行事曆' },
    ],
  },
  {
    label: '傭工管理',
    items: [
      { href: '/workers', icon: Users, label: '傭工資料' },
    ],
  },
  {
    label: '系統',
    items: [
      { href: '/settings', icon: Settings, label: '設定' },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-screen fixed left-0 top-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Home className="w-6 h-6 text-indigo-400" />
          <span className="text-lg font-bold">家居管家</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">僱主家居管理系統</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-5 overflow-y-auto">
        {navGroups.map(group => (
          <div key={group.label}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-1">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ href, icon: Icon, label }) => {
                const active = pathname.startsWith(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="px-4 py-4 border-t border-gray-700">
        {session?.user && (
          <div className="flex items-center gap-3 mb-3">
            {session.user.image && (
              <img
                src={session.user.image}
                alt="avatar"
                className="w-8 h-8 rounded-full"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{session.user.name}</p>
              <p className="text-xs text-gray-400 truncate">{session.user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors w-full px-2 py-1.5 rounded-lg hover:bg-gray-800"
        >
          <LogOut className="w-4 h-4" />
          登出
        </button>
      </div>
    </aside>
  )
}
