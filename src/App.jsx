import { useCallback, useEffect, useRef, useState } from 'react'
import JarvisOrb from './components/JarvisOrb.jsx'
import StatusBar from './components/StatusBar.jsx'
import TaskPanel from './components/TaskPanel.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import TranscriptLog from './components/TranscriptLog.jsx'
import { useVoice } from './hooks/useVoice.js'
import { useReminders } from './hooks/useReminders.js'
import { askAriaStream } from './services/gemini.js'
import { addTask, listTasks, completeTask, deleteTask, updateTask } from './services/sheets.js'

const STATE_LABEL = {
  idle: 'Tap · Speak',
  listening: 'Listening...',
  thinking: 'Thinking...',
  speaking: 'Speaking...',
}

const HISTORY_KEY = 'aria_history'
const TRANSCRIPT_KEY = 'aria_transcript'

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem('aria_settings') || '{}')
  } catch {
    return {}
  }
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

function loadTranscript() {
  try {
    return JSON.parse(localStorage.getItem(TRANSCRIPT_KEY) || '[]')
  } catch {
    return []
  }
}

function timeLabel() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function App() {
  const [settings, setSettings] = useState(loadSettings)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tasksOpen, setTasksOpen] = useState(false)
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const [tasks, setTasks] = useState([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [reply, setReply] = useState('')
  const [error, setError] = useState(null)
  const [mood, setMood] = useState('neutral')
  const [transcript, setTranscript] = useState(loadTranscript)
  const [installPrompt, setInstallPrompt] = useState(null)

  // running conversation memory: [{ role: 'user'|'model', text }] — persisted so a reload
  // (or losing/regaining signal) doesn't wipe ARIA's short-term memory of the chat
  const historyRef = useRef(loadHistory())
  const listenOnceRef = useRef(() => {})

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

  const appendTranscript = useCallback((role, text) => {
    setTranscript((prev) => {
      const next = [...prev, { role, text, time: timeLabel() }].slice(-200) // cap so localStorage doesn't grow unbounded
      localStorage.setItem(TRANSCRIPT_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const persistHistory = useCallback((next) => {
    historyRef.current = next
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
    } catch {
      /* storage full or unavailable — memory still works for this session */
    }
  }, [])

  const handleFinalTranscript = useCallback(
    async (text) => {
      if (!text) return
      if (!settings.apiKey) {
        setError('Add your Gemini API Key in Settings')
        setSettingsOpen(true)
        return
      }
      appendTranscript('user', text)

      let spokenEarly = false

      try {
        const result = await askAriaStream({
          apiKey: settings.apiKey,
          userText: text,
          history: historyRef.current,
          taskContext: tasks.filter((t) => t.status !== 'done').slice(0, 10),
          userName: settings.userName,
          onRateLimited: (waitSec) => {
            setError(`ARIA is briefly rate-limited — retrying in ${Math.ceil(waitSec)}s...`)
          },
          onRetrying: (waitSec, attempt, maxAttempts) => {
            setError(`ARIA's model is overloaded — retrying (${attempt}/${maxAttempts - 1})...`)
          },
          onPartialReply: async (partialText) => {
            // start speaking as soon as we have the reply text, well before action/task/mood finish streaming
            spokenEarly = true
            setError(null)
            setReply(partialText)
            await speak(partialText, settings.voiceURI)
          },
        })

        // remember this exchange so the next turn has context
        persistHistory([
          ...historyRef.current,
          { role: 'user', text },
          { role: 'model', text: JSON.stringify(result) },
        ])

        if (result.mood) setMood(result.mood)
        appendTranscript('aria', result.reply)

        if (result.action === 'add_task' && result.task?.title && settings.scriptUrl) {
          await addTask(settings.scriptUrl, result.task)
          refreshTasks()
        } else if (result.action === 'complete_task' && result.task?.title && settings.scriptUrl) {
          await completeTask(settings.scriptUrl, result.task.title)
          refreshTasks()
        } else if (result.action === 'delete_task' && result.task?.title && settings.scriptUrl) {
          await deleteTask(settings.scriptUrl, result.task.title)
          refreshTasks()
        } else if (result.action === 'list_tasks') {
          refreshTasks()
        }

        setReply(result.reply)

        // only speak here if the streamed partial-reply path never fired (e.g. it fell back to non-streaming)
        if (!spokenEarly) {
          await speak(result.reply, settings.voiceURI)
        }

        // continuous conversation: keep listening for a natural follow-up without needing another tap/wake word
        if (settings.continuousConvo) {
          listenOnceRef.current()
        }
      } catch (e) {
        console.error(e)
        setError('Sorry, something went wrong.')
        await speak('Sorry, something went wrong.', settings.voiceURI)
      }
    },
    [settings, tasks, refreshTasks, appendTranscript, persistHistory]
  )

  const { state, amplitude, liveText, listenOnce, speak, supported } = useVoice({
    onFinalTranscript: handleFinalTranscript,
    wakeEnabled: settings.wakeEnabled,
    wakeWord: settings.wakeWord || 'dexter',
    sttLang: settings.sttLang || 'en-IN',
  })

  useEffect(() => {
    listenOnceRef.current = listenOnce
  }, [listenOnce])

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

  // capture the "Add to Home Screen" prompt so we can trigger it from our own button
  // instead of relying on the browser's own (easy-to-miss) mini-infobar
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallClick = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  useReminders({
    tasks,
    enabled: settings.remindersEnabled ?? true,
    onDue: async (task) => {
      const line = `Reminder: ${task.title}${task.time ? ` at ${task.time}` : ''}.`
      appendTranscript('aria', line)
      if (state !== 'listening') {
        await speak(line, settings.voiceURI)
      }
    },
  })

  const saveSettings = (next) => {
    setSettings(next)
    localStorage.setItem('aria_settings', JSON.stringify(next))
  }

  const startNewConversation = () => {
    persistHistory([])
    setError(null)
    setMood('neutral')
    setReply(settings.userName ? `Fresh start, ${settings.userName}. What's up?` : "Fresh start. What's up?")
  }

  const clearTranscript = () => {
    setTranscript([])
    localStorage.removeItem(TRANSCRIPT_KEY)
  }

  return (
    <div style={styles.app}>
      <StatusBar
        online={!!settings.apiKey}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenTasks={() => setTasksOpen(true)}
        onOpenTranscript={() => setTranscriptOpen(true)}
        onNewConversation={startNewConversation}
        canInstall={!!installPrompt}
        onInstall={handleInstallClick}
      />

      <div style={styles.main}>
        <JarvisOrb state={state} amplitude={amplitude} mood={mood} />

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
            if (state === 'speaking') {
              window.speechSynthesis?.cancel() // barge-in: stop ARIA talking and listen right away
            }
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
        onDelete={async (title) => {
          if (!settings.scriptUrl) return
          await deleteTask(settings.scriptUrl, title)
          refreshTasks()
        }}
        onEdit={async (originalTitle, task) => {
          if (!settings.scriptUrl) return
          await updateTask(settings.scriptUrl, originalTitle, task)
          refreshTasks()
        }}
        onRefresh={refreshTasks}
      />

      <TranscriptLog
        open={transcriptOpen}
        onClose={() => setTranscriptOpen(false)}
        entries={transcript}
        onClear={clearTranscript}
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
