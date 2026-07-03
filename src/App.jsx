import { useCallback, useEffect, useState } from 'react'
import JarvisOrb from './components/JarvisOrb.jsx'
import StatusBar from './components/StatusBar.jsx'
import TaskPanel from './components/TaskPanel.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import { useVoice } from './hooks/useVoice.js'
import { askAria } from './services/gemini.js'
import { addTask, listTasks, completeTask } from './services/sheets.js'

const STATE_LABEL = {
  idle: 'Tap · Speak',
  listening: 'Listening...',
  thinking: 'Thinking...',
  speaking: 'Speaking...',
}

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem('aria_settings') || '{}')
  } catch {
    return {}
  }
}

export default function App() {
  const [settings, setSettings] = useState(loadSettings)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tasksOpen, setTasksOpen] = useState(false)
  const [tasks, setTasks] = useState([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [reply, setReply] = useState('')
  const [error, setError] = useState(null)

  const refreshTasks = useCallback(async () => {
    if (!settings.scriptUrl) return
    setTasksLoading(true)
    try {
      const t = await listTasks(settings.scriptUrl)
      setTasks(t)
    } catch (e) {
      console.warn(e)
    } finally {
      setTasksLoading(false)
    }
  }, [settings.scriptUrl])

  const handleFinalTranscript = useCallback(
    async (text) => {
      if (!text) return
      if (!settings.apiKey) {
        setError('Add your Gemini API Key in Settings')
        setSettingsOpen(true)
        return
      }
      try {
        const result = await askAria({
          apiKey: settings.apiKey,
          userText: text,
          taskContext: tasks.filter((t) => t.status !== 'done').slice(0, 10),
          userName: settings.userName,
        })

        if (result.action === 'add_task' && result.task?.title && settings.scriptUrl) {
          await addTask(settings.scriptUrl, result.task)
          refreshTasks()
        } else if (result.action === 'complete_task' && result.task?.title && settings.scriptUrl) {
          await completeTask(settings.scriptUrl, result.task.title)
          refreshTasks()
        } else if (result.action === 'list_tasks') {
          refreshTasks()
        }

        setReply(result.reply)
        await speak(result.reply, settings.voiceURI)
      } catch (e) {
        console.error(e)
        setError('Sorry, something went wrong.')
        await speak('Sorry, something went wrong.', settings.voiceURI)
      }
    },
    [settings, tasks, refreshTasks]
  )

  const { state, amplitude, liveText, listenOnce, speak, supported } = useVoice({
    onFinalTranscript: handleFinalTranscript,
    wakeEnabled: settings.wakeEnabled,
    sttLang: settings.sttLang || 'en-IN',
  })

  useEffect(() => {
    refreshTasks()
  }, [refreshTasks])

  useEffect(() => {
    setReply(settings.userName ? `Hi ${settings.userName}, how can I help today?` : 'How can I help you today?')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // warm up voice list (Chrome loads voices async)
    window.speechSynthesis?.getVoices()
  }, [])

  const saveSettings = (next) => {
    setSettings(next)
    localStorage.setItem('aria_settings', JSON.stringify(next))
  }

  return (
    <div style={styles.app}>
      <StatusBar
        online={!!settings.apiKey}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenTasks={() => setTasksOpen(true)}
      />

      <div style={styles.main}>
        <JarvisOrb state={state} amplitude={amplitude} />

        <div className="hud-label" style={styles.stateLabel}>{STATE_LABEL[state]}</div>

        <div style={styles.transcriptBox}>
          {state === 'listening' && liveText && (
            <p className="tamil" style={styles.liveText}>{liveText}</p>
          )}
          {state !== 'listening' && (
            <p className="tamil" style={styles.replyText}>{error || reply}</p>
          )}
        </div>
      </div>

      <div style={styles.footer}>
        {!supported && (
          <p style={styles.warnText}>This browser doesn't support voice recognition. Please use Chrome for Android.</p>
        )}
        <button
          style={{ ...styles.micBtn, ...(state === 'listening' ? styles.micBtnActive : {}) }}
          onClick={() => {
            setError(null)
            listenOnce()
          }}
          disabled={!supported || state === 'thinking'}
        >
          <MicIcon />
        </button>
      </div>

      <TaskPanel
        open={tasksOpen}
        onClose={() => setTasksOpen(false)}
        tasks={tasks}
        loading={tasksLoading}
        onComplete={async (title) => {
          if (!settings.scriptUrl) return
          await completeTask(settings.scriptUrl, title)
          refreshTasks()
        }}
        onRefresh={refreshTasks}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSave={saveSettings}
      />
    </div>
  )
}

function MicIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M19 11a7 7 0 0 1-14 0M12 18v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

const styles = {
  app: { height: '100dvh', display: 'flex', flexDirection: 'column' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', gap: 22 },
  stateLabel: { color: 'var(--cyan)', fontSize: 12 },
  transcriptBox: { minHeight: 70, maxWidth: 320, textAlign: 'center' },
  liveText: { fontSize: 17, color: 'var(--text-primary)', lineHeight: 1.5 },
  replyText: { fontSize: 16, color: 'var(--text-dim)', lineHeight: 1.6 },
  warnText: { color: 'var(--amber)', fontSize: 12, textAlign: 'center', marginBottom: 12, maxWidth: 280 },
  footer: { display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 'calc(28px + env(safe-area-inset-bottom))' },
  micBtn: {
    width: 68, height: 68, borderRadius: '50%',
    background: 'var(--bg-panel)', border: '1.5px solid var(--line-strong)',
    color: 'var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 0 24px rgba(79,227,255,0.15)',
  },
  micBtnActive: {
    background: 'var(--cyan)', color: '#04141a',
    boxShadow: '0 0 34px rgba(79,227,255,0.55)',
  },
}
