import { google } from 'googleapis'
import { Task } from '@/types'

export function getCalendarClient(accessToken: string) {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  return google.calendar({ version: 'v3', auth })
}

export async function listUpcomingEvents(accessToken: string, calendarId = 'primary') {
  const calendar = getCalendarClient(accessToken)
  const now = new Date()
  const threeMonthsLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

  const res = await calendar.events.list({
    calendarId,
    timeMin: now.toISOString(),
    timeMax: threeMonthsLater.toISOString(),
    maxResults: 200,
    singleEvents: true,
    orderBy: 'startTime',
  })

  return res.data.items || []
}

export async function createCalendarEvent(
  accessToken: string,
  task: Task,
  calendarId = 'primary'
): Promise<string | null> {
  if (!task.start_time) return null

  const calendar = getCalendarClient(accessToken)

  const event = {
    summary: task.title,
    description: task.description || '',
    start: {
      dateTime: task.start_time,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: task.end_time || task.start_time,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    colorId: task.importance === 'high' ? '11' : task.importance === 'medium' ? '5' : '9',
  }

  const res = await calendar.events.insert({
    calendarId,
    requestBody: event,
  })

  return res.data.id || null
}

export async function updateCalendarEvent(
  accessToken: string,
  googleEventId: string,
  task: Task,
  calendarId = 'primary'
): Promise<void> {
  if (!task.start_time) return

  const calendar = getCalendarClient(accessToken)

  await calendar.events.update({
    calendarId,
    eventId: googleEventId,
    requestBody: {
      summary: task.title,
      description: task.description || '',
      start: {
        dateTime: task.start_time,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: task.end_time || task.start_time,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    },
  })
}

export async function deleteCalendarEvent(
  accessToken: string,
  googleEventId: string,
  calendarId = 'primary'
): Promise<void> {
  const calendar = getCalendarClient(accessToken)
  await calendar.events.delete({ calendarId, eventId: googleEventId })
}
