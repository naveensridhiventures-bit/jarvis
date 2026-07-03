import { useEffect, useRef } from 'react'

// Foreground-only reminders: while the app is open, checks pending tasks every 20s
// and fires a browser Notification + speaks a nudge once a task's date/time hits.
// NOTE: like wake-word listening, this can't fire in the background — that needs a
// service worker with scheduled push, which is a native-build (Capacitor) phase item.
export function useReminders({ tasks, enabled, onDue }) {
  const firedRef = useRef(new Set()) // titles already reminded this session, avoid repeat spam

  useEffect(() => {
    if (!enabled) return
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    const check = () => {
      const now = new Date()
      tasks
        .filter((t) => t.status !== 'done' && t.date && t.time)
        .forEach((t) => {
          const due = new Date(`${t.date}T${t.time}:00`)
          const key = `${t.title}|${t.date}|${t.time}`
          const withinWindow = now >= due && now - due < 5 * 60 * 1000 // fire within a 5-min window after due time
          if (withinWindow && !firedRef.current.has(key)) {
            firedRef.current.add(key)
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('ARIA reminder', { body: t.title, icon: '/icons/icon-192.png' })
            }
            onDue?.(t)
          }
        })
    }

    check()
    const id = setInterval(check, 20000)
    return () => clearInterval(id)
  }, [tasks, enabled, onDue])
}
