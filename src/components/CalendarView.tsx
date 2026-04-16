'use client'

import { useEffect, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { CalendarEvent, Task } from '@/types'
import { format } from 'date-fns'

interface Props {
  tasks: Task[]
  googleEvents?: any[]
  onEventClick?: (task: Task) => void
  onDateClick?: (date: string) => void
}

const importanceColor = {
  high: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
  medium: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  low: { bg: '#dcfce7', border: '#22c55e', text: '#166534' },
}

export default function CalendarView({ tasks, googleEvents = [], onEventClick, onDateClick }: Props) {
  // Convert tasks to FullCalendar events
  const taskEvents: CalendarEvent[] = tasks
    .filter(t => t.start_time && !t.is_completed)
    .map(t => {
      const colors = importanceColor[t.importance]
      return {
        id: `task-${t.id}`,
        title: `${t.is_fixed ? '📌 ' : ''}${t.title}`,
        start: t.start_time!,
        end: t.end_time || undefined,
        backgroundColor: colors.bg,
        borderColor: colors.border,
        textColor: colors.text,
        extendedProps: { task: t },
      }
    })

  // Convert Google Calendar events
  const gcalEvents = googleEvents.map((e: any) => ({
    id: `gcal-${e.id}`,
    title: `🗓 ${e.summary || '(無標題)'}`,
    start: e.start?.dateTime || e.start?.date,
    end: e.end?.dateTime || e.end?.date,
    backgroundColor: '#ede9fe',
    borderColor: '#7c3aed',
    textColor: '#4c1d95',
  }))

  return (
    <div className="fc-wrapper">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        buttonText={{
          today: '今天',
          month: '月',
          week: '週',
          day: '日',
        }}
        locale="zh-tw"
        events={[...taskEvents, ...gcalEvents]}
        editable={false}
        selectable={true}
        height="auto"
        eventClick={(info) => {
          const task = info.event.extendedProps?.task
          if (task && onEventClick) onEventClick(task)
        }}
        dateClick={(info) => {
          if (onDateClick) onDateClick(info.dateStr)
        }}
        slotMinTime="07:00:00"
        slotMaxTime="23:00:00"
        allDaySlot={true}
        nowIndicator={true}
        eventContent={(arg) => (
          <div className="px-1 py-0.5 overflow-hidden">
            <div className="text-xs font-medium truncate">{arg.event.title}</div>
            {arg.timeText && <div className="text-xs opacity-75">{arg.timeText}</div>}
          </div>
        )}
      />
    </div>
  )
}
