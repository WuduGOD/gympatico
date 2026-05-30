import React, { useState, useRef, useCallback, useEffect } from 'react'
import RestTimer from './RestTimer'

export default function NewWorkout({
  exercises,
  templates,
  onSaveTemplate,
  onDeleteTemplate,
  workoutName,
  setWorkoutName,
  workoutComment,
  setWorkoutComment,
  localSeriesList,
  setLocalSeriesList,
  handleSaveWorkout,
}) {
  const [sessionExercises, setSessionExercises] = useState([])
  const [activeExId, setActiveExId] = useState(null)
  const [weight, setWeight] = useState('60')
  const [reps, setReps] = useState('8')
  const [templateNameInput, setTemplateNameInput] = useState('')
  const [saveAsTemplateCheckbox, setSaveAsTemplateCheckbox] = useState(false)
  const [view, setView] = useState('logger')
  const [searchQuery, setSearchQuery] = useState('')
  const [timerKey, setTimerKey] = useState(0)
  const timerRef = useRef(null)

  const getSeriesForExercise = useCallback((exId) =>
    localSeriesList.filter(s => s.exerciseId === exId),
  [localSeriesList])

  useEffect(() => {
    if (!activeExId) return
    const lastSeries = localSeriesList.filter(s => s.exerciseId === activeExId).at(-1)
    if (lastSeries) {
      setWeight(String(lastSeries.weight))
      setReps(String(lastSeries.reps))
    }
  }, [activeExId])

  const adjustWeight = (delta) => {
    setWeight(prev => {
      const val = Math.max(0, parseFloat(prev || 0) + delta)
      return Number.isInteger(val) ? String(val) : val.toFixed(1)
    })
  }

  const adjustReps = (delta) => {
    setReps(prev => String(Math.max(1, parseInt(prev || 1) + delta)))
  }

  const confirmSeries = useCallback(() => {
    if (!activeExId) return
    const ex = exercises.find(e => e.id === activeExId)
    if (!ex) return

    const w = parseFloat(weight)
    const r = parseInt(reps)
    if (isNaN(w) || isNaN(r) || r < 1) return

    const estimatedOneRm = r >= 1 && r <= 12 ? w * (1 + r / 30) : null
    const seriesForEx = localSeriesList.filter(s => s.exerciseId === activeExId)
    
    const newSeries = {
      exerciseId: activeExId,
      exerciseName: ex.name,
      weight: w,
      reps: r,
      order: seriesForEx.length + 1,
      estimatedOneRm
    }

    setLocalSeriesList(prev => [...prev, newSeries])

    if (timerRef.current?.start) {
      timerRef.current.start()
    }
  }, [activeExId, weight, reps, exercises, localSeriesList, setLocalSeriesList])

  const removeLastSeries = (exId) => {
    setLocalSeriesList(prev => {
      const idx = [...prev].reverse().findIndex(s => s.exerciseId === exId)
      if (idx === -1) return prev
      const realIdx = prev.length - 1 - idx
      return prev.filter((_, i) => i !== realIdx)
    })
  }

  const addExerciseToSession = (exId) => {
    if (sessionExercises.includes(exId)) return
    setSessionExercises(prev => [...prev, exId])
    setActiveExId(exId)
    setView('logger')
    setSearchQuery('')

    const lastSeries = localSeriesList.filter(s => s.exerciseId === exId).at(-1)
    setWeight(lastSeries ? String(lastSeries.weight) : '60')
    setReps(lastSeries ? String(lastSeries.reps) : '8')
  }

  const removeExerciseFromSession = (exId) => {
    setSessionExercises(prev => prev.filter(id => id !== exId))
    setLocalSeriesList(prev => prev.filter(s => s.exerciseId !== exId))
    if (activeExId === exId) {
      const remaining = sessionExercises.filter(id => id !== exId)
      setActiveExId(remaining.at(-1) ?? null)
    }
  }

  const handleLoadTemplate = (templateId) => {
    const tpl = templates?.find(t => t.id === templateId)
    if (!tpl) return

    setWorkoutName(tpl.name)
    const exIds = [...new Set(tpl.series.map(s => s.exerciseId))]
    setSessionExercises(exIds)
    setActiveExId(exIds[0] ?? null)

    const loadedSeries = tpl.series.map(s => {
      const ex = exercises.find(e => e.id === s.exerciseId)
      const w = parseFloat(s.weight)
      const r = parseInt(s.reps)
      return {
        exerciseId: s.exerciseId,
        exerciseName: ex?.name ?? 'Nieznane ćwiczenie',
        weight: w,
        reps: r,
        order: s.order,
        estimatedOneRm: r >= 1 && r <= 12 ? w * (1 + r / 30) : null
      }
    })
    setLocalSeriesList(loadedSeries)

    const first = tpl.series.find(s => s.exerciseId === exIds[0])
    if (first) {
      setWeight(String(first.weight))
      setReps(String(first.reps))
    }
  }

  const onSubmitWorkout = async (e) => {
    e?.preventDefault()
    if (saveAsTemplateCheckbox) {
      const name = templateNameInput.trim() || workoutName.trim() || 'Mój szablon'
      const templateSeries = localSeriesList.map((s, idx) => ({
        exerciseId: s.exerciseId, weight: s.weight, reps: s.reps, order: idx + 1
      }))
      const ok = await onSaveTemplate(name, templateSeries)
      if (!ok) return
    }
    handleSaveWorkout()
  }

  const activeEx = exercises.find(e => e.id === activeExId)
  const activeSeriesList = activeExId ? getSeriesForExercise(activeExId) : []
  const totalSeries = localSeriesList.length

  const filteredExercises = exercises.filter(e =>
    !sessionExercises.includes(e.id) &&
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const grouped = filteredExercises.reduce((acc, ex) => {
    const g = ex.muscle_group || 'Inne'
    if (!acc[g]) acc[g] = []
    acc[g].push(ex)
    return acc
  }, {})

  return (
    <div className="max-w-[640px] mx-auto flex flex-col gap-4 text-left">
      
      {/* NAGŁÓWEK */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Kreator treningu 🏋️‍♂️</h2>
          <p className="text-xs text-textSecondary mt-0.5">
            {totalSeries > 0 ? `${totalSeries} ${totalSeries === 1 ? 'seria zapisana' : 'serii zapisanych'}` : 'Brak serii — dodaj ćwiczenia poniżej'}
          </p>
        </div>
        {totalSeries > 0 && (
          <button onClick={onSubmitWorkout} className="px-4 py-2 bg-gymRed hover:bg-gymRedHover text-white font-bold text-sm rounded-gp-md cursor-pointer transition-all active:scale-95 shadow-lg shadow-red-950/20 shrink-0">
            Zakończ sesję ✓
          </button>
        )}
      </div>

      {/* SZABLONY */}
      {templates?.length > 0 && (
        <div className="bg-gymCardSecondary border border-zinc-800/40 rounded-gp-lg p-3">
          <div className="text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-2">Wczytaj gotowy plan:</div>
          <div className="flex flex-col gap-1.5">
            {templates.map(tpl => (
              <div key={tpl.id} className="flex items-center gap-2">
                <button onClick={() => handleLoadTemplate(tpl.id)} className="flex-1 text-left px-3 py-2.5 rounded-gp-md border border-zinc-800 bg-gymCard hover:border-zinc-700 cursor-pointer text-sm font-semibold flex items-center justify-between text-textPrimary transition-all">
                  <span>{tpl.name}</span>
                  <span className="text-xs text-textSecondary font-normal">{tpl.series.length} serii</span>
                </button>
                <button onClick={() => onDeleteTemplate(tpl.id)} title="Usuń szablon" className="p-2.5 rounded-gp-md border border-zinc-800 hover:border-gymRed hover:text-gymRed text-textSecondary bg-transparent cursor-pointer transition-colors">
                  <i className="ti ti-trash text-sm" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NAZWA TRENINGU */}
      <input
        type="text"
        placeholder="Nazwa treningu (np. Push A — Klatka + Barki)"
        value={workoutName}
        onChange={e => setWorkoutName(e.target.value)}
        className="w-full p-3 rounded-gp-md border border-zinc-800 bg-gymCard text-white text-sm font-medium outline-none transition-all focus:border-gymRed"
        required
      />

      {/* MINUTNIK */}
      <RestTimerWrapper timerRef={timerRef} key={timerKey} />

      {/* KARTOTEKA SESJI */}
      {sessionExercises.length > 0 && (
        <div className="bg-gymCard border border-zinc-800/40 rounded-gp-lg overflow-hidden shadow-lg">
          <div className="divide-y divide-zinc-800/50">
            {sessionExercises.map(exId => {
              const ex = exercises.find(e => e.id === exId)
              if (!ex) return null
              const series = getSeriesForExercise(exId)
              const isActive = exId === activeExId

              return (
                <div key={exId} onClick={() => { setActiveExId(exId); const last = series.at(-1); if (last) { setWeight(String(last.weight)); setReps(String(last.reps)); } }} className={`flex items-center p-3 gap-3 cursor-pointer transition-colors ${isActive ? 'bg-gymRed/5' : 'hover:bg-zinc-800/20'}`}>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${series.length > 0 ? 'bg-gymSuccess' : isActive ? 'bg-gymRed' : 'bg-zinc-700'}`} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm truncate ${isActive ? 'text-gymRed font-bold' : 'text-textPrimary'}`}>{ex.name}</div>
                    {series.length > 0 && (
                      <div className="text-xs text-textSecondary font-mono mt-0.5">{series.map(s => `${s.weight}×${s.reps}`).join('  ·  ')}</div>
                    )}
                  </div>
                  <button onClick={e => { e.stopPropagation(); removeExerciseFromSession(exId) }} className="p-1 text-textSecondary hover:text-gymDanger opacity-60 hover:opacity-100 transition-all cursor-pointer">
                    <i className="ti ti-x text-sm" />
                  </button>
                </div>
              )
            })}
          </div>

          {/* LOGGER SERII (TOUCH-TARGET FRIENDLY) */}
          {activeEx && (
            <div className="p-4 border-t border-zinc-800 bg-gymCardSecondary/40">
              <div className="text-xs font-bold text-gymRed uppercase tracking-wider mb-3">{activeEx.name} — SERIA #{activeSeriesList.length + 1}</div>

              {/* CIĘŻAR */}
              <div className="mb-3">
                <label className="text-[11px] font-semibold text-textSecondary block mb-1">Ciężar (kg):</label>
                <div className="flex gap-2 items-center">
                  <button onClick={() => adjustWeight(-2.5)} className="w-11 h-11 rounded-gp-md border border-zinc-800 bg-gymCard hover:bg-zinc-800 text-xl font-light flex items-center justify-center cursor-pointer select-none text-textPrimary active:scale-95 transition-transform">−</button>
                  <input type="number" step="0.5" value={weight} onChange={e => setWeight(e.target.value)} className="flex-1 h-11 text-center font-mono text-xl font-bold bg-gymCard border border-zinc-800 rounded-gp-md text-white outline-none focus:border-gymRed" />
                  <button onClick={() => adjustWeight(2.5)} className="w-11 h-11 rounded-gp-md border border-zinc-800 bg-gymCard hover:bg-zinc-800 text-xl font-light flex items-center justify-center cursor-pointer select-none text-textPrimary active:scale-95 transition-transform">+</button>
                </div>
              </div>

              {/* POWTÓRZENIA */}
              <div className="mb-3">
                <label className="text-[11px] font-semibold text-textSecondary block mb-1">Powtórzenia:</label>
                <div className="flex gap-2 items-center">
                  <button onClick={() => adjustReps(-1)} className="w-11 h-11 rounded-gp-md border border-zinc-800 bg-gymCard hover:bg-zinc-800 text-xl font-light flex items-center justify-center cursor-pointer select-none text-textPrimary active:scale-95 transition-transform">−</button>
                  <input type="number" value={reps} onChange={e => setReps(e.target.value)} className="flex-1 h-11 text-center font-mono text-xl font-bold bg-gymCard border border-zinc-800 rounded-gp-md text-white outline-none focus:border-gymRed" />
                  <button onClick={() => adjustReps(1)} className="w-11 h-11 rounded-gp-md border border-zinc-800 bg-gymCard hover:bg-zinc-800 text-xl font-light flex items-center justify-center cursor-pointer select-none text-textPrimary active:scale-95 transition-transform">+</button>
                </div>
              </div>

              {/* SZYBKIE PRESETY */}
              <div className="flex gap-1 mb-4">
                {[5, 6, 8, 10, 12, 15].map(r => (
                  <button key={r} onClick={() => setReps(String(r))} className={`flex-1 py-1.5 rounded-gp-sm text-xs font-mono font-bold border transition-all cursor-pointer ${reps === String(r) ? 'border-gymRed text-gymRed bg-gymRed/5' : 'border-zinc-800 text-textSecondary bg-transparent hover:text-white'}`}>{r}</button>
                ))}
              </div>

              {/* ZAPISZ */}
              <button onClick={confirmSeries} disabled={!weight || !reps} className="w-full py-3 bg-gymRed hover:bg-gymRedHover disabled:opacity-40 text-white font-bold text-sm rounded-gp-md cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-md">
                <i className="ti ti-check text-base" /> Zapisz serię roboczą
              </button>

              {activeSeriesList.length > 0 && (
                <button onClick={() => removeLastSeries(activeExId)} className="w-full mt-2 py-1.5 border border-zinc-800 hover:border-zinc-700 bg-transparent text-textSecondary text-[11px] font-semibold rounded-gp-md cursor-pointer flex items-center justify-center gap-1 transition-colors">
                  <i className="ti ti-arrow-back" /> Cofnij ostatnią serię
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* PRZYCISK OD ATLASU */}
      <button onClick={() => setView(v => v === 'builder' ? 'logger' : 'builder')} className="w-full py-2.5 border border-dashed border-zinc-800 hover:border-zinc-600 bg-transparent text-textSecondary hover:text-white text-xs font-bold rounded-gp-md cursor-pointer flex items-center justify-center gap-1.5 transition-colors">
        <i className={`ti ti-${view === 'builder' ? 'x' : 'plus'} text-base`} />
        {view === 'builder' ? 'Zamknij atlas ćwiczeń' : 'Dodaj ćwiczenie do dzisiejszej sesji'}
      </button>

      {/* SEKCJA ATLASU */}
      {view === 'builder' && (
        <div className="bg-gymCard border border-zinc-800/40 rounded-gp-lg overflow-hidden shadow-xl animate-in fade-in duration-150">
          <div className="p-3 border-b border-zinc-800">
            <input type="search" placeholder="Wpisz nazwę ćwiczenia..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus className="w-full p-2.5 rounded-gp-md border border-zinc-800 bg-gymCardSecondary text-white text-sm outline-none focus:border-gymRed" />
          </div>
          <div className="max-h-[320px] overflow-y-auto divide-y divide-zinc-800/40">
            {Object.entries(grouped).map(([group, exList]) => (
              <div key={group} className="text-left">
                <div className="px-3 py-1 text-[10px] font-bold text-textSecondary uppercase tracking-wider bg-gymCardSecondary/60 border-b border-zinc-800/30">{group}</div>
                {exList.map(ex => (
                  <div key={ex.id} onClick={() => addExerciseToSession(ex.id)} className="px-3 py-2.5 text-sm text-textPrimary hover:bg-zinc-800/30 cursor-pointer flex items-center justify-between transition-colors">
                    <span>{ex.name}</span>
                    <i className="ti ti-plus text-textMuted" />
                  </div>
                ))}
              </div>
            ))}
            {filteredExercises.length === 0 && (
              <div className="p-6 text-center text-textSecondary text-xs italic">Brak wyników dla frazy "{searchQuery}"</div>
            )}
          </div>
        </div>
      )}

      {/* NOTATKI */}
      <textarea placeholder="Komentarz lub notatki do dzisiejszego treningu (opcjonalnie)..." value={workoutComment} onChange={e => setWorkoutComment(e.target.value)} className="w-full p-3 rounded-gp-md border border-zinc-800 bg-gymCard text-white text-sm outline-none focus:border-gymRed min-h-[64px] resize-none" />

      {/* UTWORZ SZABLON */}
      {localSeriesList.length > 0 && (
        <div className="bg-gymCardSecondary border border-zinc-800/40 rounded-gp-lg p-3 shadow-md">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={saveAsTemplateCheckbox} onChange={e => setSaveAsTemplateCheckbox(e.target.checked)} className="w-4 h-4 rounded border-zinc-800 bg-gymCard accent-gymRed cursor-pointer" />
            <span className="text-xs font-bold text-textPrimary">Zapisz tę sesję jako stały szablon</span>
          </label>
          {saveAsTemplateCheckbox && (
            <input type="text" placeholder={workoutName.trim() || 'Nazwa nowego szablonu'} value={templateNameInput} onChange={e => setTemplateNameInput(e.target.value)} maxLength={100} className="w-full p-2.5 rounded-gp-md border border-zinc-800 bg-gymCard text-white text-sm font-medium outline-none focus:border-gymRed mt-2 animate-in slide-in-from-top-2 duration-150" />
          )}
        </div>
      )}
    </div>
  )
}

function RestTimerWrapper({ timerRef }) {
  const timer = RestTimer({ onFinish: () => {} })
  timerRef.current = { start: timer.start, stop: timer.stop }
  return timer.TimerUI
}