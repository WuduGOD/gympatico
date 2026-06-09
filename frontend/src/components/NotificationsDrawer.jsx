// frontend/src/components/NotificationsDrawer.jsx
import React, { useEffect } from 'react';

export default function NotificationsDrawer({
  isOpen,
  onClose,
  pendingRequests,
  notifications,
  onAcceptFriend,
  onRejectFriend,
  markAsRead
}) {
  // Blokowanie scrollowania pod spodem, gdy drawer jest otwarty
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (markAsRead) markAsRead();
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen, markAsRead]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end">
      
      {/* Tło (Backdrop) - kliknięcie zamyka panel */}
      <div 
        onClick={onClose} 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity cursor-pointer" 
      />

      {/* Panel boczny */}
      <div className="relative w-full max-w-md bg-[#0c0e12] border-l border-zinc-800/80 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Nagłówek */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800/80 bg-[#161920]">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            🔔 Powiadomienia
          </h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Zawartość scrollowalna */}
        <div className="flex-1 overflow-y-auto p-4 space-y-8">

          {/* SEKCJA 1: ZAPROSZENIA (Zawsze na samej górze) */}
          {pendingRequests && pendingRequests.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gymRed uppercase tracking-wider pl-1 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gymRed animate-pulse" />
                Oczekujące akcje
              </h3>
              
              <div className="space-y-3">
                {pendingRequests.map(req => (
                  // 🔴 POPRAWKA: Używamy friendship_id jako klucza
                  <div key={req.friendship_id} className="bg-[#161920] border border-zinc-700/80 rounded-xl p-4 shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-bold text-white border border-zinc-700">
                        {/* 🔴 POPRAWKA: Bezpieczne wyciąganie litery z req.nick */}
                        {req.nick ? req.nick.charAt(0).toUpperCase() : '👤'}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{req.nick}</div>
                        <div className="text-[11px] text-zinc-400">Chce dołączyć do Twojego Gangu</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {/* 🔴 POPRAWKA: Przekazujemy friendship_id do akcji */}
                      <button onClick={() => onAcceptFriend(req.friendship_id)} className="flex-1 py-2 bg-gymRed hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-[0_0_15px_rgba(220,38,38,0.2)]">
                        Akceptuj
                      </button>
                      <button onClick={() => onRejectFriend(req.friendship_id)} className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-lg transition-colors cursor-pointer">
                        Odrzuć
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SEKCJA 2: HISTORIA (Reakcje itp.) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider pl-1">Historia</h3>
            
            {!notifications || notifications.length === 0 ? (
              <div className="text-center py-12 text-zinc-600 text-sm border border-dashed border-zinc-800 rounded-xl">
                Brak nowych powiadomień.
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map(notif => (
                  <div key={notif.id} className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${notif.is_read ? 'bg-zinc-900/20 border-zinc-800/40 opacity-70' : 'bg-[#161920] border-zinc-700 shadow-md'}`}>
                    <div className="text-xl mt-0.5">
                      {notif.type === 'REACTION' ? '🔥' : '👋'}
                    </div>
                    <div>
                      <p className="text-sm text-zinc-300 leading-snug">
                        <span className="font-bold text-white">{notif.sender_nick || 'Ktoś'}</span> {notif.message}
                      </p>
                      <span className="text-[10px] text-zinc-500 mt-1.5 block font-medium">
                        {new Date(notif.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}