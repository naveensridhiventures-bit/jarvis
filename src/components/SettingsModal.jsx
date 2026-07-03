import { useEffect, useState } from 'react'

export default function SettingsModal({ open, onClose, settings, onSave }) {
  const [apiKey, setApiKey] = useState(settings.apiKey || '')
  const [scriptUrl, setScriptUrl] = useState(settings.scriptUrl || '')
  const [wakeEnabled, setWakeEnabled] = useState(settings.wakeEnabled || false)
  const [wakeWord, setWakeWord] = useState(settings.wakeWord || 'dexter')
  const [userName, setUserName] = useState(settings.userName || '')
  const [voiceURI, setVoiceURI] = useState(settings.voiceURI || '')
  const [sttLang, setSttLang] = useState(settings.sttLang || 'en-IN')
  const [continuousConvo, setContinuousConvo] = useState(settings.continuousConvo || false)
  const [tamilVoices, setTamilVoices] = useState([])

  useEffect(() => {
    if (!open) return
    const loadVoices = () => {
      const all = window.speechSynthesis?.getVoices() || []
      setTamilVoices(all.filter((v) => v.lang?.toLowerCase().startsWith('ta')))
    }
    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
  }, [open])

  if (!open) return null

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className="hud-label" style={{ marginBottom: 18 }}>SETTINGS</div>

        <label style={styles.label}>Your Name</label>
        <input
          style={styles.input}
          type="text"
          placeholder="e.g. Naveen"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
        />
        <p style={styles.hint}>ARIA will address you by this name — like Jarvis calling Tony "Sir."</p>

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

        <label style={styles.label}>Speech Input Language</label>
        <select style={styles.input} value={sttLang} onChange={(e) => setSttLang(e.target.value)}>
          <option value="en-IN">English</option>
          <option value="ta-IN">Tamil</option>
        </select>
        <p style={styles.hint}>
          The mic can only listen in one language at a time — switch this depending on what you're about
          to say. ARIA will reply in that same language.
        </p>

        <label style={styles.label}>Tamil Voice</label>
        <select style={styles.input} value={voiceURI} onChange={(e) => setVoiceURI(e.target.value)}>
          <option value="">Auto-select</option>
          {tamilVoices.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name} {v.localService ? '· on-device' : '· online'}
            </option>
          ))}
        </select>
        {tamilVoices.length === 0 ? (
          <p style={{ ...styles.hint, color: 'var(--amber)' }}>
            No Tamil voice found on this device. Go to Settings → System → Languages →
            Text-to-speech output → Install voice data → download Tamil, then reopen this page.
          </p>
        ) : (
          <p style={styles.hint}>
            For clearer pronunciation, prefer "Google" voices where available — they're clearer than
            Samsung/System default voices.
          </p>
        )}

        <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
          <input type="checkbox" checked={wakeEnabled} onChange={(e) => setWakeEnabled(e.target.checked)} />
          Wake word listening (foreground only)
        </label>

        {wakeEnabled && (
          <>
            <label style={styles.label}>Wake Word</label>
            <input
              style={styles.input}
              type="text"
              placeholder="e.g. dexter"
              value={wakeWord}
              onChange={(e) => setWakeWord(e.target.value)}
            />
            <p style={styles.hint}>Say this word to wake ARIA up and start listening — no need to tap the mic first.</p>
          </>
        )}
        <p style={styles.hint}>
          Listens continuously for "{wakeWord || 'dexter'}" while the app is open and the screen is on. True
          background wake-word needs the Capacitor + Porcupine native build — see README.
        </p>

        <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
          <input type="checkbox" checked={continuousConvo} onChange={(e) => setContinuousConvo(e.target.checked)} />
          Continuous conversation mode
        </label>
        <p style={styles.hint}>
          After ARIA replies, it automatically starts listening again for your next line — no need to tap or say
          the wake word between turns. Tap the mic to interrupt/stop anytime.
        </p>

        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            style={styles.saveBtn}
            onClick={() => {
              onSave({ apiKey, scriptUrl, wakeEnabled, wakeWord, userName, voiceURI, sttLang, continuousConvo })
              onClose()
            }}
          >
            Save
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
