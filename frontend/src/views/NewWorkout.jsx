// frontend/src/views/NewWorkout.jsx
import React, { useState, useRef, useEffect } from 'react'
import RestTimer from './RestTimer'

// Definicja dostępnych typów serii, ich etykiet i klas kolorystycznych Tailwind
const SERIES_TYPES = {
  NORMAL: { label: (idx) => idx + 1, bg: 'bg-zinc-800/40 text-textSecondary border-zinc-700/50' },
  WARMUP: { label: () => 'W', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  DROP_SET: { label: () => 'D', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  FAILURE: { label: () => 'F', bg: 'bg-red-500/10 text-red-400 border-red-500/30' }
}

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
  // 1. GŁÓWNY STEROWNIK TRYBU
  const [activeMode, setActiveMode] = useState(() => {
    if (localSeriesList.length > 0) return 'active_workout'
    return 'selection'
  })

  // 🛠️ [POPRAWKA TDZ] Deklaracja przeniesiona na samą górę ciała komponentu
  const isCreatorMode = activeMode === 'template_creator'

  // 2. STANY KOMPONENTU
  const [sessionExercises, setSessionExercises] = useState([])
  const [customTemplateName, setCustomTemplateName] = useState('')
  const [templateSeriesList, setTemplateSeriesList] = useState([])
  const [isAtlasOpen, setIsAtlasOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState('Wszystkie')
  const [infoExercise, setInfoExercise] = useState(null)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  
  // Stany zarządzające In-App Numpadem
  const [activeInput, setActiveInput] = useState(null) // { globalIdx, field: 'weight' | 'reps' }
  const [showPlateCalc, setShowPlateCalc] = useState(false)

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

  // 🛠️ [POPRAWKA] Algorytm obliczania talerzy na jedną stronę sztangi 20 kg z poprawnymi zależnościami
  const platesConfig = React.useMemo(() => {
    if (!activeInput) return []
    const list = isCreatorMode ? templateSeriesList : localSeriesList
    const targetWeight = parseFloat(list[activeInput.globalIdx]?.weight || 0)
    
    const weightOnOneSide = (targetWeight - 20) / 2
    if (weightOnOneSide <= 0 || isNaN(weightOnOneSide)) return []

    const availablePlates = [25, 20, 15, 10, 5, 2.5, 1.25]
    let remaining = weightOnOneSide
    const result = []

    for (const plate of availablePlates) {
      while (remaining >= plate) {
        result.push(plate)
        remaining -= plate
      }
    }
    return result
  }, [activeInput, localSeriesList, templateSeriesList, isCreatorMode])

  // --- OBSŁUGA INTERFEJSU AKTYWNEGO TRENINGU ---

  const handleAddExerciseToSession = (exId) => {
    if (sessionExercises.includes(exId)) {
      setIsAtlasOpen(false)
      return
    }

    setSessionExercises(prev => [...prev, exId])
    setIsAtlasOpen(false)
    setSearchQuery('')
    setSelectedMuscleFilter('Wszystkie')

    if (isCreatorMode) {
      const defaultRows = [
        { exerciseId: exId, weight: '', reps: '10', order: 1, seriesType: 'NORMAL' },
        { exerciseId: exId, weight: '', reps: '10', order: 2, seriesType: 'NORMAL' },
        { exerciseId: exId, weight: '', reps: '10', order: 3, seriesType: 'NORMAL' }
      ]
      setTemplateSeriesList(prev => [...prev, ...defaultRows])
    } else {
      const defaultRows = [
        { exerciseId: exId, weight: '', reps: '', order: 1, completed: false, estimatedOneRm: null, seriesType: 'NORMAL' },
        { exerciseId: exId, weight: '', reps: '', order: 2, completed: false, estimatedOneRm: null, seriesType: 'NORMAL' },
        { exerciseId: exId, weight: '', reps: '', order: 3, completed: false, estimatedOneRm: null, seriesType: 'NORMAL' }
      ]
      setLocalSeriesList(prev => [...prev, ...defaultRows])
    }
  }

  const handleRemoveExerciseFromSession = (exId) => {
    setSessionExercises(prev => prev.filter(id => id !== exId))
    if (isCreatorMode) {
      setTemplateSeriesList(prev => prev.filter(s => s.exerciseId !== exId))
    } else {
      setLocalSeriesList(prev => prev.filter(s => s.exerciseId !== exId))
    }
    setActiveInput(null)
  }

  const handleAddRowToExercise = (exId) => {
    if (isCreatorMode) {
      const currentCount = templateSeriesList.filter(s => s.exerciseId === exId).length
      const newRow = { exerciseId: exId, weight: '', reps: '10', order: currentCount + 1, seriesType: 'NORMAL' }
      setTemplateSeriesList(prev => [...prev, newRow])
    } else {
      const currentCount = localSeriesList.filter(s => s.exerciseId === exId).length
      const newRow = { exerciseId: exId, weight: '', reps: '', order: currentCount + 1, completed: false, estimatedOneRm: null, seriesType: 'NORMAL' }
      setLocalSeriesList(prev => [...prev, newRow])
    }
  }

  const handleRemoveRowFromExercise = (exId) => {
    const list = isCreatorMode ? templateSeriesList : localSeriesList
    const setter = isCreatorMode ? setTemplateSeriesList : setLocalSeriesList
    const targetIdx = [...list].reverse().findIndex(s => s.exerciseId === exId)
    if (targetIdx === -1) return
    const realIndex = list.length - 1 - targetIdx
    setter(prev => prev.filter((_, i) => i !== realIndex))
    setActiveInput(null)
  }

  const handleUpdateInlineValue = (globalIdx, field, val, modeStr) => {
    const setter = modeStr === 'creator' ? setTemplateSeriesList : setLocalSeriesList
    setter(prev => prev.map((item, i) => i === globalIdx ? { ...item, [field]: val } : item))
  }

  const handleCycleSeriesType = (globalIdx, modeStr) => {
    const setter = modeStr === 'creator' ? setTemplateSeriesList : setLocalSeriesList
    const list = modeStr === 'creator' ? templateSeriesList : localSeriesList
    if (list[globalIdx]?.completed) return

    const currentType = list[globalIdx]?.seriesType || 'NORMAL'
    const typesKeys = Object.keys(SERIES_TYPES)
    const nextIndex = (typesKeys.indexOf(currentType) + 1) % typesKeys.length
    const nextType = typesKeys[nextIndex]

    setter(prev => prev.map((item, i) => i === globalIdx ? { ...item, seriesType: nextType } : item))
  }

  // LOGIKA NACISKANIA KLAWISZY NA WŁASNYM NUMPADZIE
  const handleNumpadPress = (key) => {
    if (!activeInput) return
    const modeStr = isCreatorMode ? 'creator' : 'workout'
    const list = isCreatorMode ? templateSeriesList : localSeriesList
    const currentVal = String(list[activeInput.globalIdx]?.[activeInput.field] || '')

    if (key === 'BACKSPACE') {
      const newVal = currentVal.slice(0, -1)
      handleUpdateInlineValue(activeInput.globalIdx, activeInput.field, newVal, modeStr)
    } else if (key === '.') {
      if (activeInput.field === 'reps') return
      if (currentVal.includes('.')) return
      handleUpdateInlineValue(activeInput.globalIdx, activeInput.field, currentVal + '.', modeStr)
    } else if (key === 'DALEJ') {
      if (activeInput.field === 'weight') {
        setActiveInput({ globalIdx: activeInput.globalIdx, field: 'reps' })
      } else {
        setActiveInput(null)
        setShowPlateCalc(false)
      }
    } else if (key.startsWith('+')) {
      const inc = parseFloat(key.replace(' kg', ''))
      const currentNum = parseFloat(currentVal) || 0
      const newVal = String(currentNum + inc)
      handleUpdateInlineValue(activeInput.globalIdx, activeInput.field, newVal, modeStr)
    } else {
      const newVal = currentVal === '0' ? key : currentVal + key
      handleUpdateInlineValue(activeInput.globalIdx, activeInput.field, newVal, modeStr)
    }
  }

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
        timerRef.current.start()
      }
      return { ...item, completed: isTurningOn, estimatedOneRm: oneRm }
    }))
  }

  // --- SAVES & LOADING ---
  const handleStartTemplateCreator = () => {
    setCustomTemplateName('')
    setTemplateSeriesList([])
    setSessionExercises([])
    setIsAtlasOpen(true)
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
      order: i + 1,
      seriesType: s.seriesType || 'NORMAL'
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

    const mapped = tpl.series.map(s => {
      const ex = exercises.find(e => e.id === s.exerciseId)
      return {
        exerciseId: s.exerciseId,
        exerciseName: ex?.name ?? 'Ćwiczenie',
        weight: '', 
        reps: s.reps ? String(s.reps) : '', 
        completed: false,
        estimatedOneRm: null,
        seriesType: s.seriesType || 'NORMAL'
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

  const confirmExit = () => {
    setWorkoutName('')
    setWorkoutComment('')
    setLocalSeriesList([])
    setSessionExercises([])
    setActiveInput(null)
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
      order: idx + 1,
      seriesType: s.seriesType || 'NORMAL'
    }))

    try {
      await handleSaveWorkout(normalized)
    } catch (err) {
      if (showToast) showToast(err.message || 'Błąd zapisu treningu', 'error')
    }
  }

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

  const currentGlobalList = isCreatorMode ? templateSeriesList : localSeriesList

  // =========================================================================
  // STAN 1: SELECTION (COUCH MODE HOME)
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

  // =========================================================================
  // STAN 2: ACTIVE WORKOUT / TEMPLATE CREATOR PANEL
  // =========================================================================
  return (
    <div className="max-w-[640px] mx-auto flex flex-col gap-4 text-left animate-in fade-in duration-200 pb-20">
      
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
          <button onClick={() => setIsCancelModalOpen(true)} className="px-3 py-2 border border-zinc-800 hover:bg-zinc-800/30 text-textSecondary font-bold text-xs rounded-gp-md cursor-pointer transition-colors">
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

      {sessionExercises.length === 0 ? (
        <div className="text-center py-16 bg-gymCard/30 border border-dashed border-zinc-800 rounded-gp-lg p-6 text-textMuted text-xs italic">
          Brak ćwiczeń w strukturze. Tapnij poniższy przycisk, aby rozbudować listę z atlasu.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sessionExercises.map((exId) => {
            const exerciseObj = exercises.find(e => e.id === exId)
            if (!exerciseObj) return null

            const exerciseRows = currentGlobalList
              .map((s, globalIndex) => ({ ...s, globalIndex }))
              .filter(s => s.exerciseId === exId)

            // ULTRA-KOMPAKTOWY WIDOK JEDNOLINIJKOWY DLA PROJEKTOWANIA PLANU
            if (isCreatorMode) {
              return (
                <div key={exId} className="bg-gymCard border border-zinc-800/40 rounded-gp-lg p-3 flex items-center justify-between gap-4 shadow-md animate-in fade-in duration-150">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-textPrimary truncate">{exerciseObj.name}</h3>
                      <button
                        type="button"
                        onClick={() => setInfoExercise(exerciseObj)}
                        className="p-1 text-textMuted hover:text-white transition-colors cursor-pointer text-[11px] bg-zinc-800/40 hover:bg-zinc-800 rounded-md font-bold"
                      >
                        ⓘ
                      </button>
                    </div>
                    <span className="text-[10px] font-bold text-textMuted uppercase tracking-wider mt-0.5 block">{exerciseObj.muscle_group || 'Inne'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-gymCardSecondary/60 border border-zinc-800/60 p-1 rounded-gp-md shrink-0 select-none">
                    <button
                      type="button"
                      onClick={() => handleRemoveRowFromExercise(exId)}
                      disabled={exerciseRows.length <= 1}
                      className="w-7 h-7 rounded bg-zinc-800 border border-zinc-700/60 hover:text-gymDanger text-textSecondary disabled:opacity-20 flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
                    >
                      －
                    </button>
                    <span className="text-xs font-mono font-black text-white min-w-[55px] text-center">
                      {exerciseRows.length} {exerciseRows.length === 1 ? 'seria' : exerciseRows.length < 5 ? 'serie' : 'serii'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddRowToExercise(exId)}
                      className="w-7 h-7 rounded bg-zinc-800 border border-zinc-700/60 hover:text-white text-textSecondary flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
                    >
                      ＋
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveExerciseFromSession(exId)}
                    className="p-1.5 text-textMuted hover:text-gymDanger transition-colors cursor-pointer text-sm shrink-0"
                  >
                    ✕
                  </button>
                </div>
              )
            }

            // PEŁNY LOGGER NA SIŁOWNIĘ (Z BADGE'AMI TYPÓW SERII + IN-APP KLAWIATURĄ)
            return (
              <div key={exId} className="bg-gymCard border border-zinc-800/40 rounded-gp-lg shadow-lg overflow-hidden animate-in fade-in duration-150">
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

                <div className="p-3">
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-12 gap-2 text-center text-[10px] font-bold text-textMuted uppercase tracking-tight px-1">
                      <div className="col-span-2 text-left">Seria</div>
                      <div className="col-span-3">Poprzednio</div>
                      <div className="col-span-3">Ciężar (kg)</div>
                      <div className="col-span-2">Powt.</div>
                      <div className="col-span-2">Status</div>
                    </div>

                    {exerciseRows.map((s, localIdx) => {
                      const currentCfg = SERIES_TYPES[s.seriesType || 'NORMAL']
                      const renderedLabel = currentCfg.label(localIdx)

                      const isWeightActive = activeInput?.globalIdx === s.globalIndex && activeInput?.field === 'weight'
                      const isRepsActive = activeInput?.globalIdx === s.globalIndex && activeInput?.field === 'reps'

                      return (
                        <div 
                          key={s.globalIndex} 
                          className={`grid grid-cols-12 gap-2 items-center text-center p-1 rounded transition-all ${
                            s.completed 
                              ? 'bg-gymSuccess/5 border-l-2 border-gymSuccess' 
                              : s.seriesType === 'WARMUP' ? 'bg-amber-500/[0.02]'
                              : s.seriesType === 'DROP_SET' ? 'bg-purple-500/[0.02]'
                              : s.seriesType === 'FAILURE' ? 'bg-red-500/[0.02]'
                              : 'bg-transparent'
                          }`}
                        >
                          <div className="col-span-2 text-left px-0.5">
                            <button
                              type="button"
                              disabled={s.completed}
                              onClick={() => handleCycleSeriesType(s.globalIndex, 'workout')}
                              className={`w-7 h-7 rounded-md border text-center font-mono text-xs font-black transition-all cursor-pointer flex items-center justify-center active:scale-90 ${currentCfg.bg} disabled:opacity-100 disabled:cursor-default`}
                            >
                              {renderedLabel}
                            </button>
                          </div>

                          <div className="col-span-3 text-[11px] text-textMuted font-medium truncate font-mono">
                            —
                          </div>

                          {/* INPUT CIĘŻARU (WŁASNY NUMPAD) */}
                          <div className="col-span-3">
                            <input 
                              type="text"
                              inputMode="none"
                              readOnly={true}
                              placeholder="0"
                              disabled={s.completed}
                              value={s.weight}
                              onClick={() => !s.completed && setActiveInput({ globalIdx: s.globalIndex, field: 'weight' })}
                              className={`w-full p-1.5 rounded bg-gymCardSecondary border text-center font-mono text-xs font-bold text-white outline-none cursor-pointer disabled:opacity-40 transition-all ${
                                isWeightActive ? 'border-gymRed ring-1 ring-gymRed shadow-[0_0_8px_rgba(239,68,68,0.2)]' : 'border-zinc-800'
                              }`}
                            />
                          </div>

                          {/* INPUT POWTÓRZEŃ (WŁASNY NUMPAD - NAPRAWIONY ŚREDNIK) */}
                          <div className="col-span-2">
                            <input 
                              type="text"
                              inputMode="none"
                              readOnly={true}
                              placeholder="10"
                              disabled={s.completed}
                              value={s.reps}
                              onClick={() => !s.completed && setActiveInput({ globalIdx: s.globalIndex, field: 'reps' })}
                              className={`w-full p-1.5 rounded bg-gymCardSecondary border text-center font-mono text-xs font-bold text-white outline-none cursor-pointer disabled:opacity-40 transition-all ${
                                isRepsActive ? 'border-gymRed ring-1 ring-gymRed shadow-[0_0_8px_rgba(239,68,68,0.2)]' : 'border-zinc-800'
                              }`}
                            />
                          </div>

                          <div className="col-span-2 flex justify-center">
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
                          </div>

                        </div>
                      )
                    })}
                  </div>

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

      {/* STICKY FOOTER */}
      <div className={`fixed bottom-16 left-0 right-0 max-w-[640px] mx-auto z-40 bg-gradient-to-t from-gymDark via-gymDark to-transparent pt-6 pb-2 px-4 sm:px-0 transition-transform duration-200 ${activeInput ? 'translate-y-20 opacity-0 pointer-events-none' : ''}`}>
        <button 
          onClick={() => setIsAtlasOpen(true)} 
          className="w-full py-3.5 bg-gymCardSecondary hover:bg-zinc-800/60 border border-dashed border-zinc-800 hover:border-zinc-600 text-textSecondary hover:text-white text-xs font-bold rounded-gp-md cursor-pointer flex items-center justify-center gap-1.5 transition-colors shadow-2xl"
        >
          <span className="text-gymRed font-black text-base">＋</span> Dodaj ćwiczenie do planu sesji
        </button>
      </div>

      {/* INTERAKTYWNY IN-APP NUMPAD + PLATE CALCULATOR DRAW PANEL */}
      {activeInput && (
        <div className="fixed bottom-0 left-0 right-0 max-w-[640px] mx-auto bg-[#15181f] border-t-2 border-zinc-800 z-[9999] p-3 animate-in slide-in-from-bottom duration-200 select-none pb-safe">
          
          <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2 mb-2 px-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-400">Pole:</span>
              <span className="font-black uppercase text-gymRed bg-gymRed/10 px-2 py-0.5 rounded-md tracking-wider text-[10px]">
                {activeInput.field === 'weight' ? 'Ciężar (kg) ⚖️' : 'Powtórzenia 🔁'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-zinc-400">
              {activeInput.field === 'weight' && platesConfig.length > 0 && showPlateCalc && (
                <div className="flex items-center gap-1 bg-gymPremium/10 text-gymPremium font-mono font-black text-[10px] px-2 py-0.5 rounded border border-gymPremium/20 animate-in zoom-in-95">
                  🏋️‍♂️ Na stronę: {platesConfig.join(' + ')} kg
                </div>
              )}
              
              {activeInput.field === 'weight' && (
                <button
                  type="button"
                  onClick={() => setShowPlateCalc(!showPlateCalc)}
                  className={`p-1 rounded font-bold text-xs cursor-pointer transition-colors ${showPlateCalc ? 'bg-gymPremium text-gymDark' : 'bg-zinc-800 text-textSecondary hover:text-white'}`}
                >
                  🛠️ Talerze
                </button>
              )}
              <button 
                type="button" 
                onClick={() => { setActiveInput(null); setShowPlateCalc(false); }} 
                className="text-textMuted hover:text-white font-bold px-2 py-1 bg-zinc-900 rounded border border-zinc-800 cursor-pointer ml-1"
              >
                Zamknij
              </button>
            </div>
          </div>

          {/* SZYBKIE PRZYCISKI MIKRO-OBCIĄŻEŃ */}
          {activeInput.field === 'weight' && (
            <div className="grid grid-cols-3 gap-1.5 mb-2 font-mono">
              {['+1.25 kg', '+2.5 kg', '+5 kg'].map(inc => (
                <button
                  key={inc} type="button" onClick={() => handleNumpadPress(inc)}
                  className="py-2 bg-gymCardSecondary/60 hover:bg-zinc-800 text-gymPremium border border-zinc-800/80 font-black text-xs rounded-gp-md cursor-pointer transition-colors text-center shadow-sm"
                >
                  {inc}
                </button>
              ))}
            </div>
          )}

          {/* KLAWIATURA CYFROWA */}
          <div className="grid grid-cols-3 gap-1.5 font-mono">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button
                key={num} type="button" onClick={() => handleNumpadPress(num)}
                className="py-3 bg-zinc-800/50 hover:bg-zinc-800 active:bg-zinc-700 text-white font-black text-lg rounded-gp-md cursor-pointer transition-colors text-center shadow-md border border-zinc-800/40"
              >
                {num}
              </button>
            ))}
            <button
              type="button" onClick={() => handleNumpadPress('.')}
              className={`py-3 text-center font-black text-lg rounded-gp-md cursor-pointer border shadow-md transition-colors ${
                activeInput.field === 'reps' ? 'opacity-20 bg-zinc-900 border-zinc-900 text-zinc-700 cursor-not-allowed' : 'bg-zinc-800/50 hover:bg-zinc-800 text-white border-zinc-800/40'
              }`}
            >
              .
            </button>
            <button
              type="button" onClick={() => handleNumpadPress('0')}
              className="py-3 bg-zinc-800/50 hover:bg-zinc-800 active:bg-zinc-700 text-white font-black text-lg rounded-gp-md cursor-pointer transition-colors text-center shadow-md border border-zinc-800/40"
            >
              0
            </button>
            <button
              type="button" onClick={() => handleNumpadPress('BACKSPACE')}
              className="py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-black text-sm rounded-gp-md cursor-pointer transition-colors text-center shadow-md border border-zinc-800/60 flex items-center justify-center"
            >
              ⌫
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleNumpadPress('DALEJ')}
            className="w-full mt-2 py-3 bg-gymRed hover:bg-red-600 text-white font-black text-sm uppercase tracking-wider rounded-gp-md cursor-pointer transition-all active:scale-[0.99] shadow-lg text-center"
          >
            {activeInput.field === 'weight' ? 'Dalej ➔ (Wpisz powtórzenia)' : 'Zatwierdź pole ✓'}
          </button>

        </div>
      )}

      {/* ATLAS DRAWER */}
      {isAtlasOpen && (
        <div className="fixed inset-0 z-[1000] md:z-[998] animate-in fade-in duration-150">
          <div onClick={() => setIsAtlasOpen(false)} className="absolute inset-0 bg-black/77 backdrop-blur-xs" />
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
                      className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-tight whitespace-nowrap transition-all border cursor-pointer active:scale-95 ${isActive ? 'bg-gymRed border-gymRed text-white' : 'bg-gymCard border-zinc-800 text-textSecondary hover:text-white'}`}
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
                        className={`px-4 py-3 text-sm text-textPrimary hover:bg-gymRed/5 cursor-pointer flex items-center justify-between transition-colors border-b border-zinc-900/40 ${isAlreadyAdded ? 'opacity-40 pointer-events-none bg-zinc-900/20' : ''}`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="font-medium truncate">{ex.name}</span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setInfoExercise(ex); }}
                            className="p-1 text-textMuted hover:text-white transition-colors cursor-pointer text-[11px] bg-zinc-800/50 hover:bg-zinc-700 rounded-md font-bold shrink-0"
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
            </div>
          </div>
        </div>
      )}

      {/* DETAILS MODAL */}
      {infoExercise && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div onClick={() => setInfoExercise(null)} className="absolute inset-0 bg-black/80 backdrop-blur-xs" />
          <div className="bg-gymCard border border-zinc-800 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl relative z-10 text-left animate-in zoom-in-95 duration-150">
            {infoExercise.video_url ? (
              <video src={infoExercise.video_url} autoPlay muted loop playsInline className="w-full h-44 object-cover bg-black border-b border-zinc-800" />
            ) : (
              <div className="w-full h-44 bg-zinc-900/60 border-b border-zinc-800 flex flex-col items-center justify-center text-center p-4 text-textMuted">
                <span className="text-2xl mb-1">🏋️‍♂️</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Pętla ruchu 3D / Video</span>
              </div>
            )}
            <div className="p-5">
              <span className="text-[10px] font-black text-gymRed uppercase tracking-wider block mb-0.5">{infoExercise.muscle_group}</span>
              <h3 className="text-base font-black text-white tracking-tight mb-3">{infoExercise.name}</h3>
              <div className="text-xs text-zinc-400 leading-relaxed bg-zinc-900/40 border border-zinc-800/60 p-3 rounded-xl max-h-36 overflow-y-auto">
                {infoExercise.description || <span className="italic text-zinc-600">Brak opisu technicznego.</span>}
              </div>
              <button type="button" onClick={() => setInfoExercise(null)} className="w-full mt-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer text-center">Zamknij podgląd</button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div onClick={() => setIsCancelModalOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="bg-gymCard border border-zinc-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative z-10 text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-gymRed text-xl">⚠️</div>
            <h3 className="text-lg font-bold text-white mb-2 tracking-tight">Anulować konfigurację?</h3>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setIsCancelModalOpen(false)} className="flex-1 py-2.5 bg-[#2d2d2d] text-white font-semibold rounded-lg text-sm border border-zinc-800 cursor-pointer">Kontynuuj</button>
              <button onClick={confirmExit} className="flex-1 py-2.5 bg-gymRed hover:bg-red-600 text-white font-bold rounded-lg text-sm cursor-pointer">Tak, anuluj</button>
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