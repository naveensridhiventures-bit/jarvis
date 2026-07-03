import { useEffect, useRef } from 'react'

/**
 * Reactive HUD orb — the assistant's "face".
 * state: 'idle' | 'listening' | 'thinking' | 'speaking'
 * amplitude: 0..1 live audio level (mic input while listening, or synthetic pulse while speaking)
 */
// Subtle color shift layered on top of the state color, based on ARIA's last reply mood.
const MOOD_TINT = {
  neutral: null,
  happy: '#8fffb0',
  excited: '#ff9ee0',
  thinking: '#ffb454',
  concerned: '#ff8a65',
}

export default function JarvisOrb({ state = 'idle', amplitude = 0, mood = 'neutral' }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const rotationRef = useRef(0)
  const smoothedAmpRef = useRef(0)
  const particlesRef = useRef(
    Array.from({ length: 48 }, (_, i) => ({
      angle: (i / 48) * Math.PI * 2,
      jitter: Math.random() * 0.6 + 0.4
    }))
  )

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      const size = canvas.clientWidth
      canvas.width = size * dpr
      canvas.height = size * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const colorFor = {
      idle: '#4fe3ff',
      listening: '#4fe3ff',
      thinking: '#ffb454',
      speaking: '#4fe3ff'
    }

    const draw = () => {
      const size = canvas.clientWidth
      const cx = size / 2
      const cy = size / 2
      const baseR = size * 0.24

      // smooth amplitude toward target so it doesn't jitter harshly
      smoothedAmpRef.current += (amplitude - smoothedAmpRef.current) * 0.18

      const amp = smoothedAmpRef.current
      // mood only tints the orb while idle/speaking — "thinking" keeps its own amber,
      // and "listening" stays neutral cyan so it's always clear the mic is live
      const moodTint = (state === 'idle' || state === 'speaking') ? MOOD_TINT[mood] : null
      const color = moodTint || colorFor[state] || colorFor.idle
      const speed = state === 'thinking' ? 0.028 : state === 'listening' ? 0.012 : 0.006
      rotationRef.current += speed

      ctx.clearRect(0, 0, size, size)

      // outer tick dial
      const ticks = 60
      for (let i = 0; i < ticks; i++) {
        const a = (i / ticks) * Math.PI * 2 + rotationRef.current
        const isMajor = i % 5 === 0
        const r1 = size * 0.46
        const len = isMajor ? size * 0.03 : size * 0.015
        const x1 = cx + Math.cos(a) * r1
        const y1 = cy + Math.sin(a) * r1
        const x2 = cx + Math.cos(a) * (r1 + len)
        const y2 = cy + Math.sin(a) * (r1 + len)
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.strokeStyle = isMajor ? `${color}66` : `${color}26`
        ctx.lineWidth = isMajor ? 1.6 : 1
        ctx.stroke()
      }

      // orbiting particles, react to amplitude
      particlesRef.current.forEach((p) => {
        const a = p.angle - rotationRef.current * 1.6
        const r = size * (0.37 + amp * 0.05 * p.jitter)
        const x = cx + Math.cos(a) * r
        const y = cy + Math.sin(a) * r
        const rad = 1 + amp * 2.2 * p.jitter
        ctx.beginPath()
        ctx.arc(x, y, rad, 0, Math.PI * 2)
        ctx.fillStyle = `${color}aa`
        ctx.fill()
      })

      // mid ring — pulses with amplitude
      const midR = baseR * 1.55 + amp * size * 0.05
      ctx.beginPath()
      ctx.arc(cx, cy, midR, 0, Math.PI * 2)
      ctx.strokeStyle = `${color}55`
      ctx.lineWidth = 1.4
      ctx.stroke()

      // core glow
      const coreR = baseR * (0.72 + amp * 0.35)
      const grad = ctx.createRadialGradient(cx, cy, coreR * 0.1, cx, cy, coreR * 1.6)
      grad.addColorStop(0, `${color}dd`)
      grad.addColorStop(0.5, `${color}44`)
      grad.addColorStop(1, `${color}00`)
      ctx.beginPath()
      ctx.arc(cx, cy, coreR * 1.6, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()

      // core disc
      ctx.beginPath()
      ctx.arc(cx, cy, coreR * 0.62, 0, Math.PI * 2)
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 0.62)
      coreGrad.addColorStop(0, '#eaf6fa')
      coreGrad.addColorStop(1, color)
      ctx.fillStyle = coreGrad
      ctx.fill()

      // waveform arcs when speaking
      if (state === 'speaking') {
        for (let i = 0; i < 3; i++) {
          const r = coreR * (1.1 + i * 0.22) + amp * size * 0.02
          ctx.beginPath()
          ctx.arc(cx, cy, r, rotationRef.current * (i % 2 ? 1 : -1), rotationRef.current * (i % 2 ? 1 : -1) + Math.PI * 0.6)
          ctx.strokeStyle = `${color}${i === 0 ? '99' : '55'}`
          ctx.lineWidth = 1.6
          ctx.stroke()
        }
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [state, amplitude, mood])

  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', maxWidth: 340, margin: '0 auto' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}
