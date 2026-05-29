import { useState, useCallback } from 'react'; // <--- DODAJ useCallback DO IMPORTU
import { API_BASE_URL } from '../config/api';

export function useWeightLogs(token, showToast) {
  const [weightLogs, setWeightLogs] = useState([]);
  const [weightInput, setWeightInput] = useState('');

  // Owijamy w useCallback, aby referencja była stabilna
  const fetchWeightLogs = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`${API_BASE_URL}/api/weight`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Błąd historii wagi');
    const data = await res.json();
    setWeightLogs(data);
  }, [token]); // <--- Zależność to tylko token

  const handleAddWeight = (e) => {
    e.preventDefault();
    if (!weightInput) return;
    
    fetch(`${API_BASE_URL}/api/weight`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ weight: weightInput })
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Nie udało się zapisać pomiaru wagi.');
        return data;
      })
      .then(data => {
        setWeightLogs([data.log, ...weightLogs]);
        setWeightInput('');
        if (showToast) showToast('Waga zapisana pomyślnie! 📉', 'success');
      })
      .catch(err => {
        console.error("❌ Błąd zapisu wagi:", err.message);
        if (showToast) showToast(err.message, 'error');
      });
  };

  // NOWOŚĆ: Logika usuwania wpisu z bazy i stanu
  const handleDeleteWeight = useCallback(async (logId) => {
    if (!token) return;

    const res = await fetch(`${API_BASE_URL}/api/weight/${logId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Nie udało się usunąć pomiaru wagi.');

    // Optymistyczna, natychmiastowa aktualizacja interfejsu
    setWeightLogs(prev => prev.filter(log => log.id !== logId));
    return data;
  }, [token]);

  return { weightLogs, setWeightLogs, weightInput, setWeightInput, handleAddWeight, fetchWeightLogs, handleDeleteWeight };
}