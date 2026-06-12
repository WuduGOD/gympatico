// frontend/src/App.jsx
import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import Settings from './views/Settings';
import Landing from './views/Landing';

import LoginView from './views/LoginView'
import Dashboard from './views/Dashboard'
import ExercisesList from './views/ExercisesList'
import NewWorkout from './views/NewWorkout'
import History from './views/History'
import Social from './views/Social'

import { useWeightLogs } from './hooks/useWeightLogs'
import { useFriends } from './hooks/useFriends'
import { useWorkouts } from './hooks/useWorkouts'
import { useTemplates } from './hooks/useTemplates';
import { API_BASE_URL } from './config/api'
import StatsView from './views/StatsView'

import NotificationBell from './components/NotificationBell';
import NotificationsDrawer from './components/NotificationsDrawer';

// Prosty dekoder weryfikujący czas życia JWT
const getJwtExpiry = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000;
  } catch (e) {
    return null;
  }
};

function AppContent() {
  const [token, setToken] = useState(() => localStorage.getItem('gp_token') || null);
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('gp_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      localStorage.removeItem('gp_user');
      return null;
    }
  });
  const [exercises, setExercises] = useState([])
  const [stats, setStats] = useState(null)
  const [loadingData, setLoadingData] = useState(false)

  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)
  const [isNotificationsDrawerOpen, setIsNotificationsDrawerOpen] = useState(false);

  const navigate = useNavigate()
  const location = useLocation()

  const [toast, setToast] = useState({ message: '', type: 'success' })
  
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast({ message: '', type: 'success' }), 3500)
  }

  const { weightLogs, weightInput, setWeightInput, handleAddWeight, fetchWeightLogs, handleDeleteWeight } = useWeightLogs(token, showToast)
  
  const { 
    friends, pendingRequests, friendNickInput, setFriendNickInput, selectedFriendProfile, setSelectedFriendProfile, isProfileLoading, fetchFriendProfile, 
    handleSendFriendRequest, handleAcceptFriend, handleRejectFriend, fetchFriendsData, activityFeed, handleToggleReaction, weeklyChallenge, notifications, markNotificationsAsRead, handleRemoveFriend
  } = useFriends(token)

  const { templates, fetchTemplates, handleSaveTemplate, handleDeleteTemplate } = useTemplates(token, showToast);
  
  const {
    workoutsHistory, workoutName, setWorkoutName, workoutComment, setWorkoutComment, 
    currentSelectedExercise, setCurrentSelectedExercise, seriesWeight, setSeriesWeight, 
    seriesReps, setSeriesReps, localSeriesList, setLocalSeriesList, addSeriesToLocalList, 
    handleSaveWorkout, fetchWorkoutsData, removeSeriesFromLocalList, progressionData, 
    fetchProgression, handleDeleteWorkout, hasMoreWorkouts, handleUpdateWorkout,
    totalWorkoutsCount 
  } = useWorkouts(token, exercises, showToast)

  const handleLoginSuccess = (userToken, userData) => {
    const isPremiumVal = userData.isPremium || userData.is_premium || false;
    const normalizedLoginUser = {
      ...userData,
      is_premium: isPremiumVal,
      isPremium: isPremiumVal
    };

    localStorage.setItem('gp_token', userToken);
    localStorage.setItem('gp_user', JSON.stringify(normalizedLoginUser));
    setToken(userToken)
    setUser(normalizedLoginUser)
    navigate('/')
  }

  const handleLogout = useCallback(async () => {
    try {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          await fetch(`${API_BASE_URL}/api/notifications/unsubscribe`, {
            method: 'DELETE',
            headers: { 
              'Content-Type': 'application/json', 
              'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ endpoint: subscription.endpoint })
          });

          await subscription.unsubscribe();
          console.log("▶ Subskrypcja Web Push została pomyślnie wyrejestrowana globalnie.");
        }
      }
    } catch (e) {
      console.error("⚠️ Ignorowany błąd czyszczenia subskrypcji przy wylogowaniu:", e);
    }

    localStorage.removeItem('gp_token');
    localStorage.removeItem('gp_user');
    setToken(null);
    setUser(null);
    setLocalSeriesList([]); 
    setIsMoreMenuOpen(false);
    navigate('/login');
  }, [navigate, setLocalSeriesList, token]);

  const fetchStatsData = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`${API_BASE_URL}/api/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Błąd pobierania statystyk');
    const data = await res.json();
    setStats(data);
  }, [token]);

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
        .then(data => {
          const isPremiumVal = data.is_premium || false;
          const normalizedUser = {
            ...data,
            is_premium: isPremiumVal,
            isPremium: isPremiumVal, 
          };
          setUser(normalizedUser);
          localStorage.setItem('gp_user', JSON.stringify(normalizedUser));
        });

      await Promise.all([
        fetchExercises,
        fetchUserProfile,
        fetchWeightLogs(),
        fetchWorkoutsData(),
        fetchFriendsData(),
        fetchStatsData(),
        fetchTemplates()
      ]);
    } catch (error) {
      console.error("❌ Błąd ładowania danych:", error.message);
      showToast(`Nie udało się pobrać danych: ${error.message}`, 'error');
    } finally {
      setLoadingData(false);
    }
  }, [token, fetchWeightLogs, fetchWorkoutsData, fetchFriendsData, setCurrentSelectedExercise, fetchStatsData, fetchTemplates]);

  useEffect(() => {
    fetchAllData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    if (!token) return;

    const checkAndRefreshToken = async () => {
      const expiryTime = getJwtExpiry(token);
      if (!expiryTime) return;

      const timeUntilExpiry = expiryTime - Date.now();
      const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

      if (timeUntilExpiry > 0 && timeUntilExpiry < SEVEN_DAYS_IN_MS) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (res.ok) {
            const data = await res.json();
            if (data.token) {
              localStorage.setItem('gp_token', data.token);
              setToken(data.token);
              console.log('🔄 Sesja GymPatico została dyskretnie przedłużona.');
            }
          }
        } catch (err) {
          console.error("Błąd podczas odnawiania sesji w tle:", err);
        }
      }
    };

    checkAndRefreshToken();
  }, [token]);

  useEffect(() => {
    const handleSessionExpired = () => {
      handleLogout(); 
      showToast('Twoja sesja wygasła. Zaloguj się ponownie! 🔐', 'error');
    };

    window.addEventListener('gympatico-unauthorized', handleSessionExpired);
    return () => {
      window.removeEventListener('gympatico-unauthorized', handleSessionExpired);
    };
  }, [handleLogout]);

  // 🔴 NOWOŚĆ: Nasłuchiwanie na powiadomienia Push w tle (Real-Time Auto Refresh)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleSWMessage = (event) => {
      if (event.data && event.data.type === 'PUSH_RECEIVED') {
        console.log('🔄 SW Signal: Wykryto zmianę w Gangu. Szybki refetch...');
        fetchFriendsData(); 
      }
    };

    navigator.serviceWorker.addEventListener('message', handleSWMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleSWMessage);
  }, [fetchFriendsData]);

  // 🔴 NOWOŚĆ: Ciche odpytywanie (Fallback) co 30 sekund
  useEffect(() => {
    if (!token) return;

    const handleWindowFocus = () => {
      console.log('🍏 Okno aktywne: Błyskawiczna weryfikacja stanu Gangu...');
      fetchFriendsData(); // Odświeża listę w 0 ms od momentu spojrzenia na ekran
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [token, fetchFriendsData]);

  // 3. AGRESYWNY POLLING (Fallback): Sprawdzanie zmian co 7 sekund w tle
  useEffect(() => {
    if (!token) return;

    // Pobieramy tylko lekkie dane relacji, Supabase obsłuży to natychmiastowo
    const interval = setInterval(() => {
      fetchFriendsData(); 
    }, 7000); // Zmniejszone z 30s do 7s pod kątem dynamicznej synchronizacji
    
    return () => clearInterval(interval);
  }, [token, fetchFriendsData]);

  const onUpdateWeeklyTarget = async (newTarget) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/weekly-target`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ weeklyTarget: newTarget })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Nie udało się zaktualizować celu.');
      
      setUser(prev => {
        const updatedUser = { ...prev, weekly_target_workouts: data.weekly_target_workouts };
        localStorage.setItem('gp_user', JSON.stringify(updatedUser));
        return updatedUser;
      });
      showToast('Tygodniowy cel zaktualizowany! 🎯', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const onAddWeight = async (e) => {
    if (e) e.preventDefault();
    try {
      await handleAddWeight(e);
      await fetchAllData();
    } catch (err) {
      // Błąd obsługiwany w hooku
    }
  };

  const onDeleteWeightLog = async (logId) => {
    try {
      await handleDeleteWeight(logId);
      showToast('Pomiar wagi został usunięty ⚖️', 'success');
      await fetchAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const onSaveWorkout = async (seriesOverride) => {
    try {
      await handleSaveWorkout(seriesOverride);
      showToast('Trening zapisany pomyślnie! 🔥', 'success');
      await fetchAllData();
      navigate('/history');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const onSendFriendRequest = async () => {
    try {
      await handleSendFriendRequest(friendNickInput);
      showToast('Zaproszenie wysłane pomyślnie! ✉️', 'success');
      fetchFriendsData(); // SKALPEL
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const onAcceptFriend = (friendshipId) => {
    handleAcceptFriend(friendshipId).then(() => {
      showToast('Zaproszenie zaakceptowane! 🤝', 'success');
      fetchFriendsData(); // SKALPEL
    }).catch(err => {
      showToast(err.message, 'error');
    });
    return true; // Szuflada dostaje informację "zrobione" natychmiast
  };

  const onRejectFriend = (friendshipId) => {
    handleRejectFriend(friendshipId).then(() => {
      showToast('Zaproszenie zostało odrzucone.', 'success');
      fetchFriendsData(); // SKALPEL
    }).catch(err => {
      showToast(err.message, 'error');
    });
    return true;
  };

  const onRemoveFriend = async (friendId) => {
    try {
      await handleRemoveFriend(friendId);
      showToast('Użytkownik został usunięty z Gangu 💔', 'success');
      setSelectedFriendProfile(null); 
      fetchFriendsData(); // SKALPEL
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

  const mtLoadMoreWorkouts = async () => {
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
      await fetchAllData(); 
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const onUpdateWorkoutMetadata = async (sessionId, name, comment) => {
    try {
      await handleUpdateWorkout(sessionId, name, comment);
      showToast('Trening został zaktualizowany! ✏️', 'success');
      return true; 
    } catch (err) {
      showToast(err.message, 'error');
      return false; 
    }
  };

  const isMoreRouteActive = location.pathname === '/exercises' || location.pathname === '/social' || location.pathname === '/settings';

  return (
    <div className="p-4 md:p-6 font-sans bg-gymDark text-white min-h-screen relative">

      {token && (
        <>
          {/* HEADER DESKTOP / MOBILE */}
          <header className="flex justify-between items-center border-b border-zinc-800/80 pb-4 mb-6 md:mb-8 gap-4">
            <div className="text-left">
              <h1 className="text-xl md:text-2xl font-black text-gymRed tracking-tight">🏋️‍♂️ GymPatico</h1>
              <p className="hidden md:block text-zinc-400 text-xs mt-0.5">Witaj, <strong className="text-zinc-200">{user?.nick}</strong>!</p>
            </div>
            
            <div className="flex items-center gap-3 md:gap-4 shrink-0">
              <NotificationBell 
                notifications={notifications} 
                pendingRequests={pendingRequests}
                markAsRead={markNotificationsAsRead} 
                onClick={() => setIsNotificationsDrawerOpen(true)}
              />
              
              <nav className="hidden md:flex items-center gap-2">
                <button onClick={() => navigate('/')} className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${location.pathname === '/' ? 'bg-gymRed text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>Panel</button>
                <button onClick={() => navigate('/stats')} className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${location.pathname === '/stats' ? 'bg-gymRed text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>Statystyki 📊</button>
                <button onClick={() => navigate('/exercises')} className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${location.pathname === '/exercises' ? 'bg-gymRed text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>Atlas 📚</button>
                <button onClick={() => navigate('/new-workout')} className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${location.pathname === '/new-workout' ? 'bg-gymRed text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>+ Nowy Trening</button>
                <button onClick={() => navigate('/history')} className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${location.pathname === '/history' ? 'bg-gymRed text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>Historia</button>
                <button onClick={() => navigate('/social')} className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${location.pathname === '/social' ? 'bg-gymRed text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>Społeczność 👥</button>
                <button onClick={() => navigate('/settings')} className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${location.pathname === '/settings' ? 'bg-zinc-700 text-white' : 'bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>⚙️</button>
                <button onClick={handleLogout} className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer transition-all ml-2">Wyloguj</button>
              </nav>

              <button onClick={handleLogout} className="block md:hidden px-3 py-2 bg-zinc-800 text-white border border-zinc-700 rounded-lg font-bold cursor-pointer text-xs transition-colors hover:bg-zinc-700 shrink-0">
                Wyjdź 🚪
              </button>
            </div>
          </header>

          {/* DOLNA BELKA MOBILNA */}
          <nav className="grid grid-cols-5 md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#181a20] border-t border-zinc-800/60 shadow-2xl z-[999] py-1 px-1 items-center">
            <button onClick={() => { navigate('/'); setIsMoreMenuOpen(false); }} className={`flex flex-col items-center justify-center bg-transparent border-none cursor-pointer text-[10px] font-bold gap-0.5 transition-colors ${location.pathname === '/' ? 'text-gymRed' : 'text-zinc-500'}`}>
              <span className="text-lg">📊</span><span>Panel</span>
            </button>
            <button onClick={() => { navigate('/stats'); setIsMoreMenuOpen(false); }} className={`flex flex-col items-center justify-center bg-transparent border-none cursor-pointer text-[10px] font-bold gap-0.5 transition-colors ${location.pathname === '/stats' ? 'text-gymRed' : 'text-zinc-500'}`}>
              <span className="text-lg">📈</span><span>Stats</span>
            </button>
            <div className="flex justify-center relative -top-3">
              <button onClick={() => { navigate('/new-workout'); setIsMoreMenuOpen(false); }} className={`w-13 h-13 rounded-full flex items-center justify-center cursor-pointer shadow-xl shadow-red-950/50 border border-red-500/20 active:scale-90 transition-transform ${location.pathname === '/new-workout' ? 'bg-red-600 text-white' : 'bg-gymRed text-white'}`}>
                <span className="text-xl font-bold">＋</span>
              </button>
            </div>
            <button onClick={() => { navigate('/history'); setIsMoreMenuOpen(false); }} className={`flex flex-col items-center justify-center bg-transparent border-none cursor-pointer text-[10px] font-bold gap-0.5 transition-colors ${location.pathname === '/history' ? 'text-gymRed' : 'text-zinc-500'}`}>
              <span className="text-lg">📅</span><span>Historia</span>
            </button>
            <button onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)} className={`flex flex-col items-center justify-center bg-transparent border-none cursor-pointer text-[10px] font-bold gap-0.5 transition-colors ${isMoreMenuOpen || isMoreRouteActive ? 'text-gymRed' : 'text-zinc-500'}`}>
              <span className="text-lg">☰</span><span>Więcej</span>
            </button>
          </nav>

          {/* BOTTOM SHEET DRAWER */}
          {isMoreMenuOpen && (
            <div className="fixed inset-0 z-[998] md:hidden animate-in fade-in duration-150">
              <div onClick={() => setIsMoreMenuOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
              <div className="absolute bottom-16 left-0 right-0 bg-[#161920] border-t border-zinc-800 rounded-t-2xl p-4 flex flex-col gap-2.5 shadow-2xl animate-in slide-in-from-bottom-6 duration-200">
                <div className="w-12 h-1 bg-zinc-800 rounded-full mx-auto mb-2" />
                <button onClick={() => { navigate('/exercises'); setIsMoreMenuOpen(false); }} className={`flex items-center gap-3.5 p-3.5 rounded-xl border text-left font-bold text-sm transition-all cursor-pointer ${location.pathname === '/exercises' ? 'border-gymRed/40 bg-gymRed/5 text-gymRed' : 'border-zinc-800 bg-zinc-900/50 text-zinc-300'}`}>
                  <span className="text-xl">📚</span>
                  <div>
                    <div>Atlas Ćwiczeń</div>
                    <div className="text-[11px] text-zinc-500 font-normal mt-0.5">Dodawaj własne i przeglądaj bazę ruchu</div>
                  </div>
                </button>
                <button onClick={() => { navigate('/social'); setIsMoreMenuOpen(false); }} className={`flex items-center gap-3.5 p-3.5 rounded-xl border text-left font-bold text-sm transition-all cursor-pointer ${location.pathname === '/social' ? 'border-gymRed/40 bg-gymRed/5 text-gymRed' : 'border-zinc-800 bg-zinc-900/50 text-zinc-300'}`}>
                  <span className="text-xl">👥</span>
                  <div>
                    <div>Gang GymPatico</div>
                    <div className="text-[11px] text-zinc-500 font-normal mt-0.5">Ranking streaków, zaproszenia i społeczność</div>
                  </div>
                </button>
                <button onClick={() => { navigate('/settings'); setIsMoreMenuOpen(false); }} className={`flex items-center gap-3.5 p-3.5 rounded-xl border text-left font-bold text-sm transition-all cursor-pointer ${location.pathname === '/settings' ? 'border-zinc-600 bg-zinc-800 text-white' : 'border-zinc-800 bg-zinc-900/50 text-zinc-300'}`}>
                  <span className="text-xl">⚙️</span>
                  <div>
                    <div>Ustawienia</div>
                    <div className="text-[11px] text-zinc-500 font-normal mt-0.5">Powiadomienia i preferencje konta</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {loadingData && token && (
        <div className="text-gymRed text-left mb-4 font-bold text-xs md:text-sm animate-pulse flex items-center gap-1.5">
          🔄 Synchronizacja z bazą danych...
        </div>
      )}

      <main className="pb-24 md:pb-0">
        <Routes>
          <Route path="/" element={token ? (
            <Dashboard 
              user={user} 
              weightLogs={weightLogs} 
              weightInput={weightInput} 
              setWeightInput={setWeightInput} 
              handleAddWeight={onAddWeight} 
              exercises={exercises} 
              onUpdateWeeklyTarget={onUpdateWeeklyTarget} 
              progressionData={progressionData} 
              fetchProgression={fetchProgression} 
              onDeleteWeight={onDeleteWeightLog} 
              workoutsHistory={workoutsHistory} 
              templates={templates} 
            />
          ) : <Landing />} />

          <Route path="/login" element={token ? <Navigate to="/" /> : <LoginView onLoginSuccess={handleLoginSuccess} />} />
          <Route path="/register" element={token ? <Navigate to="/" /> : <LoginView onLoginSuccess={handleLoginSuccess} />} />
          
          <Route path="/exercises" element={token ? <ExercisesList exercises={exercises} onAddExercise={onAddCustomExercise} onDeleteExercise={onDeleteCustomExercise} /> : <Navigate to="/login" />} />
          
          <Route path="/new-workout" element={token ? (
            <NewWorkout
              exercises={exercises}
              templates={templates}
              onSaveTemplate={handleSaveTemplate}
              onDeleteTemplate={handleDeleteTemplate}
              workoutName={workoutName}
              setWorkoutName={setWorkoutName}
              workoutComment={workoutComment}
              setWorkoutComment={setWorkoutComment}
              localSeriesList={localSeriesList}
              setLocalSeriesList={setLocalSeriesList}
              handleSaveWorkout={onSaveWorkout}
              showToast={showToast}
            />
          ) : <Navigate to="/login" />} />
          
          <Route path="/history" element={token ? (
            <History 
              workoutsHistory={workoutsHistory} 
              onDeleteWorkout={onDeleteWorkout} 
              onLoadMoreWorkouts={mtLoadMoreWorkouts} 
              hasMoreWorkouts={hasMoreWorkouts} 
              onUpdateWorkout={onUpdateWorkoutMetadata} 
              user={user} 
              token={token} 
              showToast={showToast} 
              totalWorkoutsCount={totalWorkoutsCount} 
            />
          ) : <Navigate to="/login" />} />
          
          <Route path="/social" element={token ? <Social friendNickInput={friendNickInput} setFriendNickInput={setFriendNickInput} onSendFriendRequest={onSendFriendRequest} friends={friends} user={user} activityFeed={activityFeed} onToggleReaction={handleToggleReaction} weeklyChallenge={weeklyChallenge} fetchFriendProfile={fetchFriendProfile} selectedFriendProfile={selectedFriendProfile} setSelectedFriendProfile={setSelectedFriendProfile} isProfileLoading={isProfileLoading} onRemoveFriend={onRemoveFriend} /> : <Navigate to="/login" />} />
          
          <Route path="/stats" element={token ? <StatsView stats={stats} loading={loadingData} /> : <Navigate to="/login" />} />
          
          <Route path="/settings" element={token ? <Settings token={token} showToast={showToast} /> : <Navigate to="/login" />} />
          
          <Route path="*" element={<Navigate to={token ? "/" : "/login"} />} />
        </Routes>
      </main>

      <NotificationsDrawer 
        isOpen={isNotificationsDrawerOpen}
        onClose={() => setIsNotificationsDrawerOpen(false)}
        pendingRequests={pendingRequests}
        notifications={notifications}
        onAcceptFriend={onAcceptFriend}
        onRejectFriend={onRejectFriend}
        markAsRead={markNotificationsAsRead}
      />

      {toast.message && (
        <div 
          className={`fixed bottom-24 md:bottom-6 right-4 md:right-6 px-5 py-3 rounded-xl text-white font-bold text-xs md:text-sm shadow-2xl z-[99999] tracking-wide animate-in fade-in slide-in-from-bottom-4 duration-200
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