// frontend/src/hooks/useWorkouts.js
import { useState, useCallback } from 'react'
import { API_BASE_URL } from '../config/api'

export function useWorkouts(token, exercises, showToast) {
  const [workoutsHistory, setWorkoutsHistory] = useState([])
  const [totalWorkoutsCount, setTotalWorkoutsCount] = useState(0) // <--- NOWY STAN LICZNIKA
  const [hasMoreWorkouts, setHasMoreWorkouts] = useState(true)

  const [workoutName, setWorkoutName] = useState('')
  const [workoutComment, setWorkoutComment] = useState('')
  const [localSeriesList, setLocalSeriesList] = useState([])

  const [currentSelectedExercise, setCurrentSelectedExercise] = useState('')
  const [seriesWeight, setSeriesWeight] = useState('')
  const [seriesReps, setSeriesReps] = useState('')

  const [progressionData, setProgressionData] = useState([])

  const fetchWorkoutsData = useCallback(async (currentLength = 0, isAppend = false) => {
    if (!token) return
    const limit = 20
    try {
      const res = await fetch(`${API_BASE_URL}/api/workouts?limit=${limit}&offset=${currentLength}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Błąd historii treningów')
      const data = await res.json() // Oczekujemy { workouts, totalCount }

      if (isAppend) {
        setWorkoutsHistory(prev => [...prev, ...data.workouts])
        setHasMoreWorkouts(currentLength + data.workouts.length < data.totalCount)
      } else {
        setWorkoutsHistory(data.workouts)
        setHasMoreWorkouts(data.workouts.length < data.totalCount)
      }
      setTotalWorkoutsCount(data.totalCount)
    } catch (err) {
      console.error('Błąd pobierania historii:', err.message)
    }
  }, [token])

  const addSeriesToLocalList = useCallback((e) => {
    e?.preventDefault()
    if (!seriesWeight || !seriesReps || !currentSelectedExercise) {
      if (showToast) showToast('Wpisz wagę i powtórzenia! ⚠️', 'error')
      return
    }
    const ex = exercises.find(item => item.id === currentSelectedExercise)
    if (!ex) return

    const weight = parseFloat(seriesWeight)
    const reps = parseInt(seriesReps)
    const estimatedOneRm = reps >= 1 && reps <= 12 ? weight * (1 + reps / 30) : null

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
  }, [currentSelectedExercise, seriesWeight, seriesReps, localSeriesList, exercises, showToast])

  const removeSeriesFromLocalList = useCallback((index) => {
    setLocalSeriesList(prev => prev.filter((_, i) => i !== index))
  }, [])

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

    setWorkoutName('')
    setWorkoutComment('')
    setLocalSeriesList([])
    return data
  }, [token, workoutName, workoutComment, localSeriesList])

  const handleDeleteWorkout = useCallback(async (sessionId) => {
    const res = await fetch(`${API_BASE_URL}/api/workouts/${sessionId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Nie udało się usunąć treningu.')
    return data
  }, [token])

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
      console.error('Błąd pobierania progresu siłowego:', err.message)
    }
  }, [token])

  const handleUpdateWorkout = useCallback(async (sessionId, newName, newComment) => {
    if (!token) return
    const res = await fetch(`${API_BASE_URL}/api/workouts/${sessionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name: newName, comment: newComment })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Nie udało się zaktualizować treningu.')

    setWorkoutsHistory(prev =>
      prev.map(w => w.id === sessionId ? { ...w, name: newName, comment: newComment } : w)
    )
    return data
  }, [token])

  return {
    workoutsHistory, setWorkoutsHistory, hasMoreWorkouts, totalWorkoutsCount, fetchWorkoutsData, // <--- EKSPORT LICZNIKA
    workoutName, setWorkoutName,
    workoutComment, setWorkoutComment,
    currentSelectedExercise, setCurrentSelectedExercise,
    seriesWeight, setSeriesWeight,
    seriesReps, setSeriesReps,
    localSeriesList, setLocalSeriesList,
    addSeriesToLocalList, removeSeriesFromLocalList,
    handleSaveWorkout, handleDeleteWorkout,
    progressionData, fetchProgression,
    handleUpdateWorkout
  }
}