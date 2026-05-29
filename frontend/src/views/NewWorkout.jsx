import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkouts } from '../hooks/useWorkouts'

export default function NewWorkout({ token, exercises, templates, onSaveTemplate, onDeleteTemplate }) {
  const navigate = useNavigate()
  const {
    workoutName, setWorkoutName,
    workoutComment, setWorkoutComment,
    localSeriesList, setLocalSeriesList,
    handleAddSeriesRow, handleRemoveSeriesRow, handleSeriesInputChange,
    handleSaveWorkout
  } = useWorkouts(token, () => navigate('/history'))

  const [selectedExercise, setSelectedExercise] = useState('')
  const [templateNameInput, setTemplateNameInput] = useState('')
  const [saveAsTemplateCheckbox, setSaveAsTemplateCheckbox] = useState(false)

  // ODPALENIE SZABLONU (Wstrzyknięcie danych do lokalnego stanu serii)
  const handleLoadTemplate = (templateId) => {
    if (!templateId) return
    const tpl = templates.find(t => t.id === templateId)
    if (!tpl) return

    setWorkoutName(tpl.name)
    // Mapujemy strukturę bazy danych na strukturę oczekiwaną przez frontendowy useWorkouts
    const loadedSeries = tpl.series.map((s, idx) => ({
      id: `tpl-${Date.now()}-${idx}-${Math.random()}`,
      exerciseId: s.exerciseId,
      weight: s.weight,
      reps: s.reps,
      order: s.order
    }))
    setLocalSeriesList(loadedSeries)
  }

  // WRAPPER ZAPISU (Łączy zapis treningu z ewentualnym zapisem szablonu)
  const onSubmitWorkout = async (e) => {
    e.preventDefault()
    
    if (saveAsTemplateCheckbox) {
      const nameForTemplate = templateNameInput.trim() || workoutName.trim() || "Mój Szablon"
      const success = await onSaveTemplate(nameForTemplate, localSeriesList)
      if (!success) return // Jeśli walidacja szablonu wywali błąd, nie przerywamy i nie zapisujemy złego treningu
    }

    handleSaveWorkout(e)
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
        {templates.length === 0 ? (
          <p className="text-zinc-600 italic text-xs">Brak zapisanych szablonów treningowych.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {templates.map(tpl => (
              <div key={tpl.id} className="flex justify-between items-center bg-[#2d2d2d]/50 p-2.5 rounded-lg border border-zinc-800/60 hover:border-zinc-700 transition-colors">
                <button
                  type="button"
                  onClick={() => handleLoadTemplate(tpl.id)}
                  className="flex-1 text-left font-bold text-sm text-zinc-200 hover:text-gymRed transition-colors"
                >
                  📋 {tpl.name} <span className="text-[10px] text-zinc-500 font-normal ml-1">({tpl.series.length} serii)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteTemplate(tpl.id)}
                  className="text-zinc-500 hover:text-gymRed text-xs px-2 py-1 transition-colors"
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
              placeholder="np. Skupienie na fazie negatywnej, progres ciężaru w wyciskaniu" 
              value={workoutComment} 
              onChange={e => setWorkoutComment(e.target.value)}
              className="w-full p-3 rounded-lg border border-zinc-800 bg-[#2d2d2d] text-white text-sm outline-none focus:border-gymRed font-medium min-h-[70px] resize-none"
            />
          </div>
        </div>

        {/* LISTA SERII */}
        <div className="bg-gymCard p-4 md:p-5 rounded-xl border border-zinc-800/40 shadow-lg space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Zestaw serii roboczych</h3>
            <span className="text-xs text-zinc-500 font-mono">Łącznie serii: {localSeriesList.length}</span>
          </div>

          {localSeriesList.length === 0 ? (
            <p className="text-zinc-500 italic text-center py-6 text-sm">Lista serii jest pusta. Wybierz ćwiczenie poniżej, aby zacząć.</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {localSeriesList.map((s, index) => {
                const exObj = exercises.find(e => e.id === s.exerciseId)
                return (
                  <div key={s.id} className="flex flex-col sm:flex-row gap-3 p-3 bg-[#2d2d2d]/40 rounded-xl border border-zinc-800/60 relative group">
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-gymRed font-mono uppercase">Seria #{index + 1}</span>
                      <h4 className="text-sm font-bold text-zinc-200 truncate">{exObj?.name || 'Nieznane ćwiczenie'}</h4>
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className="w-24">
                        <input 
                          type="number" 
                          step="0.25"
                          placeholder="kg"
                          value={s.weight}
                          onChange={e => handleSeriesInputChange(s.id, 'weight', e.target.value)}
                          className="w-full p-2 rounded border border-zinc-800 bg-[#2d2d2d] text-white text-center text-sm font-mono"
                          required
                        />
                      </div>
                      <span className="text-zinc-600 text-xs font-mono">x</span>
                      <div className="w-16">
                        <input 
                          type="number" 
                          placeholder="powt"
                          value={s.reps}
                          onChange={e => handleSeriesInputChange(s.id, 'reps', e.target.value)}
                          className="w-full p-2 rounded border border-zinc-800 bg-[#2d2d2d] text-white text-center text-sm font-mono"
                          required
                        />
                      </div>
                      <button 
                        type="button"
                        onClick={() => handleRemoveSeriesRow(s.id)}
                        className="text-zinc-500 hover:text-gymRed text-sm p-1 transition-colors ml-1"
                        title="Usuń serię"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* DODAWANIE NOWEGO ĆWICZENIA DO LISTY */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-zinc-800/60">
            <select
              value={selectedExercise}
              onChange={e => setSelectedExercise(e.target.value)}
              className="flex-1 p-2.5 rounded-lg border border-zinc-800 bg-[#2d2d2d] text-white text-sm outline-none focus:border-gymRed cursor-pointer"
            >
              <option value="" disabled>-- Wybierz ćwiczenie z atlasu --</option>
              {exercises.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name} ({ex.muscleGroup})</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                if (selectedExercise) {
                  handleAddSeriesRow(selectedExercise)
                  setSelectedExercise('')
                }
              }}
              disabled={!selectedExercise}
              className="bg-[#333] hover:bg-zinc-700 disabled:opacity-40 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition-all active:scale-95 cursor-pointer"
            >
              + Dodaj Serię
            </button>
          </div>
        </div>

        {/* PANEL ZAPISU JAKO SZABLON (ZABEZPIECZONY PRZED PAYLOADEM) */}
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

        {/* PRZYCISK GŁÓWNY */}
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