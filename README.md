# ARIA — Tamil Voice Assistant (Jarvis-style)

A React + Vite PWA voice assistant that speaks Tamil, teaches, clears doubts, and manages your
schedule in a free Google Sheet. Dark HUD interface with a live reactive orb — brighter/faster
when you talk, amber while thinking, cyan arcs while speaking.

## Run it locally

```bash
npm install
npm run dev
```

Open the printed URL on your phone (same wifi network) in **Chrome for Android** — Web Speech
API's Tamil recognition is Chrome/Android only, it won't work in Firefox or desktop Safari.

## One-time setup (both free)

1. **Gemini API key** — get one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey),
   no credit card. Paste it into the app's ⚙ Settings panel.
2. **Google Sheets backend** — follow `backend/APPS_SCRIPT_SETUP.md` (5 minutes), then paste the
   resulting web app URL into Settings too.

Both are stored only in your phone's local storage — nothing goes through a server of ours.

## Using it

- Tap the mic button, speak in Tamil, ARIA replies out loud and on screen.
- Say things like "நாளைக்கு காலை 7 மணிக்கு exercise பண்ண நினைவூட்டு" — it'll add a row to your Sheet.
- Tap ☰ to see/complete your task list any time.
- Every request also gets a plain conversational answer — ask it to explain a concept, clear a
  doubt, or just talk; it only touches the Sheet when you're clearly asking about tasks.

## Installing on your phone as an app

In Chrome for Android: menu (⋮) → **Add to Home screen**. It'll launch full-screen, no browser
chrome, like a real app.

## Building the full "always listening in the background" version

The web build you have now only listens for a wake word while the app is open and the screen is
on — that's a real limit of the web platform, not this code. To get true background/screen-off
listening like Jarvis, wrap this same React code with **Capacitor**:

```bash
npm install @capacitor/core @capacitor/android
npx cap init
npx cap add android
npm run build && npx cap sync
npx cap open android
```

Then in the generated Android project:
- Add a foreground service (persistent "ARIA listening" notification) so Android doesn't kill the mic.
- Swap the browser wake-word listener in `src/hooks/useVoice.js` for **Porcupine** (Picovoice's
  free personal tier) — it does real on-device wake-word detection and survives screen-off.
- Use the **Capacitor Local Notifications** plugin for reminders that fire even if the app is closed.

This later phase is a bigger lift than the web app — happy to scaffold the Capacitor wiring and
Porcupine integration next, once you've got the web version running the way you want.

## Project structure

```
src/
  components/
    JarvisOrb.jsx       the reactive HUD orb (canvas, audio-amplitude driven)
    StatusBar.jsx        top bar — time, date, status dot, settings
    TaskPanel.jsx         slide-in task/schedule list
    SettingsModal.jsx    API key + Sheets URL entry
  hooks/
    useVoice.js          Tamil STT/TTS + mic amplitude + wake-word listener
  services/
    gemini.js            calls Gemini, gets back {reply, action, task} JSON
    sheets.js             talks to the Apps Script backend
backend/
  Code.gs                 paste into Google Apps Script
  APPS_SCRIPT_SETUP.md     step-by-step deploy guide
```

## Cost
₹0 — Gemini free tier (~1,500 requests/day on Flash), Apps Script (no billing tier for this use),
Web Speech API (built into Chrome), and Capacitor/Porcupine free tiers for the later native phase.
