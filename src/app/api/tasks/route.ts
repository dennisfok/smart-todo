import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Build task tree
  const taskMap = new Map()
  const roots: any[] = []

  data.forEach((t: any) => taskMap.set(t.id, { ...t, subtasks: [] }))
  data.forEach((t: any) => {
    if (t.parent_id && taskMap.has(t.parent_id)) {
      taskMap.get(t.parent_id).subtasks.push(taskMap.get(t.id))
    } else if (!t.parent_id) {
      roots.push(taskMap.get(t.id))
    }
  })

  return NextResponse.json(roots)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...body, user_id: session.user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
