'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Worker } from '@/types'
import Sidebar from '@/components/Sidebar'
import WorkerForm from '@/components/WorkerForm'
import {
  Plus, Users, Phone, Globe, CalendarDays,
  ChevronRight, AlertCircle, UserCheck, UserX
} from 'lucide-react'
import { format, differenceInDays, parseISO } from 'date-fns'

const DAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

function contractStatus(worker: Worker) {
  if (!worker.contract_end_date) return null
  const days = differenceInDays(parseISO(worker.contract_end_date), new Date())
  if (days < 0) return { label: '已到期', color: 'text-red-600 bg-red-50' }
  if (days <= 60) return { label: `${days} 天後到期`, color: 'text-amber-600 bg-amber-50' }
  return { label: `${days} 天後到期`, color: 'text-green-700 bg-green-50' }
}

export default function WorkersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status, router])

  const fetchWorkers = useCallback(async () => {
    const res = await fetch('/api/workers')
    if (res.ok) setWorkers(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    if (session) fetchWorkers()
  }, [session, fetchWorkers])

  const handleSave = async (data: Partial<Worker>) => {
    if (editingWorker) {
      await fetch(`/api/workers/${editingWorker.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    } else {
      await fetch('/api/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    }
    setShowForm(false)
    setEditingWorker(null)
    fetchWorkers()
  }

  const handleToggleActive = async (worker: Worker) => {
    await fetch(`/api/workers/${worker.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !worker.is_active }),
    })
    fetchWorkers()
  }

  const displayed = workers.filter(w => showInactive ? true : w.is_active)
  const activeCount = workers.filter(w => w.is_active).length

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
              <h1 className="text-2xl font-bold text-gray-900">傭工管理</h1>
              <p className="text-sm text-gray-500 mt-1">{activeCount} 位在職傭工</p>
            </div>
            <button
              onClick={() => { setEditingWorker(null); setShowForm(true) }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              新增傭工
            </button>
          </div>

          {/* Toggle inactive */}
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={() => setShowInactive(!showInactive)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                showInactive
                  ? 'bg-gray-100 border-gray-300 text-gray-700'
                  : 'bg-white border-gray-200 text-gray-500'
              }`}
            >
              {showInactive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
              {showInactive ? '顯示全部' : '只顯示在職'}
            </button>
          </div>

          {/* Worker list */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent" />
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-400 text-sm">未有傭工記錄</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 text-sm text-indigo-600 hover:underline"
              >
                新增第一位傭工
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {displayed.map(worker => {
                const status = contractStatus(worker)
                return (
                  <div
                    key={worker.id}
                    className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors group"
                  >
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-bold ${
                      worker.is_active ? 'bg-indigo-500' : 'bg-gray-300'
                    }`}>
                      {worker.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">{worker.name}</span>
                        {!worker.is_active && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">已離職</span>
                        )}
                        {status && (
                          <span className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5 ${status.color}`}>
                            {status.label.includes('已到期') && <AlertCircle className="w-3 h-3" />}
                            {status.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {worker.nationality && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Globe className="w-3 h-3" />{worker.nationality}
                          </span>
                        )}
                        {worker.phone && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Phone className="w-3 h-3" />{worker.phone}
                          </span>
                        )}
                        {worker.rest_day != null && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <CalendarDays className="w-3 h-3" />休息日：{DAY_LABELS[worker.rest_day]}
                          </span>
                        )}
                        {worker.start_date && (
                          <span className="text-xs text-gray-400">
                            入職：{format(parseISO(worker.start_date), 'yyyy/MM/dd')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => { setEditingWorker(worker); setShowForm(true) }}
                        className="text-xs text-gray-500 hover:text-indigo-600 px-2 py-1 rounded border border-gray-200 hover:border-indigo-300 transition-colors"
                      >
                        編輯
                      </button>
                      <button
                        onClick={() => handleToggleActive(worker)}
                        className="text-xs text-gray-500 hover:text-amber-600 px-2 py-1 rounded border border-gray-200 hover:border-amber-300 transition-colors"
                      >
                        {worker.is_active ? '設為離職' : '復職'}
                      </button>
                    </div>

                    {/* Navigate to detail */}
                    <button
                      onClick={() => router.push(`/workers/${worker.id}`)}
                      className="p-1 text-gray-300 hover:text-indigo-500 transition-colors shrink-0"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {showForm && (
        <WorkerForm
          worker={editingWorker}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingWorker(null) }}
        />
      )}
    </div>
  )
}
