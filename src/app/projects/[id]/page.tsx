'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { Task, Project } from '@/types'
import { sortTasks, detectAndResolveConflicts } from '@/lib/scheduler'
import Sidebar from '@/components/Sidebar'
import TaskItem from '@/components/TaskItem'
import TaskForm from '@/components/TaskForm'
import { Plus, ChevronLeft, FolderOpen, CheckSquare } from 'lucide-react'
import Link from 'next/link'

const DEFAULT_SETTINGS = {
  id: '', user_id: '', work_days: [1,2,3,4,5],
  work_start: '09:00', work_end: '18:00',
  google_calendar_id: 'primary', created_at: '', updated_at: '',
}

export default function ProjectDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [addingSubtaskFor, setAddingSubtaskFor] = useState<string | null>(null)
  const [conflictWarning, setConflictWarning] = useState<any>(null)
  const [pendingTaskData, setPendingTaskData] = useState<Partial<Task> | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status, router])

  const fetchData = useCallback(async () => {
    const [projRes, allProjRes, tasksRes, settingsRes] = await Promise.all([
      fetch(`/api/projects/${projectId}`),
      fetch('/api/projects'),
      fetch('/api/tasks'),
      fetch('/api/settings'),
    ])
    if (!projRes.ok) { router.push('/projects'); return }
    setProject(await projRes.json())
    if (allProjRes.ok) setProjects(await allProjRes.json())
    if (tasksRes.ok) {
      const all = await tasksRes.json()
      // Filter to only tasks in this project
      const filterByProject = (ts: Task[]): Task[] =>
        ts
          .filter(t => t.project_id === projectId)
          .map(t => ({ ...t, subtasks: t.subtasks ? filterByProject(t.subtasks) : [] }))
      setTasks(filterByProject(all))
    }
    if (settingsRes.ok) {
      const s = await settingsRes.json()
      setSettings({ ...DEFAULT_SETTINGS, ...s })
    }
    setLoading(false)
  }, [projectId, router])

  useEffect(() => {
    if (session) fetchData()
  }, [session, fetchData])

  const allFlatTasks = (ts: Task[]): Task[] =>
    ts.flatMap(t => [t, ...(t.subtasks ? allFlatTasks(t.subtasks) : [])])

  const handleSave = async (data: Partial<Task>) => {
    if (data.start_time && data.end_time && !data.is_fixed) {
      const flat = allFlatTasks(tasks).filter(t => t.id !== editingTask?.id)
      const conflict = detectAndResolveConflicts(data, flat, settings as any)
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

    const body = { ...data, project_id: projectId }

    if (editingTask) {
      await fetch(`/api/tasks/${editingTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setEditingTask(null)
    } else {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, parent_id: addingSubtaskFor }),
      })
      setAddingSubtaskFor(null)
    }
    setShowForm(false)
    fetchData()
  }

  const handleToggle = async (id: string, completed: boolean) => {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_completed: completed, status: completed ? 'completed' : 'not_started' }),
    })
    fetchData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此任務？')) return
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    fetchData()
  }

  const handleSyncCalendar = async (taskId: string) => {
    await fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId }),
    })
    fetchData()
  }

  const flat = allFlatTasks(tasks)
  const completedCount = flat.filter(t => t.is_completed).length
  const totalCount = flat.length

  if (status === 'loading' || loading) {
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
          {/* Back link */}
          <Link href="/projects" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-5 w-fit">
            <ChevronLeft className="w-4 h-4" />
            所有項目
          </Link>

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {project && (
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: project.color + '22' }}
                >
                  <FolderOpen className="w-6 h-6" style={{ color: project.color }} />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{project?.name}</h1>
                <p className="text-sm text-gray-500 mt-0.5">{completedCount}/{totalCount} 已完成</p>
              </div>
            </div>
            <button
              onClick={() => { setEditingTask(null); setAddingSubtaskFor(null); setShowForm(true) }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              新增任務
            </button>
          </div>

          {project?.description && (
            <p className="text-sm text-gray-500 mb-5 bg-white rounded-xl border border-gray-100 p-4">
              {project.description}
            </p>
          )}

          {/* Task list */}
          {tasks.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckSquare className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-400 text-sm">此項目還沒有任務</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 text-sm text-indigo-600 hover:underline"
              >
                新增第一個任務
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {sortTasks(tasks, 'importance').map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={handleToggle}
                  onEdit={t => { setEditingTask(t); setShowForm(true) }}
                  onDelete={handleDelete}
                  onAddSubtask={id => { setAddingSubtaskFor(id); setEditingTask(null); setShowForm(true) }}
                  onSyncCalendar={handleSyncCalendar}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {showForm && (
        <TaskForm
          task={editingTask}
          parentId={addingSubtaskFor}
          projects={projects}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingTask(null); setAddingSubtaskFor(null); setConflictWarning(null); setPendingTaskData(null) }}
          conflictWarning={conflictWarning}
          onAcceptSuggestion={(start, end) => {
            if (pendingTaskData) saveTask({ ...pendingTaskData, start_time: start, end_time: end })
          }}
        />
      )}
    </div>
  )
}
