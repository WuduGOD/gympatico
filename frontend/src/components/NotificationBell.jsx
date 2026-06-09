// frontend/src/components/NotificationBell.jsx
import React from 'react';

export default function NotificationBell({ notifications = [], pendingRequests = [], onClick }) {
  // Zliczamy nieprzeczytane powiadomienia + oczekujące zaproszenia z obu źródeł
  const unreadCount = notifications.filter(n => !n.is_read).length + (pendingRequests?.length || 0);

  return (
    <button 
      onClick={onClick}
      className="w-10 h-10 rounded-full bg-gymCardSecondary/60 border border-zinc-800/60 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer relative shrink-0"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6" />
        <path d="M9 17v1a3 3 0 0 0 6 0v-1" />
      </svg>
      
      {/* CZERWONA KROPKA / LICZNIK */}
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-gymRed text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-[#15181f] shadow-sm animate-in zoom-in">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}