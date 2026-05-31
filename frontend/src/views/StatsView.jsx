// frontend/src/views/StatsView.jsx
import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function StatsView({ stats, loading }) {
  const navigate = useNavigate()

  // 1. STAN ŁADOWANIA (Aplikacja pobiera dane z serwera)
  if (loading) {
    return (
      <div className="max-w-[640px] mx-auto py-12 text-center text-zinc-500 text-sm font-medium animate-pulse flex flex-col items-center gap-2">
        <span>🔄 Pomiary laboratoryjne w toku...</span>
        <span className="text-[11px] text-textMuted">Przetwarzamy historię serii i objętość treningową.</span>
      </div>
    )
  }

  // 2. [FIXED] POPRAWIONY STAN "ZERO TRENINGÓW" Z AKTYWNYM CTA DO KREATORA
  const hasNoData = !stats || !stats.totalWorkouts || stats.totalWorkouts === 0

  if (hasNoData) {
    return (
      <div className="max-w-[500px] mx-auto bg-gymCard border border-zinc-800/50 rounded-2xl p-8 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200 mt-6">
        <div className="w-16 h-16 bg-zinc-800/50 border border-zinc-700/40 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
          📊
        </div>
        <h3 className="text-lg font-black text-white tracking-tight mb-2">
          Brak dostępnych danych analitycznych ⚠️
        </h3>
        <p className="text-textSecondary text-xs leading-relaxed max-w-sm mx-auto">
          Twoje wykresy objętości, statystyki ulubionych partii oraz tonaż siłowy wygenerują się automatycznie po zalogowaniu sesji roboczej.
        </p>

        {/* REAKTYWNY PRZYCISK INTERAKCJI */}
        <button 
          onClick={() => navigate('/new-workout')}   
          className="mt-6 px-5 py-2.5 bg-gymRed hover:bg-gymRedHover text-white font-bold rounded-gp-md text-sm cursor-pointer shadow-lg shadow-red-950/40 transition-all active:scale-95 flex items-center justify-center gap-2 mx-auto"
        >
          Zaloguj pierwszy trening →
        </button>
      </div>
    )
  }

  // 3. PEŁNY WIDOK ANALITYCZNY (Gdy w bazie są już realne treningi)
  return (
    <div className="max-w-[800px] mx-auto flex flex-col gap-6 text-left animate-in fade-in duration-200">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-white">Analityka Progresu 📈</h2>
        <p className="text-xs text-textSecondary mt-0.5">Podsumowanie Twoich osiągów siłowych i statystyk globalnych.</p>
      </div>

      {/* SIATKA KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gymCard border border-zinc-800/40 p-4 rounded-gp-lg shadow-md">
          <span className="text-[10px] font-bold text-textSecondary uppercase tracking-wider block">Wszystkie sesje</span>
          <span className="text-2xl font-black text-white font-mono mt-1 block">{stats.totalWorkouts}</span>
        </div>
        
        <div className="bg-gymCard border border-zinc-800/40 p-4 rounded-gp-lg shadow-md">
          <span className="text-[10px] font-bold text-textSecondary uppercase tracking-wider block">Łączny tonaż</span>
          <span className="text-2xl font-black text-gymRed font-mono mt-1 block">
            {parseInt(stats.totalVolume || 0).toLocaleString()} <span className="text-xs font-normal text-textSecondary">kg</span>
          </span>
        </div>

        <div className="bg-gymCard border border-zinc-800/40 p-4 rounded-gp-lg shadow-md">
          <span className="text-[10px] font-bold text-textSecondary uppercase tracking-wider block">Ulubiona partia</span>
          <span className="text-base font-black text-gymPremium truncate mt-2 block uppercase tracking-tight">
            {stats.favoriteMuscleGroup || 'Brak danych'}
          </span>
        </div>
      </div>

      {/* ROZKŁAD TRENINGOWY NA GRUPY MIĘŚNIOWE */}
      {stats.muscleDistribution && stats.muscleDistribution.length > 0 && (
        <section className="bg-gymCard border border-zinc-800/40 p-5 rounded-xl shadow-lg">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Nacisk na grupy mięśniowe (Objętość serii)</h3>
          <div className="flex flex-col gap-3">
            {stats.muscleDistribution.map((item, idx) => {
              const maxCount = Math.max(...stats.muscleDistribution.map(m => m.count || 1))
              const percentage = Math.round((item.count / maxCount) * 100)

              return (
                <div key={idx} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-textPrimary">{item.muscle_group || 'Inne'}</span>
                    <span className="text-textSecondary font-mono">{item.count} serii</span>
                  </div>
                  <div className="w-full h-2 bg-gymCardSecondary rounded-full overflow-hidden border border-zinc-800/40">
                    <div 
                      className="h-full bg-gymRed rounded-full transition-all duration-500" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}