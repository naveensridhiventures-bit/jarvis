import { useState } from 'react'

export default function SettingsModal({ open, onClose, settings, onSave }) {
  const [apiKey, setApiKey] = useState(settings.apiKey || '')
  const [scriptUrl, setScriptUrl] = useState(settings.scriptUrl || '')
  const [wakeEnabled, setWakeEnabled] = useState(settings.wakeEnabled || false)

  if (!open) return null

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className="hud-label" style={{ marginBottom: 18 }}>SETTINGS</div>

        <label style={styles.label}>Gemini API Key</label>
        <input
          style={styles.input}
          type="password"
          placeholder="AIza..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <p style={styles.hint}>
          Free from{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={styles.link}>
            aistudio.google.com/apikey
          </a>. Never leaves your phone — sent directly to Google, not to any server of ours.
        </p>

        <label style={styles.label}>Google Sheets Script URL</label>
        <input
          style={styles.input}
          type="text"
          placeholder="https://script.google.com/macros/s/.../exec"
          value={scriptUrl}
          onChange={(e) => setScriptUrl(e.target.value)}
        />
        <p style={styles.hint}>See backend/APPS_SCRIPT_SETUP.md for the 5-minute setup.</p>

        <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
          <input type="checkbox" checked={wakeEnabled} onChange={(e) => setWakeEnabled(e.target.checked)} />
          Wake word listening (foreground only)
        </label>
        <p style={styles.hint}>
          Listens continuously for "ஆரியா" / "Jarvis" while the app is open and the screen is on. True background
          wake-word needs the Capacitor + Porcupine native build — see README.
        </p>

        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={onClose}>ரத்து</button>
          <button
            style={styles.saveBtn}
            onClick={() => {
              onSave({ apiKey, scriptUrl, wakeEnabled })
              onClose()
            }}
          >
            சேமி
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', zIndex: 40 },
  modal: { width: '100%', background: 'var(--bg-panel)', borderTop: '1px solid var(--line-strong)', borderRadius: '20px 20px 0 0', padding: '24px 20px 32px' },
  label: { display: 'block', fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 6, marginTop: 14 },
  input: { width: '100%', background: 'var(--bg-panel-raised)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'var(--font-body)' },
  hint: { fontSize: 11.5, color: 'var(--text-faint)', marginTop: 6, lineHeight: 1.5 },
  link: { color: 'var(--cyan)' },
  actions: { display: 'flex', gap: 10, marginTop: 24 },
  cancelBtn: { flex: 1, padding: '12px 0', borderRadius: 10, border: '1px solid var(--line)', background: 'transparent', color: 'var(--text-dim)' },
  saveBtn: { flex: 2, padding: '12px 0', borderRadius: 10, border: 'none', background: 'var(--cyan)', color: '#04141a', fontWeight: 700 },
}
