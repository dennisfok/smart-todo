import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { autoScheduleTasks } from '@/lib/scheduler'
import { Settings, Task } from '@/types'

const DEFAULT_SETTINGS: Settings = {
  id: '',
  user_id: '',
  work_days: [1, 2, 3, 4, 5],
  work_start: '09:00',
  work_end: '18:00',
  google_calendar_id: 'primary',
  created_at: '',
  updated_at: '',
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  // Fetch tasks and settings in parallel
  const [tasksRes, settingsRes] = await Promise.all([
    supabase.from('tasks').select('*').eq('user_id', userId),
    supabase.from('settings').select('*').eq('user_id', userId).single(),
  ])

  if (tasksRes.error) return NextResponse.json({ error: tasksRes.error.message }, { status: 500 })

  const tasks: Task[] = tasksRes.data || []
  const settings: Settings = settingsRes.data
    ? { ...DEFAULT_SETTINGS, ...settingsRes.data }
    : DEFAULT_SETTINGS

  const assignments = autoScheduleTasks(tasks, settings)

  if (assignments.length === 0) {
    return NextResponse.json({ scheduled: 0, assignments: [] })
  }

  // Batch-update each scheduled task
  const updates = await Promise.all(
    assignments.map(({ taskId, start, end }) =>
      supabase
        .from('tasks')
        .update({ start_time: start, end_time: end })
        .eq('id', taskId)
        .eq('user_id', userId)
    )
  )

  const errors = updates.filter(r => r.error)
  if (errors.length > 0) {
    return NextResponse.json({ error: 'Some tasks failed to update' }, { status: 500 })
  }

  return NextResponse.json({ scheduled: assignments.length, assignments })
}
