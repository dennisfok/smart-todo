'use client'

import { useState } from 'react'
import { Task } from '@/types'
import {
  CheckCircle2, Circle, ChevronDown, ChevronRight,
  Clock, Pin, Pencil, Trash2, Plus, CalendarDays, AlertCircle
} from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'

interface Props {
  task: Task
  onToggle: (id: string, completed: boolean) => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onAddSubtask: (parentId: string) => void
  onSyncCalendar: (taskId: string) => void
  depth?: number
}

const importanceDot: Record<string, string> = {
  asap: 'bg-red-600',
  high: 'bg-orange-500',
  medium: 'bg-yellow-400',
  low: 'bg-green-400',
}

const importanceLabel: Record<string, string> = {
  asap: '緊急',
  high: '高',
  medium: '中',
  low: '低',
}

const statusBadge: Record<string, { label: string; cls: string }> = {
  not_started: { label: '未開始', cls: 'bg-gray-100 text-gray-500' },
  in_progress: { label: '進行中', cls: 'bg-blue-100 text-blue-600' },
  completed: { label: '已完成', cls: 'bg-green-100 text-green-600' },
}

function DeadlineBadge({ deadline }: { deadline: string }) {
  const date = new Date(deadline)
  const overdue = isPast(date) && !isToday(date)
  const dueToday = isToday(date)
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${
      overdue ? 'bg-red-100 text-red-600' : dueToday ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'
    }`}>
      <AlertCircle className="w-3 h-3" />
      {overdue ? '已逾期 ' : dueToday ? '今天截止 ' : '截止 '}
      {format(date, 'MM/dd')}
    </span>
  )
}

export default function TaskItem({
  task, onToggle, onEdit, onDelete, onAddSubtask, onSyncCalendar, depth = 0
}: Props) {
  const [expanded, setExpanded] = useState(true)
  const hasSubtasks = task.subtasks && task.subtasks.length > 0
  const sb = statusBadge[task.status || 'not_started']

  return (
    <div className={`${depth > 0 ? 'ml-6 border-l-2 border-gray-100 pl-4' : ''}`}>
      <div className={`group flex items-start gap-3 py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors ${
        task.is_completed ? 'opacity-50' : ''
      }`}>
        {/* Expand toggle */}
        {hasSubtasks ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-0.5 text-gray-400 hover:text-gray-600 shrink-0"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <div className="w-4 shrink-0" />
        )}

        {/* Checkbox */}
        <button
          onClick={() => onToggle(task.id, !task.is_completed)}
          className="mt-0.5 shrink-0 text-gray-400 hover:text-indigo-500 transition-colors"
        >
          {task.is_completed
            ? <CheckCircle2 className="w-5 h-5 text-indigo-500" />
            : <Circle className="w-5 h-5" />
          }
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Importance dot */}
            <span className={`w-2 h-2 rounded-full shrink-0 ${importanceDot[task.importance]}`} title={`優先級：${importanceLabel[task.importance]}`} />

            {/* Title */}
            <span className={`text-sm font-medium text-gray-800 ${task.is_completed ? 'line-through' : ''}`}>
              {task.title}
            </span>

            {/* Project badge */}
            {task.project && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                style={{ backgroundColor: task.project.color + '22', color: task.project.color }}
              >
                {task.project.name}
              </span>
            )}

            {/* Status badge */}
            {!task.is_completed && task.status !== 'not_started' && (
              <span className={`text-xs px-1.5 py-0.5 rounded-md ${sb.cls}`}>{sb.label}</span>
            )}

            {/* Fixed badge */}
            {task.is_fixed && (
              <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                <Pin className="w-3 h-3" /> 固定
              </span>
            )}

            {/* Google Calendar badge */}
            {task.google_event_id && (
              <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-md">已同步</span>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{task.description}</p>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {/* Scheduled time */}
            {task.start_time && (
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                <span>
                  {format(new Date(task.start_time), 'MM/dd HH:mm')}
                  {task.end_time && ` → ${format(new Date(task.end_time), 'HH:mm')}`}
                </span>
              </div>
            )}

            {/* Duration */}
            {!task.start_time && task.duration_minutes && (
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                <span>{task.duration_minutes >= 60
                  ? `${Math.floor(task.duration_minutes / 60)}h${task.duration_minutes % 60 ? ` ${task.duration_minutes % 60}m` : ''}`
                  : `${task.duration_minutes}m`
                }</span>
              </div>
            )}

            {/* Deadline */}
            {task.deadline && !task.is_completed && (
              <DeadlineBadge deadline={task.deadline} />
            )}

            {/* Subtask count */}
            {hasSubtasks && (
              <span className="text-xs text-gray-400">
                {task.subtasks!.filter(t => t.is_completed).length}/{task.subtasks!.length} 子任務
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => onAddSubtask(task.id)}
            className="p-1 text-gray-400 hover:text-indigo-500 rounded"
            title="新增子任務"
          >
            <Plus className="w-4 h-4" />
          </button>
          {task.start_time && !task.google_event_id && (
            <button
              onClick={() => onSyncCalendar(task.id)}
              className="p-1 text-gray-400 hover:text-green-500 rounded"
              title="同步到 Google Calendar"
            >
              <CalendarDays className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onEdit(task)}
            className="p-1 text-gray-400 hover:text-blue-500 rounded"
            title="編輯"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1 text-gray-400 hover:text-red-500 rounded"
            title="刪除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Subtasks */}
      {expanded && hasSubtasks && (
        <div>
          {task.subtasks!.map(sub => (
            <TaskItem
              key={sub.id}
              task={sub}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddSubtask={onAddSubtask}
              onSyncCalendar={onSyncCalendar}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
