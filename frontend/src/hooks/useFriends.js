import { useState, useCallback } from 'react'; // <--- DODAJ useCallback DO IMPORTU
import { API_BASE_URL } from '../config/api';

export function useFriends(token) {
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [friendNickInput, setFriendNickInput] = useState('');
  const [socialMessage, setSocialMessage] = useState('');

  // Stabilizacja pobierania modułu społecznościowego
  const fetchFriendsData = useCallback(async () => {
    if (!token) return;
    const headers = { 'Authorization': `Bearer ${token}` };
    const [friendsRes, requestsRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/friends`, { headers }),
      fetch(`${API_BASE_URL}/api/friends/requests`, { headers })
    ]);

    if (!friendsRes.ok) throw new Error('Błąd pobierania znajomych');
    if (!requestsRes.ok) throw new Error('Błąd pobierania zaproszeń');

    setFriends(await friendsRes.json());
    setPendingRequests(await requestsRes.json());
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

    // Czyszczenie inputu po pomyślnym wysłaniu (to należy do hooka)
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