// frontend/src/components/WorkoutCalendar.jsx
import React, { useState, useMemo } from 'react'

export default function WorkoutCalendar({ workoutsHistory }) {
  // Stan kontrolujący aktualnie wyświetlany rok i miesiąc w kalendarzu
  const [currentDate, setCurrentDate] = useState(new Date())

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() // 0-11

  // Nazwy miesięcy do nagłówka
  const monthNames = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
  ]

  // 1. Mapujemy historię treningów na zestaw unikalnych stringów 'YYYY-MM-DD' dla natychmiastowego wyszukiwania
  const workoutDatesSet = useMemo(() => {
    const dates = new Set()
    if (!workoutsHistory || !Array.isArray(workoutsHistory)) return dates

    workoutsHistory.forEach(w => {
      if (w.startedAt) {
        const d = new Date(w.startedAt)
        // Formatowanie lokalne do YYYY-MM-DD z uwzględnieniem strefy czasowej
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        dates.add(`${year}-${month}-${day}`)
      }
    })
    return dates
  }, [workoutsHistory])

  // 2. Generowanie struktury dni dla siatki kalendarza
  const calendarDays = useMemo(() => {
    // Pierwszy dzień aktualnego miesiąca
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
    // Dzień tygodnia pierwszego dnia (0 = Niedziela, 1 = Poniedziałek...)
    let startDayOfWeek = firstDayOfMonth.getDay()
    // Konwertujemy na format europejski (0 = Poniedziałek, 6 = Niedziela)
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1

    // Łączna liczba dni w aktualnym miesiącu
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

    const daysArray = []

    // Wypełniamy puste bloki (dni z poprzedniego miesiąca, aby wyrównać siatkę do Poniedziałku)
    for (let i = 0; i < startDayOfWeek; i++) {
      daysArray.push({ id: `empty-${i}`, dayNumber: null, fullDate: null })
    }

    // Wypełniamy właściwe dni miesiąca
    for (let day = 1; day <= daysInMonth; day++) {
      const mStr = String(currentMonth + 1).padStart(2, '0')
      const dStr = String(day).padStart(2, '0')
      const fullDate = `${currentYear}-${mStr}-${dStr}`

      daysArray.push({
        id: `day-${day}`,
        dayNumber: day,
        fullDate,
        hasWorkout: workoutDatesSet.has(fullDate),
        isToday: new Date().toDateString() === new Date(currentYear, currentMonth, day).toDateString()
      })
    }

    return daysArray
  }, [currentYear, currentMonth, workoutDatesSet])

  // Nawigacja po kalendarzu
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }

  return (
    <div className="w-full bg-gymCardSecondary/40 border border-zinc-800/60 rounded-xl p-4 shadow-inner mb-6 animate-in fade-in duration-150">
      
      {/* NAGŁÓWEK KALENDARZA Z NAWIGACJĄ */}
      <div className="flex items-center justify-between border-b border-zinc-800/50 pb-3 mb-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
          📅 <span className="text-textPrimary">{monthNames[currentMonth]}</span> <span className="text-zinc-500 font-mono font-medium">{currentYear}</span>
        </h3>
        
        <div className="flex gap-1">
          <button 
            type="button" 
            onClick={handlePrevMonth}
            className="w-7 h-7 rounded-md bg-zinc-800/40 border border-zinc-800 hover:border-zinc-700 text-textSecondary hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition-colors"
          >
            ‹
          </button>
          <button 
            type="button" 
            onClick={handleNextMonth}
            className="w-7 h-7 rounded-md bg-zinc-800/40 border border-zinc-800 hover:border-zinc-700 text-textSecondary hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition-colors"
          >
            ›
          </button>
        </div>
      </div>

      {/* NAGŁÓWKI DNI TYGODNIA */}
      <div className="grid grid-cols-7 text-center text-[10px] font-black text-textMuted uppercase tracking-tight mb-2">
        <div>Pn</div><div>Wt</div><div>Śr</div><div>Cz</div><div>Pt</div><div>Sb</div><div>Nd</div>
      </div>

      {/* SIATKA ELEMENTÓW DNIA */}
      <div className="grid grid-cols-7 gap-y-2 gap-x-1 justify-items-center">
        {calendarDays.map((item) => {
          if (!item.dayNumber) {
            return <div key={item.id} className="w-8 h-8 opacity-0" />
          }

          return (
            <div 
              key={item.id}
              className={`w-8 h-8 rounded-lg flex flex-col items-center justify-center relative border transition-all ${
                item.isToday 
                  ? 'border-gymRed/60 bg-gymRed/5 text-white' 
                  : 'border-transparent bg-zinc-900/10 text-zinc-400'
              }`}
            >
              <span className="font-mono text-xs font-bold">{item.dayNumber}</span>
              
              {/* 🔴 EMOCJONALNA KROPKA SESJI TRENINGOWEJ */}
              {item.hasWorkout && (
                <span className="absolute bottom-1 w-1 h-1 bg-gymRed rounded-full shadow-[0_0_6px_rgba(239,68,68,0.8)] animate-in zoom-in duration-200" />
              )}
            </div>
          )
        })}
      </div>

    </div>
  )
}