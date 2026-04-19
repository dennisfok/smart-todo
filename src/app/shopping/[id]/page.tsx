'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { ShoppingList, ShoppingItem, InventoryUnit } from '@/types'
import Sidebar from '@/components/Sidebar'
import {
  ArrowLeft, CheckCircle2, Circle, Plus, Trash2,
  Pencil, ShoppingCart, CheckCheck, RotateCcw, DollarSign
} from 'lucide-react'

const UNIT_LABELS: Record<InventoryUnit, string> = {
  pcs: '個', pack: '包', bottle: '瓶', box: '盒', bag: '袋',
  kg: 'kg', g: 'g', L: 'L', mL: 'mL', roll: '卷',
}

const UNITS: InventoryUnit[] = ['pcs', 'pack', 'bottle', 'box', 'bag', 'kg', 'g', 'L', 'mL', 'roll']

interface AddItemRow {
  name: string
  quantity: string
  unit: InventoryUnit
  estimated_price: string
}

const BLANK_ROW: AddItemRow = { name: '', quantity: '1', unit: 'pcs', estimated_price: '' }

export default function ShoppingListDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { id } = useParams() as { id: string }

  const [list, setList] = useState<ShoppingList | null>(null)
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [addRow, setAddRow] = useState<AddItemRow>(BLANK_ROW)
  const [showAddRow, setShowAddRow] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [listName, setListName] = useState('')
  const [savingName, setSavingName] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status, router])

  const fetchList = useCallback(async () => {
    const [listRes, itemsRes] = await Promise.all([
      fetch(`/api/shopping/lists/${id}`),
      fetch(`/api/shopping/lists/${id}/items`),
    ])
    if (!listRes.ok) { router.push('/shopping'); return }
    const l: ShoppingList = await listRes.json()
    setList(l)
    setListName(l.name)
    if (itemsRes.ok) setItems(await itemsRes.json())
    setLoading(false)
  }, [id, router])

  useEffect(() => {
    if (session) fetchList()
  }, [session, fetchList])

  const toggleBought = async (item: ShoppingItem) => {
    const updated = { is_bought: !item.is_bought }
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, ...updated } : i))
    await fetch(`/api/shopping/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addRow.name.trim()) return

    const res = await fetch(`/api/shopping/lists/${id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: addRow.name.trim(),
        quantity: Number(addRow.quantity) || 1,
        unit: addRow.unit,
        estimated_price: addRow.estimated_price ? Number(addRow.estimated_price) : null,
      }),
    })
    if (res.ok) {
      const newItem = await res.json()
      setItems(prev => [...prev, newItem])
      setAddRow(BLANK_ROW)
      // keep add row open for quick multi-add
    }
  }

  const handleDeleteItem = async (item: ShoppingItem) => {
    setItems(prev => prev.filter(i => i.id !== item.id))
    await fetch(`/api/shopping/items/${item.id}`, { method: 'DELETE' })
  }

  const handleSaveName = async () => {
    if (!listName.trim() || listName === list?.name) { setEditingName(false); return }
    setSavingName(true)
    await fetch(`/api/shopping/lists/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: listName.trim() }),
    })
    setList(prev => prev ? { ...prev, name: listName.trim() } : prev)
    setSavingName(false)
    setEditingName(false)
  }

  const handleMarkAllDone = async () => {
    const unbought = items.filter(i => !i.is_bought)
    setItems(prev => prev.map(i => ({ ...i, is_bought: true })))
    await Promise.all(unbought.map(i =>
      fetch(`/api/shopping/items/${i.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_bought: true }),
      })
    ))
  }

  const handleCompleteList = async () => {
    if (!confirm('將此清單標為已完成，並自動更新存貨數量？')) return

    // Update linked inventory items: add bought quantity
    const boughtWithLink = items.filter(i => i.is_bought && i.inventory_item_id)
    await Promise.all(boughtWithLink.map(async i => {
      const newQty = (i.inventory_item?.quantity ?? 0) + i.quantity
      return fetch(`/api/inventory/items/${i.inventory_item_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQty }),
      })
    }))

    await fetch(`/api/shopping/lists/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    })
    router.push('/shopping')
  }

  const handleReopenList = async () => {
    await fetch(`/api/shopping/lists/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    })
    setList(prev => prev ? { ...prev, status: 'active' } : prev)
  }

  const boughtCount = items.filter(i => i.is_bought).length
  const totalEstimated = items.reduce((sum, i) => sum + (i.estimated_price ?? 0) * i.quantity, 0)
  const isCompleted = list?.status === 'completed'

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  if (!list) return null

  const pending = items.filter(i => !i.is_bought)
  const bought = items.filter(i => i.is_bought)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="ml-64 flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">

          {/* Back */}
          <button
            onClick={() => router.push('/shopping')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            返回採購清單
          </button>

          {/* Header */}
          <div className="flex items-start justify-between mb-6 gap-3">
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={listName}
                    onChange={e => setListName(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveName() }}
                    className="text-xl font-bold text-gray-900 border-b-2 border-indigo-500 outline-none flex-1 bg-transparent"
                  />
                </div>
              ) : (
                <h1
                  className="text-xl font-bold text-gray-900 cursor-pointer hover:text-indigo-700 transition-colors flex items-center gap-1.5"
                  onClick={() => setEditingName(true)}
                >
                  {list.name}
                  <Pencil className="w-3.5 h-3.5 text-gray-300 hover:text-indigo-400" />
                </h1>
              )}
              <p className="text-sm text-gray-400 mt-1">
                {boughtCount}/{items.length} 項已買
                {totalEstimated > 0 && <span className="ml-2">• 預計 HK${totalEstimated.toFixed(0)}</span>}
              </p>
            </div>

            {/* Progress */}
            {items.length > 0 && (
              <div className="shrink-0">
                <div className="w-12 h-12 relative">
                  <svg className="w-12 h-12 -rotate-90">
                    <circle cx="24" cy="24" r="18" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                    <circle
                      cx="24" cy="24" r="18" fill="none"
                      stroke={isCompleted ? '#16a34a' : '#6366f1'} strokeWidth="4"
                      strokeDasharray={`${2 * Math.PI * 18}`}
                      strokeDashoffset={`${2 * Math.PI * 18 * (1 - boughtCount / items.length)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
                    {items.length > 0 ? Math.round(boughtCount / items.length * 100) : 0}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Status badge */}
          {isCompleted && (
            <div className="flex items-center gap-3 mb-5 p-3 bg-green-50 rounded-xl border border-green-200">
              <CheckCheck className="w-5 h-5 text-green-600 shrink-0" />
              <p className="text-sm text-green-800 font-medium flex-1">已完成採購，存貨已自動更新</p>
              <button
                onClick={handleReopenList}
                className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 border border-green-300 rounded-lg px-2 py-1"
              >
                <RotateCcw className="w-3 h-3" /> 重新開啟
              </button>
            </div>
          )}

          {/* Pending items */}
          {pending.length > 0 && (
            <section className="mb-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                {pending.map(item => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onToggle={toggleBought}
                    onDelete={handleDeleteItem}
                    disabled={isCompleted}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Add item row */}
          {!isCompleted && (
            <div className="mb-4">
              {showAddRow ? (
                <form
                  onSubmit={handleAddItem}
                  className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-4 space-y-3"
                >
                  <input
                    autoFocus
                    value={addRow.name}
                    onChange={e => setAddRow(r => ({ ...r, name: e.target.value }))}
                    placeholder="物品名稱"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={addRow.quantity}
                      onChange={e => setAddRow(r => ({ ...r, quantity: e.target.value }))}
                      min="0.1" step="0.1"
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <select
                      value={addRow.unit}
                      onChange={e => setAddRow(r => ({ ...r, unit: e.target.value as InventoryUnit }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {UNITS.map(u => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
                    </select>
                    <div className="flex items-center gap-1 border border-gray-300 rounded-lg px-2">
                      <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="number"
                        value={addRow.estimated_price}
                        onChange={e => setAddRow(r => ({ ...r, estimated_price: e.target.value }))}
                        placeholder="價錢"
                        min="0" step="0.5"
                        className="w-16 text-sm outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowAddRow(false); setAddRow(BLANK_ROW) }}
                      className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                    >
                      完成
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                    >
                      加入
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowAddRow(true)}
                  className="w-full flex items-center gap-2 px-4 py-3 bg-white border border-dashed border-gray-300 rounded-2xl text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  加入物品
                </button>
              )}
            </div>
          )}

          {/* Bought items */}
          {bought.length > 0 && (
            <section className="mb-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                已買（{bought.length}）
              </h3>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 opacity-60">
                {bought.map(item => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onToggle={toggleBought}
                    onDelete={handleDeleteItem}
                    disabled={isCompleted}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Action buttons */}
          {!isCompleted && items.length > 0 && (
            <div className="flex gap-3">
              {pending.length > 0 && (
                <button
                  onClick={handleMarkAllDone}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <CheckCheck className="w-4 h-4" />
                  全部標為已買
                </button>
              )}
              {boughtCount > 0 && (
                <button
                  onClick={handleCompleteList}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  <ShoppingCart className="w-4 h-4" />
                  完成採購，更新存貨
                </button>
              )}
            </div>
          )}

          {items.length === 0 && !showAddRow && (
            <div className="text-center py-12">
              <ShoppingCart className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">清單為空，請加入物品</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function ItemRow({ item, onToggle, onDelete, disabled }: {
  item: ShoppingItem
  onToggle: (item: ShoppingItem) => void
  onDelete: (item: ShoppingItem) => void
  disabled?: boolean
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 group ${item.is_bought ? 'opacity-50' : ''}`}>
      <button
        onClick={() => !disabled && onToggle(item)}
        className="shrink-0 text-gray-300 hover:text-indigo-500 transition-colors"
        disabled={disabled}
      >
        {item.is_bought
          ? <CheckCircle2 className="w-5 h-5 text-green-500" />
          : <Circle className="w-5 h-5" />
        }
      </button>

      <div className="flex-1 min-w-0">
        <span className={`text-sm font-medium ${item.is_bought ? 'line-through text-gray-400' : 'text-gray-800'}`}>
          {item.name}
        </span>
        {item.inventory_item && (
          <span className="ml-1.5 text-xs text-indigo-400">（已連結存貨）</span>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400">
            {item.quantity} {UNIT_LABELS[item.unit]}
          </span>
          {item.estimated_price && (
            <span className="text-xs text-gray-400">
              ≈ HK${(item.estimated_price * item.quantity).toFixed(0)}
            </span>
          )}
        </div>
      </div>

      {!disabled && (
        <button
          onClick={() => onDelete(item)}
          className="p-1 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
