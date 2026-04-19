'use client'

import { useState } from 'react'
import { Worker } from '@/types'
import { X } from 'lucide-react'

interface Props {
  worker?: Worker | null
  onSave: (data: Partial<Worker>) => void
  onClose: () => void
}

const DAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

const NATIONALITIES = [
  '菲律賓', '印尼', '泰國', '印度', '斯里蘭卡', '尼泊爾', '孟加拉', '緬甸', '其他'
]

export default function WorkerForm({ worker, onSave, onClose }: Props) {
  const [name, setName] = useState(worker?.name || '')
  const [nationality, setNationality] = useState(worker?.nationality || '')
  const [phone, setPhone] = useState(worker?.phone || '')
  const [email, setEmail] = useState(worker?.email || '')
  const [startDate, setStartDate] = useState(worker?.start_date?.slice(0, 10) || '')
  const [contractEndDate, setContractEndDate] = useState(worker?.contract_end_date?.slice(0, 10) || '')
  const [salary, setSalary] = useState(worker?.salary?.toString() || '')
  const [restDay, setRestDay] = useState<number | ''>(worker?.rest_day ?? '')
  const [agencyName, setAgencyName] = useState(worker?.agency_name || '')
  const [passportNo, setPassportNo] = useState(worker?.passport_no || '')
  const [visaExpiry, setVisaExpiry] = useState(worker?.visa_expiry?.slice(0, 10) || '')
  const [notes, setNotes] = useState(worker?.notes || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    onSave({
      name: name.trim(),
      nationality: nationality || undefined,
      phone: phone || undefined,
      email: email || undefined,
      start_date: startDate || null,
      contract_end_date: contractEndDate || null,
      salary: salary ? Number(salary) : null,
      rest_day: restDay !== '' ? Number(restDay) : null,
      agency_name: agencyName || undefined,
      passport_no: passportNo || undefined,
      visa_expiry: visaExpiry || null,
      notes: notes || undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {worker ? '編輯傭工' : '新增傭工'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="傭工姓名"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
              required
            />
          </div>

          {/* Nationality + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">國籍</label>
              <select
                value={nationality}
                onChange={e => setNationality(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">選擇國籍</option>
                {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">電話</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="聯絡電話"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">電郵</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="電郵地址"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Start + Contract End */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">入職日期</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">合約到期</label>
              <input
                type="date"
                value={contractEndDate}
                onChange={e => setContractEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Salary + Rest Day */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">月薪（港元）</label>
              <input
                type="number"
                value={salary}
                onChange={e => setSalary(e.target.value)}
                placeholder="例：5000"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">休息日</label>
              <div className="flex gap-1 flex-wrap">
                {DAY_LABELS.map((label, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRestDay(restDay === idx ? '' : idx)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                      restDay === idx
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Agency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">職業介紹所</label>
            <input
              type="text"
              value={agencyName}
              onChange={e => setAgencyName(e.target.value)}
              placeholder="介紹所名稱"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Passport + Visa */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">護照號碼</label>
              <input
                type="text"
                value={passportNo}
                onChange={e => setPassportNo(e.target.value)}
                placeholder="護照號碼"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">簽證到期</label>
              <input
                type="date"
                value={visaExpiry}
                onChange={e => setVisaExpiry(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">備注</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="其他備注..."
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
              {worker ? '儲存' : '新增'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
