import React, { useState, useEffect } from 'react'
import { API_BASE_URL } from '../config/api'

export default function StatsView({ token }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    
    fetch(`${API_BASE_URL}/api/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(async res => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Nie udało się pobrać statystyk.')
        return data
      })
      .then(data => {
        setStats(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [token])

  if (loading) {
    return (
      <div className="text-center py-20 text-gymRed font-bold animate-pulse text-sm md:text-base">
        🔄 Kompilowanie raportu treningowego...
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-gymRed font-bold text-center p-4 rounded-xl text-sm max-w-md mx-auto">
        ⚠️ Błąd: {error}
      </div>
    )
  }

  // Przelicznik tonażu na tony dla lepszego UX
  const tonnageInTons = (stats?.totalTonnage / 1000).toFixed(2)

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="text-xl md:text-2xl font-black tracking-tight">Analityka i Podsumowanie 📊</h2>
        <p className="text-zinc-400 text-xs md:text-sm mt-0.5">Twoje globalne osiągnięcia zarejestrowane w GymPatico.</p>
      </div>

      {/* SIATKA KPI CARDS (4 KOLUMNY) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        {/* KARTA 1: ŁĄCZNIE TRENINGÓW */}
        <div className="bg-gymCard p-5 rounded-xl border border-zinc-800/40 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl"></div>
          <span className="text-2xl mb-2 block">🏋️‍♂️</span>
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Ukończone sesje</h3>
          <div className="text-4xl font-black text-white mt-2 font-mono tracking-tight group-hover:text-blue-400 transition-colors">
            {stats?.totalWorkouts}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Wszystkie zarejestrowane dni treningowe</p>
        </div>

        {/* KARTA 2: ŁĄCZNY TONAŻ */}
        <div className="bg-gymCard p-5 rounded-xl border border-zinc-800/40 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl"></div>
          <span className="text-2xl mb-2 block">🏗️</span>
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Przerzucony ciężar</h3>
          <div className="text-4xl font-black text-emerald-400 mt-2 font-mono tracking-tight">
            {tonnageInTons} <span className="text-lg font-normal text-zinc-400">t</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Suma: {stats?.totalTonnage.toLocaleString()} kg</p>
        </div>

        {/* KARTA 3: ŻYCIOWY STREAK */}
        <div className="bg-gymCard p-5 rounded-xl border border-zinc-800/40 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gymRed/5 rounded-full blur-xl"></div>
          <span className="text-2xl mb-2 block">🔥</span>
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Życiowy rekord kontynuacji</h3>
          <div className="text-4xl font-black text-gymRed mt-2 font-mono tracking-tight">
            {stats?.maxStreak} <span className="text-lg font-normal text-zinc-400">dni</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Aktualny streak: {stats?.currentStreak} dni</p>
        </div>

        {/* KARTA 4: ULUBIONE ĆWICZENIE */}
        <div className="bg-gymCard p-5 rounded-xl border border-zinc-800/40 shadow-lg relative overflow-hidden group sm:col-span-2 lg:col-span-1">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl"></div>
          <span className="text-2xl mb-2 block">👑</span>
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Najwyższa frekwencja</h3>
          
          {stats?.favorite ? (
            <>
              <div className="text-base font-black text-white mt-2 truncate max-w-full" title={stats.favorite.name}>
                {stats.favorite.name}
              </div>
              <div className="mt-1 flex gap-2 items-center">
                <span className="bg-amber-500/10 text-amber-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                  {stats.favorite.muscleGroup}
                </span>
                <span className="text-zinc-500 text-xs font-mono">
                  {stats.favorite.count} serii roboczych
                </span>
              </div>
            </>
          ) : (
            <div className="text-zinc-500 text-sm italic mt-3">Brak danych sesji</div>
          )}
        </div>

      </div>

      {/* DODATKOWA SEKCJA: MOTYWATOR INTERFEJSU */}
      <section className="bg-gradient-to-r from-[#222] to-gymCard p-5 rounded-xl border border-zinc-800/40 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="max-w-xl">
          <h4 className="text-sm font-bold text-zinc-200">„Konsekwencja pokonuje talent, kiedy talent nie trenuje” 🛠️</h4>
          <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
            Każda pojedyncza seria, którą dopisujesz w swoim garażowym labie treningowym, zwiększa globalny tonaż i buduje Twoją sportową sylwetkę. Kontynuuj passę i nie odpuszczaj kolejnych sesji!
          </p>
        </div>
        <div className="text-3xl hidden md:block opacity-60">💪⚡</div>
      </section>
    </div>
  )
}