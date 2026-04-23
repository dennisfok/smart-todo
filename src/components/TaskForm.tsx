'use client'

import { useState, useEffect } from 'react'
import { Task, Importance, TaskStatus, Project } from '@/types'
import { X, AlertTriangle, Clock } from 'lucide-react'
import { format } from 'date-fns'

interface Props {
  task?: Task | null
  parentId?: string | null
  projects?: Project[]
  onSave: (data: Partial<Task>) => void
  onClose: () => void
  conflictWarning?: {
    conflictingTasks: Task[]
    suggestedStart: string
    suggestedEnd: string
  } | null
  onAcceptSuggestion?: (start: string, end: string) => void
}

const IMPORTANCE_CONFIG: Record<Importance, { label: string; color: string }> = {
  asap: { label: '緊急', color: 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200' },
  high: { label: '高', color: 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200' },
  medium: { label: '中', color: 'bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200' },
  low: { label: '低', color: 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200' },
}

const STATUS_CONFIG: Record<TaskStatus, { label: string }> = {
  not_started: { label: '未開始' },
  in_progress: { label: '進行中' },
  completed: { label: '已完成' },
}

const DURATION_PRESETS = [
  { label: '15分', value: 15 },
  { label: '30分', value: 30 },
  { label: '1小時', value: 60 },
  { label: '2小時', value: 120 },
  { label: '半天', value: 240 },
  { label: '全天', value: 480 },
]

export default function TaskForm({ task, parentId, projects = [], onSave, onClose, conflictWarning, onAcceptSuggestion }: Props) {
  const [title, setTitle] = useState(task?.title || '')
  const [description, setDescription] = useState(task?.description || '')
  const [importance, setImportance] = useState<Importance>(task?.importance || 'medium')
  const [status, setStatus] = useState<TaskStatus>(task?.status || 'not_started')
  const [durationMinutes, setDurationMinutes] = useState(task?.duration_minutes || 60)
  const [startTime, setStartTime] = useState(
    task?.start_time ? format(new Date(task.start_time), "yyyy-MM-dd'T'HH:mm") : ''
  )
  const [endTime, setEndTime] = useState(
    task?.end_time ? format(new Date(task.end_time), "yyyy-MM-dd'T'HH:mm") : ''
  )
  const [deadline, setDeadline] = useState(
    task?.deadline ? format(new Date(task.deadline), "yyyy-MM-dd'T'HH:mm") : ''
  )
  const [isFixed, setIsFixed] = useState(task?.is_fixed || false)
  const [projectId, setProjectId] = useState(task?.project_id || '')

  // Auto-compute end time from start + duration
  useEffect(() => {
    if (startTime && durationMinutes && !task?.end_time) {
      const start = new Date(startTime)
      const end = new Date(start.getTime() + durationMinutes * 60000)
      setEndTime(format(end, "yyyy-MM-dd'T'HH:mm"))
    }
  }, [startTime, durationMinutes])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      importance,
      status,
      duration_minutes: durationMinutes,
      start_time: startTime ? new Date(startTime).toISOString() : null,
      end_time: endTime ? new Date(endTime).toISOString() : null,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      is_fixed: isFixed,
      project_id: projectId || null,
      parent_id: parentId || task?.parent_id || null,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">
            {task ? '編輯任務' : parentId ? '新增子任務' : '新增任務'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conflict Warning */}
        {conflictWarning && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">時間衝突</p>
                <p className="text-xs text-amber-600 mt-1">
                  與 <strong>{conflictWarning.conflictingTasks.map(t => t.title).join(', ')}</strong> 有衝突
                </p>
                <p className="text-xs text-amber-600">
                  建議時間：{format(new Date(conflictWarning.suggestedStart), 'MM/dd HH:mm')} - {format(new Date(conflictWarning.suggestedEnd), 'HH:mm')}
                </p>
                <button
                  type="button"
                  onClick={() => onAcceptSuggestion?.(conflictWarning.suggestedStart, conflictWarning.suggestedEnd)}
                  className="mt-2 text-xs bg-amber-500 text-white px-3 py-1 rounded-lg hover:bg-amber-600"
                >
                  接受建議時間
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">任務名稱 *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="輸入任務名稱..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述（選填）</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="輸入備注..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Priority + Status row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Importance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">優先級</label>
              <div className="grid grid-cols-2 gap-1">
                {(Object.entries(IMPORTANCE_CONFIG) as [Importance, typeof IMPORTANCE_CONFIG.high][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setImportance(key)}
                    className={`py-1.5 text-xs border rounded-lg transition-colors ${
                      importance === key ? cfg.color + ' font-semibold' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">狀態</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {(Object.entries(STATUS_CONFIG) as [TaskStatus, { label: string }][]).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              預計時長
            </label>
            <div className="flex gap-2 flex-wrap">
              {DURATION_PRESETS.map(preset => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setDurationMinutes(preset.value)}
                  className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                    durationMinutes === preset.value
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              <input
                type="number"
                min="5"
                max="480"
                value={durationMinutes}
                onChange={e => setDurationMinutes(Number(e.target.value))}
                className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="分鐘"
              />
            </div>
          </div>

          {/* Project */}
          {projects.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">所屬項目</label>
              <select
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">無項目</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Deadline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">截止日期（選填）</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">開始時間</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">結束時間</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Fixed toggle */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="isFixed"
              checked={isFixed}
              onChange={e => setIsFixed(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <div>
              <label htmlFor="isFixed" className="text-sm font-medium text-gray-700 cursor-pointer">
                固定時間（不可自動移動）
              </label>
              <p className="text-xs text-gray-400">勾選後，智能排程不會移動此任務</p>
            </div>
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
              {task ? '儲存' : '新增'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
