import { Task, Settings, Importance } from '@/types'
import { addMinutes, parseISO, format, setHours, setMinutes, addDays, getDay } from 'date-fns'

export function hasOverlap(
  start1: Date, end1: Date,
  start2: Date, end2: Date
): boolean {
  return start1 < end2 && end1 > start2
}

export function isWithinWorkHours(
  start: Date,
  end: Date,
  settings: Settings
): boolean {
  const day = getDay(start)
  if (!settings.work_days.includes(day)) return false

  const [startH, startM] = settings.work_start.split(':').map(Number)
  const [endH, endM] = settings.work_end.split(':').map(Number)

  const workStart = setMinutes(setHours(new Date(start), startH), startM)
  const workEnd = setMinutes(setHours(new Date(start), endH), endM)

  return start >= workStart && end <= workEnd
}

export function findNextAvailableSlot(
  durationMinutes: number,
  existingTasks: Task[],
  settings: Settings,
  preferredStart?: Date
): { start: Date; end: Date } {
  const now = new Date()
  const start = preferredStart && preferredStart > now ? preferredStart : now
  const durationMs = durationMinutes * 60 * 1000

  const busySlots = existingTasks
    .filter(t => t.start_time && t.end_time && !t.is_completed)
    .map(t => ({
      start: parseISO(t.start_time!),
      end: parseISO(t.end_time!),
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  const [wStartH, wStartM] = settings.work_start.split(':').map(Number)
  let candidate = setMinutes(setHours(new Date(start), wStartH), wStartM)

  // If preferred start is after work start today, begin from preferred start
  if (preferredStart && preferredStart > candidate) {
    candidate = new Date(preferredStart)
  }

  for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
    const day = getDay(candidate)
    if (!settings.work_days.includes(day)) {
      candidate = addDays(setMinutes(setHours(candidate, wStartH), wStartM), 1)
      continue
    }

    const [wEndH, wEndM] = settings.work_end.split(':').map(Number)
    const workEnd = setMinutes(setHours(new Date(candidate), wEndH), wEndM)

    while (addMinutes(candidate, durationMinutes) <= workEnd) {
      const slotEnd = new Date(candidate.getTime() + durationMs)
      const conflict = busySlots.find(b => hasOverlap(candidate, slotEnd, b.start, b.end))

      if (!conflict) {
        return { start: candidate, end: slotEnd }
      }

      candidate = new Date(conflict.end)
    }

    candidate = addDays(setMinutes(setHours(candidate, wStartH), wStartM), 1)
  }

  return {
    start,
    end: new Date(start.getTime() + durationMs),
  }
}

export function detectAndResolveConflicts(
  newTask: Partial<Task>,
  existingTasks: Task[],
  settings: Settings
): {
  hasConflict: boolean
  conflictingTasks: Task[]
  suggestedStart?: string
  suggestedEnd?: string
} {
  if (!newTask.start_time || !newTask.end_time) {
    return { hasConflict: false, conflictingTasks: [] }
  }

  const newStart = parseISO(newTask.start_time)
  const newEnd = parseISO(newTask.end_time)
  const durationMinutes = (newEnd.getTime() - newStart.getTime()) / 60000

  const conflictingTasks = existingTasks.filter(t => {
    if (!t.start_time || !t.end_time || t.is_completed || t.id === newTask.id) return false
    return hasOverlap(newStart, newEnd, parseISO(t.start_time), parseISO(t.end_time))
  })

  if (conflictingTasks.length === 0) {
    return { hasConflict: false, conflictingTasks: [] }
  }

  const slot = findNextAvailableSlot(durationMinutes, existingTasks, settings, newStart)

  return {
    hasConflict: true,
    conflictingTasks,
    suggestedStart: slot.start.toISOString(),
    suggestedEnd: slot.end.toISOString(),
  }
}

const importanceOrder: Record<Importance, number> = { asap: 0, high: 1, medium: 2, low: 3 }

export function sortTasks(tasks: Task[], sortBy: 'importance' | 'date' | 'created' | 'deadline' = 'importance'): Task[] {
  return [...tasks].sort((a, b) => {
    if (sortBy === 'importance') {
      const impDiff = importanceOrder[a.importance] - importanceOrder[b.importance]
      if (impDiff !== 0) return impDiff
      if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      if (a.deadline) return -1
      if (b.deadline) return 1
      if (a.start_time && b.start_time) return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      if (a.start_time) return -1
      if (b.start_time) return 1
      return 0
    }

    if (sortBy === 'deadline') {
      if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      if (a.deadline) return -1
      if (b.deadline) return 1
      return importanceOrder[a.importance] - importanceOrder[b.importance]
    }

    if (sortBy === 'date') {
      if (a.start_time && b.start_time) return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      if (a.start_time) return -1
      if (b.start_time) return 1
      return importanceOrder[a.importance] - importanceOrder[b.importance]
    }

    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}

/**
 * Auto-schedule unscheduled tasks into available work slots.
 * Sorts by importance + deadline, then fills slots greedily.
 * Returns array of { taskId, start, end } assignments.
 */
export function autoScheduleTasks(
  tasks: Task[],
  settings: Settings
): { taskId: string; start: string; end: string }[] {
  // Only schedule unscheduled, incomplete, non-fixed tasks without a start_time
  const unscheduled = tasks.filter(
    t => !t.is_completed && !t.start_time && !t.parent_id
  )

  // Sort: ASAP first, then by deadline, then importance
  const sorted = [...unscheduled].sort((a, b) => {
    const impDiff = importanceOrder[a.importance] - importanceOrder[b.importance]
    if (impDiff !== 0) return impDiff
    if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    if (a.deadline) return -1
    if (b.deadline) return 1
    return 0
  })

  // Treat already-scheduled tasks as busy
  const scheduled: Task[] = tasks.filter(t => t.start_time && t.end_time && !t.is_completed)
  const assignments: { taskId: string; start: string; end: string }[] = []

  for (const task of sorted) {
    const duration = task.duration_minutes || 60
    // Prefer scheduling before deadline if set
    const preferBefore = task.deadline ? parseISO(task.deadline) : undefined
    const slot = findNextAvailableSlot(duration, scheduled, settings)

    // If slot goes past deadline, skip (deadline constraint)
    if (preferBefore && slot.end > preferBefore) continue

    assignments.push({
      taskId: task.id,
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
    })

    // Add to scheduled so subsequent tasks don't overlap
    scheduled.push({
      ...task,
      start_time: slot.start.toISOString(),
      end_time: slot.end.toISOString(),
    })
  }

  return assignments
}
