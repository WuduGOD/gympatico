// frontend/src/hooks/useWeightLogs.js
import { useState, useCallback } from 'react';
import { API_BASE_URL } from '../config/api';

export function useWeightLogs(token, showToast) {
  const [weightLogs, setWeightLogs] = useState([]);
  const [weightInput, setWeightInput] = useState('');

  // 1. Pobieranie historii wagi 
  const fetchWeightLogs = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/weight`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Błąd historii wagi');
      const data = await res.json();
      setWeightLogs(data);
    } catch (err) {
      console.error("❌ Błąd pobierania historii wagi:", err.message);
    }
  }, [token]);

  // 🔴 POPRAWKA: handleAddWeight jako funkcja async zwracająca Promise dla App.jsx
  const handleAddWeight = useCallback(async (e) => {
    if (e) e.preventDefault();
    if (!weightInput) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/weight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ weight: weightInput })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Nie udało się zapisać pomiaru wagi.');
      
      // Bezpieczna aktualizacja stanu
      setWeightLogs(prev => [data.log, ...prev]);
      setWeightInput('');
      
      if (showToast) showToast('Waga zapisana pomyślnie! 📉', 'success');
      return data; // Zwracamy dane dla łańcucha obietnic w App.jsx
    } catch (err) {
      console.error("❌ Błąd zapisu wagi:", err.message);
      if (showToast) showToast(err.message, 'error');
      throw err; // Przekazujemy błąd wyżej do wrappera
    }
  }, [token, weightInput, showToast]);

  // 3. Usuwanie pomiaru wagi
  const handleDeleteWeight = useCallback(async (logId) => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/weight/${logId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Nie udało się usunąć pomiaru wagi.');

      setWeightLogs(prev => prev.filter(log => log.id !== logId));
      return data;
    } catch (err) {
      console.error("❌ Błąd usuwania wagi:", err.message);
      if (showToast) showToast(err.message, 'error');
    }
  }, [token, showToast]);

  return { 
    weightLogs, 
    setWeightLogs, 
    weightInput, 
    setWeightInput, 
    handleAddWeight, 
    fetchWeightLogs, 
    handleDeleteWeight 
  };
}