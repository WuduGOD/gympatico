// frontend/src/views/ExercisesList.jsx
import React, { useState, useMemo } from 'react'

export default function ExercisesList({ exercises, onAddExercise, onDeleteExercise }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState('Wszystkie')
  const [infoExercise, setInfoExercise] = useState(null)

  // Stany do dodawania własnego ćwiczenia użytkownika
  const [newName, setNewName] = useState('')
  const [newMuscleGroup, setNewMuscleGroup] = useState('Klatka piersiowa')
  const [isAddFormOpen, setIsAddFormOpen] = useState(false)

  // Dynamiczne wyciąganie grup mięśniowych do paska filtrów
  const uniqueMuscleGroups = useMemo(() => {
    const groups = exercises.map(e => e.muscle_group).filter(Boolean)
    return ['Wszystkie', ...new Set(groups)]
  }, [exercises])

  // Hybrydowe filtrowanie (Wyszukiwarka bez auto-focusu + wybrane kapsułki)
  const filteredExercises = exercises.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesMuscle = selectedMuscleFilter === 'Wszystkie' || e.muscle_group === selectedMuscleFilter
    return matchesSearch && matchesMuscle
  })

  // Grupowanie odfiltrowanych wyników
  const groupedExercises = filteredExercises.reduce((acc, ex) => {
    const g = ex.muscle_group || 'Inne'
    if (!acc[g]) acc[g] = []
    acc[g].push(ex)
    return acc
  }, {})

  const handleSubmitCustom = (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    onAddExercise(newName.trim(), newMuscleGroup)
    setNewName('')
    setIsAddFormOpen(false)
  }

  return (
    <div className="max-w-[640px] mx-auto flex flex-col gap-5 text-left animate-in fade-in duration-200">
      
      {/* NAGŁÓWEK SEKCI */}
      <div className="flex justify-between items-center border-b border-zinc-800 pb-3 gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight text-white">Atlas Ćwiczeń 📚</h2>
          <p className="text-xs text-textSecondary mt-0.5">Przeglądaj bazę wiedzy ruchowej lub dodaj własne niestandardowe pozycje.</p>
        </div>
        <button
          onClick={() => setIsAddFormOpen(!isAddFormOpen)}
          className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-gp-md cursor-pointer transition-colors shrink-0"
        >
          {isAddFormOpen ? 'Anuluj' : '＋ Własne'}
        </button>
      </div>

      {/* FORMULARZ KREOWANIA WŁASNEGO RUCHU */}
      {isAddFormOpen && (
        <form onSubmit={handleSubmitCustom} className="bg-gymCard border border-zinc-800 p-4 rounded-gp-lg flex flex-col gap-3 shadow-xl animate-in slide-in-from-top-3 duration-150">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gymRed">Nowe ćwiczenie użytkownika</h4>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="np. Wyciskanie gilotynowe..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="flex-1 p-2.5 rounded-gp-md border border-zinc-800 bg-gymCardSecondary text-white text-base md:text-sm outline-none focus:border-gymRed font-medium"
              required
            />
            <select
              value={newMuscleGroup}
              onChange={e => setNewMuscleGroup(e.target.value)}
              className="p-2.5 rounded-gp-md border border-zinc-800 bg-gymCardSecondary text-white text-xs font-bold cursor-pointer outline-none focus:border-gymRed sm:w-44"
            >
              <option value="Klatka piersiowa">Klatka piersiowa</option>
              <option value="Plecy">Plecy</option>
              <option value="Barki">Barki</option>
              <option value="Nogi">Nogi</option>
              <option value="Pośladki">Pośladki</option>
              <option value="Biceps">Biceps</option>
              <option value="Triceps">Triceps</option>
              <option value="Brzuch">Brzuch</option>
              <option value="Inne">Inne</option>
            </select>
          </div>
          <button type="submit" className="w-full py-2 bg-gymRed hover:bg-gymRedHover text-white font-bold text-xs rounded-gp-md cursor-pointer transition-colors shadow-md">
            Zatwierdź i wprowadź do repozytorium
          </button>
        </form>
      )}

      {/* PASEK WYSZUKIWANIA I FILTRY KAPSUŁKOWE (BEZ AUTO-FOCUSU I AUTO-ZOOMU) */}
      <div className="bg-gymCard border border-zinc-800/40 p-3 rounded-gp-lg shadow-md flex flex-col gap-3">
        <input
          type="search"
          placeholder="Wyszukaj pozycję w bibliotece..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full p-2.5 rounded-gp-md border border-zinc-800 bg-gymCardSecondary text-white text-base md:text-sm outline-none focus:border-gymRed font-medium"
        />

        {/* POZIOME BADGE GRUP MIĘŚNIOWYCH */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden select-none">
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
                    : 'bg-gymCardSecondary border-zinc-800 text-textSecondary hover:border-zinc-700 hover:text-white'
                }`}
              >
                {group}
              </button>
            )
          })}
        </div>
      </div>

      {/* GŁÓWNA LISTA ATLASU */}
      <div className="bg-gymCard border border-zinc-800/40 rounded-gp-lg shadow-xl overflow-hidden divide-y divide-zinc-800/50">
        {Object.entries(groupedExercises).map(([group, exList]) => (
          <div key={group} className="flex flex-col">
            <div className="px-4 py-1.5 text-[10px] font-bold text-textSecondary uppercase tracking-wider bg-gymCardSecondary/30 border-b border-zinc-800/20">
              {group} ({exList.length})
            </div>
            
            {exList.map(ex => (
              <div
                key={ex.id}
                className="px-4 py-3 text-sm text-textPrimary hover:bg-zinc-800/10 flex items-center justify-between gap-4 transition-colors border-b border-zinc-900/20"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-zinc-200 truncate">{ex.name}</span>
                  <button
                    type="button"
                    onClick={() => setInfoExercise(ex)}
                    className="p-1 text-textMuted hover:text-white transition-colors cursor-pointer text-xs bg-zinc-800/60 hover:bg-zinc-800 rounded-md font-bold shrink-0 font-mono"
                  >
                    ⓘ
                  </button>
                </div>

                {/* Możliwość usuwania tylko własnych (jeśli backend przekazuje flagę lub usuwa po ID) */}
                {ex.is_custom && (
                  <button
                    onClick={() => onDeleteExercise(ex.id)}
                    className="text-textMuted hover:text-gymDanger p-1 text-xs transition-colors cursor-pointer"
                    title="Usuń z bazy"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}

        {filteredExercises.length === 0 && (
          <div className="p-12 text-center text-textSecondary text-xs italic bg-gymCard/10">
            Brak wyników spełniających kryteria wyszukiwania.
          </div>
        )}
      </div>

      {/* INTERAKTYWNA SZUFLADA MODALU INFORMACYJNEGO (ZGODNA Z NEWWORKOUT) */}
      {infoExercise && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div onClick={() => setInfoExercise(null)} className="absolute inset-0 bg-black/80 backdrop-blur-xs" />
          
          <div className="bg-gymCard border border-zinc-800 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl relative z-10 text-left animate-in zoom-in-95 duration-150">
            
            {infoExercise.video_url ? (
              <video 
                src={infoExercise.video_url} 
                autoPlay muted loop playsInline 
                className="w-full h-44 object-cover bg-black border-b border-zinc-800"
              />
            ) : (
              <div className="w-full h-44 bg-zinc-900/60 border-b border-zinc-800 flex flex-col items-center justify-center text-center p-4 text-textMuted select-none">
                <span className="text-2xl mb-1">🏋️‍♂️</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Pętla ruchu 3D / Video</span>
                <span className="text-[9px] text-zinc-600 mt-1 max-w-[220px]">Wideo załaduje się automatycznie po wprowadzeniu linku MP4 w bazie danych.</span>
              </div>
            )}

            <div className="p-5">
              <span className="text-[10px] font-black text-gymRed uppercase tracking-wider block mb-0.5">
                {infoExercise.muscle_group || 'Inne'}
              </span>
              <h3 className="text-base font-black text-white tracking-tight mb-3">
                {infoExercise.name}
              </h3>
              
              <div className="text-xs text-zinc-400 leading-relaxed bg-zinc-900/40 border border-zinc-800/60 p-3 rounded-xl max-h-36 overflow-y-auto font-medium">
                {infoExercise.description ? infoExercise.description : (
                  <span className="italic text-zinc-600 text-[11px]">Brak opisu technicznego dla tego ćwiczenia. Instrukcja zostanie zaciągnięta automatycznie z bazy danych.</span>
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

    </div>
  )
}