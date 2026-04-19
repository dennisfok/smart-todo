'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { Worker, Leave, LeaveType, LeaveStatus } from '@/types'
import Sidebar from '@/components/Sidebar'
import WorkerForm from '@/components/WorkerForm'
import LeaveForm from '@/components/LeaveForm'
import {
  ArrowLeft, Phone, Mail, Globe, Building2,
  CalendarDays, CreditCard, FileText, AlertCircle,
  Plus, CheckCircle2, XCircle, Clock, Pencil, Trash2
} from 'lucide-react'
import { format, differenceInDays, parseISO } from 'date-fns'

const DAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

const leaveTypeLabel: Record<LeaveType, string> = {
  annual: '年假',
  sick: '病假',
  compensation: '補假',
  unpaid: '無薪假',
  other: '其他',
}

const leaveTypeColor: Record<LeaveType, string> = {
  annual: 'bg-blue-100 text-blue-700',
  sick: 'bg-red-100 text-red-700',
  compensation: 'bg-purple-100 text-purple-700',
  unpaid: 'bg-gray-100 text-gray-700',
  other: 'bg-yellow-100 text-yellow-700',
}

const statusIcon: Record<LeaveStatus, React.ReactNode> = {
  pending: <Clock className="w-3.5 h-3.5 text-amber-500" />,
  approved: <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />,
  rejected: <XCircle className="w-3.5 h-3.5 text-red-500" />,
}

const statusLabel: Record<LeaveStatus, string> = {
  pending: '待批',
  approved: '已批准',
  rejected: '已拒絕',
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-gray-800">{value}</p>
      </div>
    </div>
  )
}

export default function WorkerDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const workerId = params.id as string

  const [worker, setWorker] = useState<Worker | null>(null)
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [loading, setLoading] = useState(true)
  const [showWorkerForm, setShowWorkerForm] = useState(false)
  const [showLeaveForm, setShowLeaveForm] = useState(false)
  const [editingLeave, setEditingLeave] = useState<Leave | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status, router])

  const fetchWorker = useCallback(async () => {
    const res = await fetch(`/api/workers/${workerId}`)
    if (res.ok) setWorker(await res.json())
    else router.push('/workers')
  }, [workerId, router])

  const fetchLeaves = useCallback(async () => {
    const res = await fetch(`/api/workers/${workerId}/leaves`)
    if (res.ok) setLeaves(await res.json())
    setLoading(false)
  }, [workerId])

  useEffect(() => {
    if (session) {
      fetchWorker()
      fetchLeaves()
    }
  }, [session, fetchWorker, fetchLeaves])

  const handleWorkerSave = async (data: Partial<Worker>) => {
    await fetch(`/api/workers/${workerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setShowWorkerForm(false)
    fetchWorker()
  }

  const handleLeaveSave = async (data: Partial<Leave>) => {
    if (editingLeave) {
      await fetch(`/api/leaves/${editingLeave.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    } else {
      await fetch(`/api/workers/${workerId}/leaves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    }
    setShowLeaveForm(false)
    setEditingLeave(null)
    fetchLeaves()
  }

  const handleLeaveStatusChange = async (leave: Leave, newStatus: LeaveStatus) => {
    await fetch(`/api/leaves/${leave.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    fetchLeaves()
  }

  const handleLeaveDelete = async (leave: Leave) => {
    if (!confirm('確定刪除此假期記錄？')) return
    await fetch(`/api/leaves/${leave.id}`, { method: 'DELETE' })
    fetchLeaves()
  }

  const totalApprovedLeaves = leaves
    .filter(l => l.status === 'approved')
    .reduce((sum, l) => sum + l.days, 0)

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  if (!worker) return null

  const contractDaysLeft = worker.contract_end_date
    ? differenceInDays(parseISO(worker.contract_end_date), new Date())
    : null

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <main className="ml-64 flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Back */}
          <button
            onClick={() => router.push('/workers')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            返回傭工列表
          </button>

          {/* Worker header */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold ${
                  worker.is_active ? 'bg-indigo-500' : 'bg-gray-300'
                }`}>
                  {worker.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{worker.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    {!worker.is_active && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">已離職</span>
                    )}
                    {contractDaysLeft != null && (
                      <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        contractDaysLeft < 0 ? 'bg-red-50 text-red-600' :
                        contractDaysLeft <= 60 ? 'bg-amber-50 text-amber-600' :
                        'bg-green-50 text-green-700'
                      }`}>
                        {contractDaysLeft < 0 && <AlertCircle className="w-3 h-3" />}
                        合約{contractDaysLeft < 0 ? `已到期 ${Math.abs(contractDaysLeft)} 天` : `剩 ${contractDaysLeft} 天`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowWorkerForm(true)}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 border border-gray-200 hover:border-indigo-300 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                編輯
              </button>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-4 mt-5">
              <InfoRow icon={Globe} label="國籍" value={worker.nationality} />
              <InfoRow icon={Phone} label="電話" value={worker.phone} />
              <InfoRow icon={Mail} label="電郵" value={worker.email} />
              <InfoRow
                icon={CalendarDays}
                label="休息日"
                value={worker.rest_day != null ? `每週${DAY_LABELS[worker.rest_day]}` : null}
              />
              <InfoRow
                icon={CreditCard}
                label="月薪"
                value={worker.salary ? `HK$${worker.salary.toLocaleString()}` : null}
              />
              <InfoRow icon={Building2} label="職業介紹所" value={worker.agency_name} />
              <InfoRow
                icon={CalendarDays}
                label="入職日期"
                value={worker.start_date ? format(parseISO(worker.start_date), 'yyyy/MM/dd') : null}
              />
              <InfoRow
                icon={CalendarDays}
                label="合約到期"
                value={worker.contract_end_date ? format(parseISO(worker.contract_end_date), 'yyyy/MM/dd') : null}
              />
              <InfoRow icon={FileText} label="護照號碼" value={worker.passport_no} />
              <InfoRow
                icon={AlertCircle}
                label="簽證到期"
                value={worker.visa_expiry ? format(parseISO(worker.visa_expiry), 'yyyy/MM/dd') : null}
              />
            </div>

            {worker.notes && (
              <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-400 mb-1">備注</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{worker.notes}</p>
              </div>
            )}
          </div>

          {/* Leave section */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">假期記錄</h2>
                <p className="text-xs text-gray-400 mt-0.5">已批准：{totalApprovedLeaves} 天</p>
              </div>
              <button
                onClick={() => { setEditingLeave(null); setShowLeaveForm(true) }}
                className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                新增假期
              </button>
            </div>

            {leaves.length === 0 ? (
              <div className="text-center py-8">
                <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">未有假期記錄</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaves.map(leave => (
                  <div key={leave.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${leaveTypeColor[leave.leave_type]}`}>
                          {leaveTypeLabel[leave.leave_type]}
                        </span>
                        <span className="text-sm text-gray-800">
                          {format(parseISO(leave.start_date), 'yyyy/MM/dd')}
                          {leave.start_date !== leave.end_date && ` → ${format(parseISO(leave.end_date), 'MM/dd')}`}
                        </span>
                        <span className="text-xs text-gray-400">{leave.days} 天</span>
                      </div>
                      {leave.notes && (
                        <p className="text-xs text-gray-400 mt-0.5">{leave.notes}</p>
                      )}
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {statusIcon[leave.status]}
                      <span className="text-xs text-gray-500">{statusLabel[leave.status]}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {leave.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleLeaveStatusChange(leave, 'approved')}
                            className="text-xs text-green-600 hover:text-green-700 border border-green-200 hover:border-green-400 px-2 py-0.5 rounded"
                          >
                            批准
                          </button>
                          <button
                            onClick={() => handleLeaveStatusChange(leave, 'rejected')}
                            className="text-xs text-red-600 hover:text-red-700 border border-red-200 hover:border-red-400 px-2 py-0.5 rounded"
                          >
                            拒絕
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => { setEditingLeave(leave); setShowLeaveForm(true) }}
                        className="p-1 text-gray-400 hover:text-blue-500 rounded"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleLeaveDelete(leave)}
                        className="p-1 text-gray-400 hover:text-red-500 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {showWorkerForm && (
        <WorkerForm
          worker={worker}
          onSave={handleWorkerSave}
          onClose={() => setShowWorkerForm(false)}
        />
      )}

      {showLeaveForm && (
        <LeaveForm
          leave={editingLeave}
          onSave={handleLeaveSave}
          onClose={() => { setShowLeaveForm(false); setEditingLeave(null) }}
        />
      )}
    </div>
  )
}
