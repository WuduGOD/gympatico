// frontend/src/hooks/useFriends.js
import { useState, useCallback } from 'react';
import { API_BASE_URL } from '../config/api';

export function useFriends(token) {
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [friendNickInput, setFriendNickInput] = useState('');
  const [socialMessage, setSocialMessage] = useState('');

  // 🔴 POPRAWKA: Kompleksowe pobieranie modułu społecznościowego (Ranking + Skrzynka odbiorcza zaproszeń)
  const fetchFriendsData = useCallback(async () => {
    if (!token) return;
    try {
      // Pobieramy równolegle dane o znajomych oraz zaproszenia oczekujące na akceptację
      const [friendsRes, requestsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/friends`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/friends/requests`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (!friendsRes.ok) throw new Error('Błąd pobierania rankingu gangu');
      if (!requestsRes.ok) throw new Error('Błąd pobierania skrzynki odbiorczej zaproszeń');

      const friendsData = await friendsRes.json();
      const requestsData = await requestsRes.json();

      // TWARDA NORMALIZACJA: Gwarantujemy frontowi jeden, pewny klucz camelCase
      const normalizedFriends = friendsData.map(friend => ({
        ...friend,
        isPremium: friend.is_premium === true || friend.isPremium === true
      }));

      setFriends(normalizedFriends);
      setPendingRequests(requestsData); // 🔴 POPRAWKA: Wstrzykujemy pobrane zaproszenia do stanu Reacta!
    } catch (err) {
      console.error("❌ Błąd synchronizacji modułu społecznościowego:", err.message);
    }
  }, [token]);

  const handleSendFriendRequest = async (targetNick) => {
    if (!targetNick) throw new Error('Wpisz nick znajomego!');

    const res = await fetch(`${API_BASE_URL}/api/friends/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ targetNick })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Nie udało się wysłać zaproszenia.');

    // Czyszczenie inputu po pomyślnym wysłaniu
    setFriendNickInput('');
    return data;
  };

  const handleAcceptFriend = async (friendshipId) => {
    const res = await fetch(`${API_BASE_URL}/api/friends/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ friendshipId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Nie udało się zaakceptować zaproszenia.');
    return data;
  };

  const handleRejectFriend = async (friendshipId) => {
    const res = await fetch(`${API_BASE_URL}/api/friends/requests/${friendshipId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Nie udało się odrzucić zaproszenia.');

    return data;
  };

  return {
    friends, setFriends, pendingRequests, setPendingRequests,
    friendNickInput, setFriendNickInput, socialMessage, setSocialMessage,
    handleSendFriendRequest, handleAcceptFriend, fetchFriendsData, handleRejectFriend
  };
}