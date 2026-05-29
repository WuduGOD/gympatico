import React, { useState } from 'react'
import { API_BASE_URL } from '../config/api'

export default function LoginView({ onLoginSuccess }) {
  // Stan przełączający między logowaniem (false) a rejestracją (true)
  const [isRegistering, setIsRegistering] = useState(false)
  
  // Stany formularza
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nick, setNick] = useState('')
  
  // Stany komunikatów zwrotnych
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    if (isRegistering) {
      // --- LOGIKA REJESTRACJI ---
      if (!nick) return setError('Nick jest wymagany!')
      
      // Walidacja siły hasła po stronie frontendu (minimum 8 znaków)
      if (password.length < 8) {
        return setError('Hasło musi składać się z co najmniej 8 znaków!')
      }

      fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, nick })
      })
        .then(async res => {
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Błąd rejestracji!')
          return data
        })
        .then(() => {
          setSuccessMessage('Konto założone pomyślnie! 🏋️‍♂️ Teraz możesz się zalogować.')
          setIsRegistering(false) // Powrót do formularza logowania
          setPassword('')
          setNick('')
        })
        .catch(err => setError(err.message))
    } else {
      // --- LOGIKA LOGOWANIA ---
      fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
        .then(async res => {
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Nieprawidłowy e-mail lub hasło!')
          return data
        })
        .then(data => {
          onLoginSuccess(data.token, data.user)
        })
        .catch(err => setError(err.message))
    }
  }

  return (
    // min-h-screen flex items-center = Perfekcyjne wycentrowanie karty w pionie i poziomie na każdym ekranie
    <div className="p-4 font-sans bg-gymDark min-h-screen flex items-center justify-center">
      
      {/* KARTA LOGOWANIA/REJESTRACJI */}
      <div className="max-w-md w-full bg-gymCard p-6 md:p-8 rounded-2xl shadow-2xl border border-zinc-800/60 transition-all duration-300">
        
        <h1 className="text-3xl font-black text-gymRed text-center mb-1 tracking-tight">
          🏋️‍♂️ GymPatico
        </h1>
        <h3 className="text-center text-zinc-400 text-sm md:text-base font-medium mb-6">
          {isRegistering ? 'Stwórz nowe konto sportowca' : 'Zaloguj się do panelu treningowego'}
        </h3>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* POLE: NICK (Renderowane warunkowo przy rejestracji) */}
          {isRegistering && (
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Twój Nick:</label>
              <input 
                type="text" 
                placeholder="np. Koksik99" 
                value={nick} 
                onChange={e => setNick(e.target.value)} 
                required 
                className="p-3 rounded-lg border border-zinc-800 bg-[#2d2d2d] text-white text-sm outline-none transition-all focus:border-gymRed"
              />
            </div>
          )}

          {/* POLE: EMAIL */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">E-mail:</label>
            <input 
              type="email" 
              placeholder="np. treser@gym.pl" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              className="p-3 rounded-lg border border-zinc-800 bg-[#2d2d2d] text-white text-sm outline-none transition-all focus:border-gymRed"
            />
          </div>

          {/* POLE: HASŁO */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Hasło:</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              className="p-3 rounded-lg border border-zinc-800 bg-[#2d2d2d] text-white text-sm outline-none transition-all focus:border-gymRed"
            />
            
            {/* Dynamiczny wskaźnik walidacji hasła */}
            {isRegistering && password.length > 0 && password.length < 8 && (
              <p className="text-gymRed text-xs font-semibold mt-1 flex items-center gap-1 animate-pulse">
                ⚠️ Za krótkie ({password.length}/8 znaków)
              </p>
            )}
          </div>

          {/* KOMUNIKATY BŁĘDU / SUKCESU */}
          {error && (
            <p className="bg-red-500/10 border border-red-500/20 text-gymRed font-bold text-center p-3 rounded-lg text-xs md:text-sm">
              {error}
            </p>
          )}
          {successMessage && (
            <p className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-center p-3 rounded-lg text-xs md:text-sm">
              {successMessage}
            </p>
          )}

          {/* PRZYCISK ZATWIERDZENIA FORUMULARZA */}
          <button 
            type="submit" 
            className="w-full py-3.5 bg-gymRed hover:bg-red-600 text-white font-bold rounded-lg text-sm md:text-base tracking-wide transition-all active:scale-[0.98] cursor-pointer shadow-md shadow-red-950/20 mt-2"
          >
            {isRegistering ? 'Zarejestruj się 🚀' : 'Zaloguj się 🦾'}
          </button>
        </form>

        {/* PRZEŁĄCZNIK TRYBU (LOGOWANIE / REJESTRACJA) */}
        <div className="text-center mt-6 pt-4 border-t border-zinc-800/60">
          <button 
            onClick={() => {
              setIsRegistering(!isRegistering)
              setError('')
              setSuccessMessage('')
              setPassword('')
            }} 
            className="text-gymRed hover:text-red-400 bg-transparent border-none cursor-pointer underline text-xs md:text-sm font-semibold transition-colors"
          >
            {isRegistering ? 'Masz już konto? Zaloguj się' : 'Nie masz konta? Zarejestruj się'}
          </button>
        </div>
      </div>
    </div>
  )
}