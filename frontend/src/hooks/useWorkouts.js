import { useState, useCallback } from 'react'
import { API_BASE_URL } from '../config/api'

export function useWorkouts(token, exercises) {
  const [workoutsHistory, setWorkoutsHistory] = useState([])
  const [hasMoreWorkouts, setHasMoreWorkouts] = useState(true)
  
  // Stany formularza tworzenia nowego treningu
  const [workoutName, setWorkoutName] = useState('')
  const [workoutComment, setWorkoutComment] = useState('')
  const [currentSelectedExercise, setCurrentSelectedExercise] = useState('')
  const [seriesWeight, setSeriesWeight] = useState('')
  const [seriesReps, setSeriesReps] = useState('')
  const [localSeriesList, setLocalSeriesList] = useState([])

  // Stan progresji 1RM do wykresu na Dashboardzie
  const [progressionData, setProgressionData] = useState([])

  // 1. Pobieranie historii treningów z paginacją (Limit 20)
  const fetchWorkoutsData = useCallback(async (currentLength = 0, isAppend = false) => {
    if (!token) return
    const limit = 20
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/workouts?limit=${limit}&offset=${currentLength}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Błąd historii treningów')
      const data = await res.json()
      
      if (isAppend) {
        setWorkoutsHistory(prev => [...prev, ...data])
      } else {
        setWorkoutsHistory(data)
      }

      if (data.length < limit) {
        setHasMoreWorkouts(false)
      } else {
        setHasMoreWorkouts(true)
      }
    } catch (err) {
      console.error("❌ Błąd pobierania historii:", err.message)
    }
  }, [token])

  // 2. Dodawanie serii do koszyka (Zoptymalizowane pod event onSubmit i relację exercises)
  const addSeriesToLocalList = useCallback((e) => {
    e.preventDefault()

    if (!seriesWeight || !seriesReps || !currentSelectedExercise) {
      alert("Wpisz wagę i powtórzenia!")
      return
    }

    const ex = exercises.find(item => item.id === currentSelectedExercise)
    if (!ex) {
      alert("Wybrane ćwiczenie nie istnieje w bazie atlasu.")
      return
    }

    const weight = parseFloat(seriesWeight)
    const reps = parseInt(seriesReps)
    const estimatedOneRm = reps === 1 ? weight : weight * (1 + reps / 30)

    const newSeries = {
      exerciseId: currentSelectedExercise,
      exerciseName: ex.name,
      weight,
      reps,
      order: localSeriesList.filter(s => s.exerciseId === currentSelectedExercise).length + 1,
      estimatedOneRm
    }

    setLocalSeriesList(prev => [...prev, newSeries])
    setSeriesWeight('')
    setSeriesReps('')
  }, [currentSelectedExercise, seriesWeight, seriesReps, localSeriesList, exercises])

  // 3. Usuwanie pojedynczej serii z koszyka
  const removeSeriesFromLocalList = useCallback((index) => {
    setLocalSeriesList(prev => prev.filter((_, i) => i !== index))
  }, [])

  // 4. Zapisywanie skompletowanego treningu do bazy danych
  const handleSaveWorkout = useCallback(async () => {
    if (!workoutName) throw new Error('Nazwa treningu jest wymagana!')
    if (localSeriesList.length === 0) throw new Error('Nie można zapisać pustego treningu!')

    const res = await fetch(`${API_BASE_URL}/api/workouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: workoutName,
        comment: workoutComment,
        series: localSeriesList.map(s => ({
          exerciseId: s.exerciseId,
          weight: s.weight,
          reps: s.reps,
          order: s.order,
          estimatedOneRm: s.estimatedOneRm
        }))
      })
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Błąd zapisu treningu')

    // Czyszczenie kreatora po udanym zapisie
    setWorkoutName('')
    setWorkoutComment('')
    setLocalSeriesList([])
    return data
  }, [token, workoutName, workoutComment, localSeriesList])

  // 5. Usuwanie całego treningu z bazy
  const handleDeleteWorkout = useCallback(async (sessionId) => {
    const res = await fetch(`${API_BASE_URL}/api/workouts/${sessionId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Nie udało się usunąć treningu.')
    return data
  }, [token])

  // 6. Pobieranie danych do krzywej progresu siłowego
  const fetchProgression = useCallback(async (exerciseId) => {
    if (!token || !exerciseId) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/workouts/progression/${exerciseId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Błąd pobierania danych progresji')
      const data = await res.json()
      setProgressionData(data)
    } catch (err) {
      console.error("❌ Błąd pobierania progresu siłowego:", err.message)
    }
  }, [token])

  // Nowość: Aktualizacja nazwy i komentarza treningu w bazie oraz stanie
  const handleUpdateWorkout = useCallback(async (sessionId, newName, newComment) => {
    if (!token) return;

    const res = await fetch(`${API_BASE_URL}/api/workouts/${sessionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name: newName, comment: newComment })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Nie udało się zaktualizować treningu.');

    // Błyskawiczna aktualizacja lokalnego stanu historii
    setWorkoutsHistory(prev => prev.map(w => 
      w.id === sessionId ? { ...w, name: newName, comment: newComment } : w
    ));
    
    return data;
  }, [token]);

  return {
    workoutsHistory, setWorkoutsHistory, hasMoreWorkouts, fetchWorkoutsData,
    workoutName, setWorkoutName, workoutComment, setWorkoutComment,
    currentSelectedExercise, setCurrentSelectedExercise,
    seriesWeight, setSeriesWeight, seriesReps, setSeriesReps,
    localSeriesList, setLocalSeriesList,
    addSeriesToLocalList, removeSeriesFromLocalList, handleSaveWorkout, handleDeleteWorkout,
    progressionData, fetchProgression, handleUpdateWorkout
  }
}