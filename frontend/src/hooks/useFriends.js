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
  const [notifications, setNotifications] = useState([]); // 🔴 STAN POWIADOMIEŃ

  const fetchFriendsData = useCallback(async () => {
    if (!token) return;
    try {
      // 🔴 POPRAWKA: Pobieramy 5 endpointów naraz (dodano notifRes)
      const [friendsRes, requestsRes, activityRes, challengeRes, notifRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/friends`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/friends/requests`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/friends/activity`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/friends/challenges/weekly`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/friends/notifications`, { headers: { 'Authorization': `Bearer ${token}` } }) // <-- NOWE
      ]);

      const friendsData = await friendsRes.json();
      const requestsData = await requestsRes.json();
      const activityData = await activityRes.json();
      const challengeData = await challengeRes.json();
      const notifData = await notifRes.json(); // <-- NOWE

      setFriends(Array.isArray(friendsData) ? friendsData.map(f => ({ ...f, isPremium: f.is_premium || f.isPremium })) : []);
      setPendingRequests(Array.isArray(requestsData) ? requestsData : []); 
      setActivityFeed(Array.isArray(activityData) ? activityData : []);
      setWeeklyChallenge(Array.isArray(challengeData) ? challengeData : []);
      setNotifications(Array.isArray(notifData) ? notifData : []); // <-- Zapis powiadomień do stanu
    } catch (err) {
      console.error("❌ Błąd synchronizacji społecznościowej:", err.message);
    }
  }, [token]);

  // Pobieranie profilu do pojedynku Head-to-Head
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

  // Optymistyczne aktualizowanie reakcji w locie
  const handleToggleReaction = useCallback(async (workoutId, emoji) => {
    setActivityFeed(prevFeed => prevFeed.map(act => {
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
    }));

    try {
      await fetch(`${API_BASE_URL}/api/friends/activity/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ workoutId, emoji })
      });
    } catch (err) {
      console.error("Błąd zapisu reakcji", err);
    }
  }, [token]);

  // 🔴 NOWOŚĆ: Oznaczanie powiadomień jako odczytane
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
    handleSendFriendRequest, handleAcceptFriend, fetchFriendsData, handleRejectFriend, handleToggleReaction,
    notifications, markNotificationsAsRead // 🔴 WYEKSPORTOWANO
  };
}