'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Task } from '@/types'
import Sidebar from '@/components/Sidebar'
import {
  BarChart2,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  AlertCircle,
  Circle,
} from 'lucide-react'
import { format, parseISO, isToday } from 'date-fns'
import { zhTW } from 'date-fns/locale'

interface DailyReportData {
  date: string
  scheduled: Task[]
  scheduledCompleted: Task[]
  scheduledPending: Task[]
  extraCompleted: Task[]
  allCompleted: Task[]
  stats: {
    scheduledTotal: number
    scheduledDone: number
    extraDone: number
    totalDone: number
    pendingCount: number
  }
}

const IMPORTANCE_LABEL: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

const IMPORTANCE_COLOR: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-green-100 text-green-700 border-green-200',
}

function formatTime(iso: string | null | undefined) {
  if (!iso) return '—'
  return format(parseISO(iso), 'HH:mm')
}

function formatDuration(start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) return null
  const mins = (parseISO(end).getTime() - parseISO(start).getTime()) / 60000
  if (mins < 60) return `${mins}分鐘`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}小時${m}分` : `${h}小時`
}

function TaskRow({ task, showTime = true }: { task: Task; showTime?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-3">
      {task.is_completed ? (
        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
      ) : (
        <Circle className="w-5 h-5 text-gray-300 shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium ${task.is_completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
            {task.title}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full border ${IMPORTANCE_COLOR[task.importance]}`}>
            {IMPORTANCE_LABEL[task.importance]}
          </span>
        </div>
        {showTime && task.start_time && (
          <p className="text-xs text-gray-400 mt-0.5">
            {formatTime(task.start_time)}
            {task.end_time && ` – ${formatTime(task.end_time)}`}
            {task.end_time && ` · ${formatDuration(task.start_time, task.end_time)}`}
          </p>
        )}
        {task.description && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">{task.description}</p>
        )}
      </div>
    </div>
  )
}

export default function DailyReportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [report, setReport] = useState<DailyReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status, router])

  const fetchReport = useCallback(async (date: Date) => {
    setLoading(true)
    const dateStr = date.toISOString().split('T')[0]
    const res = await fetch(`/api/daily-report?date=${dateStr}`)
    if (res.ok) {
      setReport(await res.json())
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (session) fetchReport(selectedDate)
  }, [session, selectedDate, fetchReport])

  const goDay = (delta: number) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + delta)
    setSelectedDate(d)
  }

  const generateReportText = () => {
    if (!report) return ''
    const dateLabel = format(parseISO(report.date), 'yyyy年M月d日 (EEEE)', { locale: zhTW })
    const lines: string[] = [
      `📋 每日工作匯報 — ${dateLabel}`,
      '',
      `📊 統計：已完成 ${report.stats.totalDone} 項 | 排程 ${report.stats.scheduledTotal} 項 | 待辦 ${report.stats.pendingCount} 項`,
      '',
    ]

    if (report.scheduled.length > 0) {
      lines.push('🗓 今日排程')
      report.scheduled.forEach(t => {
        const time = t.start_time ? `[${formatTime(t.start_time)}${t.end_time ? `–${formatTime(t.end_time)}` : ''}] ` : ''
        const status = t.is_completed ? '✅' : '⏳'
        lines.push(`  ${status} ${time}${t.title}`)
      })
      lines.push('')
    }

    if (report.extraCompleted.length > 0) {
      lines.push('✅ 額外完成（非排程）')
      report.extraCompleted.forEach(t => {
        lines.push(`  ✅ ${t.title}`)
      })
      lines.push('')
    }

    if (report.stats.pendingCount > 0) {
      lines.push('⏳ 未完成')
      report.scheduledPending.forEach(t => {
        const time = t.start_time ? `[${formatTime(t.start_time)}] ` : ''
        lines.push(`  ⏳ ${time}${t.title}`)
      })
      lines.push('')
    }

    return lines.join('\n')
  }

  const handleCopy = async () => {
    const text = generateReportText()
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isViewingToday = isToday(selectedDate)
  const dateLabel = isViewingToday
    ? '今天'
    : format(selectedDate, 'M月d日 EEEE', { locale: zhTW })

  const completionRate = report
    ? report.stats.scheduledTotal > 0
      ? Math.round((report.stats.scheduledDone / report.stats.scheduledTotal) * 100)
      : report.stats.totalDone > 0 ? 100 : 0
    : 0

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
        <div className="max-w-2xl mx-auto px-6 py-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <BarChart2 className="w-6 h-6 text-indigo-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">每日工作匯報</h1>
                <p className="text-sm text-gray-500">追蹤你今天做咗啲咩</p>
              </div>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-600"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? '已複製' : '複製匯報'}
            </button>
          </div>

          {/* Date nav */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => goDay(-1)}
              className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </button>
            <div className="text-center">
              <span className="text-lg font-semibold text-gray-900">{dateLabel}</span>
              {!isViewingToday && (
                <button
                  onClick={() => setSelectedDate(new Date())}
                  className="ml-2 text-xs text-indigo-600 hover:underline"
                >
                  返回今天
                </button>
              )}
            </div>
            <button
              onClick={() => goDay(1)}
              disabled={isViewingToday}
              className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent" />
            </div>
          ) : report ? (
            <>
              {/* Stats cards */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                  <p className="text-3xl font-bold text-indigo-600">{report.stats.totalDone}</p>
                  <p className="text-xs text-gray-500 mt-1">已完成任務</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                  <p className="text-3xl font-bold text-amber-500">{report.stats.pendingCount}</p>
                  <p className="text-xs text-gray-500 mt-1">未完成排程</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                  <p className="text-3xl font-bold text-green-600">{completionRate}%</p>
                  <p className="text-xs text-gray-500 mt-1">排程完成率</p>
                </div>
              </div>

              {/* Progress bar */}
              {report.stats.scheduledTotal > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">今日排程進度</span>
                    <span className="text-sm text-gray-500">
                      {report.stats.scheduledDone} / {report.stats.scheduledTotal}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Today's schedule timeline */}
              {report.scheduled.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-4">
                  <div className="flex items-center gap-2 px-4 pt-4 pb-2 border-b border-gray-50">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    <h2 className="text-sm font-semibold text-gray-700">今日排程</h2>
                  </div>
                  <div className="px-4 divide-y divide-gray-50">
                    {report.scheduled.map(task => (
                      <TaskRow key={task.id} task={task} showTime />
                    ))}
                  </div>
                </div>
              )}

              {/* Extra completed (no schedule) */}
              {report.extraCompleted.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-4">
                  <div className="flex items-center gap-2 px-4 pt-4 pb-2 border-b border-gray-50">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <h2 className="text-sm font-semibold text-gray-700">額外完成（非排程）</h2>
                  </div>
                  <div className="px-4 divide-y divide-gray-50">
                    {report.extraCompleted.map(task => (
                      <TaskRow key={task.id} task={task} showTime={false} />
                    ))}
                  </div>
                </div>
              )}

              {/* Pending scheduled */}
              {report.scheduledPending.length > 0 && (
                <div className="bg-white rounded-xl border border-orange-100 shadow-sm mb-4">
                  <div className="flex items-center gap-2 px-4 pt-4 pb-2 border-b border-orange-50">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <h2 className="text-sm font-semibold text-gray-700">未完成排程任務</h2>
                  </div>
                  <div className="px-4 divide-y divide-gray-50">
                    {report.scheduledPending.map(task => (
                      <TaskRow key={task.id} task={task} showTime />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {report.scheduled.length === 0 && report.allCompleted.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <BarChart2 className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-400 text-sm">今天暫時沒有任何記錄</p>
                  <p className="text-gray-300 text-xs mt-1">去任務清單新增有時間嘅任務，就會喺呢度出現</p>
                </div>
              )}
            </>
          ) : null}
        </div>
      </main>
    </div>
  )
}
