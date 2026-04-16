'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Task } from '@/types'
import Sidebar from '@/components/Sidebar'
import CalendarView from '@/components/CalendarView'
import TaskForm from '@/components/TaskForm'
import { RefreshCw } from 'lucide-react'

export default function CalendarPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [tasks, setTasks] = useState<Task[]>([])
  const [googleEvents, setGoogleEvents] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status, router])

  const fetchData = useCallback(async () => {
    const [tasksRes, gcalRes] = await Promise.all([
      fetch('/api/tasks'),
      fetch('/api/calendar'),
    ])
    if (tasksRes.ok) setTasks(await tasksRes.json())
    if (gcalRes.ok) setGoogleEvents(await gcalRes.json())
  }, [])

  useEffect(() => {
    if (session) fetchData()
  }, [session, fetchData])

  const handleRefresh = async () => {
    setSyncing(true)
    await fetchData()
    setSyncing(false)
  }

  const handleDateClick = (dateStr: string) => {
    setSelectedDate(dateStr)
    setShowForm(true)
  }

  const handleSave = async (data: Partial<Task>) => {
    const body = selectedDate
      ? { ...data, start_time: selectedDate + 'T09:00:00', end_time: selectedDate + 'T10:00:00' }
      : data

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const task = await res.json()
      if (task.start_time) {
        await fetch('/api/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: task.id }),
        })
      }
      setShowForm(false)
      fetchData()
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <main className="ml-64 flex-1 overflow-y-auto">
        <div className="px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">行事曆</h1>
              <p className="text-sm text-gray-500 mt-1">點擊日期可新增任務，紫色為 Google Calendar 事件</p>
            </div>
            <button
              onClick={handleRefresh}
              className={`flex items-center gap-2 text-sm text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors ${syncing ? 'opacity-50' : ''}`}
              disabled={syncing}
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              同步 Google Calendar
            </button>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-red-400 inline-block" /> 高重要
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-yellow-400 inline-block" /> 中重要
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-green-400 inline-block" /> 低重要
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-violet-400 inline-block" /> Google Calendar
            </div>
          </div>

          {/* Calendar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <CalendarView
              tasks={tasks}
              googleEvents={googleEvents}
              onDateClick={handleDateClick}
            />
          </div>
        </div>
      </main>

      {showForm && (
        <TaskForm
          onSave={handleSave}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
