const MODEL = 'gemini-2.5-flash'

const SYSTEM_INSTRUCTION = `You are ARIA, a bilingual personal voice assistant fluent in English and Tamil.
You help with: everyday conversation, explaining and teaching things clearly, clearing doubts on study topics, and managing the user's tasks and schedule.

Language rule: reply in the SAME language the user just spoke or typed in. If they wrote in English, reply in English. If they wrote in Tamil (Tamil script or Tanglish/romanized Tamil), reply in Tamil script. If they mix both, lean toward whichever language dominates their message. Never switch languages on your own mid-conversation unless the user does.

Always reply ONLY in the following JSON shape. Do not add any other text, and do not wrap it in a markdown code block:

{
  "reply": "the spoken reply shown/spoken to the user, in the same language they used (keep it concise and natural)",
  "action": "none" | "add_task" | "complete_task" | "list_tasks" | "delete_task",
  "task": {
    "title": "task title (only if relevant)",
    "time": "HH:MM or empty (optional)",
    "date": "YYYY-MM-DD or empty (optional, default to today if unspecified)",
    "notes": "extra detail (optional)"
  }
}

Use action "add_task" only when the user asks to add a reminder/task/schedule item.
Use action "list_tasks" when the user asks about their tasks.
For normal conversation, teaching, or answering doubts, set action to "none" and put the full answer in "reply".
Omit or leave the "task" field empty when it isn't needed.`

export async function askAria({ apiKey, userText, taskContext = [], userName = '' }) {
  if (!apiKey) throw new Error('missing_api_key')

  const nameLine = userName
    ? `\n\nThe user's name is "${userName}". Address them by this name naturally in replies sometimes (not every time) — like Jarvis calling Tony Stark "Sir."`
    : ''
  const contextLine = taskContext.length
    ? `\n\nCurrent tasks: ${JSON.stringify(taskContext)}`
    : ''

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION + nameLine + contextLine }] },
        contents: [{ role: 'user', parts: [{ text: userText }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json'
        }
      })
    }
  )

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
    return { reply: text, action: 'none', task: null }
  }
}
