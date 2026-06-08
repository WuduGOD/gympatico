// frontend/src/hooks/useFriends.js
import { useState, useCallback } from 'react';
import { API_BASE_URL } from '../config/api';

export function useFriends(token) {
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [friendNickInput, setFriendNickInput] = useState('');
  const [socialMessage, setSocialMessage] = useState('');
  const [weeklyChallenge, setWeeklyChallenge] = useState([]);
  const [selectedFriendProfile, setSelectedFriendProfile] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const fetchFriendsData = useCallback(async () => {
    if (!token) return;
    try {
      const [friendsRes, requestsRes, activityRes, challengeRes, notifRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/friends`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/friends/requests`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/friends/activity`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/friends/challenges/weekly`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/friends/notifications`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const friendsData = friendsRes.ok ? await friendsRes.json() : [];
      const requestsData = requestsRes.ok ? await requestsRes.json() : [];
      const activityData = activityRes.ok ? await activityRes.json() : [];
      const challengeData = challengeRes.ok ? await challengeRes.json() : [];
      const notifData = notifRes.ok ? await notifRes.json() : [];

      setFriends(Array.isArray(friendsData) ? friendsData.map(f => ({ ...f, isPremium: f.is_premium || f.isPremium })) : []);
      setPendingRequests(Array.isArray(requestsData) ? requestsData : []); 
      setActivityFeed(Array.isArray(activityData) ? activityData : []);
      setWeeklyChallenge(Array.isArray(challengeData) ? challengeData : []);
      setNotifications(Array.isArray(notifData) ? notifData : []);
      
    } catch (err) {
      console.error("❌ Błąd synchronizacji sieciowej w module społecznościowym:", err.message);
    }
  }, [token]);

  const fetchFriendProfile = async (friendId) => {
    setIsProfileLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/friends/profile/${friendId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Błąd ładowania profilu');
      const data = await res.json();
      setSelectedFriendProfile(data);
    } catch (err) {
      console.error(err.message);
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handleSendFriendRequest = async (targetNick) => {
    if (!targetNick) throw new Error('Wpisz nick znajomego!');
    const res = await fetch(`${API_BASE_URL}/api/friends/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ targetNick })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Nie udało się wysłać zaproszenia.');
    setFriendNickInput('');
    return data;
  };

  const handleAcceptFriend = async (friendshipId) => {
    const res = await fetch(`${API_BASE_URL}/api/friends/accept`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ friendshipId }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Nie udało się zaakceptować zaproszenia.');
    return data;
  };

  const handleRejectFriend = async (friendshipId) => {
    const res = await fetch(`${API_BASE_URL}/api/friends/requests/${friendshipId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Nie udało się odrzucić zaproszenia.');
    return data;
  };

  const handleRemoveFriend = async (friendId) => {
    const res = await fetch(`${API_BASE_URL}/api/friends/${friendId}`, { 
      method: 'DELETE', 
      headers: { 'Authorization': `Bearer ${token}` } 
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Nie udało się usunąć znajomego.');
    return data;
  };

  // 🔴 ZAKTUALIZOWANE: Optymistyczne aktualizowanie reakcji w locie z pełnym Rollbackiem
  const handleToggleReaction = useCallback(async (workoutId, emoji) => {
    let rollbackFeed = null; // Zmienna do przechwycenia dokładnego stanu przed zmianą

    // 1. Zmień UI natychmiast i zapamiętaj poprzedni stan
    setActivityFeed(prevFeed => {
      rollbackFeed = [...prevFeed]; // Zapisujemy kopię zapasową
      
      return prevFeed.map(act => {
        if (act.workout_id !== workoutId) return act;
        
        let currentReactions = [...(act.reactions || [])];
        const existingIdx = currentReactions.findIndex(r => r.emoji === emoji);

        if (existingIdx >= 0) {
          const r = { ...currentReactions[existingIdx] };
          if (r.user_reacted) {
            r.count -= 1;
            r.user_reacted = false;
          } else {
            r.count += 1;
            r.user_reacted = true;
          }
          currentReactions[existingIdx] = r;
          if (r.count <= 0) currentReactions.splice(existingIdx, 1);
        } else {
          currentReactions.push({ emoji, count: 1, user_reacted: true });
        }
        return { ...act, reactions: currentReactions };
      });
    });

    // 2. Wyślij dane do bazy w tle
    try {
      const res = await fetch(`${API_BASE_URL}/api/friends/activity/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ workoutId, emoji })
      });
      
      // Jeśli serwer zwróci błąd (np. 400 lub 500), wymuszamy rzucenie wyjątku
      if (!res.ok) {
        throw new Error(`Błąd serwera: ${res.status}`);
      }
    } catch (err) {
      console.error("❌ Błąd zapisu reakcji! Wycofuję zmiany w UI (Rollback).", err);
      // 3. Wycofaj zmiany w UI w przypadku niepowodzenia
      if (rollbackFeed) {
        setActivityFeed(rollbackFeed);
      }
    }
  }, [token]);

  const markNotificationsAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      await fetch(`${API_BASE_URL}/api/friends/notifications/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) { 
      console.error("Błąd oznaczania powiadomień", err); 
    }
  };

  return {
    friends, setFriends, pendingRequests, setPendingRequests, activityFeed, weeklyChallenge,
    friendNickInput, setFriendNickInput, socialMessage, setSocialMessage,
    selectedFriendProfile, setSelectedFriendProfile, isProfileLoading, fetchFriendProfile,
    handleSendFriendRequest, handleAcceptFriend, fetchFriendsData, handleRejectFriend, handleRemoveFriend, handleToggleReaction,
    notifications, markNotificationsAsRead
  };
}