'use client'

import { useState } from 'react'
import { Task } from '@/types'
import {
  CheckCircle2, Circle, ChevronDown, ChevronRight,
  Clock, Pin, PinOff, Pencil, Trash2, Plus, CalendarDays
} from 'lucide-react'
import { format } from 'date-fns'

interface Props {
  task: Task
  onToggle: (id: string, completed: boolean) => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onAddSubtask: (parentId: string) => void
  onSyncCalendar: (taskId: string) => void
  depth?: number
}

const importanceDot = {
  high: 'bg-red-500',
  medium: 'bg-yellow-400',
  low: 'bg-green-400',
}

const importanceLabel = {
  high: '高',
  medium: '中',
  low: '低',
}

export default function TaskItem({
  task, onToggle, onEdit, onDelete, onAddSubtask, onSyncCalendar, depth = 0
}: Props) {
  const [expanded, setExpanded] = useState(true)
  const hasSubtasks = task.subtasks && task.subtasks.length > 0

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
            <span className={`w-2 h-2 rounded-full shrink-0 ${importanceDot[task.importance]}`} title={`重要性：${importanceLabel[task.importance]}`} />

            {/* Title */}
            <span className={`text-sm font-medium text-gray-800 ${task.is_completed ? 'line-through' : ''}`}>
              {task.title}
            </span>

            {/* Fixed badge */}
            {task.is_fixed && (
              <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                <Pin className="w-3 h-3" /> 固定
              </span>
            )}

            {/* Google Calendar badge */}
            {task.google_event_id && (
              <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-md">
                已同步
              </span>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{task.description}</p>
          )}

          {/* Time */}
          {task.start_time && (
            <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              <span>
                {format(new Date(task.start_time), 'MM/dd HH:mm')}
                {task.end_time && ` → ${format(new Date(task.end_time), 'HH:mm')}`}
              </span>
            </div>
          )}

          {/* Subtask count */}
          {hasSubtasks && (
            <p className="text-xs text-gray-400 mt-0.5">
              {task.subtasks!.filter(t => t.is_completed).length}/{task.subtasks!.length} 子任務完成
            </p>
          )}
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
