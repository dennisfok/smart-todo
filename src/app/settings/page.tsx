'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { Save, Check } from 'lucide-react'

const DAYS = [
  { value: 0, label: '日' },
  { value: 1, label: '一' },
  { value: 2, label: '二' },
  { value: 3, label: '三' },
  { value: 4, label: '四' },
  { value: 5, label: '五' },
  { value: 6, label: '六' },
]

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [workStart, setWorkStart] = useState('09:00')
  const [workEnd, setWorkEnd] = useState('18:00')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetch('/api/settings').then(r => r.json()).then(data => {
        if (data.work_days) setWorkDays(data.work_days)
        if (data.work_start) setWorkStart(data.work_start)
        if (data.work_end) setWorkEnd(data.work_end)
      })
    }
  }, [session])

  const toggleDay = (day: number) => {
    setWorkDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        work_days: workDays,
        work_start: workStart,
        work_end: workEnd,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  if (status === 'loading') {
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
          <h1 className="text-2xl font-bold text-gray-900 mb-8">設定</h1>

          <div className="space-y-6">
            {/* Work Hours */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-1">工作時間</h2>
              <p className="text-sm text-gray-500 mb-5">智能排程只會在工作時間內安排任務</p>

              {/* Work days */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">工作日</label>
                <div className="flex gap-2">
                  {DAYS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => toggleDay(value)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                        workDays.includes(value)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">開始時間</label>
                  <input
                    type="time"
                    value={workStart}
                    onChange={e => setWorkStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">結束時間</label>
                  <input
                    type="time"
                    value={workEnd}
                    onChange={e => setWorkEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Account */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-1">帳號</h2>
              <p className="text-sm text-gray-500 mb-4">已連接 Google 帳號，Calendar 同步已啟用</p>
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-800">{session?.user?.email}</p>
                  <p className="text-xs text-green-600">Google Calendar 已授權</p>
                </div>
              </div>
            </div>

            {/* iOS Reminders */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-1">iOS Reminders 整合</h2>
              <p className="text-sm text-gray-500 mb-4">透過 Apple Shortcuts 橋接到 iOS 提醒事項</p>
              <div className="p-4 bg-blue-50 rounded-xl text-sm text-blue-700 space-y-2">
                <p className="font-medium">設定步驟：</p>
                <ol className="list-decimal list-inside space-y-1 text-xs text-blue-600">
                  <li>在 iPhone 開啟「捷徑」App</li>
                  <li>建立新捷徑，加入「取得網頁內容」動作</li>
                  <li>URL 填入你的 app 網址 + /api/tasks</li>
                  <li>加入「建立提醒事項」動作</li>
                  <li>設定自動化，每天早上執行</li>
                </ol>
              </div>
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-colors ${
                saved
                  ? 'bg-green-600 text-white'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? '已儲存！' : saving ? '儲存中...' : '儲存設定'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
