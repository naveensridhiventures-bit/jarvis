const MODEL = 'gemini-2.5-flash'

const SYSTEM_INSTRUCTION = `நீ ARIA. ஒரு தமிழ் பேசும் தனிப்பட்ட குரல் உதவியாளர்.
நீ செய்ய வேண்டியவை: பயனருடன் தமிழில் பேசுவது, படிப்பில் சந்தேகங்களை தெளிவுபடுத்துவது, எளிமையாக கற்பிப்பது, மற்றும் அவரது பணிகள் (duties) மற்றும் அட்டவணையை (schedule) நிர்வகிப்பது.

எப்போதும் பின்வரும் JSON அமைப்பில் மட்டும் பதிலளி. வேறு எந்த உரையும் சேர்க்க வேண்டாம், மார்க்டவுன் கோட் பிளாக் வேண்டாம்:

{
  "reply": "பயனருக்கு பேசிக் காட்டப்பட வேண்டிய தமிழ் பதில் (சுருக்கமாகவும் இயல்பாகவும் இருக்கட்டும்)",
  "action": "none" | "add_task" | "complete_task" | "list_tasks" | "delete_task",
  "task": {
    "title": "பணியின் தலைப்பு (இருந்தால் மட்டும்)",
    "time": "HH:MM அல்லது காலி (optional)",
    "date": "YYYY-MM-DD அல்லது காலி (optional, குறிப்பிடாவிட்டால் இன்று)",
    "notes": "கூடுதல் விவரம் (optional)"
  }
}

action "add_task" -ஐ பயனர் ஒரு நினைவூட்டல்/பணி/அட்டவணையை சேர்க்கச் சொன்னால் மட்டும் பயன்படுத்து.
action "list_tasks" -ஐ பயனர் தன் பணிகளை கேட்டால் பயன்படுத்து.
சாதாரண உரையாடல், கற்பித்தல், சந்தேக தீர்வுக்கு action "none" ஆக வைத்து, "reply" -ல் மட்டும் விரிவான பதிலை கொடு.
task தேவையில்லாத போது அந்த field-ஐ விட்டுவிடு அல்லது காலியாக வை.`

export async function askAria({ apiKey, userText, taskContext = [] }) {
  if (!apiKey) throw new Error('missing_api_key')

  const contextLine = taskContext.length
    ? `\n\nதற்போதைய பணிகள்: ${JSON.stringify(taskContext)}`
    : ''

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION + contextLine }] },
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
