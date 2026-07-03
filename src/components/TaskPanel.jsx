import { useState } from 'react'

export default function TaskPanel({ open, onClose, tasks, loading, onComplete, onDelete, onEdit, onRefresh }) {
  const [editingTitle, setEditingTitle] = useState(null) // original title of task being edited
  const [draft, setDraft] = useState({ title: '', date: '', time: '', notes: '' })

  const startEdit = (t) => {
    setEditingTitle(t.title)
    setDraft({ title: t.title, date: t.date || '', time: t.time || '', notes: t.notes || '' })
  }

  const cancelEdit = () => {
    setEditingTitle(null)
  }

  const saveEdit = async () => {
    if (!draft.title.trim()) return
    await onEdit(editingTitle, {
      title: draft.title.trim(),
      date: draft.date,
      time: draft.time,
      notes: draft.notes
    })
    setEditingTitle(null)
  }

  return (
    <div style={{ ...styles.overlay, pointerEvents: open ? 'auto' : 'none', opacity: open ? 1 : 0 }} onClick={onClose}>
      <div
        style={{ ...styles.panel, transform: open ? 'translateX(0)' : 'translateX(-100%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.header}>
          <span className="hud-label">TASKS · SCHEDULE</span>
          <button onClick={onRefresh} style={styles.refreshBtn}>↻</button>
        </div>

        {loading && <div style={styles.empty}>Loading...</div>}
        {!loading && tasks.length === 0 && (
          <div style={styles.empty}>No tasks yet. Try saying "Remind me to study at 6 tomorrow."</div>
        )}

        <div style={styles.list}>
          {tasks.map((t, i) => {
            const isEditing = editingTitle === t.title
            return (
              <div key={i} style={{ ...styles.item, opacity: t.status === 'done' ? 0.4 : 1 }}>
                {isEditing ? (
                  <div style={{ flex: 1 }}>
                    <input
                      style={styles.editInput}
                      value={draft.title}
                      onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                      placeholder="Title"
                    />
                    <div style={styles.editRow}>
                      <input
                        style={{ ...styles.editInput, flex: 1 }}
                        type="date"
                        value={draft.date}
                        onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                      />
                      <input
                        style={{ ...styles.editInput, flex: 1 }}
                        type="time"
                        value={draft.time}
                        onChange={(e) => setDraft({ ...draft, time: e.target.value })}
                      />
                    </div>
                    <input
                      style={styles.editInput}
                      value={draft.notes}
                      onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                      placeholder="Notes (optional)"
                    />
                    <div style={styles.editActions}>
                      <button style={styles.smallBtn} onClick={cancelEdit}>Cancel</button>
                      <button style={{ ...styles.smallBtn, ...styles.saveSmallBtn }} onClick={saveEdit}>Save</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => onComplete(t.title)}
                      style={{ ...styles.check, borderColor: t.status === 'done' ? 'var(--cyan)' : 'var(--line-strong)' }}
                    >
                      {t.status === 'done' ? '✓' : ''}
                    </button>
                    <div style={{ flex: 1 }}>
                      <div className="tamil" style={{ ...styles.title, textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>
                        {t.title}
                      </div>
                      <div style={styles.meta}>
                        {[t.date, t.time].filter(Boolean).join(' · ') || 'No time specified'}
                      </div>
                    </div>
                    <div style={styles.itemActions}>
                      <button aria-label="Edit task" style={styles.iconSmallBtn} onClick={() => startEdit(t)}>✎</button>
                      <button aria-label="Delete task" style={styles.iconSmallBtn} onClick={() => onDelete(t.title)}>🗑</button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    transition: 'opacity 0.25s ease', zIndex: 30,
  },
  panel: {
    position: 'absolute', top: 0, left: 0, bottom: 0, width: '82%', maxWidth: 340,
    background: 'var(--bg-panel)', borderRight: '1px solid var(--line)',
    padding: '24px 18px', transition: 'transform 0.28s ease', overflowY: 'auto',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  refreshBtn: { background: 'transparent', border: 'none', color: 'var(--cyan)', fontSize: 16 },
  empty: { color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.6, marginTop: 20 },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  item: { display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--bg-panel-raised)', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--line)' },
  check: { width: 20, height: 20, borderRadius: 6, border: '1.5px solid', background: 'transparent', color: 'var(--cyan)', fontSize: 12, flexShrink: 0, marginTop: 2 },
  title: { fontSize: 15, fontWeight: 500 },
  meta: { fontSize: 11.5, color: 'var(--text-dim)', marginTop: 4, fontFamily: 'var(--font-body)' },
  itemActions: { display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 },
  iconSmallBtn: { background: 'transparent', border: '1px solid var(--line)', color: 'var(--text-dim)', width: 26, height: 26, borderRadius: 7, fontSize: 12 },
  editInput: { width: '100%', background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 8, padding: '7px 9px', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-body)', marginBottom: 6 },
  editRow: { display: 'flex', gap: 6 },
  editActions: { display: 'flex', gap: 8, marginTop: 4 },
  smallBtn: { flex: 1, padding: '7px 0', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--text-dim)', fontSize: 12.5 },
  saveSmallBtn: { border: 'none', background: 'var(--cyan)', color: '#04141a', fontWeight: 700 },
}
