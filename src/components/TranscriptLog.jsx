export default function TranscriptLog({ open, onClose, entries, onClear }) {
  if (!open) return null

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <span className="hud-label">TRANSCRIPT</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={styles.textBtn} onClick={onClear}>Clear</button>
            <button style={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        {entries.length === 0 && <div style={styles.empty}>Nothing said yet this session.</div>}

        <div style={styles.list}>
          {entries.map((e, i) => (
            <div key={i} style={{ ...styles.bubble, ...(e.role === 'user' ? styles.userBubble : styles.ariaBubble) }}>
              <div style={styles.bubbleLabel}>{e.role === 'user' ? 'You' : 'ARIA'} · {e.time}</div>
              <div className="tamil" style={styles.bubbleText}>{e.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end', zIndex: 40 },
  panel: { width: '100%', maxHeight: '78vh', background: 'var(--bg-panel)', borderTop: '1px solid var(--line-strong)', borderRadius: '20px 20px 0 0', padding: '20px 18px 28px', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  textBtn: { background: 'transparent', border: '1px solid var(--line)', color: 'var(--text-dim)', fontSize: 12, borderRadius: 8, padding: '5px 10px' },
  closeBtn: { background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: 15 },
  empty: { color: 'var(--text-dim)', fontSize: 13, textAlign: 'center', marginTop: 30 },
  list: { display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' },
  bubble: { padding: '10px 13px', borderRadius: 12, maxWidth: '88%', border: '1px solid var(--line)' },
  userBubble: { alignSelf: 'flex-end', background: 'var(--bg-panel-raised)' },
  ariaBubble: { alignSelf: 'flex-start', background: 'rgba(79,227,255,0.08)' },
  bubbleLabel: { fontSize: 10.5, color: 'var(--text-faint)', marginBottom: 4, letterSpacing: '0.04em', textTransform: 'uppercase' },
  bubbleText: { fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5 },
}
