// frontend/src/views/History.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../config/api'
import WorkoutCalendar from '../components/WorkoutCalendar' // 🛠️ Zaimportowanie modułu kalendarza

// 🛠️ Słownik stylizacji wizualnej typów serii w historii (spójny z NewWorkout)
const SERIES_TYPES = {
  NORMAL: { label: (order) => order, bg: 'bg-zinc-800/20 text-textSecondary border-zinc-800' },
  WARMUP: { label: () => 'W', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.05)]' },
  DROP_SET: { label: () => 'D', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_8px_rgba(168,85,247,0.05)]' },
  FAILURE: { label: () => 'F', bg: 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.05)]' }
}

export default function History({ 
  workoutsHistory, 
  onDeleteWorkout, 
  onLoadMoreWorkouts, 
  hasMoreWorkouts, 
  onUpdateWorkout,
  user,  
  token,
  showToast,
  totalWorkoutsCount
}) {
  const navigate = useNavigate()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false)
  const [workoutToDelete, setWorkoutToDelete] = useState(null)
  const [isExporting, setIsExporting] = useState(false)

  const [editingSessionId, setEditingSessionId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editComment, setEditComment] = useState('')

  const isPremiumUser = user?.is_premium || user?.isPremium || user?.role === 'TRAINER';
  const remaining = Math.max(0, totalWorkoutsCount - workoutsHistory.length);

  const handleExportCSV = async () => {
    if (!isPremiumUser) {
      setIsPremiumModalOpen(true);
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

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `gympatico_export_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      if (showToast) {
        showToast(`❌ Błąd eksportu: ${err.message}`, "error")
      }
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

  const saveEditing = async (id) => {
    if (!editName.trim()) return;
    const isSuccess = await onUpdateWorkout(id, editName.trim(), editComment.trim());
    if (isSuccess) {
      setEditingSessionId(null);
    }
  }

  return (
    <section className="bg-gymCard border border-zinc-800/40 p-4 md:p-6 rounded-xl text-left shadow-lg relative">
      
      {/* NAGŁÓWEK HISTORII TRENINGÓW */}
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

      {/* 🛠️ [INTEGRACJA] Miesięczny kalendarz regularności treningowej z kropkami sesji */}
      <WorkoutCalendar workoutsHistory={workoutsHistory} />
      
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
                    &quot;{w.comment}&quot;
                  </p>
                )}
                
                {/* COMFORT SCROLL NA MOBILE */}
                <div className="overflow-x-auto mt-4 -mx-4 px-4 sm:mx-0 sm:px-0 [mask-image:linear-gradient(to_right,black_85%,transparent_100%)] sm:[mask-image:none]">
                  <table className="w-full border-collapse min-w-[500px] sm:min-w-0">
                    <thead>
                      <tr className="text-left border-b border-zinc-700 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                        <th className="pb-2">Ćwiczenie</th>
                        <th className="pb-2 text-center w-16">Seria</th>
                        <th className="pb-2 text-center">Obciążenie</th>
                        <th className="pb-2 text-center">Reps</th>
                        <th className="pb-2 text-right">Est. 1RM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800 text-xs md:text-sm">
                      {w.series.map(s => {
                        // Pobieramy konfigurację dla określonego typu serii z bazy
                        const currentCfg = SERIES_TYPES[s.seriesType || 'NORMAL']
                        const renderedLabel = currentCfg.label(s.order)

                        return (
                          <tr 
                            key={s.id} 
                            className={`transition-colors ${
                              s.seriesType === 'WARMUP' ? 'bg-amber-500/[0.01] hover:bg-amber-500/[0.03]'
                              : s.seriesType === 'DROP_SET' ? 'bg-purple-500/[0.01] hover:bg-purple-500/[0.03]'
                              : s.seriesType === 'FAILURE' ? 'bg-red-500/[0.01] hover:bg-red-500/[0.03]'
                              : 'hover:bg-zinc-800/30'
                            }`}
                          >
                            <td className="py-2.5 font-medium pr-2 text-zinc-200">{s.exerciseName}</td>
                            
                            {/* ODZWIERCIEDLENIE BADGE TYPU SERII Z LOGGERA */}
                            <td className="py-2.5 text-center flex justify-center">
                              <span className={`inline-flex w-6 h-6 rounded-md border items-center justify-center font-mono text-[10px] font-black tracking-tighter ${currentCfg.bg}`}>
                                {renderedLabel}
                              </span>
                            </td>

                            <td className="py-2.5 text-center text-zinc-200 font-semibold">{s.weight} kg</td>
                            <td className="py-2.5 text-center text-zinc-400">{s.reps}</td>
                            <td className="py-2.5 text-right text-gymRed font-bold">
                              {s.estimatedOneRM ? `${parseFloat(s.estimatedOneRM).toFixed(1)} kg` : '-'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}

          {hasMoreWorkouts && (
            <button onClick={onLoadMoreWorkouts} className="w-full py-3.5 bg-[#2d2d2d] hover:bg-zinc-700 text-white border border-zinc-800 rounded-lg font-bold text-sm transition-all active:scale-[0.99] cursor-pointer mt-2">
              Załaduj więcej ({remaining} pozostało)
            </button>
          )}
        </div>
      )}

      {/* MODAL USUWANIA TRENINGU */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div onClick={closeModal} className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
          <div className="bg-gymCard border border-zinc-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative z-10 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-gymRed text-xl">⚠️</div>
            <h3 className="text-lg font-bold text-white mb-2 tracking-tight">Usunąć ten trening?</h3>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">Ta operacja jest bezpowrotna. Dane o serii oraz rekordy 1RM znikną z profilu.</p>
            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 py-2.5 bg-[#2d2d2d] hover:bg-zinc-700 text-white font-semibold rounded-lg text-sm border border-zinc-800 cursor-pointer">Anuluj</button>
              <button onClick={confirmDelete} className="flex-1 py-2.5 bg-gymRed hover:bg-red-600 text-white font-bold rounded-lg text-sm shadow-lg shadow-red-950/20 cursor-pointer">Tak, usunąć</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BLOKADY EKSPORTU PREMIUM */}
      {isPremiumModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div onClick={() => setIsPremiumModalOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
          <div className="bg-gymCard border border-zinc-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative z-10 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-gymPremium text-xl">🔒</div>
            <h3 className="text-lg font-bold text-white mb-2 tracking-tight">Funkcja Premium</h3>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">Eksport historii treningów do zewnętrznego arkusza kalkulacyjnego CSV jest dostępny wyłącznie dla posiadaczy konta Premium.</p>
            <div className="flex gap-3">
              <button onClick={() => setIsPremiumModalOpen(false)} className="flex-1 py-2.5 bg-[#2d2d2d] hover:bg-zinc-700 text-white font-semibold rounded-lg text-sm border border-zinc-800 cursor-pointer">Anuluj</button>
              <button 
                onClick={() => { setIsPremiumModalOpen(false); navigate('/social'); }} 
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-gymPremium hover:opacity-90 text-gymDark font-black rounded-lg text-sm cursor-pointer shadow-xl shadow-amber-950/20"
              >
                Przejdź na Premium
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}