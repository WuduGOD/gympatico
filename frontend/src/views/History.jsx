import React, { useState } from 'react'
import { API_BASE_URL } from '../config/api'

export default function History({ 
  workoutsHistory, 
  onDeleteWorkout, 
  onLoadMoreWorkouts, 
  hasMoreWorkouts, 
  onUpdateWorkout,
  user,  // <--- NOWOŚĆ
  token  // <--- NOWOŚĆ
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [workoutToDelete, setWorkoutToDelete] = useState(null)
  const [isExporting, setIsExporting] = useState(false)

  // STANY DLA OBSŁUGI INLINE EDIT
  const [editingSessionId, setEditingSessionId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editComment, setEditComment] = useState('')

  const isPremiumUser = user?.is_premium || user?.role === 'TRAINER';

  // FUNKCJA OBSŁUGI BEZPIECZNEGO POBIERANIA BLOB PLIKU CSV
  const handleExportCSV = async () => {
    if (!isPremiumUser) {
      alert("🔒 Funkcja eksportu do pliku CSV jest dostępna wyłącznie dla posiadaczy konta GymPatico PREMIUM! Przejdź na wyższy pakiet, aby odblokować pełną analitykę arkusza Excel.");
      return;
    }

    setIsExporting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/workouts/export`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Nie udało się pobrać pliku.');
      }

      // Konwertujemy odpowiedź na Blob strumienia danych
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Tworzymy ukryty element kotwicy <a>, aby wymusić natywne pobieranie w przeglądarce (również na telefonie)
      const a = document.createElement('a');
      a.href = url;
      a.download = `gympatico_export_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      
      // Czyszczenie pamięci podręcznej przeglądarki po pobraniu
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      alert(`❌ Błąd eksportu: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  }

  const initiateDelete = (id) => {
    setWorkoutToDelete(id)
    setIsModalOpen(true)
  }

  const confirmDelete = () => {
    if (workoutToDelete) {
      onDeleteWorkout(workoutToDelete)
    }
    closeModal()
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setWorkoutToDelete(null)
  }

  const startEditing = (w) => {
    setEditingSessionId(w.id)
    setEditName(w.name)
    setEditComment(w.comment || '')
  }

  const cancelEditing = () => {
    setEditingSessionId(null)
    setEditName('')
    setEditComment('')
  }

  const saveEditing = (id) => {
    if (!editName.trim()) return
    onUpdateWorkout(id, editName.trim(), editComment.trim())
    setEditingSessionId(null)
  }

  return (
    <section className="bg-gymCard p-4 md:p-6 rounded-xl text-left shadow-lg relative">
      
      {/* NAGŁÓWEK SEKCJ Z INTEGRACJĄ PRZYCISKU EKSPORTU */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-zinc-800 pb-4 mb-4 gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Twoja historia aktywności 📅</h2>
          <p className="text-zinc-400 text-xs mt-0.5">Wszystkie zarejestrowane sesje robocze w laboratoriach GymPatico.</p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={isExporting || workoutsHistory.length === 0}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all active:scale-95 cursor-pointer shadow-md border ${
            isPremiumUser
              ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
          } disabled:opacity-40`}
        >
          {isExporting ? '🔄 Generowanie...' : isPremiumUser ? '📊 Eksportuj do CSV' : '🔒 Eksportuj do CSV (PREMIUM)'}
        </button>
      </div>
      
      {workoutsHistory.length === 0 ? (
        <p className="text-zinc-500 italic mt-4 text-center py-6">Brak wpisów w historii.</p>
      ) : (
        <div className="flex flex-col gap-4 mt-4">
          {workoutsHistory.map(w => {
            const isEditing = w.id === editingSessionId

            return (
              <div key={w.id} className="bg-[#2d2d2d] p-4 md:p-5 rounded-lg border-l-4 border-gymRed shadow-md transition-all hover:border-l-6">
                
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
                  
                  <div className="flex-1 flex flex-col gap-2">
                    {isEditing ? (
                      <div className="flex flex-col gap-2 max-w-md w-full">
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="p-2 text-sm font-bold text-white bg-zinc-900 border border-zinc-700 rounded-lg outline-none focus:border-gymRed"
                          placeholder="Nazwa treningu"
                          required
                        />
                        <input
                          type="text"
                          value={editComment}
                          onChange={e => setEditComment(e.target.value)}
                          className="p-2 text-xs text-zinc-300 bg-zinc-900 border border-zinc-700 rounded-lg outline-none focus:border-gymRed"
                          placeholder="Dodaj komentarz (opcjonalnie)..."
                        />
                      </div>
                    ) : (
                      <>
                        <h3 className="text-base md:text-lg font-bold text-gymRed leading-tight">{w.name}</h3>
                        <span className="text-zinc-400 text-xs">{new Date(w.startedAt).toLocaleString()}</span>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {isEditing ? (
                      <>
                        <button onClick={cancelEditing} className="px-3 py-1.5 rounded border border-zinc-600 text-zinc-400 text-xs font-bold bg-transparent transition-all hover:bg-zinc-700 hover:text-white cursor-pointer">Anuluj</button>
                        <button onClick={() => saveEditing(w.id)} className="px-3 py-1.5 rounded bg-emerald-600 text-white text-xs font-bold transition-all hover:bg-emerald-500 active:scale-95 cursor-pointer shadow-md">Zapisz ✓</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEditing(w)} className="px-3 py-1.5 rounded border border-zinc-600 text-zinc-400 text-xs font-bold bg-transparent transition-all hover:bg-zinc-700 hover:text-white active:scale-95 cursor-pointer">Edytuj ✏️</button>
                        <button onClick={() => initiateDelete(w.id)} className="px-3 py-1.5 rounded border border-gymRed text-gymRed text-xs font-bold bg-transparent transition-all hover:bg-gymRed hover:text-white active:scale-95 cursor-pointer">Usuń ✕</button>
                      </>
                    )}
                  </div>
                </div>

                {!isEditing && w.comment && (
                  <p className="text-zinc-400 italic mt-3 text-xs md:text-sm bg-zinc-800/40 p-2 rounded border-l border-zinc-700">
                    "{w.comment}"
                  </p>
                )}
                
                <div className="overflow-x-auto mt-4 -mx-4 px-4 sm:mx-0 sm:px-0">
                  <table className="w-full border-collapse min-w-[500px] sm:min-w-0">
                    <thead>
                      <tr className="text-left border-b border-zinc-700 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                        <th className="pb-2">Ćwiczenie</th>
                        <th className="pb-2 text-center">Seria</th>
                        <th className="pb-2 text-center">Obciążenie</th>
                        <th className="pb-2 text-center">Reps</th>
                        <th className="pb-2 text-right">Est. 1RM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800 text-xs md:text-sm">
                      {w.series.map(s => (
                        <tr key={s.id} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="py-2.5 font-medium pr-2 text-zinc-200">{s.exerciseName}</td>
                          <td className="py-2.5 text-center text-zinc-400">{s.order}</td>
                          <td className="py-2.5 text-center text-zinc-200 font-semibold">{s.weight} kg</td>
                          <td className="py-2.5 text-center text-zinc-400">{s.reps}</td>
                          <td className="py-2.5 text-right text-gymRed font-bold">
                            {s.estimatedOneRM ? `${s.estimatedOneRM.toFixed(1)} kg` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}

          {hasMoreWorkouts && (
            <button onClick={onLoadMoreWorkouts} className="w-full py-3.5 bg-[#2d2d2d] hover:bg-zinc-700 text-white border border-zinc-800 rounded-lg font-bold text-sm transition-all active:scale-[0.99] cursor-pointer mt-2">
              Załaduj starsze treningi 🔄
            </button>
          )}
        </div>
      )}

      {/* --- AUTORSKI MODAL POTWIERDZENIA USUWANIA --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div onClick={closeModal} className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"></div>
          <div className="bg-gymCard border border-zinc-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative z-10 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-gymRed text-xl">⚠️</div>
            <h3 className="text-lg font-bold text-white mb-2 tracking-tight">Usunąć ten trening?</h3>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">Ta operacja jest bezpowrotna. Dane o serii oraz rekordy 1RM znikną z profilu.</p>
            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 py-2.5 bg-[#2d2d2d] hover:bg-zinc-700 text-white font-semibold rounded-lg text-sm transition-all active:scale-95 cursor-pointer border border-zinc-800">Anuluj</button>
              <button onClick={confirmDelete} className="flex-1 py-2.5 bg-gymRed hover:bg-red-600 text-white font-bold rounded-lg text-sm transition-all active:scale-95 cursor-pointer shadow-lg shadow-red-950/20">Tak, usuń</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}