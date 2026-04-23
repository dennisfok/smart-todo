export type Importance = 'asap' | 'high' | 'medium' | 'low'
export type TaskStatus = 'not_started' | 'in_progress' | 'completed'

export interface Project {
  id: string
  user_id: string
  name: string
  color: string
  description?: string
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  user_id: string
  title: string
  description?: string
  importance: Importance
  status: TaskStatus
  duration_minutes: number
  start_time?: string | null
  end_time?: string | null
  deadline?: string | null
  is_fixed: boolean
  is_completed: boolean
  project_id?: string | null
  parent_id?: string | null
  google_event_id?: string | null
  created_at: string
  updated_at: string
  subtasks?: Task[]
  project?: Project
}

export interface Settings {
  id: string
  user_id: string
  work_days: number[] // 0=Sun,1=Mon,...,6=Sat
  work_start: string  // "09:00"
  work_end: string    // "18:00"
  google_calendar_id: string
  created_at: string
  updated_at: string
}

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end?: string
  backgroundColor?: string
  borderColor?: string
  textColor?: string
  extendedProps?: {
    task?: Task
    importance?: Importance
    is_fixed?: boolean
    description?: string
  }
}

export type SortOption = 'importance' | 'date' | 'created' | 'deadline'

export interface ScheduleConflict {
  conflictingTask: Task
  suggestedStart: string
  suggestedEnd: string
}
