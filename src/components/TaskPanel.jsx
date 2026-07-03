export default function TaskPanel({ open, onClose, tasks, loading, onComplete, onRefresh }) {
  return (
    <div style={{ ...styles.overlay, pointerEvents: open ? 'auto' : 'none', opacity: open ? 1 : 0 }} onClick={onClose}>
      <div
        style={{ ...styles.panel, transform: open ? 'translateX(0)' : 'translateX(-100%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.header}>
          <span className="hud-label">பணிகள் · SCHEDULE</span>
          <button onClick={onRefresh} style={styles.refreshBtn}>↻</button>
        </div>

        {loading && <div style={styles.empty}>ஏற்றுகிறது...</div>}
        {!loading && tasks.length === 0 && (
          <div style={styles.empty}>எந்த பணியும் இல்லை. "நாளைக்கு 6 மணிக்கு படிக்க நினைவூட்டு" என்று சொல்லி பாருங்கள்.</div>
        )}

        <div style={styles.list}>
          {tasks.map((t, i) => (
            <div key={i} style={{ ...styles.item, opacity: t.status === 'done' ? 0.4 : 1 }}>
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
                  {[t.date, t.time].filter(Boolean).join(' · ') || 'நேரம் குறிப்பிடப்படவில்லை'}
                </div>
              </div>
            </div>
          ))}
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
}
