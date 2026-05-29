import React from 'react'

export default function Social({
  friendNickInput, 
  setFriendNickInput,
  handleSendFriendRequest, 
  pendingRequests, 
  handleAcceptFriend, 
  handleRejectFriend,
  friends,
  user // <--- NOWOŚĆ: odebranie zalogowanego użytkownika z App.jsx
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
      
      {/* LEWA STRONA: WYSZUKIWARKA + OCZEKUJĄCE */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        
        {/* SEKCJA 1: WYSZUKAJ ZNAJOMYCH */}
        <section className="bg-gymCard p-4 md:p-5 rounded-xl shadow-lg border border-zinc-800/40">
          <h2 className="text-lg md:text-xl font-bold tracking-tight mb-2">Szukaj znajomych 🔍</h2>
          <p className="text-zinc-400 text-xs mb-4">Wpisz dokładny nick dewelopera, aby zaprosić go do gangen.</p>
          
          <form onSubmit={handleSendFriendRequest} className="flex gap-2">
            <input 
              type="text" 
              placeholder="np. MarekWorkout" 
              value={friendNickInput} 
              onChange={e => setFriendNickInput(e.target.value)} 
              className="flex-1 p-3 rounded-lg border border-zinc-800 bg-[#2d2d2d] text-white text-sm outline-none transition-all focus:border-gymRed"
            />
            <button 
              type="submit" 
              className="bg-gymRed hover:bg-red-600 text-white font-bold px-4 py-2 rounded-lg text-sm transition-all active:scale-95 cursor-pointer"
            >
              Zaproś
            </button>
          </form>
        </section>

        {/* SEKCJA 2: OCZEKUJĄCE ZAPROSZENIA */}
        <section className="bg-gymCard p-4 md:p-5 rounded-xl shadow-lg border border-zinc-800/40">
          <h2 className="text-lg md:text-xl font-bold tracking-tight mb-4">Oczekujące zaproszenia ✉️</h2>
          
          {pendingRequests.length === 0 ? (
            <p className="text-zinc-500 italic text-sm text-center py-4">Brak nowych zaproszeń.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {pendingRequests.map(req => (
                <div key={req.friendship_id} className="flex justify-between items-center bg-[#2d2d2d] p-3 rounded-lg border border-zinc-800 shadow-sm">
                  <span className="text-sm">Od: <strong className="text-zinc-200">{req.nick}</strong></span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleAcceptFriend(req.friendship_id)} 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded text-xs transition-all active:scale-95 cursor-pointer"
                    >
                      Akceptuj
                    </button>
                    <button 
                      onClick={() => handleRejectFriend(req.friendship_id)} 
                      className="border border-gymRed text-gymRed hover:bg-gymRed/10 font-bold px-3 py-1.5 rounded text-xs transition-all active:scale-95 cursor-pointer"
                    >
                      Odrzuć
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* PRAWA STRONA: RANKING STREAKÓW */}
      <section className="lg:col-span-2 bg-gymCard p-4 md:p-6 rounded-xl shadow-lg border border-zinc-800/40">
        <div className="border-b border-zinc-800 pb-4 mb-4">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-gymRed">
            Ranking Streaków Gangu GymPatico 🔥
          </h2>
          <p className="text-zinc-400 text-xs md:text-sm mt-1">Utrzymuj cel tygodniowy, aby piąć się w górę tabeli!</p>
        </div>

        {friends.length === 0 ? (
          <p className="text-zinc-500 italic text-center py-12">Brak znajomych w rankingu. Zaproś kogoś!</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {friends.map((f, idx) => {
              const isFirst = idx === 0;
              const isSecond = idx === 1;
              const isThird = idx === 2;
              const isMe = f.id === user?.id; // <--- NOWOŚĆ: Sprawdzenie czy ten wiersz to Ty

              return (
                <div 
                  key={f.id} 
                  className={`flex justify-between items-center p-3.5 rounded-lg shadow-sm transition-all duration-200 ${
                    isMe
                      ? 'bg-gymRed/10 border-2 border-gymRed/40 shadow-[0_0_15px_rgba(255,71,87,0.05)]' // Styl dla Ciebie
                      : isFirst 
                        ? 'bg-amber-500/10 border border-amber-500/30' 
                        : 'bg-[#2d2d2d] border border-zinc-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-black w-8 text-center ${
                      isMe ? 'text-gymRed' : isFirst ? 'text-amber-400' : isSecond ? 'text-zinc-300' : isThird ? 'text-amber-600' : 'text-zinc-500'
                    }`}>
                      #{idx + 1}
                    </span>
                    <strong className={`text-sm md:text-base ${isMe ? 'text-gymRed font-black' : isFirst ? 'text-amber-200 font-bold' : 'text-zinc-100'}`}>
                      {f.nick} {isMe ? '(Ty) ⚡' : isFirst ? '👑' : ''}
                    </strong>
                  </div>
                  
                  <div className="text-right">
                    <span className={`font-black text-sm md:text-lg tracking-tight ${
                      isMe ? 'text-gymRed' : isFirst ? 'text-amber-400' : 'text-gymRed'
                    }`}>
                      🔥 {f.current_streak} {f.current_streak === 1 ? 'tyg.' : 'tyg.'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  )
}