import React, { useState } from 'react'

export default function NewWorkout({ 
  exercises, 
  templates, 
  onSaveTemplate, 
  onDeleteTemplate,
  workoutName, 
  setWorkoutName, 
  workoutComment, 
  setWorkoutComment,
  currentSelectedExercise, 
  setCurrentSelectedExercise,
  seriesWeight, 
  setSeriesWeight,
  seriesReps, 
  setSeriesReps,
  localSeriesList, 
  setLocalSeriesList,
  addSeriesToLocalList, 
  handleSaveWorkout, 
  removeSeriesFromLocalList
}) {
  const [templateNameInput, setTemplateNameInput] = useState('')
  const [saveAsTemplateCheckbox, setSaveAsTemplateCheckbox] = useState(false)

  // ODPALENIE SZABLONU (Wstrzyknięcie danych bezpośrednio do globalnego koszyka serii)
  const handleLoadTemplate = (templateId) => {
    if (!templateId) return
    const tpl = templates.find(t => t.id === templateId)
    if (!tpl) return

    setWorkoutName(tpl.name)
    
    // Mapujemy strukturę bazy danych na strukturę oczekiwaną przez useWorkouts.js
    const loadedSeries = tpl.series.map((s) => {
      const ex = exercises.find(item => item.id === s.exerciseId)
      return {
        exerciseId: s.exerciseId,
        exerciseName: ex ? ex.name : 'Nieznane ćwiczenie',
        weight: parseFloat(s.weight),
        reps: parseInt(s.reps),
        order: s.order,
        estimatedOneRm: s.reps === 1 ? parseFloat(s.weight) : parseFloat(s.weight) * (1 + parseInt(s.reps) / 30)
      }
    })
    setLocalSeriesList(loadedSeries)
  }

  // WRAPPER INTEGRACYJNY ZAPISU (Zapisuje opcjonalny szablon oraz finalizuje trening)
  const onSubmitWorkout = async (e) => {
    e.preventDefault()
    
    if (saveAsTemplateCheckbox) {
      const nameForTemplate = templateNameInput.trim() || workoutName.trim() || "Mój Szablon"
      const templateSeries = localSeriesList.map((s, idx) => ({
        exerciseId: s.exerciseId,
        weight: s.weight,
        reps: s.reps,
        order: idx + 1
      }))
      const success = await onSaveTemplate(nameForTemplate, templateSeries)
      if (!success) return
    }

    // Wywołuje spiętą funkcję z App.jsx (onSaveWorkout), która odświeża bazę i robi redirect
    handleSaveWorkout()
  }

  return (
    <div className="max-w-2xl mx-auto text-left space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-black tracking-tight">Kreator Treningu 🏋️‍♂️</h2>
        <p className="text-zinc-400 text-xs md:text-sm mt-0.5">Zaloguj dzisiejsze serie robocze lub wczytaj gotowy szablon.</p>
      </div>

      {/* SEKCJA SZABLONÓW (WCZYTAJ / USUŃ) */}
      <section className="bg-gymCard p-4 rounded-xl border border-zinc-800/40 shadow-md">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Szybki Start z Szablonu</h3>
        {templates && templates.length === 0 ? (
          <p className="text-zinc-600 italic text-xs">Brak zapisanych szablonów treningowych.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {templates && templates.map(tpl => (
              <div key={tpl.id} className="flex justify-between items-center bg-[#2d2d2d]/50 p-2.5 rounded-lg border border-zinc-800/60 hover:border-zinc-700 transition-colors">
                <button
                  type="button"
                  onClick={() => handleLoadTemplate(tpl.id)}
                  className="flex-1 text-left font-bold text-sm text-zinc-200 hover:text-gymRed transition-colors cursor-pointer"
                >
                  📋 {tpl.name} <span className="text-[10px] text-zinc-500 font-normal ml-1">({tpl.series.length} serii)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteTemplate(tpl.id)}
                  className="text-zinc-500 hover:text-gymRed text-xs px-2 py-1 transition-colors cursor-pointer"
                  title="Usuń szablon"
                >
                  Usuń ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <form onSubmit={onSubmitWorkout} className="space-y-6">
        {/* METADANE TRENINGU */}
        <div className="bg-gymCard p-4 md:p-5 rounded-xl border border-zinc-800/40 shadow-lg space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Nazwa treningu</label>
            <input 
              type="text" 
              placeholder="np. Klatka + Ramiona (Push)" 
              value={workoutName} 
              onChange={e => setWorkoutName(e.target.value)}
              className="w-full p-3 rounded-lg border border-zinc-800 bg-[#2d2d2d] text-white text-sm outline-none focus:border-gymRed font-medium"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Notatki / Komentarz (Opcjonalnie)</label>
            <textarea 
              placeholder="np. Skupienie na fazie negatywnej, progres ciężaru" 
              value={workoutComment} 
              onChange={e => setWorkoutComment(e.target.value)}
              className="w-full p-3 rounded-lg border border-zinc-800 bg-[#2d2d2d] text-white text-sm outline-none focus:border-gymRed font-medium min-h-[70px] resize-none"
            />
          </div>
        </div>

        {/* LISTA DODANYCH SERII W KOSZYKU */}
        <div className="bg-gymCard p-4 md:p-5 rounded-xl border border-zinc-800/40 shadow-lg space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Zestaw serii roboczych</h3>
            <span className="text-xs text-zinc-500 font-mono">Łącznie serii: {localSeriesList.length}</span>
          </div>

          {localSeriesList.length === 0 ? (
            <p className="text-zinc-500 italic text-center py-6 text-sm">Lista serii jest pusta. Użyj formularza poniżej, aby skomponować sesję.</p>
          ) : (
            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
              {localSeriesList.map((s, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-[#2d2d2d]/40 rounded-xl border border-zinc-800/60">
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-gymRed font-mono uppercase">Seria #{index + 1}</span>
                    <h4 className="text-sm font-bold text-zinc-200 truncate">{s.exerciseName}</h4>
                  </div>
                  <div className="flex gap-4 items-center">
                    <span className="text-sm font-bold text-emerald-400 font-mono">{s.weight} kg <span className="text-zinc-500 font-normal text-xs">x</span> {s.reps}</span>
                    <button 
                      type="button"
                      onClick={() => removeSeriesFromLocalList(index)}
                      className="text-zinc-500 hover:text-gymRed text-sm p-1 transition-colors cursor-pointer"
                      title="Usuń serię"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FORMULARZ CENTRALNEGO DODAWANIA SERII (Zgodny z useWorkouts.js) */}
        <div className="bg-gymCard p-4 md:p-5 rounded-xl border border-zinc-800/40 shadow-lg space-y-4">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 pb-2">Dodaj serię roboczą</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Wybierz ćwiczenie</label>
              <select
                value={currentSelectedExercise}
                onChange={e => setCurrentSelectedExercise(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-zinc-800 bg-[#2d2d2d] text-white text-xs md:text-sm outline-none focus:border-gymRed cursor-pointer"
              >
                <option value="" disabled>-- Wybierz --</option>
                {exercises.map(ex => (
                  <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Ciężar (kg)</label>
              <input 
                type="number" 
                step="0.25"
                placeholder="np. 80"
                value={seriesWeight}
                onChange={e => setSeriesWeight(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-zinc-800 bg-[#2d2d2d] text-white text-xs font-mono outline-none focus:border-gymRed"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Powtórzenia</label>
              <input 
                type="number" 
                placeholder="np. 10"
                value={seriesReps}
                onChange={e => setSeriesReps(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-zinc-800 bg-[#2d2d2d] text-white text-xs font-mono outline-none focus:border-gymRed"
              />
            </div>
          </div>
          
          <button
            type="button"
            onClick={addSeriesToLocalList}
            className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg text-xs md:text-sm transition-all active:scale-95 cursor-pointer border border-zinc-700"
          >
            ➕ Dodaj Serię do Treningu
          </button>
        </div>

        {/* PANEL ZAPISU JAKO SZABLON */}
        <section className="bg-gymCard p-4 md:p-5 rounded-xl border border-zinc-800/40 shadow-lg space-y-3">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input 
              type="checkbox"
              checked={saveAsTemplateCheckbox}
              onChange={e => setSaveAsTemplateCheckbox(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-800 bg-[#2d2d2d] text-gymRed accent-gymRed cursor-pointer"
            />
            <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">
              Zapisz tę kompozycję jako szablon wielokrotnego użytku 💾
            </span>
          </label>

          {saveAsTemplateCheckbox && (
            <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-150">
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Nazwa nowego szablonu (Opcjonalnie)</label>
              <input 
                type="text" 
                placeholder={workoutName.trim() || "np. Mój Nowy Szablon"}
                value={templateNameInput}
                onChange={e => setTemplateNameInput(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-zinc-800 bg-[#2d2d2d] text-white text-xs outline-none focus:border-gymRed font-medium"
                maxLength={100}
              />
            </div>
          )}
        </section>

        {/* PRZYCISK FINALE */}
        <button
          type="submit"
          disabled={localSeriesList.length === 0}
          className="w-full py-4 bg-gymRed hover:bg-red-600 disabled:opacity-40 text-white font-black text-center rounded-xl text-base shadow-xl transition-all active:scale-[0.98] cursor-pointer"
        >
          Zapisz i Zakończ Sesję Treningową 🚀
        </button>
      </form>
    </div>
  )
}