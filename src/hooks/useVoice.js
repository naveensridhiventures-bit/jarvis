import { useCallback, useEffect, useRef, useState } from 'react'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

export function useVoice({ onFinalTranscript, wakeWord = 'ஆரியா', wakeEnabled = false }) {
  const [state, setState] = useState('idle') // idle | listening | thinking | speaking
  const [amplitude, setAmplitude] = useState(0)
  const [liveText, setLiveText] = useState('')
  const [supported] = useState(!!SpeechRecognition)

  const recognitionRef = useRef(null)
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const rafRef = useRef(null)
  const modeRef = useRef('idle') // tracks whether we're in wake-listen or command-listen

  // ---- mic amplitude meter (for the orb) ----
  const startMeter = useCallback(async () => {
    if (audioCtxRef.current) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      audioCtxRef.current = audioCtx
      analyserRef.current = analyser

      const data = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((a, b) => a + b, 0) / data.length
        setAmplitude(Math.min(avg / 90, 1))
        rafRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch (e) {
      console.warn('mic meter unavailable', e)
    }
  }, [])

  const stopMeter = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    if (audioCtxRef.current) {
      audioCtxRef.current.close()
      audioCtxRef.current = null
    }
    setAmplitude(0)
  }, [])

  // ---- speech synthesis (Tamil TTS) ----
  const speak = useCallback((text) => {
    return new Promise((resolve) => {
      window.speechSynthesis.cancel()
      const utter = new SpeechSynthesisUtterance(text)
      utter.lang = 'ta-IN'
      const voices = window.speechSynthesis.getVoices()
      const tamilVoice = voices.find((v) => v.lang === 'ta-IN') || voices.find((v) => v.lang?.startsWith('ta'))
      if (tamilVoice) utter.voice = tamilVoice
      utter.rate = 1
      utter.onstart = () => setState('speaking')
      utter.onend = () => {
        setState('idle')
        resolve()
      }
      utter.onerror = () => {
        setState('idle')
        resolve()
      }
      window.speechSynthesis.speak(utter)
    })
  }, [])

  // ---- speech recognition (Tamil STT) ----
  const listenOnce = useCallback(() => {
    if (!supported) return
    modeRef.current = 'command'
    const rec = new SpeechRecognition()
    rec.lang = 'ta-IN'
    rec.continuous = false
    rec.interimResults = true
    recognitionRef.current = rec

    setLiveText('')
    setState('listening')
    startMeter()

    rec.onresult = (event) => {
      let text = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript
      }
      setLiveText(text)
      if (event.results[event.results.length - 1].isFinal) {
        setState('thinking')
        stopMeter()
        onFinalTranscript?.(text.trim())
      }
    }
    rec.onerror = () => {
      setState('idle')
      stopMeter()
    }
    rec.onend = () => {
      if (modeRef.current === 'command') {
        stopMeter()
      }
    }
    rec.start()
  }, [supported, onFinalTranscript, startMeter, stopMeter])

  // ---- lightweight foreground "wake word" listener ----
  // NOTE: this only works while the tab/app is open and the screen is on.
  // True background wake-word detection needs the Capacitor + Porcupine phase (see README).
  useEffect(() => {
    if (!wakeEnabled || !supported) return
    modeRef.current = 'wake'
    const rec = new SpeechRecognition()
    rec.lang = 'ta-IN'
    rec.continuous = true
    rec.interimResults = true
    recognitionRef.current = rec

    rec.onresult = (event) => {
      const text = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join(' ')
      if (text.includes(wakeWord) || text.toLowerCase().includes('jarvis') || text.toLowerCase().includes('aria')) {
        rec.stop()
        listenOnce()
      }
    }
    rec.onend = () => {
      if (modeRef.current === 'wake') {
        try { rec.start() } catch {}
      }
    }
    try { rec.start() } catch {}

    return () => {
      modeRef.current = 'idle'
      rec.onend = null
      rec.stop()
    }
  }, [wakeEnabled, supported, wakeWord, listenOnce])

  useEffect(() => () => stopMeter(), [stopMeter])

  return { state, setState, amplitude, liveText, listenOnce, speak, supported }
}
