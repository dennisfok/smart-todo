'use client'

import { useState, useEffect } from 'react'
import { Leave, LeaveType, LeaveStatus } from '@/types'
import { X } from 'lucide-react'
import { differenceInCalendarDays, parseISO, addDays, format } from 'date-fns'

interface Props {
  leave?: Leave | null
  onSave: (data: Partial<Leave>) => void
  onClose: () => void
}

const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: 'annual', label: '年假' },
  { value: 'sick', label: '病假' },
  { value: 'compensation', label: '補假' },
  { value: 'unpaid', label: '無薪假' },
  { value: 'other', label: '其他' },
]

const STATUSES: { value: LeaveStatus; label: string }[] = [
  { value: 'pending', label: '待批' },
  { value: 'approved', label: '已批准' },
  { value: 'rejected', label: '已拒絕' },
]

export default function LeaveForm({ leave, onSave, onClose }: Props) {
  const today = format(new Date(), 'yyyy-MM-dd')

  const [leaveType, setLeaveType] = useState<LeaveType>(leave?.leave_type || 'annual')
  const [startDate, setStartDate] = useState(leave?.start_date || today)
  const [endDate, setEndDate] = useState(leave?.end_date || today)
  const [status, setStatus] = useState<LeaveStatus>(leave?.status || 'pending')
  const [notes, setNotes] = useState(leave?.notes || '')

  const days = startDate && endDate
    ? Math.max(1, differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1)
    : 1

  useEffect(() => {
    if (startDate && endDate && parseISO(endDate) < parseISO(startDate)) {
      setEndDate(startDate)
    }
  }, [startDate, endDate])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      days,
      status,
      notes: notes || undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {leave ? '編輯假期' : '新增假期'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Leave type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">假期類型</label>
            <div className="flex gap-2 flex-wrap">
              {LEAVE_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLeaveType(value)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    leaveType === value
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">開始日期</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">結束日期</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={e => setEndDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Days badge */}
          <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-lg">
            <span className="text-sm text-indigo-700 font-medium">共 {days} 天</span>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">狀態</label>
            <div className="flex gap-2">
              {STATUSES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatus(value)}
                  className={`flex-1 py-1.5 rounded-lg text-sm border transition-colors ${
                    status === value
                      ? value === 'approved' ? 'bg-green-600 text-white border-green-600'
                        : value === 'rejected' ? 'bg-red-500 text-white border-red-500'
                        : 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">備注（選填）</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="例如：醫生證明、補假原因..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              {leave ? '儲存' : '新增'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
