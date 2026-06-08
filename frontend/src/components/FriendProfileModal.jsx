// frontend/src/components/FriendProfileModal.jsx
import React from 'react';

export default function FriendProfileModal({ profile, onClose, myNick, onRemoveFriend }) {
  if (!profile) return null;

  // Konwersja na tony dla lepszego efektu
  const myVolTons = (profile.my_volume / 1000).toFixed(1);
  const frVolTons = (profile.friend_volume / 1000).toFixed(1);

  // Kto wygrywa w poszczególnych kategoriach?
  const myWorkoutsWin = profile.my_workouts >= profile.friend_workouts;
  const frWorkoutsWin = profile.friend_workouts >= profile.my_workouts;
  const myVolWin = profile.my_volume >= profile.friend_volume;
  const frVolWin = profile.friend_volume >= profile.my_volume;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col justify-end animate-in fade-in duration-200">
      <div onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      
      <div className="bg-gymCard border-t border-zinc-800 w-full max-w-[640px] mx-auto rounded-t-3xl shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-hidden flex flex-col">
        {/* Uchwyt do zamykania */}
        <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mt-3 mb-2 shrink-0" />
        
        <div className="overflow-y-auto px-5 pb-8 pt-2">
          {/* HERO SECTION */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-20 h-20 rounded-full bg-zinc-800 border-2 border-gymRed flex items-center justify-center text-3xl font-black text-white shadow-[0_0_20px_rgba(239,68,68,0.2)] mb-3 relative">
              {profile.nick.charAt(0).toUpperCase()}
              {profile.is_premium && (
                <div className="absolute -bottom-2 bg-amber-500 border border-amber-300 text-black text-[9px] px-2 py-0.5 rounded-full font-black tracking-widest uppercase shadow-md">
                  Premium
                </div>
              )}
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">{profile.nick}</h2>
            <p className="text-gymRed font-bold text-sm mt-1">🔥 Utrzymuje cel od {profile.current_streak} tyg.</p>
          </div>

          {/* HEAD-TO-HEAD RING */}
          <div className="bg-gymCardSecondary/50 border border-zinc-800/80 rounded-2xl p-4 mb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <h3 className="text-[10px] font-black text-textSecondary uppercase tracking-widest text-center mb-4 border-b border-zinc-800/50 pb-2">
              Pojedynek 1v1 (Ostatnie 30 dni)
            </h3>
            
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              {/* Nagłówki */}
              <div className="text-zinc-500 font-bold col-span-1 text-left">Kategoria</div>
              <div className="font-black text-zinc-400">{myNick} (Ty)</div>
              <div className="font-black text-amber-400">{profile.nick}</div>

              {/* Ilość Treningów */}
              <div className="text-zinc-400 font-medium col-span-1 text-left py-2 border-t border-zinc-800/30">Treningi</div>
              <div className={`font-bold py-2 border-t border-zinc-800/30 ${myWorkoutsWin ? 'text-gymSuccess' : 'text-zinc-500'}`}>{profile.my_workouts} {myWorkoutsWin && '🏆'}</div>
              <div className={`font-bold py-2 border-t border-zinc-800/30 ${frWorkoutsWin ? 'text-amber-400' : 'text-zinc-500'}`}>{profile.friend_workouts} {frWorkoutsWin && '🏆'}</div>

              {/* Tonaż */}
              <div className="text-zinc-400 font-medium col-span-1 text-left py-2 border-t border-zinc-800/30">Tonaż</div>
              <div className={`font-bold py-2 border-t border-zinc-800/30 ${myVolWin ? 'text-gymSuccess' : 'text-zinc-500'}`}>{myVolTons}t {myVolWin && '🏆'}</div>
              <div className={`font-bold py-2 border-t border-zinc-800/30 ${frVolWin ? 'text-amber-400' : 'text-zinc-500'}`}>{frVolTons}t {frVolWin && '🏆'}</div>
            </div>
          </div>

          {/* HISTORIA ZNAJOMEGO */}
          <div>
            <h3 className="text-sm font-bold text-white mb-3">Ostatnie bitwy (5 sesji) ⚔️</h3>
            {profile.recent_workouts.length === 0 ? (
              <div className="text-zinc-500 italic text-xs bg-zinc-900/40 p-4 rounded-xl text-center border border-zinc-800/40">Ten użytkownik jeszcze nic nie zalogował.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {profile.recent_workouts.map(w => (
                  <div key={w.id} className="bg-zinc-800/30 border border-zinc-800/60 p-3 rounded-xl flex justify-between items-center">
                    <span className="text-sm font-bold text-zinc-200 truncate pr-3">{w.name}</span>
                    <span className="text-[10px] text-zinc-500 font-mono shrink-0 bg-zinc-900 px-2 py-1 rounded">
                      {new Date(w.started_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <button 
            onClick={onClose} 
            className="w-full mt-6 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl text-sm transition-colors"
          >
            Zamknij podgląd
          </button>

        {/* 🔴 NOWOŚĆ: Przycisk usuwania znajomego */}
          <button 
            onClick={() => {
              if (window.confirm(`Czy na pewno chcesz wyrzucić użytkownika ${profile.nick} ze swojego Gangu?\nStracisz dostęp do jego statystyk.`)) {
                onRemoveFriend(profile.id);
              }
            }} 
            className="w-full py-3 bg-transparent hover:bg-red-500/10 text-zinc-500 hover:text-gymDanger font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Usuń ze znajomych 💔
          </button>
        </div>
      </div>
    </div>
  );
}