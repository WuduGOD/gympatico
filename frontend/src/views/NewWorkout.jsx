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
  showToast
}) {
  // GŁÓWNY STEROWNIK TRYBU: 'selection' | 'active_workout' | 'template_creator'
  const [activeMode, setActiveMode] = useState(() => {
    if (localSeriesList.length > 0) return 'active_workout'
    return 'selection'
  })

  // Kolejność i lista bloków ćwiczeń wyświetlanych na ekranie
  const [sessionExercises, setSessionExercises] = useState([])
  
  // Stany dla konfiguracji szablonu w domu (Couch Mode)
  const [customTemplateName, setCustomTemplateName] = useState('')
  const [templateSeriesList, setTemplateSeriesList] = useState([])

  // Kontrola dolnego Drawera z atlasem ćwiczeń
  const [isAtlasOpen, setIsAtlasOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Stan aktywnego filtra grupy mięśniowej
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState('Wszystkie')

  // 🛠️ [NOWOŚĆ] Stan obsługi modalu z podglądem animacji i instrukcji ćwiczenia
  const [infoExercise, setInfoExercise] = useState(null)
  
  // State dla bezpiecznego modalu anulowania treningu
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  
  const timerRef = useRef(null)

  // Automatyczna synchronizacja trybu przy czyszczeniu nadrzędnym
  useEffect(() => {
    if (localSeriesList.length === 0 && sessionExercises.length === 0 && !workoutName && activeMode === 'active_workout') {
      setActiveMode('selection')
    }
  }, [localSeriesList, sessionExercises, workoutName, activeMode])

  // Wyciąganie unikalnych grup mięśniowych z bazy do paska filtrów
  const uniqueMuscleGroups = React.useMemo(() => {
    const groups = exercises.map(e => e.muscle_group).filter(Boolean)
    return ['Wszystkie', ...new Set(groups)]
  }, [exercises])

  // --- OBSŁUGA INTERFEJSU AKTYWNEGO TRENINGU (W LOCIE NA SIŁOWNI) ---

  // Dodanie nowego ćwiczenia do aktywnego treningu lub szablonu
  const handleAddExerciseToSession = (exId) => {
    if (sessionExercises.includes(exId)) {
      setIsAtlasOpen(false)
      return
    }

    setSessionExercises(prev => [...prev, exId])
    setIsAtlasOpen(false)
    setSearchQuery('')
    setSelectedMuscleFilter('Wszystkie') // Reset filtra przy wyborze

    // Generujemy domyślnie 3 puste wiersze serii-placeholderów dla wybranego ćwiczenia
    if (activeMode === 'template_creator') {
      const defaultRows = [
        { exerciseId: exId, weight: '', reps: '10', order: 1 },
        { exerciseId: exId, weight: '', reps: '10', order: 2 },
        { exerciseId: exId, weight: '', reps: '10', order: 3 }
      ]
      setTemplateSeriesList(prev => [...prev, ...defaultRows])
    } else {
      const defaultRows = [
        { exerciseId: exId, weight: '', reps: '', order: 1, completed: false, estimatedOneRm: null },
        { exerciseId: exId, weight: '', reps: '', order: 2, completed: false, estimatedOneRm: null },
        { exerciseId: exId, weight: '', reps: '', order: 3, completed: false, estimatedOneRm: null }
      ]
      setLocalSeriesList(prev => [...prev, ...defaultRows])
    }
  }

  // Usuwanie całego bloku ćwiczenia wraz z jego seriami
  const handleRemoveExerciseFromSession = (exId) => {
    setSessionExercises(prev => prev.filter(id => id !== exId))
    if (activeMode === 'template_creator') {
      setTemplateSeriesList(prev => prev.filter(s => s.exerciseId !== exId))
    } else {
      setLocalSeriesList(prev => prev.filter(s => s.exerciseId !== exId))
    }
  }

  // Zarządzanie pojedynczymi wierszami serii (Zwiększanie/Zmniejszanie objętości bloku)
  const handleAddRowToExercise = (exId) => {
    if (activeMode === 'template_creator') {
      const currentCount = templateSeriesList.filter(s => s.exerciseId === exId).length
      const newRow = { exerciseId: exId, weight: '', reps: '10', order: currentCount + 1 }
      setTemplateSeriesList(prev => [...prev, newRow])
    } else {
      const currentCount = localSeriesList.filter(s => s.exerciseId === exId).length
      const newRow = { exerciseId: exId, weight: '', reps: '', order: currentCount + 1, completed: false, estimatedOneRm: null }
      setLocalSeriesList(prev => [...prev, newRow])
    }
  }

  const handleRemoveRowFromExercise = (exId) => {
    const list = activeMode === 'template_creator' ? templateSeriesList : localSeriesList
    const setter = activeMode === 'template_creator' ? setTemplateSeriesList : setLocalSeriesList
    
    // Szukamy indeksu ostatniej serii przypisanej do tego konkretnego ćwiczenia
    const targetIdx = [...list].reverse().findIndex(s => s.exerciseId === exId)
    if (targetIdx === -1) return
    
    const realIndex = list.length - 1 - targetIdx
    setter(prev => prev.filter((_, i) => i !== realIndex))
  }

  // Inline edycja wartości wewnątrz tablicy stanów
  const handleUpdateInlineValue = (globalIdx, field, val, modeStr) => {
    const setter = modeStr === 'creator' ? setTemplateSeriesList : setLocalSeriesList
    setter(prev => prev.map((item, i) => i === globalIdx ? { ...item, [field]: val } : item))
  }

  // Zaliczenie serii (Ptaszkiem ✓) -> Wyliczenie 1RM i aktywacja stopera
  const handleToggleCompleteSeries = (globalIdx) => {
    setLocalSeriesList(prev => prev.map((item, i) => {
      if (i !== globalIdx) return item

      const isTurningOn = !item.completed
      const w = parseFloat(item.weight)
      const r = parseInt(item.reps)

      if (isTurningOn && (isNaN(w) || isNaN(r) || r < 1)) {
        if (showToast) showToast('Wpisz poprawne wartości zanim zaliczysz serię! ⚠️', 'error')
        return item
      }

      const oneRm = isTurningOn && r >= 1 && r <= 12 ? w * (1 + r / 30) : null
      
      if (isTurningOn && timerRef.current?.start) {
        timerRef.current.start() // Odpalenie minutnika przerwy
      }

      return { ...item, completed: isTurningOn, estimatedOneRm: oneRm }
    }))
  }

  // --- AKCJE KOŃCOWE / ZAPISY ---

  const handleStartTemplateCreator = () => {
    setCustomTemplateName('')
    setTemplateSeriesList([])
    setSessionExercises([])
    setIsAtlasOpen(true) // Od razu sugerujemy wybór ćwiczeń
    setActiveMode('template_creator')
  }

  const handleSaveCustomTemplate = async () => {
    const name = customTemplateName.trim() || 'Nowy Szablon'
    if (templateSeriesList.length === 0) {
      if (showToast) showToast('Szablon musi mieć przypisane ćwiczenia! 📋', 'error')
      return
    }
    const cleanSeries = templateSeriesList.map((s, i) => ({
      exerciseId: s.exerciseId,
      weight: parseFloat(s.weight) || 0,
      reps: parseInt(s.reps) || 10,
      order: i + 1
    }))
    const ok = await onSaveTemplate(name, cleanSeries)
    if (ok) setActiveMode('selection')
  }

  const handleLoadTemplate = (templateId) => {
    const tpl = templates?.find(t => t.id === templateId)
    if (!tpl) return

    setWorkoutName(tpl.name)
    const exIds = [...new Set(tpl.series.map(s => s.exerciseId))]
    setSessionExercises(exIds)

    // Mapowanie struktury bazy na interaktywne, czyste wiersze loggera
    const mapped = tpl.series.map(s => {
      const ex = exercises.find(e => e.id === s.exerciseId)
      return {
        exerciseId: s.exerciseId,
        exerciseName: ex?.name ?? 'Ćwiczenie',
        weight: '', 
        reps: s.reps ? String(s.reps) : '', 
        completed: false,
        estimatedOneRm: null
      }
    })
    setLocalSeriesList(mapped)
    setActiveMode('active_workout')
  }

  const handleStartEmptyWorkout = () => {
    setWorkoutName(`Trening rutynowy - ${new Date().toLocaleDateString()}`)
    setSessionExercises([])
    setLocalSeriesList([])
    setActiveMode('active_workout')
  }

  const handleExitToSelection = () => {
    setIsCancelModalOpen(true)
  }

  const confirmExit = () => {
    setWorkoutName('')
    setWorkoutComment('')
    setLocalSeriesList([])
    setSessionExercises([])
    setActiveMode('selection')
    setIsCancelModalOpen(false)
  }

  const onSubmitActiveWorkout = async (e) => {
    e?.preventDefault()
    const finished = localSeriesList.filter(s => s.completed && s.weight && s.reps)
    
    if (finished.length === 0) {
      if (showToast) showToast('Nie odznaczono żadnej ukończonej serii ptaszkiem ✓! ⚠️', 'error')
      return
    }

    const normalized = finished.map((s, idx) => ({
      ...s,
      weight: parseFloat(s.weight),
      reps: parseInt(s.reps),
      order: idx + 1
    }))

    setLocalSeriesList(normalized)
    
    setTimeout(() => {
      handleSaveWorkout()
    }, 40)
  }

  // Filtrowanie hybrydowe (Wyszukiwarka + Grupa mięśniowa)
  const filteredExercises = exercises.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesMuscle = selectedMuscleFilter === 'Wszystkie' || e.muscle_group === selectedMuscleFilter
    return matchesSearch && matchesMuscle
  })

  const groupedExercises = filteredExercises.reduce((acc, ex) => {
    const g = ex.muscle_group || 'Inne'
    if (!acc[g]) acc[g] = []
    acc[g].push(ex)
    return acc
  }, {})

  const isCreatorMode = activeMode === 'template_creator'
  const currentGlobalList = isCreatorMode ? templateSeriesList : localSeriesList

  // =========================================================================
  // STAN 1: HOME / COUCH MODE
  // =========================================================================
  if (activeMode === 'selection') {
    return (
      <div className="max-w-[640px] mx-auto flex flex-col gap-6 text-left animate-in fade-in duration-200">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white">Trening i Plany 🚀</h2>
          <p className="text-xs text-textSecondary mt-0.5">Wybierz szablon na dziś lub skonfiguruj nowy plan w domu.</p>
        </div>

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
                        <span className="text-[9px] font-black text-gymRed bg-gymRed/10 px-2 py-0.5 rounded-full uppercase shrink-0">{uniqueExNames.length} ćw.</span>
                      </div>
                      <p className="text-xs text-textSecondary mt-1.5 line-clamp-2 leading-relaxed">{uniqueExNames.join(', ')}{uniqueExNames.length > 3 ? '...' : ''}</p>
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

  return (
    <div className="max-w-[640px] mx-auto flex flex-col gap-4 text-left animate-in fade-in duration-200 pb-20">
      
      {/* PANEL STEROWANIA FORMULARZA */}
      <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-3">
        <div>
          <h2 className={`text-xl font-black tracking-tight ${isCreatorMode ? 'text-gymPremium' : 'text-white'}`}>
            {isCreatorMode ? 'Projektowanie szablonu 📋' : 'Aktywny trening ⚡'}
          </h2>
          <p className="text-xs text-textSecondary mt-0.5">
            {isCreatorMode ? 'Definiujesz szkielet serii i powtórzeń.' : 'Wprowadź ciężary i odznaczaj ukończone serie.'}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={handleExitToSelection} className="px-3 py-2 border border-zinc-800 hover:bg-zinc-800/30 text-textSecondary font-bold text-xs rounded-gp-md cursor-pointer transition-colors">
            Wyjdź ✕
          </button>
          <button 
            onClick={isCreatorMode ? handleSaveCustomTemplate : onSubmitActiveWorkout} 
            className={`px-4 py-2 font-black text-xs rounded-gp-md cursor-pointer transition-all active:scale-95 shadow-md ${isCreatorMode ? 'bg-gymPremium text-gymDark' : 'bg-gymSuccess text-gymDark'}`}
          >
            {isCreatorMode ? 'Zapisz plan' : 'Zakończ trening'}
          </button>
        </div>
      </div>

      <input
        type="text"
        placeholder={isCreatorMode ? "Podaj nazwę planu (np. Push Siła, Pull B)..." : "Nazwa dzisiejszej sesji..."}
        value={isCreatorMode ? customTemplateName : workoutName}
        onChange={e => isCreatorMode ? setCustomTemplateName(e.target.value) : setWorkoutName(e.target.value)}
        className="w-full p-3 rounded-gp-md border border-zinc-800 bg-gymCard text-white text-sm font-bold outline-none focus:border-gymRed"
        required
      />

      {!isCreatorMode && <RestTimerWrapper timerRef={timerRef} />}

      {/* RENDEROWANIE KART ELEMENTÓW NA OŚI SESJI */}
      {sessionExercises.length === 0 ? (
        <div className="text-center py-16 bg-gymCard/30 border border-dashed border-zinc-800 rounded-gp-lg p-6 text-textMuted text-xs italic">
          Brak ćwiczeń w strukturze. Tapnij poniższy przycisk, aby rozbudować listę z atlasu.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sessionExercises.map((exId) => {
            const exerciseObj = exercises.find(e => e.id === exId)
            if (!exerciseObj) return null

            const exerciseRows = currentGlobalList
              .map((s, globalIndex) => ({ ...s, globalIndex }))
              .filter(s => s.exerciseId === exId)

            return (
              <div key={exId} className="bg-gymCard border border-zinc-800/40 rounded-gp-lg shadow-lg overflow-hidden animate-in fade-in duration-150">
                
                {/* NAGŁÓWEK KARTY ĆWICZENIA (Zintegrowane Info ⓘ) */}
                <div className="px-4 py-3 bg-gymCardSecondary/40 border-b border-zinc-800/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div>
                      <h3 className="text-sm font-bold text-textPrimary leading-tight truncate">{exerciseObj.name}</h3>
                      <span className="text-[10px] font-bold text-textMuted uppercase tracking-wider">{exerciseObj.muscle_group || 'Inne'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInfoExercise(exerciseObj)}
                      className="p-1 text-textMuted hover:text-white transition-colors cursor-pointer text-xs bg-zinc-800/40 hover:bg-zinc-800/80 rounded-md shrink-0 font-bold"
                      title="Podgląd instrukcji"
                    >
                      ⓘ
                    </button>
                  </div>
                  <button 
                    onClick={() => handleRemoveExerciseFromSession(exId)}
                    className="p-1 text-textMuted hover:text-gymDanger transition-colors cursor-pointer text-sm shrink-0"
                  >
                    ✕
                  </button>
                </div>

                {/* INTERAKTYWNA TABELA SERII INLINE */}
                <div className="p-3">
                  {exerciseRows.length === 0 ? (
                    <p className="text-[11px] text-textMuted italic py-2">Brak zdefiniowanych wierszy serii.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-12 gap-2 text-center text-[10px] font-bold text-textMuted uppercase tracking-tight px-1">
                        <div className="col-span-2 text-left">Seria</div>
                        <div className="col-span-3">Poprzednio</div>
                        <div className="col-span-3">Ciężar (kg)</div>
                        <div className="col-span-2">Powt.</div>
                        <div className="col-span-2">Status</div>
                      </div>

                      {exerciseRows.map((s, localIdx) => (
                        <div 
                          key={s.globalIndex} 
                          className={`grid grid-cols-12 gap-2 items-center text-center p-1 rounded transition-colors ${
                            s.completed ? 'bg-gymSuccess/5 border-l-2 border-gymSuccess' : 'bg-transparent'
                          }`}
                        >
                          <div className="col-span-2 text-left font-mono text-xs font-bold text-textSecondary px-1">
                            {localIdx + 1}
                          </div>

                          <div className="col-span-3 text-[11px] text-textMuted font-medium truncate font-mono">
                            {isCreatorMode ? '—' : '60 kg x 8'}
                          </div>

                          <div className="col-span-3">
                            <input 
                              type="number"
                              step="0.5"
                              placeholder="0"
                              disabled={s.completed}
                              value={s.weight}
                              onChange={e => handleUpdateInlineValue(s.globalIndex, 'weight', e.target.value, isCreatorMode ? 'creator' : 'workout')}
                              className="w-full p-1.5 rounded bg-gymCardSecondary border border-zinc-800 text-center font-mono text-xs font-bold text-white outline-none focus:border-gymRed disabled:opacity-40"
                            />
                          </div>

                          <div className="col-span-2">
                            <input 
                              type="number"
                              placeholder="10"
                              disabled={s.completed}
                              value={s.reps}
                              onChange={e => handleUpdateInlineValue(s.globalIndex, 'reps', e.target.value, isCreatorMode ? 'creator' : 'workout')}
                              className="w-full p-1.5 rounded bg-gymCardSecondary border border-zinc-800 text-center font-mono text-xs font-bold text-white outline-none focus:border-gymRed disabled:opacity-40"
                            />
                          </div>

                          <div className="col-span-2 flex justify-center">
                            {isCreatorMode ? (
                              <span className="text-textMuted text-xs font-bold">—</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleCompleteSeries(s.globalIndex)}
                                className={`w-7 h-7 rounded-md flex items-center justify-center font-black text-xs transition-all cursor-pointer border ${
                                  s.completed 
                                    ? 'bg-gymSuccess text-gymDark border-emerald-500' 
                                    : 'bg-transparent text-textMuted border-zinc-800 hover:border-zinc-700 hover:text-white'
                                }`}
                              >
                                ✓
                              </button>
                            )}
                          </div>

                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 justify-end mt-3 pt-2 border-t border-zinc-800/40 text-[11px]">
                    <button 
                      onClick={() => handleRemoveRowFromExercise(exId)} 
                      disabled={exerciseRows.length === 0}
                      className="px-2.5 py-1 rounded bg-zinc-800/60 border border-zinc-800 text-textSecondary hover:text-gymDanger disabled:opacity-30 transition-colors cursor-pointer font-bold"
                    >
                      － Seria
                    </button>
                    <button 
                      onClick={() => handleAddRowToExercise(exId)}
                      className="px-2.5 py-1 rounded bg-zinc-800/60 border border-zinc-800 text-textSecondary hover:text-white transition-colors cursor-pointer font-bold"
                    >
                      ＋ Seria
                    </button>
                  </div>

                </div>

              </div>
            )
          })}
        </div>
      )}

      {/* STICKY FOOTER ACTION BAR */}
      <div className="fixed bottom-16 left-0 right-0 max-w-[640px] mx-auto z-40 bg-gradient-to-t from-gymDark via-gymDark to-transparent pt-6 pb-2 px-4 sm:px-0">
        <button 
          onClick={() => setIsAtlasOpen(true)} 
          className="w-full py-3.5 bg-gymCardSecondary hover:bg-zinc-800/60 border border-dashed border-zinc-800 hover:border-zinc-600 text-textSecondary hover:text-white text-xs font-bold rounded-gp-md cursor-pointer flex items-center justify-center gap-1.5 transition-colors shadow-2xl"
        >
          <span className="text-gymRed font-black text-base">＋</span> Dodaj ćwiczenie do planu sesji
        </button>
      </div>

      {/* ATLAS JAKO BOTTOM SHEET DRAWER PANEL */}
      {isAtlasOpen && (
        <div className="fixed inset-0 z-[1000] md:z-[998] animate-in fade-in duration-150">
          <div onClick={() => setIsAtlasOpen(false)} className="absolute inset-0 bg-black/75 backdrop-blur-xs" />
          
          <div className="absolute bottom-16 left-0 right-0 max-w-[640px] mx-auto bg-[#14161d] border-t border-zinc-800 rounded-t-2xl flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[75vh]">
            <div className="w-12 h-1 bg-zinc-800 rounded-full mx-auto my-2.5 shrink-0" />
            
            <div className="px-4 pb-3 pt-1 border-b border-zinc-800/80 flex flex-col gap-3 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <input 
                  type="search" 
                  placeholder="Wyszukaj ćwiczenie..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  className="flex-1 p-2.5 rounded-gp-md border border-zinc-800 bg-gymCard text-white text-base md:text-sm outline-none focus:border-gymRed font-medium" 
                />
                <button onClick={() => setIsAtlasOpen(false)} className="text-textSecondary hover:text-white font-bold text-xs px-3 py-2 bg-gymCardSecondary border border-zinc-800 rounded-gp-md cursor-pointer shrink-0 transition-colors">
                  Anuluj
                </button>
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-2 px-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden select-none">
                {uniqueMuscleGroups.map(group => {
                  const isActive = selectedMuscleFilter === group
                  return (
                    <button
                      key={group}
                      type="button"
                      onClick={() => setSelectedMuscleFilter(group)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-tight whitespace-nowrap transition-all border cursor-pointer active:scale-95 ${
                        isActive
                          ? 'bg-gymRed border-gymRed text-white shadow-md shadow-red-950/20'
                          : 'bg-gymCard border-zinc-800 text-textSecondary hover:border-zinc-700 hover:text-white'
                      }`}
                    >
                      {group}
                    </button>
                  )
                })}
              </div>
            </div>
            
            <div className="overflow-y-auto divide-y divide-zinc-800/40 flex-1 pb-6">
              {Object.entries(groupedExercises).map(([group, exList]) => (
                <div key={group} className="text-left">
                  <div className="px-4 py-1.5 text-[10px] font-bold text-textSecondary uppercase tracking-wider bg-gymCardSecondary/40 border-b border-zinc-800/20">{group}</div>
                  {exList.map(ex => {
                    const isAlreadyAdded = sessionExercises.includes(ex.id)
                    return (
                      <div 
                        key={ex.id} 
                        onClick={() => handleAddExerciseToSession(ex.id)} 
                        className={`px-4 py-3 text-sm text-textPrimary hover:bg-gymRed/5 cursor-pointer flex items-center justify-between transition-colors border-b border-zinc-900/40 ${
                          isAlreadyAdded ? 'opacity-40 pointer-events-none bg-zinc-900/20' : ''
                        }`}
                      >
                        {/* 🛠️ Wyrównany kontener z odizolowaną ikonką Info ⓘ */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="font-medium truncate">{ex.name}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation(); // Kluczowe! Zapobiega dodaniu ćwiczenia pod spodem
                              setInfoExercise(ex);
                            }}
                            className="p-1 text-textMuted hover:text-white transition-colors cursor-pointer text-[11px] bg-zinc-800/50 hover:bg-zinc-700 rounded-md font-bold shrink-0"
                            title="Instrukcja wideo"
                          >
                            ⓘ
                          </button>
                        </div>
                        <span className="text-gymRed font-bold text-base bg-gymRed/5 w-6 h-6 rounded-full flex items-center justify-center border border-red-500/10 ml-2 shrink-0">
                          {isAlreadyAdded ? '✓' : '＋'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ))}
              {filteredExercises.length === 0 && (
                <div className="p-12 text-center text-textSecondary text-xs italic">Brak pozycji w bazie o nazwie &quot;{searchQuery}&quot;</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🛠️ [NOWOŚĆ] INTERAKTYWNY MODAL DETALI - PRZYGOTOWANY POD WIDEO MULTIMEDIA */}
      {infoExercise && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div onClick={() => setInfoExercise(null)} className="absolute inset-0 bg-black/80 backdrop-blur-xs" />
          
          <div className="bg-gymCard border border-zinc-800 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl relative z-10 text-left animate-in zoom-in-95 duration-150">
            
            {/* Odtwarzacz wideo z auto-pętlą i fallbackiem */}
            {infoExercise.video_url ? (
              <video 
                src={infoExercise.video_url} 
                autoPlay 
                muted 
                loop 
                playsInline 
                className="w-full h-44 object-cover bg-black border-b border-zinc-800"
              />
            ) : (
              <div className="w-full h-44 bg-zinc-900/60 border-b border-zinc-800 flex flex-col items-center justify-center text-center p-4 text-textMuted select-none">
                <span className="text-2xl mb-1">🏋️‍♂️</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Pętla ruchu 3D / Video</span>
                <span className="text-[9px] text-zinc-600 mt-1 max-w-[220px]">Zostanie wyrenderowana automatycznie po przypisaniu linku MP4 w bazie.</span>
              </div>
            )}

            {/* Treść merytoryczna */}
            <div className="p-5">
              <span className="text-[10px] font-black text-gymRed uppercase tracking-wider block mb-0.5">
                {infoExercise.muscle_group || 'Inne'}
              </span>
              <h3 className="text-base font-black text-white tracking-tight mb-3">
                {infoExercise.name}
              </h3>
              
              <div className="text-xs text-zinc-400 leading-relaxed bg-zinc-900/40 border border-zinc-800/60 p-3 rounded-xl max-h-36 overflow-y-auto font-medium">
                {infoExercise.description ? infoExercise.description : (
                  <span className="italic text-zinc-600 text-[11px]">Brak opisu technicznego dla tego ćwiczenia. Instrukcja zostanie zaciągnięta automatycznie z kolumny opisowej bazy danych.</span>
                )}
              </div>

              <button 
                type="button"
                onClick={() => setInfoExercise(null)} 
                className="w-full mt-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer text-center"
              >
                Zamknij podgląd
              </button>
            </div>

          </div>
        </div>
      )}

      {/* REAKTYWNY MODAL POTWIERDZENIA WYJŚCIA */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div onClick={() => setIsCancelModalOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
          <div className="bg-gymCard border border-zinc-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative z-10 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-gymRed text-xl">⚠️</div>
            <h3 className="text-lg font-bold text-white mb-2 tracking-tight">Anulować konfigurację?</h3>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">Wszystkie wprowadzone dane i wiersze zostaną usunięte z pamięci podręcznej.</p>
            <div className="flex gap-3">
              <button onClick={() => setIsCancelModalOpen(false)} className="flex-1 py-2.5 bg-[#2d2d2d] hover:bg-zinc-700 text-white font-semibold rounded-lg text-sm border border-zinc-800 cursor-pointer">Kontynuuj</button>
              <button onClick={confirmExit} className="flex-1 py-2.5 bg-gymRed hover:bg-red-600 text-white font-bold rounded-lg text-sm cursor-pointer shadow-lg shadow-red-950/20">Tak, anuluj</button>
            </div>
          </div>
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