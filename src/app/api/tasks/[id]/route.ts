import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { updateCalendarEvent, deleteCalendarEvent } from '@/lib/google-calendar'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  // Auto-stamp completed_at when marking complete, clear it when uncompleting
  if (body.is_completed === true && !body.completed_at) {
    body.completed_at = new Date().toISOString()
  } else if (body.is_completed === false) {
    body.completed_at = null
  }
  const { data, error } = await supabase
    .from('tasks')
    .update(body)
    .eq('id', id)
    .eq('user_id', session.user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sync to Google Calendar
  if (data.google_event_id && (session as any).accessToken) {
    try {
      await updateCalendarEvent((session as any).accessToken, data.google_event_id, data)
    } catch (e) {
      console.error('Calendar sync error:', e)
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get task first to find google_event_id
  const { data: task } = await supabase
    .from('tasks')
    .select('google_event_id')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Delete from Google Calendar
  if (task?.google_event_id && (session as any).accessToken) {
    try {
      await deleteCalendarEvent((session as any).accessToken, task.google_event_id)
    } catch (e) {
      console.error('Calendar delete error:', e)
    }
  }

  return NextResponse.json({ success: true })
}
