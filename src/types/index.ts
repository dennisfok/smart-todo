export type Importance = 'high' | 'medium' | 'low'

export interface Task {
  id: string
  user_id: string
  title: string
  description?: string
  importance: Importance
  start_time?: string | null
  end_time?: string | null
  is_fixed: boolean
  is_completed: boolean
  parent_id?: string | null
  google_event_id?: string | null
  created_at: string
  updated_at: string
  subtasks?: Task[]
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

export type SortOption = 'importance' | 'date' | 'created'

export interface ScheduleConflict {
  conflictingTask: Task
  suggestedStart: string
  suggestedEnd: string
}

export type LeaveType = 'annual' | 'sick' | 'compensation' | 'unpaid' | 'other'
export type LeaveStatus = 'pending' | 'approved' | 'rejected'

export interface Worker {
  id: string
  user_id: string
  name: string
  nationality?: string
  phone?: string
  email?: string
  start_date?: string | null
  contract_end_date?: string | null
  salary?: number | null
  rest_day?: number | null  // 0=Sun,...,6=Sat
  agency_name?: string
  passport_no?: string
  visa_expiry?: string | null
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Leave {
  id: string
  worker_id: string
  user_id: string
  leave_type: LeaveType
  start_date: string
  end_date: string
  days: number
  status: LeaveStatus
  notes?: string
  created_at: string
  updated_at: string
  worker?: Worker
}
