// frontend/src/components/NotificationBell.jsx
import React, { useState, useRef, useEffect } from 'react';

const getTimeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'teraz';
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
}

export default function NotificationBell({ notifications = [], markAsRead }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      markAsRead(); // Oznaczamy jako przeczytane od razu po otwarciu
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* IKONA DZWONKA */}
      <button 
        onClick={handleToggle}
        className="w-10 h-10 rounded-full bg-gymCardSecondary/60 border border-zinc-800/60 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer relative"
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

      {/* DROPDOWN POWIADOMIEŃ */}
      {isOpen && (
        <div className="absolute top-12 right-0 w-80 bg-[#1a1f27] border border-zinc-800/80 rounded-xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60 bg-[#222833]/40">
            <h3 className="font-bold text-white text-sm">Powiadomienia 🔔</h3>
            <span className="text-[10px] text-zinc-500 font-bold uppercase">Najnowsze</span>
          </div>
          
          <div className="max-h-[350px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 text-xs italic">
                Brak nowych powiadomień.
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map((n) => (
                  <div 
                    key={n.id} 
                    className={`flex items-start gap-3 p-3 border-b border-zinc-800/40 transition-colors ${!n.is_read ? 'bg-gymRed/5' : 'hover:bg-zinc-800/30'}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center font-bold text-xs shrink-0 border border-zinc-700">
                      {n.sender_nick ? n.sender_nick.charAt(0).toUpperCase() : '🤖'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-300 leading-tight">
                        <strong className="text-white">{n.sender_nick}</strong> {n.message}
                      </p>
                      <span className="text-[9px] text-zinc-500 font-mono mt-1 block">
                        {getTimeAgo(n.created_at)}
                      </span>
                    </div>
                    {!n.is_read && <div className="w-2 h-2 rounded-full bg-gymRed shrink-0 mt-1 shadow-[0_0_5px_rgba(239,68,68,0.5)]" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}