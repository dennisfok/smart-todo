'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { InventoryItem, InventoryCategory, InventoryLocation } from '@/types'
import Sidebar from '@/components/Sidebar'
import InventoryItemForm from '@/components/InventoryItemForm'
import {
  Plus, Package, AlertTriangle, ShoppingCart,
  MapPin, Search, ChevronDown, ChevronUp,
  Pencil, Trash2, CalendarDays, Minus
} from 'lucide-react'
import { format, parseISO, differenceInDays } from 'date-fns'

const LOCATION_LABELS: Record<InventoryLocation, string> = {
  kitchen: '廚房',
  bathroom: '浴室',
  bedroom: '睡房',
  storage: '儲物室',
  other: '其他',
}

const LOCATION_COLORS: Record<InventoryLocation, string> = {
  kitchen: 'bg-orange-50 text-orange-700',
  bathroom: 'bg-blue-50 text-blue-700',
  bedroom: 'bg-purple-50 text-purple-700',
  storage: 'bg-gray-50 text-gray-600',
  other: 'bg-zinc-50 text-zinc-600',
}

function expiryStatus(dateStr: string | null) {
  if (!dateStr) return null
  const days = differenceInDays(parseISO(dateStr), new Date())
  if (days < 0) return { label: '已過期', cls: 'text-red-600 bg-red-50' }
  if (days <= 7) return { label: `${days} 天後到期`, cls: 'text-red-600 bg-red-50' }
  if (days <= 30) return { label: `${days} 天後到期`, cls: 'text-amber-600 bg-amber-50' }
  return null
}

function isLowStock(item: InventoryItem) {
  return item.quantity <= item.min_quantity
}

export default function InventoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [items, setItems] = useState<InventoryItem[]>([])
  const [categories, setCategories] = useState<InventoryCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState<string>('all')
  const [filterLocation, setFilterLocation] = useState<string>('all')
  const [showLowOnly, setShowLowOnly] = useState(false)
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status, router])

  const fetchAll = useCallback(async () => {
    const [catRes, itemRes] = await Promise.all([
      fetch('/api/inventory/categories'),
      fetch('/api/inventory/items'),
    ])
    if (catRes.ok) setCategories(await catRes.json())
    if (itemRes.ok) setItems(await itemRes.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    if (session) fetchAll()
  }, [session, fetchAll])

  const handleSave = async (data: Partial<InventoryItem>) => {
    if (editingItem) {
      await fetch(`/api/inventory/items/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    } else {
      await fetch('/api/inventory/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    }
    setShowForm(false)
    setEditingItem(null)
    fetchAll()
  }

  const handleDelete = async (item: InventoryItem) => {
    if (!confirm(`確定刪除「${item.name}」？`)) return
    await fetch(`/api/inventory/items/${item.id}`, { method: 'DELETE' })
    fetchAll()
  }

  const adjustQty = async (item: InventoryItem, delta: number) => {
    const newQty = Math.max(0, item.quantity + delta)
    await fetch(`/api/inventory/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: newQty }),
    })
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i))
  }

  const toggleCat = (catId: string) => {
    setCollapsedCats(prev => {
      const next = new Set(prev)
      next.has(catId) ? next.delete(catId) : next.add(catId)
      return next
    })
  }

  const filtered = useMemo(() => {
    return items.filter(item => {
      if (search && !item.name.toLowerCase().includes(search.toLowerCase()) &&
        !(item.brand?.toLowerCase().includes(search.toLowerCase()))) return false
      if (filterCat !== 'all' && item.category_id !== filterCat) return false
      if (filterLocation !== 'all' && item.location !== filterLocation) return false
      if (showLowOnly && !isLowStock(item)) return false
      return true
    })
  }, [items, search, filterCat, filterLocation, showLowOnly])

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, { cat: InventoryCategory | null; items: InventoryItem[] }>()
    const uncatKey = '__none__'

    filtered.forEach(item => {
      const key = item.category_id ?? uncatKey
      if (!map.has(key)) {
        map.set(key, { cat: item.category ?? null, items: [] })
      }
      map.get(key)!.items.push(item)
    })

    // Sort groups by category sort_order
    return Array.from(map.entries()).sort(([, a], [, b]) => {
      if (!a.cat) return 1
      if (!b.cat) return -1
      return (a.cat.sort_order ?? 0) - (b.cat.sort_order ?? 0)
    })
  }, [filtered])

  const lowStockCount = items.filter(isLowStock).length
  const expiredCount = items.filter(i => i.expiry_date && differenceInDays(parseISO(i.expiry_date), new Date()) < 0).length

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
        <div className="max-w-3xl mx-auto px-6 py-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">家居存貨</h1>
              <p className="text-sm text-gray-500 mt-1">{items.length} 項物品</p>
            </div>
            <button
              onClick={() => { setEditingItem(null); setShowForm(true) }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              新增物品
            </button>
          </div>

          {/* Alert strip */}
          {(lowStockCount > 0 || expiredCount > 0) && (
            <div className="flex gap-3 mb-5 flex-wrap">
              {lowStockCount > 0 && (
                <button
                  onClick={() => setShowLowOnly(v => !v)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    showLowOnly
                      ? 'bg-amber-100 border-amber-300 text-amber-800'
                      : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  {lowStockCount} 項需要補貨
                </button>
              )}
              {expiredCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-red-50 border border-red-200 text-red-700">
                  <AlertTriangle className="w-4 h-4" />
                  {expiredCount} 項已過期
                </div>
              )}
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-2 mb-5 flex-wrap items-center">
            {/* Search */}
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-40">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="搜尋物品..."
                className="flex-1 outline-none text-sm text-gray-700 placeholder-gray-400"
              />
            </div>

            {/* Category filter */}
            <select
              value={filterCat}
              onChange={e => setFilterCat(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 outline-none"
            >
              <option value="all">全部類別</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>

            {/* Location filter */}
            <select
              value={filterLocation}
              onChange={e => setFilterLocation(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 outline-none"
            >
              <option value="all">全部位置</option>
              {(Object.entries(LOCATION_LABELS) as [InventoryLocation, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {/* Item groups */}
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">未有符合條件的物品</p>
              {items.length === 0 && (
                <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-indigo-600 hover:underline">
                  新增第一件物品
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map(([key, { cat, items: groupItems }]) => {
                const collapsed = collapsedCats.has(key)
                const groupLow = groupItems.filter(isLowStock).length
                return (
                  <div key={key} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Category header */}
                    <button
                      onClick={() => toggleCat(key)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-lg">{cat?.icon ?? '📦'}</span>
                      <span className="text-sm font-semibold text-gray-800 flex-1 text-left">
                        {cat?.name ?? '未分類'}
                      </span>
                      <span className="text-xs text-gray-400">{groupItems.length} 項</span>
                      {groupLow > 0 && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                          {groupLow} 需補貨
                        </span>
                      )}
                      {collapsed
                        ? <ChevronDown className="w-4 h-4 text-gray-400" />
                        : <ChevronUp className="w-4 h-4 text-gray-400" />
                      }
                    </button>

                    {/* Items */}
                    {!collapsed && (
                      <div className="divide-y divide-gray-50">
                        {groupItems.map(item => {
                          const low = isLowStock(item)
                          const expiry = expiryStatus(item.expiry_date)
                          return (
                            <div
                              key={item.id}
                              className={`flex items-center gap-3 px-4 py-3 group ${low ? 'bg-amber-50/40' : ''}`}
                            >
                              {/* Name + badges */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-sm font-medium ${low ? 'text-amber-800' : 'text-gray-800'}`}>
                                    {item.name}
                                  </span>
                                  {item.brand && (
                                    <span className="text-xs text-gray-400">{item.brand}</span>
                                  )}
                                  {low && (
                                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                                      <ShoppingCart className="w-3 h-3" /> 需補貨
                                    </span>
                                  )}
                                  {expiry && (
                                    <span className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5 ${expiry.cls}`}>
                                      <CalendarDays className="w-3 h-3" />{expiry.label}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`text-xs px-1.5 py-0.5 rounded ${LOCATION_COLORS[item.location]}`}>
                                    {LOCATION_LABELS[item.location]}
                                  </span>
                                  {item.expiry_date && !expiry && (
                                    <span className="text-xs text-gray-400">
                                      到期：{format(parseISO(item.expiry_date), 'yyyy/MM/dd')}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Quantity control */}
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() => adjustQty(item, -1)}
                                  disabled={item.quantity <= 0}
                                  className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className={`text-sm font-semibold w-12 text-center ${low ? 'text-amber-700' : 'text-gray-800'}`}>
                                  {item.quantity} {item.unit}
                                </span>
                                <button
                                  onClick={() => adjustQty(item, 1)}
                                  className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Edit / Delete */}
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button
                                  onClick={() => { setEditingItem(item); setShowForm(true) }}
                                  className="p-1 text-gray-400 hover:text-blue-500 rounded"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(item)}
                                  className="p-1 text-gray-400 hover:text-red-500 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {showForm && (
        <InventoryItemForm
          item={editingItem}
          categories={categories}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingItem(null) }}
        />
      )}
    </div>
  )
}
