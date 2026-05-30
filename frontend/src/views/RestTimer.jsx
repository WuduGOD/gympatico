import { useState, useEffect, useRef, useCallback } from 'react'

const PRESETS = [60, 90, 120, 180]

export default function RestTimer({ onFinish }) {
  const [duration, setDuration] = useState(() => parseInt(localStorage.getItem('gp_rest_duration') || '90', 10))
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
    <div className={`rounded-gp-lg border overflow-hidden transition-all duration-300 shadow-md ${isRunning ? 'border-gymWarning/40 bg-gymWarning/5 shadow-[0_0_15px_rgba(245,158,11,0.02)]' : 'border-zinc-800/80 bg-gymCardSecondary/40'}`}>
      
      {/* Pasek Progresu */}
      <div className="h-[3px] bg-zinc-800">
        <div className={`h-full rounded-r transition-all duration-1000 linear ${isRunning ? 'bg-gymWarning' : 'bg-zinc-700'}`} style={{ width: `${progress * 100}%` }} />
      </div>

      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <i className={`ti ti-${isRunning ? 'player-pause' : 'clock'} text-lg ${isRunning ? 'text-gymWarning animate-pulse' : 'text-textSecondary'}`} />
            <div>
              <div className={`font-mono text-2xl font-bold tracking-wider leading-none ${isRunning ? (remaining <= 10 ? 'text-gymRed' : 'text-gymWarning') : 'text-textSecondary'}`}>{timeStr}</div>
              <div className="text-[10px] text-textSecondary font-semibold uppercase tracking-wider mt-1">{isRunning ? 'Odliczanie przerwy' : 'Minutnik gotowy'}</div>
            </div>
          </div>

          {/* Kontrolki */}
          <div className="flex items-center gap-1.5">
            {isRunning && (
              <>
                <button onClick={() => addTime(30)} className="text-xs px-2.5 py-1 rounded-gp-sm border border-zinc-800 hover:border-zinc-700 bg-gymCard text-textSecondary hover:text-white cursor-pointer transition-colors font-semibold font-mono">+30s</button>
                <button onClick={stop} className="text-xs px-2.5 py-1 rounded-gp-sm border border-zinc-800 hover:border-gymRed bg-gymCard text-textSecondary hover:text-gymRed cursor-pointer transition-colors font-semibold">Pomiń ✕</button>
              </>
            )}
          </div>
        </div>

        {/* Presety */}
        {!isRunning && (
          <div className="flex gap-1 mt-2.5">
            {PRESETS.map(p => (
              <button key={p} onClick={() => changeDuration(p)} className={`flex-1 py-1.5 rounded-gp-sm text-xs font-mono font-bold border transition-all cursor-pointer ${duration === p ? 'border-gymWarning text-gymWarning bg-gymWarning/5' : 'border-zinc-800 text-textSecondary bg-transparent hover:text-white'}`}>{p}s</button>
            ))}
          </div>
        )}
      </div>
    </div>
  )}
}