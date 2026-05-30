// frontend/src/views/NewWorkout.jsx
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
  // GŁÓWNY STEROWNIK TRYBU: 'selection' | 'active_workout' | 'template_creator'
  const [activeMode, setActiveMode] = useState(() => {
    if (localSeriesList.length > 0) return 'active_workout'
    return 'selection'
  })

  // Lista ćwiczeń załadowanych do bieżącej konfiguracji (treningu lub szablonu)
  const [sessionExercises, setSessionExercises] = useState([])
  const [activeExId, setActiveExId] = useState(null)

  // Szybkie inputy wartości
  const [weight, setWeight] = useState('60')
  const [reps, setReps] = useState('8')

  // Stan dedykowany dla kreatora szablonów "na sucho"
  const [customTemplateName, setCustomTemplateName] = useState('')
  const [templateSeriesList, setTemplateSeriesList] = useState([])

  // Widok wewnętrzny atlasu: 'logger' (podgląd) | 'builder' (wyszukiwarka ćwiczeń)
  const [view, setView] = useState('logger')
  const [searchQuery, setSearchQuery] = useState('')
  const timerRef = useRef(null)

  // Synchronizacja trybu, jeśli dane zostały wyczyszczone z góry
  useEffect(() => {
    if (localSeriesList.length === 0 && sessionExercises.length === 0 && !workoutName && activeMode === 'active_workout') {
      setActiveMode('selection')
    }
  }, [localSeriesList, sessionExercises, workoutName, activeMode])

  const getSeriesForExercise = useCallback((exId) => {
    if (activeMode === 'template_creator') {
      return templateSeriesList.filter(s => s.exerciseId === exId)
    }
    return localSeriesList.filter(s => s.exerciseId === exId)
  }, [localSeriesList, templateSeriesList, activeMode])

  // Podpowiedź obciążenia
  useEffect(() => {
    if (!activeExId) return
    const list = activeMode === 'template_creator' ? templateSeriesList : localSeriesList
    const lastSeries = list.filter(s => s.exerciseId === activeExId).at(-1)
    if (lastSeries) {
      setWeight(String(lastSeries.weight))
      setReps(String(lastSeries.reps))
    }
  }, [activeExId, activeMode, templateSeriesList, localSeriesList])

  const adjustWeight = (delta) => {
    setWeight(prev => {
      const val = Math.max(0, parseFloat(prev || 0) + delta)
      return Number.isInteger(val) ? String(val) : val.toFixed(1)
    })
  }

  const adjustReps = (delta) => {
    setReps(prev => String(Math.max(1, parseInt(prev || 1) + delta)))
  }

  // Zapis serii (w zależności od wybranego trybu)
  const confirmSeries = useCallback(() => {
    if (!activeExId) return
    const ex = exercises.find(e => e.id === activeExId)
    if (!ex) return

    const w = parseFloat(weight)
    const r = parseInt(reps)
    if (isNaN(w) || isNaN(r) || r < 1) return

    const estimatedOneRm = r >= 1 && r <= 12 ? w * (1 + r / 30) : null
    
    if (activeMode === 'template_creator') {
      const currentExSeries = templateSeriesList.filter(s => s.exerciseId === activeExId)
      const newSeries = {
        exerciseId: activeExId,
        weight: w,
        reps: r,
        order: currentExSeries.length + 1
      }
      setTemplateSeriesList(prev => [...prev, newSeries])
    } else {
      const currentExSeries = localSeriesList.filter(s => s.exerciseId === activeExId)
      const newSeries = {
        exerciseId: activeExId,
        exerciseName: ex.name,
        weight: w,
        reps: r,
        order: currentExSeries.length + 1,
        estimatedOneRm
      }
      setLocalSeriesList(prev => [...prev, newSeries])
      if (timerRef.current?.start) timerRef.current.start()
    }
  }, [activeExId, weight, reps, exercises, activeMode, templateSeriesList, localSeriesList, setLocalSeriesList])

  const removeLastSeries = (exId) => {
    const setter = activeMode === 'template_creator' ? setTemplateSeriesList : setLocalSeriesList
    setter(prev => {
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

    const list = activeMode === 'template_creator' ? templateSeriesList : localSeriesList
    const lastSeries = list.filter(s => s.exerciseId === exId).at(-1)
    setWeight(lastSeries ? String(lastSeries.weight) : '60')
    setReps(lastSeries ? String(lastSeries.reps) : '8')
  }

  const removeExerciseFromSession = (exId) => {
    setSessionExercises(prev => prev.filter(id => id !== exId))
    if (activeMode === 'template_creator') {
      setTemplateSeriesList(prev => prev.filter(s => s.exerciseId !== exId))
    } else {
      setLocalSeriesList(prev => prev.filter(s => s.exerciseId !== exId))
    }
    if (activeExId === exId) {
      const remaining = sessionExercises.filter(id => id !== exId)
      setActiveExId(remaining.at(-1) ?? null)
    }
  }

  // Aktywacja trybu tworzenia szablonu na sucho
  const handleStartTemplateCreator = () => {
    setCustomTemplateName('')
    setTemplateSeriesList([])
    setSessionExercises([])
    setActiveExId(null)
    setView('builder') // Od razu otwieramy atlas, żeby wybierać ćwiczenia
    setActiveMode('template_creator')
  }

  const handleSaveCustomTemplate = async () => {
    const name = customTemplateName.trim() || 'Nowy Szablon'
    if (templateSeriesList.length === 0) {
      alert('Dodaj przynajmniej jedną serię do szablonu!')
      return
    }
    const ok = await onSaveTemplate(name, templateSeriesList)
    if (ok) {
      setActiveMode('selection')
    }
  }

  // Wczytanie gotowego szablonu na siłowni
  const handleLoadTemplate = (templateId) => {
    const tpl = templates?.find(t => t.id === templateId)
    if (!tpl) return

    setWorkoutName(tpl.name)
    const exIds = [...new Set(tpl.series.map(s => s.exerciseId))]
    setSessionExercises(exIds)
    setActiveExId(exIds[0] ?? null)

    const loadedSeries = tpl.series.map(s => {
      const ex = exercises.find(e => e.id === s.exerciseId)
      return {
        exerciseId: s.exerciseId,
        exerciseName: ex?.name ?? 'Nieznane ćwiczenie',
        weight: parseFloat(s.weight),
        reps: parseInt(s.reps),
        order: s.order,
        estimatedOneRm: s.reps >= 1 && s.reps <= 12 ? parseFloat(s.weight) * (1 + parseInt(s.reps) / 30) : null
      }
    })
    setLocalSeriesList(loadedSeries)
    setActiveMode('active_workout')
  }

  const handleStartEmptyWorkout = () => {
    setWorkoutName(`Trening rutynowy - ${new Date().toLocaleDateString()}`)
    setSessionExercises([])
    setActiveExId(null)
    setLocalSeriesList([])
    setActiveMode('active_workout')
  }

  const handleExitToSelection = () => {
    if (window.confirm("Czy chcesz opuścić kreator? Niezapisane zmiany zostaną utracone.")) {
      setWorkoutName('')
      setWorkoutComment('')
      setLocalSeriesList([])
      setSessionExercises([])
      setActiveExId(null)
      setActiveMode('selection')
    }
  }

  const activeEx = exercises.find(e => e.id === activeExId)
  const activeSeriesList = activeExId ? getSeriesForExercise(activeExId) : []
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

  // =========================================================================
  // STAN 1: EKRAN WYBORU (Home / Couch Mode)
  // =========================================================================
  if (activeMode === 'selection') {
    return (
      <div className="max-w-[640px] mx-auto flex flex-col gap-6 text-left animate-in fade-in duration-200">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white">Trening i Plany 🚀</h2>
          <p className="text-xs text-textSecondary mt-0.5">Wybierz szablon na dziś lub skonfiguruj nowy plan w domu.</p>
        </div>

        {/* AKCJE GŁÓWNE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button onClick={handleStartEmptyWorkout} className="p-4 bg-gymCard hover:bg-zinc-800/40 border border-zinc-800 rounded-gp-lg text-left transition-all active:scale-[0.99] cursor-pointer flex items-center justify-between group">
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-gymRed transition-colors">Pusty trening ➕</h3>
              <p className="text-[11px] text-textSecondary mt-0.5">Zaloguj spontaniczną sesję.</p>
            </div>
          </button>
          
          <button onClick={handleStartTemplateCreator} className="p-4 bg-gymCardSecondary hover:bg-zinc-800/40 border border-zinc-800/60 rounded-gp-lg text-left transition-all active:scale-[0.99] cursor-pointer flex items-center justify-between group">
            <div>
              <h3 className="text-sm font-bold text-gymPremium group-hover:text-amber-400 transition-colors">Stwórz nowy szablon 📋</h3>
              <p className="text-[11px] text-textSecondary mt-0.5">Rozpisz plan na sucho poza treningiem.</p>
            </div>
          </button>
        </div>

        {/* LISTA SZABLONÓW */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold text-textSecondary uppercase tracking-wider">Twoje Szablony ({templates?.length || 0})</h3>
          {(!templates || templates.length === 0) ? (
            <p className="text-xs text-textMuted italic bg-gymCard/20 p-6 rounded-gp-lg text-center border border-dashed border-zinc-800">Brak szablonów. Kliknij przycisk powyżej, aby dodać swój pierwszy plan!</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {templates.map(tpl => {
                const uniqueExNames = [...new Set(tpl.series.map(s => exercises.find(e => e.id === s.exerciseId)?.name || 'Ćwiczenie'))].slice(0, 3)
                return (
                  <div key={tpl.id} className="bg-gymCard border border-zinc-800/60 rounded-gp-lg p-4 flex flex-col justify-between shadow-md group min-h-[135px]">
                    <div className="cursor-pointer flex-1" onClick={() => handleLoadTemplate(tpl.id)}>
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-sm font-bold text-white group-hover:text-gymRed transition-colors truncate max-w-[80%]">{tpl.name}</h4>
                        <span className="text-[9px] font-black text-gymRed bg-gymRed/10 px-2 py-0.5 rounded-full uppercase shrink-0">{tpl.series.length} serii</span>
                      </div>
                      <p className="text-xs text-textSecondary mt-1.5 line-clamp-2 leading-relaxed">{uniqueExNames.join(', ')}{tpl.series.length > 3 ? '...' : ''}</p>
                    </div>
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-zinc-800/40">
                      <button onClick={() => handleLoadTemplate(tpl.id)} className="text-xs font-bold text-gymRed hover:text-red-400 cursor-pointer bg-transparent border-none">Trenuj ➔</button>
                      <button onClick={() => onDeleteTemplate(tpl.id)} className="text-textMuted hover:text-gymDanger transition-colors cursor-pointer bg-transparent border-none p-1"><i className="ti ti-trash text-xs" /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // =========================================================================
  // STAN 2 & 3: INTERFEJS AKTYWNEGO KREATORA (Trening LUB Tworzenie Planu)
  // =========================================================================
  const isCreatorMode = activeMode === 'template_creator'

  return (
    <div className="max-w-[640px] mx-auto flex flex-col gap-4 text-left animate-in fade-in duration-200">
      
      {/* PANEL KONTROLNY NAGŁÓWKA */}
      <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-3">
        <div>
          <h2 className={`text-xl font-black tracking-tight ${isCreatorMode ? 'text-gymPremium' : 'text-white'}`}>
            {isCreatorMode ? 'Projektowanie szablonu 📋' : 'Aktywny trening ⚡'}
          </h2>
          <p className="text-xs text-textSecondary mt-0.5">
            {isCreatorMode ? 'Definiujesz domyślne ćwiczenia i serie.' : `${localSeriesList.length} serii zapisanych w tej sesji.`}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={handleExitToSelection} className="px-3 py-2 border border-zinc-800 hover:bg-zinc-800/30 text-textSecondary font-bold text-xs rounded-gp-md cursor-pointer transition-colors">
            Wyjdź ✕
          </button>
          <button 
            onClick={isCreatorMode ? handleSaveCustomTemplate : onSubmitWorkout} 
            disabled={isCreatorMode ? templateSeriesList.length === 0 : localSeriesList.length === 0}
            className={`px-4 py-2 font-black text-xs rounded-gp-md cursor-pointer transition-all active:scale-95 shadow-md disabled:opacity-40 ${isCreatorMode ? 'bg-gymPremium text-gymDark' : 'bg-gymSuccess text-gymDark'}`}
          >
            {isCreatorMode ? 'Zapisz plan' : 'Zakończ trening'}
          </button>
        </div>
      </div>

      {/* INPUT NAZWY (Dynamiczny nagłówek) */}
      <input
        type="text"
        placeholder={isCreatorMode ? "Podaj nazwę planu (np. Góra - Siła, Dół A)..." : "Nazwa dzisiejszego treningu..."}
        value={isCreatorMode ? customTemplateName : workoutName}
        onChange={e => isCreatorMode ? setCustomTemplateName(e.target.value) : setWorkoutName(e.target.value)}
        className="w-full p-3 rounded-gp-md border border-zinc-800 bg-gymCard text-white text-sm font-bold outline-none focus:border-gymRed"
        required
      />

      {/* MINUTNIK (Pokazujemy go TYLKO, gdy ktoś faktycznie ćwiczy na siłowni!) */}
      {!isCreatorMode && <RestTimerWrapper timerRef={timerRef} key={0} />}

      {/* PANEL ZBUDOWANYCH ĆWICZEŃ */}
      {sessionExercises.length > 0 && (
        <div className="bg-gymCard border border-zinc-800/40 rounded-gp-lg overflow-hidden shadow-lg">
          <div className="divide-y divide-zinc-800/50">
            {sessionExercises.map(exId => {
              const ex = exercises.find(e => e.id === exId)
              if (!ex) return null
              const series = getSeriesForExercise(exId)
              const isActive = exId === activeExId

              return (
                <div key={exId} onClick={() => setActiveExId(exId)} className={`flex items-center p-3 gap-3 cursor-pointer transition-colors ${isActive ? 'bg-gymRed/5' : 'hover:bg-zinc-800/20'}`}>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${series.length > 0 ? (isCreatorMode ? 'text-gymPremium bg-gymPremium' : 'bg-gymSuccess') : 'bg-zinc-700'}`} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm truncate ${isActive ? (isCreatorMode ? 'text-gymPremium font-bold' : 'text-gymRed font-bold') : 'text-textPrimary'}`}>{ex.name}</div>
                    {series.length > 0 && (
                      <div className="text-xs text-textSecondary font-mono mt-0.5">
                        {isCreatorMode ? `${series.length} zaplanowanych serii` : series.map(s => `${s.weight}×${s.reps}`).join('  ·  ')}
                      </div>
                    )}
                  </div>
                  <button onClick={e => { e.stopPropagation(); removeExerciseFromSession(exId) }} className="p-1 text-textSecondary hover:text-gymDanger opacity-60 hover:opacity-100 transition-all cursor-pointer">
                    <i className="ti ti-x text-sm" />
                  </button>
                </div>
              )
            })}
          </div>

          {/* LOGGER / CREATOR POJEDYNCZEJ SERII ĆWICZENIA */}
          {activeEx && (
            <div className="p-4 border-t border-zinc-800 bg-gymCardSecondary/40">
              <div className={`text-xs font-bold uppercase tracking-wider mb-3 ${isCreatorMode ? 'text-gymPremium' : 'text-gymRed'}`}>
                {activeEx.name} — {isCreatorMode ? `DODAWANIE SERII DOCELOWEJ #${activeSeriesList.length + 1}` : `SERIA # ${activeSeriesList.length + 1}`}
              </div>

              {/* INPUT CIĘŻARU */}
              <div className="mb-3">
                <label className="text-[11px] font-semibold text-textSecondary block mb-1">{isCreatorMode ? 'Sugerowany ciężar (kg):' : 'Ciężar (kg):'}</label>
                <div className="flex gap-2 items-center">
                  <button onClick={() => adjustWeight(-2.5)} className="w-11 h-11 rounded-gp-md border border-zinc-800 bg-gymCard hover:bg-zinc-800 text-xl font-light flex items-center justify-center cursor-pointer text-textPrimary active:scale-95 transition-transform">−</button>
                  <input type="number" step="0.5" value={weight} onChange={e => setWeight(e.target.value)} className="flex-1 h-11 text-center font-mono text-xl font-bold bg-gymCard border border-zinc-800 rounded-gp-md text-white outline-none focus:border-gymRed" />
                  <button onClick={() => adjustWeight(2.5)} className="w-11 h-11 rounded-gp-md border border-zinc-800 bg-gymCard hover:bg-zinc-800 text-xl font-light flex items-center justify-center cursor-pointer text-textPrimary active:scale-95 transition-transform">+</button>
                </div>
              </div>

              {/* INPUT POWTÓRZEŃ */}
              <div className="mb-3">
                <label className="text-[11px] font-semibold text-textSecondary block mb-1">{isCreatorMode ? 'Docelowa liczba powtórzeń:' : 'Powtórzenia:'}</label>
                <div className="flex gap-2 items-center">
                  <button onClick={() => adjustReps(-1)} className="w-11 h-11 rounded-gp-md border border-zinc-800 bg-gymCard hover:bg-zinc-800 text-xl font-light flex items-center justify-center cursor-pointer text-textPrimary active:scale-95 transition-transform">−</button>
                  <input type="number" value={reps} onChange={e => setReps(e.target.value)} className="flex-1 h-11 text-center font-mono text-xl font-bold bg-gymCard border border-zinc-800 rounded-gp-md text-white outline-none focus:border-gymRed" />
                  <button onClick={() => adjustReps(1)} className="w-11 h-11 rounded-gp-md border border-zinc-800 bg-gymCard hover:bg-zinc-800 text-xl font-light flex items-center justify-center cursor-pointer text-textPrimary active:scale-95 transition-transform">+</button>
                </div>
              </div>

              {/* PRESETY */}
              <div className="flex gap-1 mb-4">
                {[5, 6, 8, 10, 12, 15].map(r => (
                  <button key={r} onClick={() => setReps(String(r))} className={`flex-1 py-1.5 rounded-gp-sm text-xs font-mono font-bold border transition-all cursor-pointer ${reps === String(r) ? (isCreatorMode ? 'border-gymPremium text-gymPremium bg-gymPremium/5' : 'border-gymRed text-gymRed bg-gymRed/5') : 'border-zinc-800 text-textSecondary bg-transparent hover:text-white'}`}>{r}</button>
                ))}
              </div>

              {/* PRZYCISK DOPISANIA SERII */}
              <button 
                onClick={confirmSeries} 
                disabled={!weight || !reps} 
                className={`w-full py-3 disabled:opacity-40 text-white font-bold text-sm rounded-gp-md cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-md ${isCreatorMode ? 'bg-gymPremium text-gymDark' : 'bg-gymRed hover:bg-gymRedHover'}`}
              >
                <i className="ti ti-check text-base" /> {isCreatorMode ? 'Dodaj serię do struktury szablonu' : 'Zapisz serię i włącz pauzę ⏱️'}
              </button>

              {activeSeriesList.length > 0 && (
                <button onClick={() => removeLastSeries(activeExId)} className="w-full mt-2 py-1.5 border border-zinc-800 hover:border-zinc-700 bg-transparent text-textSecondary text-[11px] font-semibold rounded-gp-md cursor-pointer flex items-center justify-center gap-1 transition-colors">
                  <i className="ti ti-arrow-back" /> Usuń ostatnią serię stąd
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* PRZYCISK ELEMENTU ATLASU */}
      <button onClick={() => setView(v => v === 'builder' ? 'logger' : 'builder')} className="w-full py-2.5 border border-dashed border-zinc-800 hover:border-zinc-600 bg-transparent text-textSecondary hover:text-white text-xs font-bold rounded-gp-md cursor-pointer flex items-center justify-center gap-1.5 transition-colors">
        <i className={`ti ti-${view === 'builder' ? 'x' : 'plus'} text-base`} />
        {view === 'builder' ? 'Ukryj atlas ćwiczeń' : 'Dodaj ćwiczenie z atlasu kapitałowego'}
      </button>

      {/* ATLAS ĆWICZEŃ */}
      {view === 'builder' && (
        <div className="bg-gymCard border border-zinc-800/40 rounded-gp-lg overflow-hidden shadow-xl animate-in fade-in duration-150">
          <div className="p-3 border-b border-zinc-800">
            <input type="search" placeholder="Wpisz nazwę szukanego ćwiczenia..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus className="w-full p-2.5 rounded-gp-md border border-zinc-800 bg-gymCardSecondary text-white text-sm outline-none focus:border-gymRed" />
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

      {/* NOTATKI (Tylko podczas realnego treningu) */}
      {!isCreatorMode && (
        <textarea placeholder="Komentarz lub notatki do dzisiejszego treningu (opcjonalnie)..." value={workoutComment} onChange={e => setWorkoutComment(e.target.value)} className="w-full p-3 rounded-gp-md border border-zinc-800 bg-gymCard text-white text-sm outline-none focus:border-gymRed min-h-[64px] resize-none" />
      )}

      {/* ZAPIS JAKO SZABLON (Tylko podczas realnego treningu, jako funkcja zapisu w locie) */}
      {!isCreatorMode && localSeriesList.length > 0 && (
        <div className="bg-gymCardSecondary border border-zinc-800/40 rounded-gp-lg p-3 shadow-md">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={saveAsTemplateCheckbox} onChange={e => setSaveAsTemplateCheckbox(e.target.checked)} className="w-4 h-4 rounded border-zinc-800 bg-gymCard accent-gymRed cursor-pointer" />
            <span className="text-xs font-bold text-textPrimary">Zapisz ten bieżący trening jako nowy szablon</span>
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