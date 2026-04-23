'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Task } from '@/types'
import Sidebar from '@/components/Sidebar'
import TaskForm from '@/components/TaskForm'
import { format, isToday, isPast } from 'date-fns'
import { Zap, Clock, CheckCircle2, Circle, CalendarDays, AlertCircle } from 'lucide-react'

const importanceColor: Record<string, string> = {
  asap: '#dc2626',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#22c55e',
}

const importanceLabel: Record<string, string> = {
  asap: '緊急',
  high: '高',
  medium: '中',
  low: '低',
}

function TimelineBlock({ task, onToggle, onEdit }: {
  task: Task
  onToggle: (id: string, done: boolean) => void
  onEdit: (task: Task) => void
}) {
  const start = task.start_time ? new Date(task.start_time) : null
  const end = task.end_time ? new Date(task.end_time) : null
  const color = importanceColor[task.importance]

  return (
    <div
      className={`flex gap-3 p-3 rounded-xl border transition-all cursor-pointer hover:shadow-sm ${
        task.is_completed ? 'opacity-50 bg-gray-50 border-gray-100' : 'bg-white border-gray-200'
      }`}
      onClick={() => onEdit(task)}
    >
      <button
        onClick={e => { e.stopPropagation(); onToggle(task.id, !task.is_completed) }}
        className="mt-0.5 shrink-0"
      >
        {task.is_completed
          ? <CheckCircle2 className="w-5 h-5 text-indigo-500" />
          : <Circle className="w-5 h-5 text-gray-300 hover:text-indigo-400" />
        }
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className={`text-sm font-medium text-gray-800 ${task.is_completed ? 'line-through' : ''}`}>
            {task.title}
          </span>
          {task.project && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-md font-medium"
              style={{ backgroundColor: task.project.color + '22', color: task.project.color }}
            >
              {task.project.name}
            </span>
          )}
        </div>

        {task.description && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{task.description}</p>
        )}

        <div className="flex items-center gap-3 mt-1">
          {start && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              {format(start, 'HH:mm')}{end && ` → ${format(end, 'HH:mm')}`}
            </span>
          )}
          {task.deadline && !task.is_completed && (
            <span className={`flex items-center gap-0.5 text-xs ${
              isPast(new Date(task.deadline)) ? 'text-red-500' : 'text-orange-500'
            }`}>
              <AlertCircle className="w-3 h-3" />
              截止 {format(new Date(task.deadline), 'HH:mm')}
            </span>
          )}
        </div>
      </div>

      <div className="text-xs text-right shrink-0">
        <span
          className="px-1.5 py-0.5 rounded text-white text-xs"
          style={{ backgroundColor: color }}
        >
          {importanceLabel[task.importance]}
        </span>
        {task.duration_minutes && (
          <p className="text-gray-400 mt-1">
            {task.duration_minutes >= 60
              ? `${Math.floor(task.duration_minutes / 60)}h${task.duration_minutes % 60 ? `${task.duration_minutes % 60}m` : ''}`
              : `${task.duration_minutes}m`}
          </p>
        )}
      </div>
    </div>
  )
}

export default function TodayPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [scheduling, setScheduling] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [scheduleResult, setScheduleResult] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status, router])

  const fetchData = useCallback(async () => {
    const [tasksRes, projRes] = await Promise.all([
      fetch('/api/tasks'),
      fetch('/api/projects'),
    ])
    if (tasksRes.ok) setTasks(await tasksRes.json())
    if (projRes.ok) setProjects(await projRes.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    if (session) fetchData()
  }, [session, fetchData])

  const allFlat = (ts: Task[]): Task[] =>
    ts.flatMap(t => [t, ...(t.subtasks ? allFlat(t.subtasks) : [])])

  const flat = allFlat(tasks)

  const todayScheduled = flat
    .filter(t => t.start_time && isToday(new Date(t.start_time)))
    .sort((a, b) => new Date(a.start_time!).getTime() - new Date(b.start_time!).getTime())

  const todayDeadline = flat.filter(t =>
    !t.is_completed && t.deadline && isToday(new Date(t.deadline)) && !t.start_time
  )

  const unscheduled = flat.filter(t =>
    !t.is_completed && !t.start_time && !t.parent_id && !todayDeadline.includes(t)
  )

  const overdue = flat.filter(t =>
    !t.is_completed && t.deadline && isPast(new Date(t.deadline)) && !isToday(new Date(t.deadline))
  )

  const completedToday = todayScheduled.filter(t => t.is_completed).length
  const totalToday = todayScheduled.length

  const handleToggle = async (id: string, completed: boolean) => {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_completed: completed, status: completed ? 'completed' : 'not_started' }),
    })
    fetchData()
  }

  const handleAutoSchedule = async () => {
    setScheduling(true)
    setScheduleResult(null)
    const res = await fetch('/api/auto-schedule', { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setScheduleResult(`已自動排程 ${data.scheduled} 個任務`)
      fetchData()
    }
    setScheduling(false)
  }

  const handleSave = async (data: Partial<Task>) => {
    if (editingTask) {
      await fetch(`/api/tasks/${editingTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    }
    setShowForm(false)
    setEditingTask(null)
    fetchData()
  }

  const openEdit = (task: Task) => {
    setEditingTask(task)
    setShowForm(true)
  }

  const today = new Date()

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

      <main className="ml-64 flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-gray-500">{format(today, 'yyyy年M月d日 EEEE')}</p>
              <h1 className="text-2xl font-bold text-gray-900">今日排程</h1>
              {totalToday > 0 && (
                <p className="text-sm text-gray-500 mt-1">{completedToday}/{totalToday} 已完成</p>
              )}
            </div>
            <button
              onClick={handleAutoSchedule}
              disabled={scheduling}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-60"
            >
              <Zap className={`w-4 h-4 ${scheduling ? 'animate-pulse' : ''}`} />
              {scheduling ? '排程中...' : 'AI 自動排程'}
            </button>
          </div>

          {scheduleResult && (
            <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-sm text-indigo-700 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              {scheduleResult}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overdue */}
              {overdue.length > 0 && (
                <section>
                  <h2 className="text-sm font-semibold text-red-500 mb-2 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> 已逾期 ({overdue.length})
                  </h2>
                  <div className="space-y-2">
                    {overdue.map(t => (
                      <TimelineBlock key={t.id} task={t} onToggle={handleToggle} onEdit={openEdit} />
                    ))}
                  </div>
                </section>
              )}

              {/* Today's deadline tasks */}
              {todayDeadline.length > 0 && (
                <section>
                  <h2 className="text-sm font-semibold text-orange-500 mb-2 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> 今天截止 ({todayDeadline.length})
                  </h2>
                  <div className="space-y-2">
                    {todayDeadline.map(t => (
                      <TimelineBlock key={t.id} task={t} onToggle={handleToggle} onEdit={openEdit} />
                    ))}
                  </div>
                </section>
              )}

              {/* Scheduled today */}
              <section>
                <h2 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4" /> 今日時程
                  {totalToday > 0 && <span className="text-gray-400 font-normal">({totalToday})</span>}
                </h2>
                {todayScheduled.length === 0 ? (
                  <div className="text-center py-8 bg-white rounded-2xl border border-gray-100">
                    <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">今天沒有排程任務</p>
                    <button
                      onClick={handleAutoSchedule}
                      className="mt-3 text-xs text-indigo-600 hover:underline"
                    >
                      點擊「AI 自動排程」安排今日任務
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {todayScheduled.map(t => (
                      <TimelineBlock key={t.id} task={t} onToggle={handleToggle} onEdit={openEdit} />
                    ))}
                  </div>
                )}
              </section>

              {/* Unscheduled backlog */}
              {unscheduled.length > 0 && (
                <section>
                  <h2 className="text-sm font-semibold text-gray-500 mb-2">
                    待排程 ({unscheduled.length})
                  </h2>
                  <div className="space-y-2">
                    {unscheduled.slice(0, 5).map(t => (
                      <TimelineBlock key={t.id} task={t} onToggle={handleToggle} onEdit={openEdit} />
                    ))}
                    {unscheduled.length > 5 && (
                      <p className="text-xs text-center text-gray-400 py-2">
                        還有 {unscheduled.length - 5} 個待排程任務
                      </p>
                    )}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </main>

      {showForm && editingTask && (
        <TaskForm
          task={editingTask}
          projects={projects}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingTask(null) }}
        />
      )}
    </div>
  )
}
