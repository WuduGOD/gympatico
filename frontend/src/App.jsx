import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'

import LoginView from './views/LoginView'
import Dashboard from './views/Dashboard'
import ExercisesList from './views/ExercisesList'
import NewWorkout from './views/NewWorkout'
import History from './views/History'
import Social from './views/Social'

import { useWeightLogs } from './hooks/useWeightLogs'
import { useFriends } from './hooks/useFriends'
import { useWorkouts } from './hooks/useWorkouts'
import { API_BASE_URL } from './config/api'
import StatsView from './views/StatsView'

function AppContent() {
  const [token, setToken] = useState(() => localStorage.getItem('gp_token') || null);
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('gp_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [exercises, setExercises] = useState([])
  const [stats, setStats] = useState(null)
  const [loadingData, setLoadingData] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()

  const [toast, setToast] = useState({ message: '', type: 'success' })
  
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast({ message: '', type: 'success' }), 3500)
  }

  // Integracja customowych hooków domenowych
  const { weightLogs, weightInput, setWeightInput, handleAddWeight, fetchWeightLogs, handleDeleteWeight } = useWeightLogs(token, showToast)
  const { 
    friends, pendingRequests, friendNickInput, setFriendNickInput, 
    handleSendFriendRequest, handleAcceptFriend, handleRejectFriend, fetchFriendsData 
  } = useFriends(token)
  
  const {
    workoutsHistory, workoutName, setWorkoutName, workoutComment, setWorkoutComment, 
    currentSelectedExercise, setCurrentSelectedExercise, seriesWeight, setSeriesWeight, 
    seriesReps, setSeriesReps, localSeriesList, setLocalSeriesList, addSeriesToLocalList, 
    handleSaveWorkout, fetchWorkoutsData, removeSeriesFromLocalList, progressionData, 
    fetchProgression, handleDeleteWorkout, hasMoreWorkouts, handleUpdateWorkout
  } = useWorkouts(token, exercises)

  const handleLoginSuccess = (userToken, userData) => {
    localStorage.setItem('gp_token', userToken);
    localStorage.setItem('gp_user', JSON.stringify(userData));
    setToken(userToken)
    setUser(userData)
    navigate('/')
  }

  const handleLogout = () => {
    localStorage.removeItem('gp_token');
    localStorage.removeItem('gp_user');
    setToken(null)
    setUser(null)
    setLocalSeriesList([])
    navigate('/login')
  }

  const fetchStatsData = useCallback(async () => {
  if (!token) return;
  const res = await fetch(`${API_BASE_URL}/api/stats`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Błąd pobierania statystyk');
  const data = await res.json();
  setStats(data);
}, [token]);

  // Globalny, zabezpieczony mechanizm synchronizacji stanów z bazą
  const fetchAllData = useCallback(async () => {
    if (!token) return;
    setLoadingData(true);
    
    const protectedHeaders = { 
      'Authorization': `Bearer ${token}` 
    };

    try {
      const fetchExercises = fetch(`${API_BASE_URL}/api/exercises`, { 
        method: 'GET',
        headers: protectedHeaders 
      })
        .then(res => { 
          if (!res.ok) throw new Error('Błąd atlasu ćwiczeń'); 
          return res.json(); 
        })
        .then(data => {
          setExercises(data);
          if (data.length > 0) setCurrentSelectedExercise(data[0].id);
        });

      const fetchUserProfile = fetch(`${API_BASE_URL}/api/auth/me`, { 
        headers: protectedHeaders 
      })
        .then(res => { if (!res.ok) throw new Error('Błąd profilu'); return res.json(); })
        .then(data => setUser(data));

      await Promise.all([
        fetchExercises,
        fetchUserProfile,
        fetchWeightLogs(),
        fetchWorkoutsData(),
        fetchFriendsData(),
        fetchStatsData()
      ]);
    } catch (error) {
      console.error("❌ Błąd ładowania danych:", error.message);
      showToast(`Nie udało się pobrać danych: ${error.message}`, 'error');
    } finally {
      setLoadingData(false);
    }
  }, [token, fetchWeightLogs, fetchWorkoutsData, fetchFriendsData, setCurrentSelectedExercise, fetchStatsData]);

  useEffect(() => {
    fetchAllData()
  }, [token, fetchAllData])

  // --- POPRAWKA: AUTOMATYCZNE WYLOGOWANIE PO WYGAŚNIĘCIU TOKENU ---
  useEffect(() => {
    const handleSessionExpired = () => {
      handleLogout(); // Czyści token, profil i przekierowuje do /login
      showToast('Twoja sesja wygasła. Zaloguj się ponownie! 🔐', 'error');
    };

    // Rejestracja nasłuchiwania na globalnej szynie zdarzeń
    window.addEventListener('gympatico-unauthorized', handleSessionExpired);
    
    // Czyszczenie subskrypcji przy odmontowywaniu komponentu
    return () => {
      window.removeEventListener('gympatico-unauthorized', handleSessionExpired);
    };
  }, [handleLogout]);

  // --- HANDLERY OPERACJI INŻYNIERSKICH COMFORT-FLOW ---
  const onUpdateWeeklyTarget = async (newTarget) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/weekly-target`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ weeklyTarget: newTarget })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Nie udało się zaktualizować celu.');
      setUser(prev => ({ ...prev, weekly_target_workouts: data.weekly_target_workouts }));
      showToast('Tygodniowy cel zaktualizowany! 🎯', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const onDeleteWeightLog = async (logId) => {
    try {
      await handleDeleteWeight(logId);
      showToast('Pomiar wagi został usunięty ⚖️', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const onSaveWorkout = async () => {
    try {
      await handleSaveWorkout();
      showToast('Trening zapisany pomyślnie! 🔥', 'success');
      await fetchAllData();
      navigate('/history');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const onSendFriendRequest = async (e) => {
    e.preventDefault();
    try {
      await handleSendFriendRequest(friendNickInput);
      showToast('Zaproszenie wysłane pomyślnie! ✉️', 'success');
      await fetchAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const onAcceptFriend = async (friendshipId) => {
    try {
      await handleAcceptFriend(friendshipId);
      showToast('Zaproszenie zaakceptowane! 🤝', 'success');
      await fetchAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const onRejectFriend = async (friendshipId) => {
    try {
      await handleRejectFriend(friendshipId);
      showToast('Zaproszenie zostało odrzucone.', 'success');
      await fetchAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const onDeleteWorkout = async (sessionId) => {
    try {
      await handleDeleteWorkout(sessionId);
      showToast('Trening został usunięty.', 'success');
      await fetchAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const onLoadMoreWorkouts = async () => {
    await fetchWorkoutsData(workoutsHistory.length, true);
  };

  const onAddCustomExercise = async (name, muscleGroup) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/exercises`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, muscleGroup })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Nie udało się dodać ćwiczenia.');
      
      showToast('Nowe ćwiczenie dodane do Twojego atlasu! 📚', 'success');
      await fetchAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const onDeleteCustomExercise = async (exerciseId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/exercises/${exerciseId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Nie udało się usunąć ćwiczenia.');

      showToast('Ćwiczenie usunięte z atlasu! 🗑️', 'success');
      await fetchAllData(); // Odświeżamy listę w locie
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const onUpdateWorkoutMetadata = async (sessionId, name, comment) => {
    try {
      await handleUpdateWorkout(sessionId, name, comment);
      showToast('Trening został zaktualizowany! ✏️', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    // Główny kontener aplikacji zintegrowany z ciemnym tłem GymPatico
    <div className="p-4 md:p-6 font-sans bg-gymDark text-white min-h-screen relative">

      {token && (
        <>
          {/* GÓRNY HEADER GLOBALNY */}
          <header className="flex justify-between items-center border-b border-zinc-800/80 pb-4 mb-6 md:mb-8 gap-4">
            <div className="text-left">
              <h1 className="text-xl md:text-2xl font-black text-gymRed tracking-tight">🏋️‍♂️ GymPatico</h1>
              <p className="hidden md:block text-zinc-400 text-xs mt-0.5">Witaj, <strong className="text-zinc-200">{user?.nick}</strong>!</p>
            </div>
            
            {/* Nawigacja stacjonarna (Ukrywana na smartfonach przez md:flex) */}
            <nav className="hidden md:flex items-center gap-2">
              <button onClick={() => navigate('/')} className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${location.pathname === '/' ? 'bg-gymRed text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>Panel</button>
              <button onClick={() => navigate('/stats')} className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${location.pathname === '/stats' ? 'bg-gymRed text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>Statystyki 📊</button>
              <button onClick={() => navigate('/exercises')} className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${location.pathname === '/exercises' ? 'bg-gymRed text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>Atlas 📚</button>
              <button onClick={() => navigate('/new-workout')} className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${location.pathname === '/new-workout' ? 'bg-gymRed text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>+ Nowy Trening</button>
              <button onClick={() => navigate('/history')} className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${location.pathname === '/history' ? 'bg-gymRed text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>Historia</button>
              <button onClick={() => navigate('/social')} className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${location.pathname === '/social' ? 'bg-gymRed text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>Społeczność 👥</button>
              <button onClick={handleLogout} className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer transition-all ml-2">Wyloguj</button>
            </nav>

            {/* Przycisk wyjścia dla wersji mobilnej */}
            <button onClick={handleLogout} className="block md:hidden px-3 py-1.5 bg-zinc-800 text-white border border-zinc-700 rounded-lg font-bold cursor-pointer text-xs transition-colors hover:bg-zinc-700">
              Wyjdź 🚪
            </button>
          </header>

          {/* ERGONOMICZNA DOLNA BELKA NAWIGACYJNA DLA MOBILE */}
          <nav className="grid grid-cols-6 md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#1e1e1e] border-t border-zinc-800/80 shadow-2xl z-[999] py-1 px-0.5">
            <button onClick={() => navigate('/')} className={`flex flex-col items-center justify-center bg-transparent border-none cursor-pointer text-[9px] font-bold gap-0.5 transition-colors ${location.pathname === '/' ? 'text-gymRed' : 'text-zinc-500'}`}>
              <span className="text-lg">📊</span><span>Panel</span>
            </button>
            <button onClick={() => navigate('/stats')} className={`flex flex-col items-center justify-center bg-transparent border-none cursor-pointer text-[9px] font-bold gap-0.5 transition-colors ${location.pathname === '/stats' ? 'text-gymRed' : 'text-zinc-500'}`}>
              <span className="text-lg">📈</span><span>Stats</span>
            </button>
            <button onClick={() => navigate('/exercises')} className={`flex flex-col items-center justify-center bg-transparent border-none cursor-pointer text-[9px] font-bold gap-0.5 transition-colors ${location.pathname === '/exercises' ? 'text-gymRed' : 'text-zinc-500'}`}>
              <span className="text-lg">📚</span><span>Atlas</span>
            </button>
            <button onClick={() => navigate('/new-workout')} className={`flex flex-col items-center justify-center bg-transparent border-none cursor-pointer text-[9px] font-bold gap-0.5 transition-colors ${location.pathname === '/new-workout' ? 'text-gymRed' : 'text-zinc-500'}`}>
              <span className="text-lg">➕</span><span>Trening</span>
            </button>
            <button onClick={() => navigate('/history')} className={`flex flex-col items-center justify-center bg-transparent border-none cursor-pointer text-[9px] font-bold gap-0.5 transition-colors ${location.pathname === '/history' ? 'text-gymRed' : 'text-zinc-500'}`}>
              <span className="text-xl">📅</span><span>Historia</span>
            </button>
            <button onClick={() => navigate('/social')} className={`flex flex-col items-center justify-center bg-transparent border-none cursor-pointer text-[9px] font-bold gap-0.5 transition-colors ${location.pathname === '/social' ? 'text-gymRed' : 'text-zinc-500'}`}>
              <span className="text-xl">👥</span><span>Gang</span>
            </button>
          </nav>
        </>
      )}

      {/* PASEK SYNCHRONIZACJI BACKENDU */}
      {loadingData && token && (
        <div className="text-gymRed text-left mb-4 font-bold text-xs md:text-sm animate-pulse flex items-center gap-1.5">
          🔄 Synchronizacja z bazą danych...
        </div>
      )}

      {/* STRUMIEŃ GŁÓWNY WIDOKÓW (Dopisany bezpieczny padding dolny na mobile pod belkę) */}
      <main className="pb-20 md:pb-0">
        <Routes>
          <Route path="/login" element={token ? <Navigate to="/" /> : <LoginView onLoginSuccess={handleLoginSuccess} />} />
          <Route path="/" element={token ? <Dashboard user={user} weightLogs={weightLogs} weightInput={weightInput} setWeightInput={setWeightInput} handleAddWeight={handleAddWeight} exercises={exercises} onUpdateWeeklyTarget={onUpdateWeeklyTarget} progressionData={progressionData} fetchProgression={fetchProgression} onDeleteWeight={onDeleteWeightLog} /> : <Navigate to="/login" />} />
          
          {/* URATOWANE: Dokładnie jedna, w pełni wyposażona trasa dla Atlasu z obsługą dodawania */}
          <Route path="/exercises" element={token ? <ExercisesList exercises={exercises} onAddExercise={onAddCustomExercise} onDeleteExercise={onDeleteCustomExercise} /> : <Navigate to="/login" />} />
          
          <Route path="/new-workout" element={token ? <NewWorkout workoutName={workoutName} setWorkoutName={setWorkoutName} workoutComment={workoutComment} setWorkoutComment={setWorkoutComment} currentSelectedExercise={currentSelectedExercise} setCurrentSelectedExercise={setCurrentSelectedExercise} seriesWeight={seriesWeight} setSeriesWeight={setSeriesWeight} seriesReps={seriesReps} setSeriesReps={setSeriesReps} exercises={exercises} localSeriesList={localSeriesList} addSeriesToLocalList={addSeriesToLocalList} handleSaveWorkout={onSaveWorkout} removeSeriesFromLocalList={removeSeriesFromLocalList} /> : <Navigate to="/login" />} />
          <Route path="/history" element={token ? <History workoutsHistory={workoutsHistory} onDeleteWorkout={onDeleteWorkout} onLoadMoreWorkouts={onLoadMoreWorkouts} hasMoreWorkouts={hasMoreWorkouts} onUpdateWorkout={onUpdateWorkoutMetadata} /> : <Navigate to="/login" />} />
          <Route path="/social" element={token ? <Social friendNickInput={friendNickInput} setFriendNickInput={setFriendNickInput} handleSendFriendRequest={onSendFriendRequest} pendingRequests={pendingRequests} handleAcceptFriend={onAcceptFriend} handleRejectFriend={onRejectFriend} friends={friends} /> : <Navigate to="/login" />} />
          <Route path="/stats" element={token ? <StatsView stats={stats} loading={loadingData} /> : <Navigate to="/login" />} />
          <Route path="*" element={<Navigate to={token ? "/" : "/login"} />} />
        </Routes>
      </main>

      {/* UNIFORM TOAST NOTIFICATION BOX */}
      {toast.message && (
        <div 
          className={`fixed bottom-20 md:bottom-6 right-4 md:right-6 px-5 py-3 rounded-xl text-white font-bold text-xs md:text-sm shadow-2xl z-[1000] tracking-wide animate-in fade-in slide-in-from-bottom-4 duration-200
            ${toast.type === 'error' ? 'bg-gymRed border border-red-600' : 'bg-emerald-500 border border-emerald-600'}`}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}