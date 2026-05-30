import { useState, useEffect, useRef, useCallback } from 'react'

const PRESETS = [60, 90, 120, 180]

export default function RestTimer({ onFinish }) {
  const [duration, setDuration] = useState(() => {
    return parseInt(localStorage.getItem('gp_rest_duration') || '90', 10)
  })
  const [remaining, setRemaining] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const intervalRef = useRef(null)
  const audioCtxRef = useRef(null)

  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    return audioCtxRef.current
  }

  const playDone = useCallback(() => {
    try {
      const ctx = getAudioCtx()
      const notes = [523.25, 659.25, 783.99]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        osc.type = 'sine'
        const start = ctx.currentTime + i * 0.15
        gain.gain.setValueAtTime(0.3, start)
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4)
        osc.start(start)
        osc.stop(start + 0.4)
      })
    } catch (_) {}
    try { navigator.vibrate?.([150, 80, 150, 80, 300]) } catch (_) {}
  }, [])

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    clearTimer()
    setIsRunning(false)
    setRemaining(null)
  }, [clearTimer])

  // Publiczne API — wywoływane z NewWorkout po zapisaniu serii
  const start = useCallback((overrideDuration) => {
    clearTimer()
    const d = overrideDuration ?? duration
    setRemaining(d)
    setIsRunning(true)
  }, [clearTimer, duration])

  useEffect(() => {
    if (!isRunning || remaining === null) return
    if (remaining <= 0) {
      clearTimer()
      setIsRunning(false)
      setRemaining(0)
      playDone()
      onFinish?.()
      return
    }
    intervalRef.current = setInterval(() => {
      setRemaining(prev => prev - 1)
    }, 1000)
    return clearTimer
  }, [isRunning, remaining, clearTimer, playDone, onFinish])

  const addTime = (secs) => {
    setRemaining(prev => Math.max(0, (prev ?? 0) + secs))
    if (!isRunning) setIsRunning(true)
  }

  const changeDuration = (d) => {
    setDuration(d)
    localStorage.setItem('gp_rest_duration', String(d))
  }

  const mins = Math.floor((remaining ?? duration) / 60)
  const secs = (remaining ?? duration) % 60
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`
  const progress = remaining !== null ? remaining / duration : 1

  return { start, stop, TimerUI: (
    <div
      style={{
        borderRadius: 'var(--border-radius-lg)',
        border: `0.5px solid ${isRunning ? 'var(--color-border-warning)' : 'var(--color-border-tertiary)'}`,
        background: isRunning ? 'var(--color-background-warning)' : 'var(--color-background-secondary)',
        overflow: 'hidden',
        transition: 'background 0.3s, border-color 0.3s'
      }}
    >
      {/* Progress bar */}
      <div style={{ height: '3px', background: 'var(--color-border-tertiary)' }}>
        <div
          style={{
            height: '3px',
            width: `${progress * 100}%`,
            background: isRunning ? 'var(--color-text-warning)' : 'var(--color-border-secondary)',
            transition: 'width 1s linear, background 0.3s',
            borderRadius: '0 2px 2px 0'
          }}
        />
      </div>

      <div style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Timer display */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i
              className={`ti ti-${isRunning ? 'player-pause' : 'clock'}`}
              aria-hidden="true"
              style={{
                fontSize: '18px',
                color: isRunning ? 'var(--color-text-warning)' : 'var(--color-text-secondary)'
              }}
            />
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '22px',
                  fontWeight: '500',
                  color: isRunning
                    ? (remaining <= 10 ? 'var(--color-text-danger)' : 'var(--color-text-warning)')
                    : 'var(--color-text-secondary)',
                  letterSpacing: '0.05em',
                  lineHeight: 1
                }}
              >
                {timeStr}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                {isRunning ? 'przerwa' : 'gotowy'}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isRunning && (
              <>
                <button
                  onClick={() => addTime(30)}
                  style={{
                    fontSize: '11px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '0.5px solid var(--color-border-secondary)',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  +30s
                </button>
                <button
                  onClick={stop}
                  style={{
                    fontSize: '11px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '0.5px solid var(--color-border-secondary)',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  Pomiń
                </button>
              </>
            )}
          </div>
        </div>

        {/* Duration presets */}
        {!isRunning && (
          <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
            {PRESETS.map(p => (
              <button
                key={p}
                onClick={() => changeDuration(p)}
                style={{
                  flex: 1,
                  fontSize: '11px',
                  padding: '3px 0',
                  borderRadius: '5px',
                  border: `0.5px solid ${duration === p ? 'var(--color-border-info)' : 'var(--color-border-tertiary)'}`,
                  background: duration === p ? 'var(--color-background-info)' : 'transparent',
                  cursor: 'pointer',
                  color: duration === p ? 'var(--color-text-info)' : 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                {p}s
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )}
}
