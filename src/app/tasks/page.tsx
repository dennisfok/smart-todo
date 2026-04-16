'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Task, Settings, SortOption } from '@/types'
import { sortTasks, detectAndResolveConflicts } from '@/lib/scheduler'
import Sidebar from '@/components/Sidebar'
import TaskItem from '@/components/TaskItem'
import TaskForm from '@/components/TaskForm'
import { Plus, SortAsc, Filter, CheckSquare } from 'lucide-react'

const DEFAULT_SETTINGS: Settings = {
  id: '',
  user_id: '',
  work_days: [1, 2, 3, 4, 5],
  work_start: '09:00',
  work_end: '18:00',
  google_calendar_id: 'primary',
  created_at: '',
  updated_at: '',
}

export default function TasksPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [tasks, setTasks] = useState<Task[]>([])
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [sortBy, setSortBy] = useState<SortOption>('importance')
  const [showCompleted, setShowCompleted] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [addingSubtaskFor, setAddingSubtaskFor] = useState<string | null>(null)
  const [conflictWarning, setConflictWarning] = useState<any>(null)
  const [pendingTaskData, setPendingTaskData] = useState<Partial<Task> | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterImportance, setFilterImportance] = useState<string>('all')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status, router])

  const fetchTasks = useCallback(async () => {
    const res = await fetch('/api/tasks')
    if (res.ok) {
      const data = await res.json()
      setTasks(data)
    }
    setLoading(false)
  }, [])

  const fetchSettings = useCallback(async () => {
    const res = await fetch('/api/settings')
    if (res.ok) {
      const data = await res.json()
      setSettings({ ...DEFAULT_SETTINGS, ...data })
    }
  }, [])

  useEffect(() => {
    if (session) {
      fetchTasks()
      fetchSettings()
    }
  }, [session, fetchTasks, fetchSettings])

  // Flatten all tasks (including subtasks) for conflict detection
  const allFlatTasks = (tasks: Task[]): Task[] => {
    return tasks.flatMap(t => [t, ...(t.subtasks ? allFlatTasks(t.subtasks) : [])])
  }

  const handleSave = async (data: Partial<Task>) => {
    // Check for conflicts if has time
    if (data.start_time && data.end_time && !data.is_fixed) {
      const flatTasks = allFlatTasks(tasks).filter(t => t.id !== editingTask?.id)
      const conflict = detectAndResolveConflicts(data, flatTasks, settings)
      if (conflict.hasConflict) {
        setConflictWarning(conflict)
        setPendingTaskData(data)
        return
      }
    }
    await saveTask(data)
  }

  const saveTask = async (data: Partial<Task>) => {
    setConflictWarning(null)
    setPendingTaskData(null)

    if (editingTask) {
      const res = await fetch(`/api/tasks/${editingTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        setEditingTask(null)
        setShowForm(false)
        fetchTasks()
      }
    } else {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, parent_id: addingSubtaskFor }),
      })
      if (res.ok) {
        setShowForm(false)
        setAddingSubtaskFor(null)
        fetchTasks()

        // Auto-sync to Google Calendar if has time
        if (data.start_time) {
          const task = await res.json()
          await fetch('/api/calendar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId: task.id }),
          })
          fetchTasks()
        }
      }
    }
  }

  const handleToggle = async (id: string, completed: boolean) => {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_completed: completed }),
    })
    fetchTasks()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此任務？')) return
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    fetchTasks()
  }

  const handleSyncCalendar = async (taskId: string) => {
    await fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId }),
    })
    fetchTasks()
  }

  const openEdit = (task: Task) => {
    setEditingTask(task)
    setAddingSubtaskFor(null)
    setConflictWarning(null)
    setShowForm(true)
  }

  const openNew = () => {
    setEditingTask(null)
    setAddingSubtaskFor(null)
    setConflictWarning(null)
    setShowForm(true)
  }

  const openSubtask = (parentId: string) => {
    setEditingTask(null)
    setAddingSubtaskFor(parentId)
    setConflictWarning(null)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingTask(null)
    setAddingSubtaskFor(null)
    setConflictWarning(null)
    setPendingTaskData(null)
  }

  // Filter + sort tasks
  const filteredTasks = tasks
    .filter(t => showCompleted ? true : !t.is_completed)
    .filter(t => filterImportance === 'all' ? true : t.importance === filterImportance)

  const sortedTasks = sortTasks(filteredTasks, sortBy)

  const completedCount = allFlatTasks(tasks).filter(t => t.is_completed).length
  const totalCount = allFlatTasks(tasks).length

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
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">任務清單</h1>
              <p className="text-sm text-gray-500 mt-1">
                {completedCount}/{totalCount} 已完成
              </p>
            </div>
            <button
              onClick={openNew}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              新增任務
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            {/* Sort */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
              <SortAsc className="w-4 h-4 text-gray-400" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortOption)}
                className="text-sm text-gray-700 bg-transparent outline-none"
              >
                <option value="importance">按重要性</option>
                <option value="date">按日期</option>
                <option value="created">按建立時間</option>
              </select>
            </div>

            {/* Importance filter */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterImportance}
                onChange={e => setFilterImportance(e.target.value)}
                className="text-sm text-gray-700 bg-transparent outline-none"
              >
                <option value="all">全部</option>
                <option value="high">高重要</option>
                <option value="medium">中重要</option>
                <option value="low">低重要</option>
              </select>
            </div>

            {/* Show completed toggle */}
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                showCompleted
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white border-gray-200 text-gray-600'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              {showCompleted ? '隱藏已完成' : '顯示已完成'}
            </button>
          </div>

          {/* Task list */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent" />
            </div>
          ) : sortedTasks.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckSquare className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-400 text-sm">
                {showCompleted ? '暫時沒有任務' : '所有任務已完成！'}
              </p>
              <button onClick={openNew} className="mt-3 text-sm text-indigo-600 hover:underline">
                新增第一個任務
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {sortedTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={handleToggle}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onAddSubtask={openSubtask}
                  onSyncCalendar={handleSyncCalendar}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Task Form Modal */}
      {showForm && (
        <TaskForm
          task={editingTask}
          parentId={addingSubtaskFor}
          onSave={handleSave}
          onClose={closeForm}
          conflictWarning={conflictWarning}
          onAcceptSuggestion={(start, end) => {
            if (pendingTaskData) {
              saveTask({ ...pendingTaskData, start_time: start, end_time: end })
            }
          }}
        />
      )}
    </div>
  )
}
