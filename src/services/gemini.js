const MODEL = 'gemini-2.5-flash-lite'

const SYSTEM_INSTRUCTION = `You are ARIA, a bilingual personal voice assistant fluent in English and Tamil.
You help with: everyday conversation, explaining and teaching things clearly, clearing doubts on study topics, and managing the user's tasks and schedule.

Language rule: reply in the SAME language the user just spoke or typed in. If they wrote in English, reply in English. If they wrote in Tamil (Tamil script or Tanglish/romanized Tamil), reply in Tamil script. If they mix both, lean toward whichever language dominates their message. Never switch languages on your own mid-conversation unless the user does.

You are given the user's current tasks and today's date/day-of-week in context. When the user asks things like "what's on my schedule today", "what do I have tomorrow", "anything pending this week" — filter/summarize the task list yourself using the date context rather than just listing everything.

Always reply ONLY in the following JSON shape. Do not add any other text, and do not wrap it in a markdown code block:

{
  "reply": "the spoken reply shown/spoken to the user, in the same language they used (keep it concise and natural)",
  "action": "none" | "add_task" | "complete_task" | "list_tasks" | "delete_task",
  "task": {
    "title": "task title (only if relevant)",
    "time": "HH:MM or empty (optional)",
    "date": "YYYY-MM-DD or empty (optional, default to today if unspecified)",
    "notes": "extra detail (optional)"
  },
  "mood": "neutral" | "happy" | "thinking" | "concerned" | "excited"
}

Use action "add_task" only when the user asks to add a reminder/task/schedule item.
Use action "list_tasks" when the user asks about their tasks.
For normal conversation, teaching, or answering doubts, set action to "none" and put the full answer in "reply".
Omit or leave the "task" field empty when it isn't needed.
Set "mood" to whatever best matches the emotional tone of your reply — this drives a visual indicator, so pick something genuine, not always "neutral".`

const MAX_HISTORY_TURNS = 16 // ~16 back-and-forths kept; older ones drop off to keep prompt size/cost sane

// Transient server-side errors (overloaded / temporarily unavailable) — worth a quick
// automatic retry with backoff, unlike 429s which need the server's suggested wait time.
const TRANSIENT_STATUS = new Set([500, 503])
const TRANSIENT_MAX_ATTEMPTS = 3 // 1 initial try + 2 retries
const TRANSIENT_BACKOFF_MS = [1000, 2000, 4000]

function buildRequestBody({ userText, history, taskContext, userName }) {
  const nameLine = userName
    ? `\n\nThe user's name is "${userName}". Address them by this name naturally in replies sometimes (not every time) — like Jarvis calling Tony Stark "Sir."`
    : ''
  const today = new Date()
  const dateLine = `\n\nToday's date is ${today.toISOString().slice(0, 10)} (${today.toLocaleDateString('en-US', { weekday: 'long' })}).`
  const contextLine = taskContext.length
    ? `\n\nCurrent tasks: ${JSON.stringify(taskContext)}`
    : ''

  const trimmedHistory = history.slice(-MAX_HISTORY_TURNS * 2)

  const contents = [
    ...trimmedHistory.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
    { role: 'user', parts: [{ text: userText }] }
  ]

  return {
    system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION + nameLine + dateLine + contextLine }] },
    contents,
    generationConfig: {
      temperature: 0.7,
      responseMimeType: 'application/json'
    }
  }
}

function parseRetryDelaySeconds(errText) {
  try {
    const parsed = JSON.parse(errText)
    const detail = parsed?.error?.details?.find((d) => d['@type']?.includes('RetryInfo'))
    const raw = detail?.retryDelay // e.g. "35s"
    if (raw) {
      const n = parseFloat(raw)
      if (!Number.isNaN(n)) return n
    }
  } catch {
    /* fall through */
  }
  return 15 // sane default if we can't parse the server's suggestion
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Non-streaming call with automatic retries:
 *  - 429 (rate limit): one retry, waiting however long the server tells us to (capped).
 *  - 500/503 (transient overload): up to 2 retries with exponential backoff.
 */
export async function askAria({ apiKey, userText, history = [], taskContext = [], userName = '', onRateLimited, onRetrying }) {
  if (!apiKey) throw new Error('missing_api_key')

  const body = buildRequestBody({ userText, history, taskContext, userName })
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`

  let rateLimitAttempt = 0
  let transientAttempt = 0

  while (true) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    if (res.status === 429 && rateLimitAttempt < 1) {
      const errText = await res.text()
      const waitSec = Math.min(parseRetryDelaySeconds(errText), 60)
      onRateLimited?.(waitSec)
      await sleep(waitSec * 1000)
      rateLimitAttempt += 1
      continue
    }

    if (TRANSIENT_STATUS.has(res.status) && transientAttempt < TRANSIENT_MAX_ATTEMPTS - 1) {
      const waitMs = TRANSIENT_BACKOFF_MS[transientAttempt] ?? 4000
      onRetrying?.(waitMs / 1000, transientAttempt + 1, TRANSIENT_MAX_ATTEMPTS)
      await sleep(waitMs)
      transientAttempt += 1
      continue
    }

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`gemini_error_${res.status}: ${errText}`)
    }

    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('empty_response')

    try {
      return JSON.parse(text)
    } catch {
      return { reply: text, action: 'none', task: null, mood: 'neutral' }
    }
  }
}

// Pulls out a usable "reply" string from a partial (still-streaming) JSON fragment,
// so we can start speaking before the full object (action/task/mood) has arrived.
function extractPartialReply(fragment) {
  const match = fragment.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/)
  if (!match) return null
  try {
    return JSON.parse(`"${match[1]}"`) // reuse JSON string-escaping rules to decode \n, \", etc.
  } catch {
    return null
  }
}

/**
 * Streaming call. Calls onPartialReply(text) as soon as the "reply" field is fully
 * available (even if action/task/mood are still streaming in), then returns the full
 * parsed result once the whole JSON object has arrived. Falls back to askAria
 * automatically on any network/parse failure, rate limit, or transient server error
 * (after its own short backoff retries here first).
 */
export async function askAriaStream({ apiKey, userText, history = [], taskContext = [], userName = '', onPartialReply, onRateLimited, onRetrying }) {
  if (!apiKey) throw new Error('missing_api_key')

  const body = buildRequestBody({ userText, history, taskContext, userName })
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`

  let res
  let transientAttempt = 0

  while (true) {
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
    } catch {
      // network-level failure — fall back to the non-streaming path entirely
      return askAria({ apiKey, userText, history, taskContext, userName, onRateLimited, onRetrying })
    }

    if (res.status === 429) {
      const errText = await res.text()
      const waitSec = Math.min(parseRetryDelaySeconds(errText), 60)
      onRateLimited?.(waitSec)
      await sleep(waitSec * 1000)
      return askAria({ apiKey, userText, history, taskContext, userName, onRateLimited, onRetrying })
    }

    if (TRANSIENT_STATUS.has(res.status) && transientAttempt < TRANSIENT_MAX_ATTEMPTS - 1) {
      const waitMs = TRANSIENT_BACKOFF_MS[transientAttempt] ?? 4000
      onRetrying?.(waitMs / 1000, transientAttempt + 1, TRANSIENT_MAX_ATTEMPTS)
      await sleep(waitMs)
      transientAttempt += 1
      continue
    }

    break
  }

  if (!res.ok || !res.body) {
    return askAria({ apiKey, userText, history, taskContext, userName, onRateLimited, onRetrying })
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let sseBuffer = ''
  let jsonAccum = ''
  let firedPartial = false

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      sseBuffer += decoder.decode(value, { stream: true })

      const events = sseBuffer.split('\n\n')
      sseBuffer = events.pop() // keep the last (possibly incomplete) chunk in the buffer

      for (const evt of events) {
        const line = evt.split('\n').find((l) => l.startsWith('data:'))
        if (!line) continue
        const payload = line.slice(5).trim()
        if (!payload || payload === '[DONE]') continue
        try {
          const chunk = JSON.parse(payload)
          const delta = chunk?.candidates?.[0]?.content?.parts?.[0]?.text
          if (delta) {
            jsonAccum += delta
            if (!firedPartial) {
              const partial = extractPartialReply(jsonAccum)
              if (partial) {
                firedPartial = true
                onPartialReply?.(partial)
              }
            }
          }
        } catch {
          // partial/malformed SSE chunk — skip, next chunk will likely complete it
        }
      }
    }
  } catch {
    // stream broke mid-way — try to salvage whatever JSON we accumulated below
  }

  try {
    const result = JSON.parse(jsonAccum)
    if (!result.mood) result.mood = 'neutral'
    return result
  } catch {
    // couldn't parse streamed JSON (got cut off, malformed, etc.) — fall back to a clean non-streaming call
    return askAria({ apiKey, userText, history, taskContext, userName, onRateLimited, onRetrying })
  }
}
