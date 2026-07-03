import { useEffect, useState } from 'react'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function StatusBar({ online, onOpenSettings, onOpenTasks, onNewConversation }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 15)
    return () => clearInterval(t)
  }, [])

  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  const dateStr = `${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}`

  return (
    <div style={styles.bar}>
      <div style={styles.left}>
        <span style={{ ...styles.dot, background: online ? '#4fe3ff' : '#5c7a8a' }} />
        <span className="hud-label">{online ? 'ARIA ONLINE' : 'OFFLINE'}</span>
      </div>

      <div style={styles.center}>
        <div style={styles.time}>{timeStr}</div>
        <div style={styles.date}>{dateStr}</div>
      </div>

      <div style={styles.right}>
        <button aria-label="New conversation" onClick={onNewConversation} style={styles.iconBtn}>+</button>
        <button aria-label="Tasks" onClick={onOpenTasks} style={styles.iconBtn}>☰</button>
        <button aria-label="Settings" onClick={onOpenSettings} style={styles.iconBtn}>⚙</button>
      </div>
    </div>
  )
}

const styles = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 20px 10px',
  },
  left: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 90 },
  dot: { width: 7, height: 7, borderRadius: '50%', boxShadow: '0 0 8px currentColor' },
  center: { textAlign: 'center' },
  time: { fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: '0.08em', color: 'var(--text-primary)' },
  date: { fontSize: 12, color: 'var(--text-dim)', marginTop: 2 },
  right: { display: 'flex', gap: 8, minWidth: 90, justifyContent: 'flex-end' },
  iconBtn: {
    background: 'var(--bg-panel)',
    border: '1px solid var(--line)',
    color: 'var(--cyan)',
    width: 32,
    height: 32,
    borderRadius: 10,
    fontSize: 15,
  }
}
