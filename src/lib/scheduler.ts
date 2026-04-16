import { Task, Settings } from '@/types'
import { addMinutes, isWithinInterval, parseISO, format, setHours, setMinutes, addDays, getDay } from 'date-fns'

/**
 * Check if two time intervals overlap
 */
export function hasOverlap(
  start1: Date, end1: Date,
  start2: Date, end2: Date
): boolean {
  return start1 < end2 && end1 > start2
}

/**
 * Check if a time slot is within work hours
 */
export function isWithinWorkHours(
  start: Date,
  end: Date,
  settings: Settings
): boolean {
  const day = getDay(start) // 0=Sun, 6=Sat
  if (!settings.work_days.includes(day)) return false

  const [startH, startM] = settings.work_start.split(':').map(Number)
  const [endH, endM] = settings.work_end.split(':').map(Number)

  const workStart = setMinutes(setHours(new Date(start), startH), startM)
  const workEnd = setMinutes(setHours(new Date(start), endH), endM)

  return start >= workStart && end <= workEnd
}

/**
 * Find next available slot for a task, respecting work hours and existing tasks
 */
export function findNextAvailableSlot(
  durationMinutes: number,
  existingTasks: Task[],
  settings: Settings,
  preferredStart?: Date
): { start: Date; end: Date } {
  const start = preferredStart || new Date()
  const durationMs = durationMinutes * 60 * 1000

  // Build list of busy intervals from fixed/completed tasks
  const busySlots = existingTasks
    .filter(t => t.start_time && t.end_time && !t.is_completed)
    .map(t => ({
      start: parseISO(t.start_time!),
      end: parseISO(t.end_time!),
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  // Try slots starting from preferred start
  let candidate = new Date(start)

  // Snap to next work hour start if outside work hours
  const [wStartH, wStartM] = settings.work_start.split(':').map(Number)
  candidate = setMinutes(setHours(candidate, wStartH), wStartM)

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

      // Jump to end of conflicting slot
      candidate = new Date(conflict.end)
    }

    // Move to next work day
    candidate = addDays(setMinutes(setHours(candidate, wStartH), wStartM), 1)
  }

  // Fallback: return preferred start (shouldn't reach here)
  return {
    start,
    end: new Date(start.getTime() + durationMs),
  }
}

/**
 * Detect conflicts for a new task and suggest reschedule if needed
 */
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

  // Find next available slot
  const slot = findNextAvailableSlot(durationMinutes, existingTasks, settings, newStart)

  return {
    hasConflict: true,
    conflictingTasks,
    suggestedStart: slot.start.toISOString(),
    suggestedEnd: slot.end.toISOString(),
  }
}

/**
 * Sort tasks by importance + date
 */
export function sortTasks(tasks: Task[], sortBy: 'importance' | 'date' | 'created' = 'importance'): Task[] {
  const importanceOrder = { high: 0, medium: 1, low: 2 }

  return [...tasks].sort((a, b) => {
    if (sortBy === 'importance') {
      const impDiff = importanceOrder[a.importance] - importanceOrder[b.importance]
      if (impDiff !== 0) return impDiff
      // Then by date
      if (a.start_time && b.start_time) {
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      }
      if (a.start_time) return -1
      if (b.start_time) return 1
      return 0
    }

    if (sortBy === 'date') {
      if (a.start_time && b.start_time) {
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      }
      if (a.start_time) return -1
      if (b.start_time) return 1
      return importanceOrder[a.importance] - importanceOrder[b.importance]
    }

    // created
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}
