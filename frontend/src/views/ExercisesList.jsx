import React, { useState } from 'react'

export default function ExercisesList({ exercises, onAddExercise, onDeleteExercise }) {
  // Stany wyszukiwania i filtrowania
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('all')

  // Stany formularza nowego ćwiczenia
  const [newName, setNewName] = useState('')
  const [newMuscleGroup, setNewMuscleGroup] = useState('Klatka piersiowa')

  // Predefiniowana, czysta lista grup mięśniowych dla ujednolicenia bazy
  const muscleGroupsList = [
    'Klatka piersiowa', 'Plecy', 'Barki', 'Biceps', 'Triceps', 'Nogi', 'Brzuch', 'Inne'
  ]

  // Dynamiczne wyciąganie grup mięśniowych istniejących w bazie do filtrów
  const uniqueFilters = ['all', ...new Set(exercises.map(ex => ex.muscle_group))]

  // Filtrowanie rekordów w locie
  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesMuscle = selectedMuscleGroup === 'all' || ex.muscle_group === selectedMuscleGroup
    return matchesSearch && matchesMuscle
  })

  // Obsługa wysłania formularza z zachowaniem natywnego mobilnego Entera
  const handleCreateExercise = (e) => {
    e.preventDefault()
    if (!newName.trim() || !newMuscleGroup) return
    
    onAddExercise(newName.trim(), newMuscleGroup)
    setNewName('') // Czyszczenie inputa po wysyłce
  }

  return (
    // Układ siatki: 1 kolumna na mobile, 3 kolumny na desktopie (lg)
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
      
      {/* LEWA KOLUMNA: FORMULARZ + FILTRY */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        
        {/* PANEL A: DODAJ WŁASNE ĆWICZENIE */}
        <section className="bg-gymCard p-4 md:p-5 rounded-xl shadow-lg border border-zinc-800/40">
          <h2 className="text-lg font-bold tracking-tight mb-1 flex items-center gap-2">
            <span>➕</span> Nowe ćwiczenie
          </h2>
          <p className="text-zinc-400 text-xs mb-4">Dodaj spersonalizowany ruch, którego brakuje w bazie.</p>
          
          <form onSubmit={handleCreateExercise} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Nazwa ćwiczenia:</label>
              <input 
                type="text" 
                placeholder="np. Wyciskanie z ziemi (Floor Press)" 
                value={newName} 
                onChange={e => setNewName(e.target.value)} 
                required
                className="p-3 rounded-lg border border-zinc-800 bg-[#2d2d2d] text-white text-sm outline-none transition-all focus:border-gymRed"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Grupa mięśniowa:</label>
              <select
                value={newMuscleGroup}
                onChange={e => setNewMuscleGroup(e.target.value)}
                className="p-3 rounded-lg border border-zinc-800 bg-[#2d2d2d] text-white text-sm outline-none transition-all focus:border-gymRed cursor-pointer"
              >
                {muscleGroupsList.map(group => (
                  <option key={group} value={group} className="bg-[#2d2d2d]">{group}</option>
                ))}
              </select>
            </div>

            <button 
              type="submit" 
              className="w-full py-3 bg-gymRed hover:bg-red-600 text-white font-bold rounded-lg text-sm transition-all active:scale-[0.98] cursor-pointer shadow-md shadow-red-950/20 mt-1"
            >
              Zapisz w atlasie 📚
            </button>
          </form>
        </section>

        {/* PANEL B: WYSZUKIWARKA I FILTROWANIE LISTY */}
        <section className="bg-gymCard p-4 md:p-5 rounded-xl shadow-lg border border-zinc-800/40">
          <h2 className="text-lg font-bold tracking-tight mb-4 flex items-center gap-2">
            <span>🔍</span> Filtruj listę
          </h2>
          
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Szukaj po nazwie:</label>
              <input
                type="text"
                placeholder="Wpisz fragment nazwy..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="p-3 rounded-lg border border-zinc-800 bg-[#2d2d2d] text-white text-sm outline-none transition-all focus:border-gymRed"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Grupa docelowa:</label>
              <select
                value={selectedMuscleGroup}
                onChange={e => setSelectedMuscleGroup(e.target.value)}
                className="p-3 rounded-lg border border-zinc-800 bg-[#2d2d2d] text-white text-sm outline-none transition-all focus:border-gymRed cursor-pointer"
              >
                {uniqueFilters.map(group => (
                  <option key={group} value={group} className="bg-[#2d2d2d]">
                    {group === 'all' ? 'Wszystkie grupy' : group}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>
      </div>

      {/* PRAWA KOLUMNA: DYNAMICZNA SIATKA ATALASU (Zajmuje 2 kolumny na desktopie) */}
      <section className="lg:col-span-2 bg-gymCard p-4 md:p-6 rounded-xl text-left shadow-lg border border-zinc-800/40">
        <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
          <h2 className="text-xl font-bold tracking-tight">Spis ćwiczeń GymPatico</h2>
          <span className="bg-[#2d2d2d] px-3 py-1 rounded-full text-xs font-semibold text-zinc-400 border border-zinc-800">
            Pozycji: {filteredExercises.length}
          </span>
        </div>

        {filteredExercises.length === 0 ? (
          <p className="text-zinc-500 italic text-center py-12">
            Nie znaleziono ćwiczeń spełniających wybrane kryteria.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredExercises.map(ex => (
              <div 
                key={ex.id} 
                className="flex flex-col justify-between items-start bg-[#2d2d2d] p-4 rounded-lg border-l-4 border-gymRed shadow-md transition-all hover:translate-x-1 duration-200 min-h-[90px]"
              >
                <strong className="text-white text-sm md:text-base font-semibold tracking-wide mb-2">
                  {ex.name}
                </strong>
                
                <div className="flex items-center gap-2">
                  {/* Globalny znacznik grupy mięśniowej */}
                  <span className="inline-block bg-gymRed/10 text-gymRed px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider">
                    {ex.muscle_group}
                  </span>

                  {/* DYNAMICZNY BADGE DLA PRYWATNYCH ĆWICZEŃ + PRZYCISK USUWANIA */}
                  {ex.user_id && (
                    <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider transition-colors hover:border-amber-500/40">
                      <span>⭐ Własne</span>
                      <button
                        onClick={() => onDeleteExercise(ex.id)}
                        className="text-amber-500/60 hover:text-gymRed transition-colors font-black ml-1 cursor-pointer text-xs"
                        title="Usuń to ćwiczenie z atlasu"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  )
}