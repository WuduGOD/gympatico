import { useState, useCallback } from 'react';
import { API_BASE_URL } from '../config/api';

export function useTemplates(token, showToast) {
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const fetchTemplates = useCallback(async () => {
    if (!token) return;
    setLoadingTemplates(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/templates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Nie udało się pobrać szablonów.');
      const data = await res.json();
      setTemplates(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTemplates(false);
    }
  }, [token]);

  const handleSaveTemplate = useCallback(async (name, seriesList) => {
    if (!token) return false;
    try {
      const res = await fetch(`${API_BASE_URL}/api/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, series: seriesList })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Błąd zapisu szablonu');
      
      showToast(data.message || 'Szablon zapisany! 💾', 'success');
      await fetchTemplates(); // Odśwież listę w tle
      return true;
    } catch (err) {
      showToast(err.message, 'error');
      return false;
    }
  }, [token, fetchTemplates, showToast]);

  const handleDeleteTemplate = useCallback(async (id) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/templates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Nie udało się usunąć szablonu.');
      showToast('Szablon został usunięty ✕', 'success');
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      showToast(err.message, 'error');
    }
  }, [token, showToast]);

  return { templates, loadingTemplates, fetchTemplates, handleSaveTemplate, handleDeleteTemplate };
}