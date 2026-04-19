'use client'

import { useState } from 'react'
import { InventoryItem, InventoryCategory, InventoryLocation, InventoryUnit } from '@/types'
import { X } from 'lucide-react'

interface Props {
  item?: InventoryItem | null
  categories: InventoryCategory[]
  onSave: (data: Partial<InventoryItem>) => void
  onClose: () => void
}

const UNITS: { value: InventoryUnit; label: string }[] = [
  { value: 'pcs', label: '個' },
  { value: 'pack', label: '包' },
  { value: 'bottle', label: '瓶' },
  { value: 'box', label: '盒' },
  { value: 'bag', label: '袋' },
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g' },
  { value: 'L', label: 'L' },
  { value: 'mL', label: 'mL' },
  { value: 'roll', label: '卷' },
]

const LOCATIONS: { value: InventoryLocation; label: string }[] = [
  { value: 'kitchen', label: '廚房' },
  { value: 'bathroom', label: '浴室' },
  { value: 'bedroom', label: '睡房' },
  { value: 'storage', label: '儲物室' },
  { value: 'other', label: '其他' },
]

export default function InventoryItemForm({ item, categories, onSave, onClose }: Props) {
  const [name, setName] = useState(item?.name || '')
  const [brand, setBrand] = useState(item?.brand || '')
  const [categoryId, setCategoryId] = useState(item?.category_id || '')
  const [unit, setUnit] = useState<InventoryUnit>(item?.unit || 'pcs')
  const [quantity, setQuantity] = useState(item?.quantity?.toString() || '0')
  const [minQuantity, setMinQuantity] = useState(item?.min_quantity?.toString() || '1')
  const [location, setLocation] = useState<InventoryLocation>(item?.location || 'kitchen')
  const [expiryDate, setExpiryDate] = useState(item?.expiry_date?.slice(0, 10) || '')
  const [notes, setNotes] = useState(item?.notes || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      brand: brand.trim() || undefined,
      category_id: categoryId || null,
      unit,
      quantity: Number(quantity),
      min_quantity: Number(minQuantity),
      location,
      expiry_date: expiryDate || null,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {item ? '編輯物品' : '新增物品'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">物品名稱 *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例：米、洗碗精..."
              required
              autoFocus
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Brand */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">品牌（選填）</label>
            <input
              type="text"
              value={brand}
              onChange={e => setBrand(e.target.value)}
              placeholder="例：家樂氏、白貓..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">類別</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">未分類</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          {/* Unit + Quantity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">單位</label>
              <select
                value={unit}
                onChange={e => setUnit(e.target.value as InventoryUnit)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {UNITS.map(u => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">現有數量</label>
              <input
                type="number"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                min="0"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Min quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              最低存量
              <span className="text-xs text-gray-400 font-normal ml-1">（低於此數量會顯示需補貨）</span>
            </label>
            <input
              type="number"
              value={minQuantity}
              onChange={e => setMinQuantity(e.target.value)}
              min="0"
              step="0.1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">存放位置</label>
            <div className="flex gap-2 flex-wrap">
              {LOCATIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLocation(value)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    location === value
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Expiry date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">到期日（選填）</label>
            <input
              type="date"
              value={expiryDate}
              onChange={e => setExpiryDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">備注（選填）</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="採購連結、特別說明..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              {item ? '儲存' : '新增'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
