import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Task, Settings, Project } from '@/types'

let _supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) throw new Error('Missing Supabase env vars')
    _supabase = createClient(url, key)
  }
  return _supabase
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabase() as any)[prop]
  }
})

// Helper: set user context for RLS
export function getSupabaseWithUser(userId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    global: {
      headers: {
        'x-user-id': userId,
      },
    },
  })
}

// Tasks
export async function getTasks(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, project:projects(id, name, color)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error

  // Build tree: attach subtasks to parents
  const taskMap = new Map<string, Task>()
  const roots: Task[] = []

  data.forEach((t: any) => taskMap.set(t.id, { ...t, subtasks: [] }))
  data.forEach((t: any) => {
    if (t.parent_id && taskMap.has(t.parent_id)) {
      taskMap.get(t.parent_id)!.subtasks!.push(taskMap.get(t.id)!)
    } else if (!t.parent_id) {
      roots.push(taskMap.get(t.id)!)
    }
  })

  return roots
}

export async function createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'subtasks'>): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Projects
export async function getProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function createProject(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert(project)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Settings
export async function getSettings(userId: string): Promise<Settings | null> {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function upsertSettings(userId: string, updates: Partial<Settings>): Promise<Settings> {
  const { data, error } = await supabase
    .from('settings')
    .upsert({ user_id: userId, ...updates })
    .select()
    .single()

  if (error) throw error
  return data
}
