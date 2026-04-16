import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listUpcomingEvents, createCalendarEvent } from '@/lib/google-calendar'
import { supabase } from '@/lib/supabase'

// GET: fetch Google Calendar events
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !(session as any).accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const events = await listUpcomingEvents((session as any).accessToken)
    return NextResponse.json(events)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST: sync task to Google Calendar
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !(session as any).accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { taskId } = await req.json()

  const { data: task, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single()

  if (error || !task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  try {
    const googleEventId = await createCalendarEvent((session as any).accessToken, task)

    if (googleEventId) {
      await supabase
        .from('tasks')
        .update({ google_event_id: googleEventId })
        .eq('id', taskId)
    }

    return NextResponse.json({ google_event_id: googleEventId })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
