// frontend/src/views/Dashboard.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import WeightChart from '../components/WeightChart'

export default function Dashboard({
  user, weightLogs, weightInput, setWeightInput, handleAddWeight,
  exercises, onUpdateWeeklyTarget, progressionData, fetchProgression, onDeleteWeight,
  workoutsHistory = [], templates = []
}) {
  const navigate = useNavigate()
  const [selectedExercise, setSelectedExercise] = useState(exercises[0]?.id || '')
  const [localTarget, setLocalTarget] = useState(user?.weekly_target_workouts || 3)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [logToDelete, setLogToDelete] = useState(null)

  // 🔴 NOWOŚĆ: Stan kontrolujący widoczność klawiatury in-app
  const [isWeightNumpadOpen, setIsWeightNumpadOpen] = useState(false)

  useEffect(() => {
    if (selectedExercise) {
      fetchProgression(selectedExercise)
    }
  }, [selectedExercise, fetchProgression])

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

  const initiateDelete = (id) => {
    setLogToDelete(id)
    setIsModalOpen(true)
  }

  const confirmDelete = () => {
    if (logToDelete) {
      onDeleteWeight(logToDelete)
    }
    closeModal()
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setLogToDelete(null)
  }

  const getWeightTrend = () => {
    if (!weightLogs || weightLogs.length < 2) return null
    const latest = parseFloat(weightLogs[0].weight)
    const previous = parseFloat(weightLogs[1].weight)
    const diff = latest - previous
    return {
      diff: Math.abs(diff).toFixed(1),
      isUp: diff > 0,
      isDown: diff < 0
    }
  }
  const trend = getWeightTrend()

  const isWeightInputInvalid = !weightInput || String(weightInput).trim() === '' || isNaN(parseFloat(weightInput)) || parseFloat(weightInput) <= 0

  // 🔴 NOWOŚĆ: Obsługa kliknięć customowego Numpada
  const handleWeightNumpadPress = (key) => {
    const currentVal = String(weightInput || '');
    if (key === 'BACKSPACE') {
      setWeightInput(currentVal.slice(0, -1));
    } else if (key === '.') {
      if (currentVal.includes('.')) return;
      setWeightInput(currentVal + '.');
    } else {
      const newVal = currentVal === '0' ? key : currentVal + key;
      setWeightInput(newVal);
    }
  }

  // 🔴 NOWOŚĆ: Szybkie dodawanie/odejmowanie ułamków wagi
  const handleWeightQuickInc = (incStr) => {
    const baseWeight = weightInput ? parseFloat(weightInput) : (weightLogs.length > 0 ? parseFloat(weightLogs[0].weight) : 80);
    const inc = parseFloat(incStr);
    let newVal = baseWeight + inc;
    if (newVal <= 0) newVal = 0;
    setWeightInput(newVal.toFixed(1));
  }

  // 🔴 NOWOŚĆ: Wrapper zapisywania wagi (chowa klawiaturę)
  const onConfirmWeight = (e) => {
    if (e) e.preventDefault();
    if (isWeightInputInvalid) return;
    handleAddWeight(e);
    setIsWeightNumpadOpen(false);
  }

  const svgWidth = 500
  const svgHeight = 160
  const padding = 25

  const validData = progressionData.filter(d => !isNaN(d.oneRm))
  const isNewUser = weightLogs.length === 0 && validData.length === 0
  const isPremiumUser = user?.is_premium || user?.isPremium || user?.role === 'TRAINER';

  let pointsPath = ''
  let gradientPath = ''
  let pointsArray = []

  if (validData.length > 1) {
    const maxX = validData.length - 1
    const yValues = validData.map(d => d.oneRm)
    const minY = Math.min(...yValues) * 0.95
    const maxY = Math.max(...yValues) * 1.05

    pointsArray = validData.map((d, index) => {
      const x = padding + (index / maxX) * (svgWidth - padding * 2)
      const denominator = (maxY - minY) === 0 ? 1 : (maxY - minY);
      const y = svgHeight - padding - ((d.oneRm - minY) / denominator) * (svgHeight - padding * 2);
      return { x, y, oneRm: d.oneRm, date: d.date }
    })

    pointsPath = pointsArray.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    gradientPath = `${pointsPath} L ${pointsArray[pointsArray.length - 1].x} ${svgHeight - padding} L ${pointsArray[0].x} ${svgHeight - padding} Z`
  }

  const getTextProgressBar = (current, max) => {
    const totalBars = 10;
    const filledBars = Math.min(Math.round((current / max) * totalBars), totalBars);
    const emptyBars = totalBars - filledBars;
    return `[${'█'.repeat(filledBars)}${'░'.repeat(emptyBars)}]`;
  }

  return (
    <div className="flex flex-col gap-5 text-left relative pb-16">
      
      {/* SEKCJA 1: HERO STRIP */}
      <section className="w-full bg-gymCard border border-zinc-800/40 rounded-gp-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div>
            <div className="text-xs text-textSecondary font-medium uppercase tracking-wider">Sportowiec</div>
            <div className="text-lg font-black text-white tracking-tight">{user?.nick || 'Użytkownik'}</div>
          </div>
          <div className="bg-gymCardSecondary border border-zinc-800/80 px-3 py-1.5 rounded-gp-md flex items-center gap-2 shrink-0">
            <span className="text-sm text-textSecondary font-semibold">Ciągłość:</span>
            <span className="text-base font-black text-gymRed animate-pulse">🔥 {user?.current_streak || 0} tyg.</span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-72 bg-gymCardSecondary/40 border border-zinc-800/30 p-2.5 rounded-gp-md">
          <span className="text-xs font-bold text-textSecondary shrink-0 uppercase tracking-tight">Cel: {localTarget} dni</span>
          <div className="flex-1 flex flex-col justify-center">
            <input 
              type="range" min="1" max="7" value={localTarget}
              onChange={(e) => setLocalTarget(parseInt(e.target.value))}
              onMouseUp={() => onUpdateWeeklyTarget(localTarget)}
              onTouchEnd={() => onUpdateWeeklyTarget(localTarget)}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-gymRed"
            />
            <div className="flex justify-between text-[9px] text-textMuted px-0.5 mt-1 select-none">
              <span>1 dzień</span>
              <span>7 dni</span>
            </div>
          </div>
        </div>
      </section>

      {/* PASEK LIMITÓW SYSTEMU FREE */}
      {!isPremiumUser && (
        <div className="w-full bg-gymCardSecondary/70 border border-zinc-800/60 rounded-gp-md px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-textSecondary shadow-inner animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <div className="flex items-center gap-2">
              <span>Treningi: <strong className="text-textPrimary">{workoutsHistory.length}/10</strong></span>
              <span className="text-gymRed tracking-tighter">{getTextProgressBar(workoutsHistory.length, 10)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Szablony: <strong className="text-textPrimary">{templates.length}/3</strong></span>
              <span className="text-gymPremium tracking-tighter">{getTextProgressBar(templates.length, 3)}</span>
            </div>
          </div>
          <button onClick={() => navigate('/history')} className="text-gymPremium hover:text-amber-400 font-bold transition-colors cursor-pointer text-xs flex items-center gap-0.5">
            Upgrade ↗
          </button>
        </div>
      )}

      {/* ONBOARDING BANNER */}
      {isNewUser && (
        <section className="w-full bg-gradient-to-br from-gymCard to-[#15181f] p-5 rounded-2xl border border-gymRed/10 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="max-w-3xl">
            <span className="inline-block bg-gymRed/10 text-gymRed text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider mb-2.5">🚀 Witamy w Gangu GymPatico!</span>
            <h2 className="text-xl font-black tracking-tight text-white mb-1">Twój panel treningowy został zainicjalizowany 🛠️</h2>
            <p className="text-textSecondary text-xs leading-relaxed mb-4">Profil jest gotowy do pracy. Aby zdjąć blokadę pustych wykresów analitycznych i rozpocząć budowanie formy, wykonaj te proste kroki wstępne:</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-[#2d2d2d]/30 p-3.5 rounded-xl border border-zinc-800/50">
                <span className="text-xs text-textSecondary font-bold block mb-1">⚖️ KROK 1</span>
                <h4 className="text-xs font-bold text-zinc-200 uppercase">Wprowadź wagę startową</h4>
              </div>
              <div className="bg-[#2d2d2d]/30 p-3.5 rounded-xl border border-zinc-800/50">
                <span className="text-xs text-textSecondary font-bold block mb-1">🎯 KROK 2</span>
                <h4 className="text-xs font-bold text-zinc-200 uppercase">Ustaw suwakiem cel wyżej</h4>
              </div>
              <div onClick={() => navigate('/new-workout')} className="bg-[#2d2d2d]/60 p-3.5 rounded-xl border border-gymRed/30 cursor-pointer hover:border-gymRed transition-all group">
                <span className="text-xs text-gymRed font-bold block mb-1">🏋️‍♂️ KROK 3</span>
                <h4 className="text-xs font-bold text-white uppercase group-hover:text-red-400">Uruchom pierwszy plan</h4>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SEKCJA 2: DWIE KOLUMNY (WYKRESY SIDE-BY-SIDE) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full">
        
        {/* LEWA KOLUMNA: WAGA + TRENDY */}
        <section className="bg-gymCard border border-zinc-800/40 rounded-gp-lg p-4 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold uppercase tracking-wider text-textSecondary">Monitor masy ciała (Trendy) ⚖️</div>
              
              {trend && (
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${trend.isUp ? 'bg-gymWarning/10 text-gymWarning' : trend.isDown ? 'bg-gymSuccess/10 text-gymSuccess' : 'bg-zinc-800 text-textSecondary'}`}>
                  {trend.isUp ? `▲ +${trend.diff}` : trend.isDown ? `▼ -${trend.diff}` : '• Bez zmian'} kg
                </span>
              )}
            </div>
            
            <WeightChart logs={isPremiumUser ? weightLogs : weightLogs.slice(0, 7)} />
            
            {weightLogs.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 mt-4 -mx-1 px-1">
                {weightLogs.slice(0, 5).map(log => (
                  <div key={log.id} className="bg-gymCardSecondary/60 border border-zinc-800/60 p-2 rounded-gp-md flex flex-col items-center min-w-[80px] relative group">
                    <button onClick={() => initiateDelete(log.id)} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center text-[8px] text-textSecondary hover:text-gymDanger cursor-pointer transition-colors shadow-md">✕</button>
                    <span className="text-xs font-bold font-mono text-zinc-100">{parseFloat(log.weight).toFixed(1)}<span className="text-[9px] font-normal text-textSecondary ml-0.5">kg</span></span>
                    <span className="text-[9px] text-textMuted mt-0.5 font-medium uppercase">{new Date(log.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4 pt-3 border-t border-zinc-800/40 items-center justify-between relative">
            <span className="text-[11px] text-textMuted font-medium">Zapisz wagę poranną:</span>
            <div className="flex gap-2 w-48">
              
              {/* 🔴 ZMODYFIKOWANY INPUT: Zablokowana domyślna klawiatura, aktywuje Numpad */}
              <input 
                type="text" 
                inputMode="none"
                readOnly={true}
                placeholder="84.5" 
                value={weightInput} 
                onClick={(e) => { e.preventDefault(); setIsWeightNumpadOpen(true); }}
                className={`w-full p-2 rounded-gp-md border bg-gymCardSecondary text-white text-xs text-center font-mono outline-none cursor-pointer transition-all ${isWeightNumpadOpen ? 'border-gymRed ring-1 ring-gymRed shadow-[0_0_8px_rgba(239,68,68,0.2)]' : 'border-zinc-800 hover:border-zinc-700'}`} 
              />
              
              <button 
                onClick={onConfirmWeight} 
                disabled={isWeightInputInvalid}
                className="bg-gymRed hover:bg-gymRedHover disabled:opacity-20 disabled:hover:bg-gymRed text-white text-xs font-bold px-4 py-2 rounded-gp-md cursor-pointer disabled:cursor-not-allowed transition-colors shrink-0"
              >
                Dodaj
              </button>
            </div>
          </div>
        </section>

        {/* PRAWA KOLUMNA: 1RM PROGRESJA */}
        <section className="bg-gymCard border border-zinc-800/40 rounded-gp-lg p-4 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="text-xs font-bold uppercase tracking-wider text-textSecondary">Krzywa progresu sły (Est. 1RM) 📈</div>
              <select
                value={selectedExercise} onChange={(e) => setSelectedExercise(e.target.value)}
                className="p-1.5 rounded-gp-md border border-zinc-800 bg-gymCardSecondary text-white text-xs outline-none focus:border-gymRed cursor-pointer max-w-[200px] truncate font-medium"
              >
                <option value="" disabled>Wybierz ćwiczenie...</option>
                {exercises.map(ex => (
                  <option key={ex.id} value={ex.id} className="bg-gymCardSecondary">{ex.name}</option>
                ))}
              </select>
            </div>

            <div className="w-full overflow-hidden bg-gymCardSecondary/20 rounded-gp-md p-1 border border-zinc-800/30 flex justify-center items-center min-h-[160px]">
              {validData.length < 2 ? (
                <div className="text-center text-textMuted text-xs italic py-12 px-4">Zaloguj minimum 2 różne dni treningowe dla tego ćwiczenia, aby wygenerować linię progresu.</div>
              ) : (
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff4757" stopOpacity="0.18"/>
                      <stop offset="100%" stopColor="#ff4757" stopOpacity="0.00"/>
                    </linearGradient>
                  </defs>
                  <line x1={padding} y1={padding} x2={svgWidth - padding} y2={padding} stroke="#22252c" strokeWidth="1" strokeDasharray="4"/>
                  <line x1={padding} y1={svgHeight - padding} x2={svgWidth - padding} y2={svgHeight - padding} stroke="#2a2e38" strokeWidth="1"/>
                  <path d={gradientPath} fill="url(#chartGradient)" />
                  <path d={pointsPath} fill="none" stroke="#ff4757" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  {pointsArray.map((p, i) => (
                    <g key={i} className="group/node cursor-pointer">
                      <circle cx={p.x} cy={p.y} r="4" fill="#0c0e12" stroke="#ff4757" strokeWidth="2" className="transition-all group-hover/node:r-5 group-hover/node:fill-[#ff4757]"/>
                      <g className="opacity-0 group-hover/node:opacity-100 transition-opacity duration-150 pointer-events-none">
                        <rect x={p.x - 35} y={p.y - 26} width="70" height="18" rx="3" fill="#1a1f27" stroke="#ff4757" strokeWidth="0.5"/>
                        <text x={p.x} y={p.y - 14} fill="white" fontSize="9" fontWeight="bold" textAnchor="middle">{p.oneRm.toFixed(1)} kg</text>
                      </g>
                    </g>
                  ))}
                </svg>
              )}
            </div>
          </div>
          <div className="text-[10px] text-textMuted font-medium mt-3 text-right">Dane synchronizowane w czasie rzeczywistym (Europe/Warsaw).</div>
        </section>

      </div>

      {/* MODAL USUWANIA POMIARU WAGI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div onClick={closeModal} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="bg-gymCard border border-zinc-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative z-10 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-gymRed text-xl">⚖️</div>
            <h3 className="text-lg font-bold text-white mb-2 tracking-tight">Usunąć pomiar wagi?</h3>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">Ta operacja bezpowrotnie wymaże ten dzień z Twojego wykresu progresu masy ciała.</p>
            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 py-2.5 bg-gymCardSecondary text-white font-semibold rounded-lg text-sm border border-zinc-800 cursor-pointer">Anuluj</button>
              <button onClick={confirmDelete} className="flex-1 py-2.5 bg-gymRed hover:bg-gymRedHover text-white font-bold rounded-gp-md text-sm cursor-pointer shadow-lg shadow-red-950/20">Tak, usuń</button>
            </div>
          </div>
        </div>
      )}

      {/* 🔴 INTERAKTYWNY IN-APP NUMPAD DLA WAGI (Zastępuje klawiaturę systemową) */}
      {isWeightNumpadOpen && (
        <div className="fixed bottom-0 left-0 right-0 max-w-[640px] mx-auto bg-[#15181f] border-t-2 border-zinc-800 z-[9999] p-3 animate-in slide-in-from-bottom duration-200 select-none pb-safe">
          
          <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2 mb-3 px-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-400">Pole:</span>
              <span className="font-black uppercase text-gymRed bg-gymRed/10 px-2 py-0.5 rounded-md tracking-wider text-[10px]">
                Masa Ciała (kg) ⚖️
              </span>
            </div>

            <button 
              type="button" 
              onClick={() => setIsWeightNumpadOpen(false)} 
              className="text-textMuted hover:text-white font-bold px-2 py-1 bg-zinc-900 rounded border border-zinc-800 cursor-pointer ml-1 transition-colors"
            >
              Zamknij
            </button>
          </div>

          {/* 🔴 PRZYCISKI KROKOWE (SZYBKIE DODAWANIE WAGI) */}
          <div className="grid grid-cols-4 gap-1.5 font-mono mb-3">
            {['-1.0', '-0.1', '+0.1', '+1.0'].map(inc => (
              <button
                key={inc} type="button" onClick={() => handleWeightQuickInc(inc)}
                className={`py-2 bg-zinc-800/30 hover:bg-zinc-800 border border-zinc-800/80 font-black text-xs rounded-gp-md cursor-pointer transition-colors text-center shadow-sm ${inc.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}
              >
                {inc}
              </button>
            ))}
          </div>

          {/* KLAWIATURA CYFROWA */}
          <div className="grid grid-cols-3 gap-1.5 font-mono">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button
                key={num} type="button" onClick={() => handleWeightNumpadPress(num)}
                className="py-3 bg-zinc-800/50 hover:bg-zinc-800 active:bg-zinc-700 text-white font-black text-lg rounded-gp-md cursor-pointer transition-colors text-center shadow-md border border-zinc-800/40"
              >
                {num}
              </button>
            ))}
            <button
              type="button" onClick={() => handleWeightNumpadPress('.')}
              className="py-3 bg-zinc-800/50 hover:bg-zinc-800 active:bg-zinc-700 text-white font-black text-lg rounded-gp-md cursor-pointer transition-colors text-center shadow-md border border-zinc-800/40"
            >
              .
            </button>
            <button
              type="button" onClick={() => handleWeightNumpadPress('0')}
              className="py-3 bg-zinc-800/50 hover:bg-zinc-800 active:bg-zinc-700 text-white font-black text-lg rounded-gp-md cursor-pointer transition-colors text-center shadow-md border border-zinc-800/40"
            >
              0
            </button>
            <button
              type="button" onClick={() => handleWeightNumpadPress('BACKSPACE')}
              className="py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-black text-sm rounded-gp-md cursor-pointer transition-colors text-center shadow-md border border-zinc-800/60 flex items-center justify-center"
            >
              ⌫
            </button>
          </div>

          <button
            type="button"
            disabled={isWeightInputInvalid}
            onClick={onConfirmWeight}
            className="w-full mt-3 py-3 bg-gymRed hover:bg-red-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-black text-sm uppercase tracking-wider rounded-gp-md cursor-pointer disabled:cursor-not-allowed transition-all active:scale-[0.99] shadow-lg text-center"
          >
            Zatwierdź i zapisz wagę ✓
          </button>

        </div>
      )}

    </div>
  )
}