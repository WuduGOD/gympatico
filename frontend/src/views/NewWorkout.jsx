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
  // Ćwiczenia aktywne w tej sesji — lista budowana ręcznie lub z szablonu
  const [sessionExercises, setSessionExercises] = useState([])
  const [activeExId, setActiveExId] = useState(null)

  // Szybki input — waga i powtórzenia z podpowiedzią z poprzedniej serii
  const [weight, setWeight] = useState('60')
  const [reps, setReps] = useState('8')

  // Szablon
  const [templateNameInput, setTemplateNameInput] = useState('')
  const [saveAsTemplateCheckbox, setSaveAsTemplateCheckbox] = useState(false)

  // Widok — 'builder' (dodawanie ćwiczeń) lub 'logger' (logowanie serii)
  const [view, setView] = useState('logger')

  // Filtr atlasu przy dodawaniu ćwiczeń
  const [searchQuery, setSearchQuery] = useState('')

  // Rest timer — hook zwracający { start, stop, TimerUI }
  const [timerKey, setTimerKey] = useState(0)
  const timerRef = useRef(null)

  // Grupowanie serii po ćwiczeniu dla widoku chipów
  const getSeriesForExercise = useCallback((exId) =>
    localSeriesList.filter(s => s.exerciseId === exId),
  [localSeriesList])

  // Aktualizuj wagę/powtórzenia gdy zmienia się aktywne ćwiczenie — podpowiedź z ostatniej serii
  useEffect(() => {
    if (!activeExId) return
    const lastSeries = localSeriesList.filter(s => s.exerciseId === activeExId).at(-1)
    if (lastSeries) {
      setWeight(String(lastSeries.weight))
      setReps(String(lastSeries.reps))
    }
  }, [activeExId]) // celowo tylko activeExId — nie chcemy resetować przy każdym zapisie

  const adjustWeight = (delta) => {
    setWeight(prev => {
      const val = Math.max(0, parseFloat(prev || 0) + delta)
      return Number.isInteger(val) ? String(val) : val.toFixed(1)
    })
  }

  const adjustReps = (delta) => {
    setReps(prev => String(Math.max(1, parseInt(prev || 1) + delta)))
  }

  // Zapisanie serii + natychmiastowy start timera
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

    // Twardy autostart timera — zawsze, bez pytania
    if (timerRef.current?.start) {
      timerRef.current.start()
    }
  }, [activeExId, weight, reps, exercises, localSeriesList, setLocalSeriesList])

  // Usunięcie ostatniej serii danego ćwiczenia
  const removeLastSeries = (exId) => {
    setLocalSeriesList(prev => {
      const idx = [...prev].reverse().findIndex(s => s.exerciseId === exId)
      if (idx === -1) return prev
      const realIdx = prev.length - 1 - idx
      return prev.filter((_, i) => i !== realIdx)
    })
  }

  // Dodanie ćwiczenia do sesji
  const addExerciseToSession = (exId) => {
    if (sessionExercises.includes(exId)) return
    setSessionExercises(prev => [...prev, exId])
    setActiveExId(exId)
    setView('logger')
    setSearchQuery('')

    // Ustaw domyślne wartości przy pierwszym dodaniu
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

  // Załadowanie szablonu
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

  // Grupuj po muscle_group
  const grouped = filteredExercises.reduce((acc, ex) => {
    const g = ex.muscle_group || 'Inne'
    if (!acc[g]) acc[g] = []
    acc[g].push(ex)
    return acc
  }, {})

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* NAGŁÓWEK + przycisk zakończenia */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '500', margin: 0 }}>Kreator treningu</h2>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '2px 0 0' }}>
            {totalSeries > 0 ? `${totalSeries} ${totalSeries === 1 ? 'seria' : 'serii'} zapisanych` : 'Brak serii — dodaj ćwiczenia poniżej'}
          </p>
        </div>
        {totalSeries > 0 && (
          <button
            onClick={onSubmitWorkout}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--border-radius-md)',
              background: '#e63946',
              color: 'white',
              border: 'none',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            Zakończ sesję
          </button>
        )}
      </div>

      {/* SZABLONY */}
      {templates?.length > 0 && (
        <div style={{
          background: 'var(--color-background-secondary)',
          borderRadius: 'var(--border-radius-lg)',
          border: '0.5px solid var(--color-border-tertiary)',
          padding: '12px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: '500', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Wczytaj szablon
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {templates.map(tpl => (
              <div key={tpl.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => handleLoadTemplate(tpl.id)}
                  style={{
                    flex: 1,
                    textAlign: 'left',
                    padding: '7px 10px',
                    borderRadius: 'var(--border-radius-md)',
                    border: '0.5px solid var(--color-border-secondary)',
                    background: 'var(--color-background-primary)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: 'var(--color-text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>{tpl.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: '400' }}>
                    {tpl.series.length} serii
                  </span>
                </button>
                <button
                  onClick={() => onDeleteTemplate(tpl.id)}
                  title="Usuń szablon"
                  style={{
                    padding: '7px 8px',
                    borderRadius: 'var(--border-radius-md)',
                    border: '0.5px solid var(--color-border-tertiary)',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1
                  }}
                >
                  <i className="ti ti-trash" aria-hidden="true" style={{ fontSize: '14px' }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NAZWA TRENINGU */}
      <input
        type="text"
        placeholder="Nazwa treningu (np. Push — klatka + ramiona)"
        value={workoutName}
        onChange={e => setWorkoutName(e.target.value)}
        style={{ width: '100%', boxSizing: 'border-box' }}
        required
      />

      {/* REST TIMER */}
      <RestTimerWrapper timerRef={timerRef} key={timerKey} />

      {/* GŁÓWNY PANEL — lista ćwiczeń + input serii */}
      {sessionExercises.length > 0 && (
        <div style={{
          background: 'var(--color-background-primary)',
          border: '0.5px solid var(--color-border-tertiary)',
          borderRadius: 'var(--border-radius-lg)',
          overflow: 'hidden'
        }}>
          {/* Lista ćwiczeń */}
          <div style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
            {sessionExercises.map(exId => {
              const ex = exercises.find(e => e.id === exId)
              if (!ex) return null
              const series = getSeriesForExercise(exId)
              const isActive = exId === activeExId
              const isDone = series.length > 0

              return (
                <div
                  key={exId}
                  onClick={() => {
                    setActiveExId(exId)
                    const last = series.at(-1)
                    if (last) {
                      setWeight(String(last.weight))
                      setReps(String(last.reps))
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 12px',
                    gap: '10px',
                    cursor: 'pointer',
                    borderBottom: '0.5px solid var(--color-border-tertiary)',
                    background: isActive ? 'var(--color-background-info)' : 'transparent',
                    transition: 'background 0.1s'
                  }}
                >
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                    background: isDone
                      ? 'var(--color-text-success)'
                      : isActive
                        ? 'var(--color-text-info)'
                        : 'var(--color-border-secondary)'
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: isActive ? '500' : '400',
                      color: isActive ? 'var(--color-text-info)' : 'var(--color-text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {ex.name}
                    </div>
                    {series.length > 0 && (
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '1px' }}>
                        {series.map(s => `${s.weight}×${s.reps}`).join('  ·  ')}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); removeExerciseFromSession(exId) }}
                    title="Usuń ćwiczenie z sesji"
                    style={{
                      padding: '4px 6px',
                      borderRadius: '5px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1,
                      opacity: 0.6
                    }}
                  >
                    <i className="ti ti-x" aria-hidden="true" style={{ fontSize: '13px' }} />
                  </button>
                </div>
              )
            })}
          </div>

          {/* Panel szybkiego zapisu aktywnego ćwiczenia */}
          {activeEx && (
            <div style={{ padding: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '500', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                {activeEx.name} — seria #{activeSeriesList.length + 1}
              </div>

              {/* Waga */}
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Ciężar (kg)</div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button onClick={() => adjustWeight(-2.5)} style={{ width: '44px', height: '44px', borderRadius: 'var(--border-radius-md)', border: '0.5px solid var(--color-border-secondary)', background: 'transparent', cursor: 'pointer', fontSize: '18px', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: '300' }}>−</button>
                  <input
                    type="number"
                    step="0.5"
                    value={weight}
                    onChange={e => setWeight(e.target.value)}
                    style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: '500', height: '44px' }}
                  />
                  <button onClick={() => adjustWeight(2.5)} style={{ width: '44px', height: '44px', borderRadius: 'var(--border-radius-md)', border: '0.5px solid var(--color-border-secondary)', background: 'transparent', cursor: 'pointer', fontSize: '18px', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: '300' }}>+</button>
                </div>
              </div>

              {/* Powtórzenia */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Powtórzenia</div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button onClick={() => adjustReps(-1)} style={{ width: '44px', height: '44px', borderRadius: 'var(--border-radius-md)', border: '0.5px solid var(--color-border-secondary)', background: 'transparent', cursor: 'pointer', fontSize: '18px', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: '300' }}>−</button>
                  <input
                    type="number"
                    value={reps}
                    onChange={e => setReps(e.target.value)}
                    style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: '500', height: '44px' }}
                  />
                  <button onClick={() => adjustReps(1)} style={{ width: '44px', height: '44px', borderRadius: 'var(--border-radius-md)', border: '0.5px solid var(--color-border-secondary)', background: 'transparent', cursor: 'pointer', fontSize: '18px', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: '300' }}>+</button>
                </div>
              </div>

              {/* Szybkie presety powtórzeń */}
              <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                {[5, 6, 8, 10, 12, 15].map(r => (
                  <button
                    key={r}
                    onClick={() => setReps(String(r))}
                    style={{
                      flex: 1,
                      fontSize: '12px',
                      padding: '5px 0',
                      borderRadius: '5px',
                      border: `0.5px solid ${reps === String(r) ? 'var(--color-border-info)' : 'var(--color-border-tertiary)'}`,
                      background: reps === String(r) ? 'var(--color-background-info)' : 'transparent',
                      cursor: 'pointer',
                      color: reps === String(r) ? 'var(--color-text-info)' : 'var(--color-text-secondary)',
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* PRZYCISK — zapisz i start timera */}
              <button
                onClick={confirmSeries}
                disabled={!weight || !reps}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: 'var(--border-radius-md)',
                  background: '#e63946',
                  color: 'white',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: (!weight || !reps) ? 0.4 : 1
                }}
              >
                <i className="ti ti-check" aria-hidden="true" style={{ fontSize: '16px' }} />
                Zapisz serię
              </button>

              {/* Ostatnie serie — cofnij */}
              {activeSeriesList.length > 0 && (
                <button
                  onClick={() => removeLastSeries(activeExId)}
                  style={{
                    width: '100%',
                    marginTop: '6px',
                    padding: '6px',
                    borderRadius: 'var(--border-radius-md)',
                    border: '0.5px solid var(--color-border-tertiary)',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: '11px',
                    color: 'var(--color-text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <i className="ti ti-arrow-back" aria-hidden="true" style={{ fontSize: '13px' }} />
                  Cofnij ostatnią serię
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* DODAJ ĆWICZENIE — przycisk przełączający widok */}
      <button
        onClick={() => setView(v => v === 'builder' ? 'logger' : 'builder')}
        style={{
          width: '100%',
          padding: '10px',
          borderRadius: 'var(--border-radius-md)',
          border: '0.5px dashed var(--color-border-secondary)',
          background: 'transparent',
          cursor: 'pointer',
          fontSize: '13px',
          color: 'var(--color-text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px'
        }}
      >
        <i className={`ti ti-${view === 'builder' ? 'x' : 'plus'}`} aria-hidden="true" style={{ fontSize: '16px' }} />
        {view === 'builder' ? 'Zamknij atlas' : 'Dodaj ćwiczenie'}
      </button>

      {/* ATLAS ĆWICZEŃ */}
      {view === 'builder' && (
        <div style={{
          background: 'var(--color-background-primary)',
          border: '0.5px solid var(--color-border-tertiary)',
          borderRadius: 'var(--border-radius-lg)',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '10px 12px', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
            <input
              type="search"
              placeholder="Szukaj ćwiczenia..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
            {Object.entries(grouped).map(([group, exList]) => (
              <div key={group}>
                <div style={{ padding: '6px 12px', fontSize: '10px', fontWeight: '500', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--color-background-secondary)', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                  {group}
                </div>
                {exList.map(ex => (
                  <div
                    key={ex.id}
                    onClick={() => addExerciseToSession(ex.id)}
                    style={{
                      padding: '10px 12px',
                      cursor: 'pointer',
                      borderBottom: '0.5px solid var(--color-border-tertiary)',
                      fontSize: '13px',
                      color: 'var(--color-text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background 0.1s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-background-secondary)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {ex.name}
                    <i className="ti ti-plus" aria-hidden="true" style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }} />
                  </div>
                ))}
              </div>
            ))}
            {filteredExercises.length === 0 && (
              <div style={{ padding: '20px 12px', textAlign: 'center', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Brak wyników dla &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        </div>
      )}

      {/* KOMENTARZ */}
      <textarea
        placeholder="Notatki do treningu (opcjonalnie)"
        value={workoutComment}
        onChange={e => setWorkoutComment(e.target.value)}
        style={{ width: '100%', boxSizing: 'border-box', minHeight: '60px', resize: 'none' }}
      />

      {/* ZAPISZ JAKO SZABLON */}
      {localSeriesList.length > 0 && (
        <div style={{
          background: 'var(--color-background-secondary)',
          borderRadius: 'var(--border-radius-lg)',
          border: '0.5px solid var(--color-border-tertiary)',
          padding: '12px'
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={saveAsTemplateCheckbox}
              onChange={e => setSaveAsTemplateCheckbox(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#e63946' }}
            />
            <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)' }}>
              Zapisz jako szablon
            </span>
          </label>
          {saveAsTemplateCheckbox && (
            <input
              type="text"
              placeholder={workoutName.trim() || 'Nazwa szablonu'}
              value={templateNameInput}
              onChange={e => setTemplateNameInput(e.target.value)}
              maxLength={100}
              style={{ width: '100%', boxSizing: 'border-box', marginTop: '10px' }}
            />
          )}
        </div>
      )}
    </div>
  )
}

// Wrapper komponent — mostuje ref do imperatywnego API timera
function RestTimerWrapper({ timerRef }) {
  const timer = RestTimer({ onFinish: () => {} })
  timerRef.current = { start: timer.start, stop: timer.stop }
  return timer.TimerUI
}
