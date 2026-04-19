import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

const DEFAULT_CATEGORIES = [
  { name: '食品／飲品', icon: '🍱', color: 'bg-orange-100', sort_order: 0 },
  { name: '清潔用品', icon: '🧹', color: 'bg-blue-100', sort_order: 1 },
  { name: '個人護理', icon: '🧴', color: 'bg-pink-100', sort_order: 2 },
  { name: '藥品', icon: '💊', color: 'bg-red-100', sort_order: 3 },
  { name: '廚房用品', icon: '🍳', color: 'bg-yellow-100', sort_order: 4 },
  { name: '其他', icon: '📦', color: 'bg-gray-100', sort_order: 5 },
]

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let { data, error } = await supabase
    .from('inventory_categories')
    .select('*')
    .eq('user_id', session.user.id)
    .order('sort_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Seed defaults on first use
  if (!data || data.length === 0) {
    const { data: seeded, error: seedErr } = await supabase
      .from('inventory_categories')
      .insert(DEFAULT_CATEGORIES.map(c => ({ ...c, user_id: session.user.id })))
      .select()
    if (seedErr) return NextResponse.json({ error: seedErr.message }, { status: 500 })
    data = seeded
  }

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { data, error } = await supabase
    .from('inventory_categories')
    .insert({ ...body, user_id: session.user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
