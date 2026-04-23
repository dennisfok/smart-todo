'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Project } from '@/types'
import Sidebar from '@/components/Sidebar'
import { Plus, FolderOpen, Pencil, Trash2, X, Check } from 'lucide-react'
import Link from 'next/link'

const PROJECT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#06b6d4', '#64748b', '#78716c',
]

function ProjectModal({
  project,
  onSave,
  onClose,
}: {
  project?: Project | null
  onSave: (data: { name: string; color: string; description?: string }) => void
  onClose: () => void
}) {
  const [name, setName] = useState(project?.name || '')
  const [color, setColor] = useState(project?.color || '#6366f1')
  const [description, setDescription] = useState(project?.description || '')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {project ? '編輯項目' : '新增項目'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">項目名稱 *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="輸入項目名稱..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">顏色</label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述（選填）</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="輸入項目描述..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={() => name.trim() && onSave({ name: name.trim(), color, description: description.trim() || undefined })}
              disabled={!name.trim()}
              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {project ? '儲存' : '建立'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProjectsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [projects, setProjects] = useState<Project[]>([])
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status, router])

  const fetchData = useCallback(async () => {
    const [projRes, tasksRes] = await Promise.all([
      fetch('/api/projects'),
      fetch('/api/tasks'),
    ])
    if (projRes.ok) setProjects(await projRes.json())
    if (tasksRes.ok) {
      const tasks = await tasksRes.json()
      const counts: Record<string, number> = {}
      const countTasks = (ts: any[]) => {
        ts.forEach(t => {
          if (t.project_id) counts[t.project_id] = (counts[t.project_id] || 0) + 1
          if (t.subtasks) countTasks(t.subtasks)
        })
      }
      countTasks(tasks)
      setTaskCounts(counts)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (session) fetchData()
  }, [session, fetchData])

  const handleCreate = async (data: { name: string; color: string; description?: string }) => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      setShowModal(false)
      fetchData()
    }
  }

  const handleEdit = async (data: { name: string; color: string; description?: string }) => {
    if (!editingProject) return
    const res = await fetch(`/api/projects/${editingProject.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      setEditingProject(null)
      setShowModal(false)
      fetchData()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('刪除項目後，相關任務將不再屬於此項目。確定刪除？')) return
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    fetchData()
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
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">項目</h1>
              <p className="text-sm text-gray-500 mt-1">將任務分組管理</p>
            </div>
            <button
              onClick={() => { setEditingProject(null); setShowModal(true) }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              新增項目
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-400 text-sm">還沒有項目</p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-3 text-sm text-indigo-600 hover:underline"
              >
                建立第一個項目
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {projects.map(project => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow relative"
                >
                  {/* Color bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                    style={{ backgroundColor: project.color }}
                  />

                  <div className="flex items-start justify-between mt-1">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: project.color + '22' }}
                      >
                        <FolderOpen className="w-5 h-5" style={{ color: project.color }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm">{project.name}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {taskCounts[project.id] || 0} 個任務
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={e => { e.preventDefault(); setEditingProject(project); setShowModal(true) }}
                        className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-gray-50"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={e => { e.preventDefault(); handleDelete(project.id) }}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {project.description && (
                    <p className="text-xs text-gray-500 mt-3 line-clamp-2">{project.description}</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      {showModal && (
        <ProjectModal
          project={editingProject}
          onSave={editingProject ? handleEdit : handleCreate}
          onClose={() => { setShowModal(false); setEditingProject(null) }}
        />
      )}
    </div>
  )
}
