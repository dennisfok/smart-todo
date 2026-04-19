'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ShoppingList, InventoryItem } from '@/types'
import Sidebar from '@/components/Sidebar'
import { ShoppingCart, Plus, ChevronRight, CheckCircle2, Circle, Trash2, RefreshCw } from 'lucide-react'
import { format, parseISO } from 'date-fns'

export default function ShoppingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [lists, setLists] = useState<ShoppingList[]>([])
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status, router])

  const fetchAll = useCallback(async () => {
    const [listsRes, invRes] = await Promise.all([
      fetch('/api/shopping/lists'),
      fetch('/api/inventory/items'),
    ])
    if (listsRes.ok) setLists(await listsRes.json())
    if (invRes.ok) {
      const items: InventoryItem[] = await invRes.json()
      setLowStockItems(items.filter(i => i.quantity <= i.min_quantity))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (session) fetchAll()
  }, [session, fetchAll])

  const handleCreateFromLowStock = async () => {
    if (lowStockItems.length === 0) return
    setCreating(true)

    const today = format(new Date(), 'yyyy年M月d日')
    const listRes = await fetch('/api/shopping/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `${today} 補貨清單` }),
    })
    if (!listRes.ok) { setCreating(false); return }
    const list: ShoppingList = await listRes.json()

    // Bulk-insert low stock items
    await Promise.all(lowStockItems.map(item =>
      fetch(`/api/shopping/lists/${list.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventory_item_id: item.id,
          name: item.name,
          quantity: Math.max(1, item.min_quantity - item.quantity + 1),
          unit: item.unit,
        }),
      })
    ))

    setCreating(false)
    router.push(`/shopping/${list.id}`)
  }

  const handleCreateBlank = async () => {
    const today = format(new Date(), 'yyyy年M月d日')
    const res = await fetch('/api/shopping/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `${today} 採購清單` }),
    })
    if (res.ok) {
      const list: ShoppingList = await res.json()
      router.push(`/shopping/${list.id}`)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('確定刪除此清單？')) return
    await fetch(`/api/shopping/lists/${id}`, { method: 'DELETE' })
    fetchAll()
  }

  const activeLists = lists.filter(l => l.status === 'active')
  const completedLists = lists.filter(l => l.status === 'completed')

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="ml-64 flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">採購清單</h1>
              <p className="text-sm text-gray-500 mt-1">{activeLists.length} 個進行中</p>
            </div>
            <button
              onClick={handleCreateBlank}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              新建清單
            </button>
          </div>

          {/* Low stock shortcut */}
          {lowStockItems.length > 0 && (
            <button
              onClick={handleCreateFromLowStock}
              disabled={creating}
              className="w-full flex items-center gap-3 p-4 mb-6 bg-amber-50 border-2 border-dashed border-amber-300 rounded-2xl hover:bg-amber-100 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                {creating
                  ? <RefreshCw className="w-5 h-5 text-amber-600 animate-spin" />
                  : <ShoppingCart className="w-5 h-5 text-amber-600" />
                }
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">
                  {creating ? '正在建立清單...' : `從 ${lowStockItems.length} 項低存量物品建立補貨清單`}
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  {lowStockItems.slice(0, 4).map(i => i.name).join('、')}
                  {lowStockItems.length > 4 ? ` 等 ${lowStockItems.length} 項` : ''}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-amber-400 shrink-0" />
            </button>
          )}

          {/* Active lists */}
          {activeLists.length > 0 && (
            <section className="mb-6">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">進行中</h2>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                {activeLists.map(list => (
                  <ListRow key={list.id} list={list} onClick={() => router.push(`/shopping/${list.id}`)} onDelete={handleDelete} />
                ))}
              </div>
            </section>
          )}

          {/* Completed lists */}
          {completedLists.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">已完成</h2>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                {completedLists.map(list => (
                  <ListRow key={list.id} list={list} onClick={() => router.push(`/shopping/${list.id}`)} onDelete={handleDelete} />
                ))}
              </div>
            </section>
          )}

          {lists.length === 0 && lowStockItems.length === 0 && (
            <div className="text-center py-16">
              <ShoppingCart className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">未有採購清單</p>
              <button onClick={handleCreateBlank} className="mt-3 text-sm text-indigo-600 hover:underline">
                建立第一個清單
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function ListRow({ list, onClick, onDelete }: {
  list: ShoppingList
  onClick: () => void
  onDelete: (id: string, e: React.MouseEvent) => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors group text-left"
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
        list.status === 'completed' ? 'bg-green-100' : 'bg-indigo-100'
      }`}>
        {list.status === 'completed'
          ? <CheckCircle2 className="w-4 h-4 text-green-600" />
          : <Circle className="w-4 h-4 text-indigo-600" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${list.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
          {list.name}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          建立於 {format(parseISO(list.created_at), 'yyyy/MM/dd')}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={e => onDelete(list.id, e)}
          className="p-1.5 text-gray-400 hover:text-red-500 rounded"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
    </button>
  )
}
