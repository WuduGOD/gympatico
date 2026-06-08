// frontend/src/views/Social.jsx
import React from 'react'
import FriendProfileModal from '../components/FriendProfileModal'

const ALLOWED_EMOJIS = ['🔥', '💪', '👑', '👏'];

const getTimeAgo = (dateStr) => {
  // 🔴 ZABEZPIECZENIE: Jeśli nie ma daty, zwróć pusty string lub komunikat
  if (!dateStr) return ''; 

  const date = new Date(dateStr);
  // Sprawdzenie czy data jest poprawna
  if (isNaN(date.getTime())) return '';

  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  
  if (mins < 0) return 'przed chwilą'; // Zapobieganie błędom przy różnicach stref czasowych
  if (mins < 1) return 'przed chwilą';
  if (mins < 60) return `${mins} min temu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} godz. temu`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'wczoraj';
  return `${days} dni temu`;
}

export default function Social({
  friendNickInput, setFriendNickInput, onSendFriendRequest,
  pendingRequests, handleAcceptFriend, handleRejectFriend,
  friends, user, activityFeed, onToggleReaction, 
  fetchFriendProfile, selectedFriendProfile, setSelectedFriendProfile, isProfileLoading,
  weeklyChallenge, onRemoveFriend
}) {
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSendFriendRequest();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left pb-16">
      
      {/* LEWA STRONA: WYSZUKIWARKA + OCZEKUJĄCE */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        <section className="bg-gymCard p-4 md:p-5 rounded-xl shadow-lg border border-zinc-800/40">
          <h2 className="text-lg md:text-xl font-bold tracking-tight mb-2 text-white">Szukaj znajomych 🔍</h2>
          <p className="text-zinc-400 text-xs mb-4">Wpisz dokładny nick dewelopera, aby zaprosić go do gangu.</p>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input 
              type="text" placeholder="np. MarekWorkout" value={friendNickInput} onChange={e => setFriendNickInput(e.target.value)} 
              className="flex-1 p-3 rounded-lg border border-zinc-800 bg-[#2d2d2d] text-white text-sm outline-none transition-all focus:border-gymRed"
            />
            <button type="submit" className="bg-gymRed hover:bg-red-600 text-white font-bold px-4 py-2 rounded-lg text-sm transition-all active:scale-95 cursor-pointer">
              Zaproś
            </button>
          </form>
        </section>

        <section className="bg-gymCard p-4 md:p-5 rounded-xl shadow-lg border border-zinc-800/40">
          <h2 className="text-lg md:text-xl font-bold tracking-tight mb-4 text-white">Oczekujące zaproszenia ✉️</h2>
          {pendingRequests.length === 0 ? (
            <p className="text-zinc-500 italic text-sm text-center py-4">Brak nowych zaproszeń.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {pendingRequests.map(req => (
                <div key={req.friendship_id} className="flex flex-col gap-3 bg-[#2d2d2d] p-3 rounded-lg border border-zinc-800 shadow-sm">
                  <span className="text-sm text-zinc-400">Zaproszenie od: <strong className="text-white">{req.nick}</strong></span>
                  <div className="flex gap-2 w-full">
                    <button onClick={() => handleAcceptFriend(req.friendship_id)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded text-xs transition-all active:scale-95 cursor-pointer">Akceptuj ✓</button>
                    <button onClick={() => handleRejectFriend(req.friendship_id)} className="flex-1 border border-zinc-700 hover:border-gymDanger text-zinc-400 hover:text-gymDanger font-bold px-3 py-2 rounded text-xs transition-all active:scale-95 cursor-pointer">Odrzuć ✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* PRAWA STRONA: RANKING + WYZWANIA + FEED Z REAKCJAMI */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        
        {/* RANKING STREAKÓW */}
        <section className="bg-gymCard p-4 md:p-6 rounded-xl shadow-lg border border-zinc-800/40">
          <div className="border-b border-zinc-800 pb-4 mb-4">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-gymRed">
              Ranking Streaków Gangu GymPatico 🔥
            </h2>
            <p className="text-zinc-400 text-xs md:text-sm mt-1">Utrzymuj cel tygodniowy, aby piąć się w górę tabeli!</p>
          </div>
          {friends.length === 0 ? (
            <p className="text-zinc-500 italic text-center py-8">Brak znajomych w rankingu. Zaproś kogoś!</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {friends.map((f, idx) => {
                const isFirst = idx === 0, isSecond = idx === 1, isThird = idx === 2, isMe = f.id === user?.id;
                return (
                  <div key={f.id} className={`flex justify-between items-center p-3.5 rounded-lg shadow-sm transition-all duration-200 ${isMe ? 'bg-gymRed/10 border-2 border-gymRed/40' : isFirst ? 'bg-amber-500/5 border border-amber-500/20' : 'bg-[#2d2d2d] border border-zinc-800/50'}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`text-lg font-black w-8 text-center shrink-0 ${isMe ? 'text-gymRed' : isFirst ? 'text-amber-400' : isSecond ? 'text-zinc-300' : isThird ? 'text-amber-600' : 'text-zinc-500'}`}>#{idx + 1}</span>
                      <div className="flex items-center gap-2 min-w-0 truncate">
                        {/* 🔴 KLIKALNY NICK (PROFIL ZNAJOMEGO) */}
                        <strong 
                          onClick={() => !isMe && fetchFriendProfile(f.id)} 
                          className={`text-sm md:text-base truncate ${!isMe ? 'cursor-pointer hover:underline' : ''} ${isMe ? 'text-gymRed font-black' : isFirst ? 'text-amber-200 font-bold' : 'text-zinc-100'}`}
                        >
                          {f.nick} {isMe ? '(Ty)' : ''}
                        </strong>
                        {f.isPremium && <span className="inline-flex items-center bg-amber-500/10 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider uppercase shrink-0">⭐ PREMIUM</span>}
                        {isFirst && !isMe && <span className="text-base shrink-0">👑</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className={`font-black text-sm md:text-lg tracking-tight ${isMe ? 'text-gymRed' : isFirst ? 'text-amber-400' : 'text-zinc-300'}`}>🔥 {f.current_streak} tyg.</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* WYZWANIE TYGODNIA: KRÓL TONAŻU */}
        <section className="bg-gradient-to-br from-[#1a1f27] to-[#15181f] p-4 md:p-6 rounded-xl shadow-2xl border border-zinc-800/60 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="border-b border-zinc-800/80 pb-4 mb-5 relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm border border-amber-500/30">
                Wyzwanie Tygodnia ⚔️
              </span>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Reset w poniedziałek</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
              Król Tonażu (Total Volume)
            </h2>
            <p className="text-zinc-400 text-xs md:text-sm mt-1">Kto przerzucił najwięcej kilogramów w tym tygodniu?</p>
          </div>

          {!weeklyChallenge || weeklyChallenge.length === 0 ? (
            <p className="text-zinc-500 italic text-center py-6 text-sm">Brak danych w tym tygodniu.</p>
          ) : (
            <div className="flex flex-col gap-3 relative z-10">
              {weeklyChallenge.map((member, idx) => {
                const isFirst = idx === 0 && member.total_volume > 0;
                const isMe = member.id === user?.id;
                const volumeInTons = (member.total_volume / 1000).toFixed(1); 
                const maxVolume = weeklyChallenge[0]?.total_volume || 1;
                const progressWidth = `${Math.min((member.total_volume / maxVolume) * 100, 100)}%`;

                return (
                  <div key={member.id} className="relative">
                    <div className="flex justify-between items-center mb-1 text-sm font-bold">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 text-center ${isFirst ? 'text-amber-400' : 'text-zinc-500'}`}>
                          {idx + 1}.
                        </span>
                        {/* 🔴 KLIKALNY NICK */}
                        <span 
                          onClick={() => !isMe && fetchFriendProfile(member.id)}
                          className={`${isMe ? 'text-gymRed' : 'text-zinc-200 cursor-pointer hover:underline'}`}
                        >
                          {member.nick} {isMe && '(Ty)'}
                        </span>
                        {isFirst && <span className="text-xs">👑</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-500 font-medium">{member.workouts_count} tren.</span>
                        <span className={`font-black font-mono ${isFirst ? 'text-amber-400' : 'text-white'}`}>
                          {volumeInTons}t
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${isFirst ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]' : isMe ? 'bg-gymRed' : 'bg-zinc-600'}`} 
                        style={{ width: member.total_volume === 0 ? '0%' : progressWidth }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* FEED Z REAKCJAMI */}
        <section className="bg-gymCard p-4 md:p-6 rounded-xl shadow-lg border border-zinc-800/40">
          <div className="border-b border-zinc-800 pb-4 mb-4">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">Aktywność Gangu ⚡</h2>
            <p className="text-zinc-400 text-xs md:text-sm mt-1">Zostaw "okejkę", aby zmotywować innych.</p>
          </div>

          {!activityFeed || activityFeed.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-zinc-800 rounded-lg">
              <span className="text-4xl mb-3 block opacity-20">📭</span>
              <p className="text-zinc-500 italic text-sm">Nikt z Twoich znajomych nie trenował w ostatnim czasie.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {activityFeed.map(act => (
                <div key={act.workout_id} className="bg-[#2d2d2d]/30 hover:bg-[#2d2d2d]/60 p-4 rounded-lg border border-zinc-800/50 transition-colors flex flex-col gap-3">
                  
                  {/* Wiersz z autorem i czasem */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-gymRed/10 text-gymRed flex items-center justify-center font-black text-base shrink-0 border border-gymRed/20 shadow-inner">
                        {act.nick.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          {/* 🔴 KLIKALNY NICK */}
                          <span 
                            onClick={() => act.user_id !== user?.id && fetchFriendProfile(act.user_id)}
                            className={`font-bold text-zinc-100 text-sm truncate ${act.user_id !== user?.id ? 'cursor-pointer hover:underline' : ''}`}
                          >
                            {act.nick}
                          </span>
                          {act.is_premium && <span className="text-[8px] text-amber-400 border border-amber-500/30 bg-amber-500/10 px-1 py-0.5 rounded uppercase font-bold tracking-wider">Premium</span>}
                        </div>
                        <div className="text-xs text-zinc-400 mt-0.5 truncate">
                          Ukończył/a: <strong className="text-zinc-200">{act.workout_name}</strong>
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono font-bold shrink-0 bg-zinc-800/40 px-2 py-1 rounded">
                      {getTimeAgo(act.started_at)}
                    </div>
                  </div>

                  {/* Wiersz z przyciskami reakcji */}
                  <div className="flex items-center gap-2 pt-3 border-t border-zinc-800/40">
                    {ALLOWED_EMOJIS.map(emoji => {
                      const reactionData = act.reactions?.find(r => r.emoji === emoji);
                      const count = reactionData ? reactionData.count : 0;
                      const hasReacted = reactionData ? reactionData.user_reacted : false;

                      return (
                        <button
                          key={emoji}
                          onClick={() => onToggleReaction(act.workout_id, emoji)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border cursor-pointer select-none active:scale-90 ${
                            hasReacted
                              ? 'bg-gymRed/15 border-gymRed/40 text-gymRed shadow-[0_0_10px_rgba(239,68,68,0.1)]'
                              : 'bg-zinc-800/40 border-zinc-700/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                          }`}
                        >
                          <span className="text-sm">{emoji}</span>
                          {count > 0 && <span>{count}</span>}
                        </button>
                      );
                    })}
                  </div>

                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* MODAL Z PROFILEM ZNAJOMEGO */}
      <FriendProfileModal 
        profile={selectedFriendProfile} 
        myNick={user?.nick || 'Ja'}
        onClose={() => setSelectedFriendProfile(null)} 
        onRemoveFriend={onRemoveFriend}
      />

    </div>
  )
}