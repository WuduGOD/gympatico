import React, { useState, useEffect } from 'react'
import WeightChart from '../components/WeightChart'

export default function Dashboard({
  user, weightLogs, weightInput, setWeightInput, handleAddWeight,
  exercises, onUpdateWeeklyTarget, progressionData, fetchProgression, onDeleteWeight
}) {
  const [selectedExercise, setSelectedExercise] = useState(exercises[0]?.id || '')
  const [localTarget, setLocalTarget] = useState(user?.weekly_target_workouts || 3)

  // Każdorazowa zmiana ćwiczenia w selektorze dzwoni do bazy po świeżą progresję 1RM
  useEffect(() => {
    if (selectedExercise) {
      fetchProgression(selectedExercise)
    }
  }, [selectedExercise, fetchProgression])

  // Automatyczne ustawienie pierwszego ćwiczenia, jeśli baza na starcie była pusta
  useEffect(() => {
    if (exercises.length > 0 && !selectedExercise) {
      setSelectedExercise(exercises[0].id)
    }
  }, [exercises, selectedExercise])

  useEffect(() => {
    if (user?.weekly_target_workouts) {
      setLocalTarget(user.weekly_target_workouts)
    }
  }, [user?.weekly_target_workouts])

  // --- PARAMETRYZACJA GENEROWANIA WYKRESU SVG ---
  const svgWidth = 500
  const svgHeight = 200
  const padding = 35

  const validData = progressionData.filter(d => !isNaN(d.oneRm))

  let pointsPath = ''
  let gradientPath = ''
  let pointsArray = []

  if (validData.length > 1) {
    const minX = 0
    const maxX = validData.length - 1
    const yValues = validData.map(d => d.oneRm)
    const minY = Math.min(...yValues) * 0.9 // 10% bufora z dołu dla dynamiki linii
    const maxY = Math.max(...yValues) * 1.1 // 10% bufora z góry

    pointsArray = validData.map((d, index) => {
      const x = padding + (index / maxX) * (svgWidth - padding * 2)
  
      // Jeśli Max i Min są równe (np. ta sama waga i reps), ustawiamy mianownik na 1, a linię centrujemy w pionie
      const denominator = (maxY - minY) === 0 ? 1 : (maxY - minY);
      const y = (maxY - minY) === 0 
        ? svgHeight / 2 
        : svgHeight - padding - ((d.oneRm - minY) / denominator) * (svgHeight - padding * 2);

      return { x, y, oneRm: d.oneRm, date: d.date }
    })

    pointsPath = pointsArray.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    gradientPath = `${pointsPath} L ${pointsArray[pointsArray.length - 1].x} ${svgHeight - padding} L ${pointsArray[0].x} ${svgHeight - padding} Z`
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
      
      {/* LEWA KOLUMNA: STATYSTYKI I CEL TYGODNIOWY */}
      <div className="flex flex-col gap-6 lg:col-span-1">
        
        {/* WIDGET 1: PROFIL I AKTUALNY STREAK */}
        <section className="bg-gymCard p-5 rounded-xl shadow-lg border border-zinc-800/40 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gymRed/5 rounded-full blur-2xl transition-all group-hover:bg-gymRed/10"></div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-1">Twój Profil</h2>
          <div className="text-2xl font-black text-white tracking-tight">{user?.nick || 'Sportowiec'}</div>
          
          <div className="mt-4 flex items-center justify-between bg-[#2d2d2d] p-4 rounded-lg border border-zinc-800/60">
            <span className="text-sm text-zinc-400 font-medium">Aktualny streak tygodniowy:</span>
            <span className="text-2xl font-black text-gymRed drop-shadow-[0_2px_10px_rgba(255,71,87,0.2)] flex items-center gap-1 animate-pulse">
              🔥 {user?.current_streak || 0}
            </span>
          </div>
        </section>

        {/* WIDGET 2: CEL TRENINGOWY (SUWAK ZOPTYMALIZOWANY POD KĄTEM SIECI) */}
        <section className="bg-gymCard p-5 rounded-xl shadow-lg border border-zinc-800/40">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Cel tygodniowy 🎯</h2>
            {/* ZMIANA: Tekst czyta teraz z błyskawicznego stanu lokalnego */}
            <span className="text-sm font-black text-gymRed bg-gymRed/10 px-2.5 py-0.5 rounded-full">
              {localTarget} dni
            </span>
          </div>
          <p className="text-zinc-500 text-xs mb-4">Zadeklaruj ile razy w tygodniu chcesz trenować w garażu.</p>
          
          <input 
            type="range" 
            min="1" 
            max="7" 
            value={localTarget} // ZMIANA: Spięte z lokalnym stanem
            onChange={(e) => setLocalTarget(parseInt(e.target.value))} // ZMIANA: Aktualizuje TYLKO UI w locie
            onMouseUp={() => onUpdateWeeklyTarget(localTarget)} // ZMIANA: Strzela do API dopiero po puszczeniu myszki (Desktop)
            onTouchEnd={() => onUpdateWeeklyTarget(localTarget)} // ZMIANA: Strzela do API dopiero po podniesieniu palca (Mobile)
            className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-gymRed transition-all"
          />
          <div className="flex justify-between text-[10px] font-bold text-zinc-600 mt-1 px-1">
            <span>1 DZIEŃ</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7 DNI</span>
          </div>
        </section>
      </div>

      {/* ŚRODKOWA KOLUMNA: PROGRESJA 1RM (WYKRES SVG) - Na dużych ekranach zajmuje 2 kolumny */}
      <section className="bg-gymCard p-5 rounded-xl shadow-lg border border-zinc-800/40 md:col-span-2 flex flex-col justify-between">
        <div>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-zinc-800 pb-4 mb-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight">Krzywa progresu siłowego (Est. 1RM) 📈</h2>
              <p className="text-zinc-400 text-xs mt-0.5">Wykres generowany automatycznie na podstawie serii roboczych.</p>
            </div>

            {/* Selektor ćwiczenia z bazy dla wykresu */}
            <select
              value={selectedExercise}
              onChange={(e) => setSelectedExercise(e.target.value)}
              className="p-2 rounded-md border border-zinc-800 bg-[#2d2d2d] text-white text-xs md:text-sm outline-none focus:border-gymRed cursor-pointer max-w-[250px]"
            >
              <option value="" disabled>Wybierz ćwiczenie...</option>
              {exercises.map(ex => (
                <option key={ex.id} value={ex.id} className="bg-[#2d2d2d]">{ex.name}</option>
              ))}
            </select>
          </div>

          {/* RENDEROWANIE WYKRESU PURE SVG */}
          <div className="w-full overflow-hidden bg-zinc-900/50 p-2 rounded-xl border border-zinc-800/40 flex justify-center items-center">
            {validData.length < 2 ? (
              <div className="text-center py-16 text-zinc-500 italic text-sm flex flex-col items-center gap-1">
                <span>📊</span> Zaloguj minimum 2 różne dni treningowe dla tego ćwiczenia, aby wygenerować linię progresu.
              </div>
            ) : (
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto max-h-[220px]">
                <defs>
                  {/* Profesjonalny gradient pod linią wykresu */}
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff4757" stopOpacity="0.25"/>
                    <stop offset="100%" stopColor="#ff4757" stopOpacity="0.00"/>
                  </linearGradient>
                </defs>
                
                {/* Siatka pozioma boczna */}
                <line x1={padding} y1={padding} x2={svgWidth - padding} y2={padding} stroke="#2d2d2d" strokeWidth="1" strokeDasharray="4"/>
                <line x1={padding} y1={svgHeight - padding} x2={svgWidth - padding} y2={svgHeight - padding} stroke="#333" strokeWidth="1"/>

                {/* Ścieżka gradientu wypełniającego */}
                <path d={gradientPath} fill="url(#chartGradient)" />

                {/* Główna, neonowa linia wykresu */}
                <path d={pointsPath} fill="none" stroke="#ff4757" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>

                {/* Węzły (kropki) na wykresie z tooltipami osadzonymi w SVG */}
                {pointsArray.map((p, i) => (
                  <g key={i} className="group/node cursor-pointer">
                    <circle cx={p.x} cy={p.y} r="5" fill="#121212" stroke="#ff4757" strokeWidth="2.5" className="transition-all hover:r-7 hover:fill-[#ff4757]"/>
                    
                    {/* Interaktywny mini-tooltip pojawiający się po najechaniu myszką */}
                    <g className="opacity-0 group-hover/node:opacity-100 transition-opacity duration-150 pointer-events-none">
                      <rect x={p.x - 40} y={p.y - 32} width="80" height="22" rx="4" fill="#1e1e1e" stroke="#ff4757" strokeWidth="1"/>
                      <text x={p.x} y={p.y - 17} fill="white" fontSize="10" fontWeight="bold" textAnchor="middle">
                        {p.oneRm.toFixed(1)} kg
                      </text>
                    </g>
                  </g>
                ))}
              </svg>
            )}
          </div>
        </div>
      </section>

      {/* DOLNA SZEROKA SEKCJA: WAGA CAŁKOWITA (PŁYTKI DO WPISYWANIA I REJESTR LOGÓW) */}
      <section className="bg-gymCard p-5 rounded-xl shadow-lg border border-zinc-800/40 md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* KARTA DODAWANIA WAGI */}
        <div className="md:col-span-1 flex flex-col justify-between border-b md:border-b-0 md:border-r border-zinc-800 pb-4 md:pb-0 md:pr-6">
          <div>
            <h2 className="text-base font-bold tracking-tight mb-1">Zarejestruj wagę ciała ⚖️</h2>
            <p className="text-zinc-500 text-xs mb-4">Wpisuj wagę poranną na czczo, aby monitorować trendy masowe.</p>
          </div>
          
          <div className="flex gap-2 mt-auto">
            <input 
              type="number" 
              step="0.1" 
              placeholder="np. 84.5" 
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              className="flex-1 p-3 rounded-lg border border-zinc-800 bg-[#2d2d2d] text-white text-sm outline-none focus:border-gymRed font-mono"
            />
            <button 
              onClick={handleAddWeight}
              className="bg-gymRed hover:bg-red-600 text-white font-bold px-5 py-2 rounded-lg text-sm transition-all active:scale-95 cursor-pointer"
            >
              Dodaj
            </button>
          </div>
        </div>

        {/* LISTA LOGÓW WAGI (Z HORIZONTALNYM STRUMIENIEM DLA UX MOBILNEGO) */}
        <div className="md:col-span-2 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold tracking-tight mb-1">Ostatnie pomiary wagi</h2>
            <p className="text-zinc-500 text-xs mb-4">Twoja oś czasu masy ciała (najnowsze pomiary).</p>
          </div>

          <div className="mb-4">
            <WeightChart logs={weightLogs} />
          </div>

          {weightLogs.length === 0 ? (
            <p className="text-zinc-600 italic text-sm py-2">Brak zapisanych pomiarów wagi.</p>
          ) : (
            // Dodaliśmy klasę "group" do kontenera nadrzędnego, aby sterować widocznością dzieci
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
              {weightLogs.slice(0, 7).map(log => (
                <div 
                  key={log.id} 
                  className="bg-[#2d2d2d] border border-zinc-800/70 p-3 rounded-lg flex flex-col items-center min-w-[90px] shadow-sm transition-colors hover:border-zinc-700 relative group"
                >
                  {/* PRZYCISK USUWANIA (✕): Widoczny zawsze na mobile, na desktopie hover kafelka (sm:opacity-0 sm:group-hover:opacity-100) */}
                  <button
                    onClick={() => onDeleteWeight(log.id)} // <--- Czysty, bezkompromisowy i natychmiastowy strzał
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center text-[9px] font-black text-zinc-400 hover:text-gymRed hover:border-gymRed active:scale-90 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer shadow-md"
                    title="Usuń pomiar"
                  >
                    ✕
                  </button>

                  <span className="text-base font-black text-zinc-100 font-mono">
                    {parseFloat(log.weight).toFixed(1)} <span className="text-[10px] text-zinc-400 font-normal">kg</span>
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium mt-1 uppercase tracking-tighter">
                    {new Date(log.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

    </div>
  )
}