import React from 'react'

export default function NewWorkout({
  workoutName, setWorkoutName,
  workoutComment, setWorkoutComment,
  currentSelectedExercise, setCurrentSelectedExercise,
  seriesWeight, setSeriesWeight,
  seriesReps, setSeriesReps,
  exercises, localSeriesList,
  addSeriesToLocalList, handleSaveWorkout,
  removeSeriesFromLocalList
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
      
      {/* LEWA STRONA: KREATOR */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        
        {/* KARTA A: METADANE TRENINGU */}
        <section className="bg-gymCard p-4 md:p-5 rounded-xl shadow-lg border border-zinc-800/40">
          <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
            <span>📝</span> Szczegóły sesji treningowej
          </h2>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Nazwa treningu:</label>
              <input 
                type="text" 
                placeholder="np. Push Day / Klatka + Barki" 
                value={workoutName} 
                onChange={e => setWorkoutName(e.target.value)} 
                className="p-3 rounded-lg border border-zinc-800 bg-[#2d2d2d] text-white text-sm outline-none transition-all focus:border-gymRed"
              />
            </div>
            
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Komentarz / Notatki:</label>
              <input 
                type="text" 
                placeholder="np. Dobra pompa, progres w ostatniej serii" 
                value={workoutComment} 
                onChange={e => setWorkoutComment(e.target.value)} 
                className="p-3 rounded-lg border border-zinc-800 bg-[#2d2d2d] text-white text-sm outline-none transition-all focus:border-gymRed"
              />
            </div>
          </div>
        </section>

        {/* KARTA B: DODAWANIE SERII */}
        <section className="bg-gymCard p-4 md:p-5 rounded-xl shadow-lg border border-zinc-800/40">
          <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
            <span>💪</span> Dodaj wykonaną serię
          </h2>
          
          <form onSubmit={addSeriesToLocalList} className="flex flex-col gap-4">
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Wybierz ćwiczenie:</label>
              <select
                value={currentSelectedExercise}
                onChange={e => setCurrentSelectedExercise(e.target.value)}
                className="p-3 rounded-lg border border-zinc-800 bg-[#2d2d2d] text-white text-sm outline-none transition-all focus:border-gymRed cursor-pointer"
              >
                {exercises.map(ex => (
                  <option key={ex.id} value={ex.id} className="bg-[#2d2d2d]">
                    {ex.name} ({ex.muscle_group})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Ciężar (kg):</label>
                <input 
                  type="number" 
                  step="0.5"
                  placeholder="0" 
                  value={seriesWeight} 
                  onChange={e => setSeriesWeight(e.target.value)} 
                  className="p-3 rounded-lg border border-zinc-800 bg-[#2d2d2d] text-white text-sm outline-none transition-all focus:border-gymRed font-mono"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Powtórzenia:</label>
                <input 
                  type="number" 
                  placeholder="0" 
                  value={seriesReps} 
                  onChange={e => setSeriesReps(e.target.value)} 
                  className="p-3 rounded-lg border border-zinc-800 bg-[#2d2d2d] text-white text-sm outline-none transition-all focus:border-gymRed font-mono"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg text-sm tracking-wide transition-all active:scale-[0.98] border border-zinc-700 cursor-pointer mt-2"
            >
              + Dodaj serię do listy
            </button>
          </form>
        </section>
      </div>

      {/* PRAWA STRONA: PODGLĄD KOSZYKA */}
      <section className="lg:col-span-1 bg-gymCard p-4 md:p-5 rounded-xl shadow-lg border border-zinc-800/40 flex flex-col justify-between h-fit min-h-[350px]">
        <div>
          <div className="border-b border-zinc-800 pb-3 mb-4 flex justify-between items-center">
            <h2 className="text-lg font-bold tracking-tight">Aktualny zestaw 🛒</h2>
            <span className="bg-gymRed/10 text-gymRed text-xs px-2.5 py-0.5 rounded-full font-bold">
              Serii: {localSeriesList.length}
            </span>
          </div>

          {localSeriesList.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center gap-2">
              <span className="text-3xl opacity-40">🏋️‍♂️</span>
              <p className="text-zinc-500 italic text-sm">Lista jest pusta. Dodaj pierwszą serię powyżej, aby zacząć logowanie.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1">
              {localSeriesList.map((s, idx) => (
                <div 
                  key={idx} 
                  className="flex justify-between items-center bg-[#2d2d2d] p-3 rounded-lg border border-zinc-800/60 shadow-sm text-xs md:text-sm group hover:border-zinc-700 transition-colors"
                >
                  <div className="flex flex-col gap-0.5 max-w-[75%]">
                    <strong className="text-zinc-200 truncate">{s.exerciseName}</strong>
                    <span className="text-zinc-400">
                      Seria {s.order}: <span className="text-gymRed font-semibold">{s.weight} kg</span> × {s.reps} powt.
                    </span>
                  </div>
                  
                  <button 
                    onClick={() => removeSeriesFromLocalList(idx)}
                    className="p-2 text-zinc-500 hover:text-gymRed transition-colors rounded hover:bg-gymRed/10 cursor-pointer"
                    title="Usuń serię"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-zinc-800/60">
          <button 
            onClick={handleSaveWorkout}
            disabled={localSeriesList.length === 0}
            className={`w-full py-4 text-white font-bold rounded-xl text-base tracking-wide transition-all shadow-md mt-auto
              ${localSeriesList.length === 0 
                ? 'bg-zinc-800 text-zinc-500 border border-zinc-900 opacity-50 cursor-not-allowed' 
                : 'bg-gymRed hover:bg-red-600 active:scale-[0.98] cursor-pointer shadow-red-950/20'
              }`}
          >
            🔥 ZAKOŃCZ I ZAPISZ TRENING
          </button>
        </div>
      </section>

    </div>
  )
}