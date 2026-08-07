import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const dateParam = searchParams.get('date') // YYYY-MM-DD

  const date = dateParam ? new Date(dateParam) : new Date()
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setHours(23, 59, 59, 999)

  // Tasks scheduled today (start_time within today)
  const { data: scheduledData } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', session.user.id)
    .gte('start_time', dayStart.toISOString())
    .lte('start_time', dayEnd.toISOString())
    .order('start_time', { ascending: true })

  // Tasks completed today (completed_at within today)
  const { data: completedTodayData } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('is_completed', true)
    .gte('completed_at', dayStart.toISOString())
    .lte('completed_at', dayEnd.toISOString())
    .order('completed_at', { ascending: false })

  // Fallback: tasks marked completed today via updated_at (for tasks without completed_at)
  const { data: completedFallbackData } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('is_completed', true)
    .is('completed_at', null)
    .gte('updated_at', dayStart.toISOString())
    .lte('updated_at', dayEnd.toISOString())

  const scheduledTasks = scheduledData || []
  const completedToday = [
    ...(completedTodayData || []),
    ...(completedFallbackData || []),
  ]

  // Deduplicate by id
  const completedIds = new Set(completedToday.map((t: any) => t.id))

  // Scheduled tasks split into completed vs pending
  const scheduledCompleted = scheduledTasks.filter((t: any) => t.is_completed)
  const scheduledPending = scheduledTasks.filter((t: any) => !t.is_completed)

  // Completed not in scheduled (done on the fly)
  const extraCompleted = completedToday.filter((t: any) =>
    !scheduledTasks.find((s: any) => s.id === t.id)
  )

  return NextResponse.json({
    date: date.toISOString().split('T')[0],
    scheduled: scheduledTasks,
    scheduledCompleted,
    scheduledPending,
    extraCompleted,
    allCompleted: [...scheduledCompleted, ...extraCompleted],
    stats: {
      scheduledTotal: scheduledTasks.length,
      scheduledDone: scheduledCompleted.length,
      extraDone: extraCompleted.length,
      totalDone: scheduledCompleted.length + extraCompleted.length,
      pendingCount: scheduledPending.length,
    },
  })
}
