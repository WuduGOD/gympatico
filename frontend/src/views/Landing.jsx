// frontend/src/views/Landing.jsx
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 animate-in fade-in duration-500">
      
      {/* Tło / Element wizualny */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 max-w-lg h-3/4 bg-gymRed/5 rounded-full blur-[100px] -z-10 pointer-events-none" />

      <div className="text-center max-w-3xl mx-auto space-y-8">
        
        {/* Odznaka / Tagline */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-gymRed animate-pulse" />
          PWA • Progressive Web App
        </div>

        {/* Główne 3 zdania (Value Proposition) */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight">
            Twój trening.<br />
            <span className="text-gymRed">Bez wymówek.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Zaawansowany dziennik treningowy stworzony dla tych, którzy traktują ciężary poważnie. Śledź progres, automatyzuj wyniki i rywalizuj ze znajomymi w Gangu.
          </p>
        </div>

        {/* Przyciski Call to Action */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button 
            onClick={() => navigate('/register')}
            className="w-full sm:w-auto px-8 py-4 bg-gymRed hover:bg-red-600 text-white font-black rounded-xl text-lg transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)] hover:-translate-y-1"
          >
            Dołącz do Gangu
          </button>
          
          <button 
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto px-8 py-4 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl text-lg border border-zinc-800 transition-all"
          >
            Zaloguj się
          </button>
        </div>

        {/* Subtelny Social Proof / Funkcje */}
        <div className="pt-12 flex flex-wrap justify-center gap-6 text-sm font-semibold text-zinc-500">
          <div className="flex items-center gap-2">🔥 System Streaków</div>
          <div className="flex items-center gap-2">📊 Analityka 1RM</div>
          <div className="flex items-center gap-2">📱 Pełne wsparcie PWA</div>
        </div>

      </div>
    </div>
  );
}