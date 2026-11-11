import React from 'react';
import { AlertTriangle, Briefcase, Moon, ShieldCheck, Sun } from 'lucide-react';
import { APP_NAME, APP_TAGLINE } from '../../config';

interface Props {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  authError: string | null;
  onLogin: () => void;
}

export default function Login({ theme, onToggleTheme, authError, onLogin }: Props) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative">
      <button
        onClick={onToggleTheme}
        className="absolute top-4 right-4 p-2.5 bg-white border border-slate-100 rounded-xl shadow-xs text-slate-400 hover:text-yellow-400 cursor-pointer transition-all flex items-center justify-center"
        title={theme === 'light' ? 'Activer le mode sombre' : 'Activer le mode clair'}
      >
        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} className="text-yellow-400" />}
      </button>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-600" />

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 mb-5">
            <Briefcase size={32} className="stroke-[2.5]" />
          </div>

          <h1 className="text-xl font-black text-slate-800 tracking-tight">{APP_NAME}</h1>
          <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mt-1">{APP_TAGLINE}</p>

          <p className="text-sm text-slate-500 mt-4 leading-relaxed">
            Connectez-vous pour créer l'espace de votre commerce ou rejoindre celui de votre équipe.
          </p>

          {authError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 text-left w-full mt-4 flex gap-3">
              <AlertTriangle size={18} className="text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-xs font-bold">Erreur de connexion</h3>
                <p className="text-xs text-rose-700 mt-1 leading-relaxed">{authError}</p>
              </div>
            </div>
          )}

          <button
            onClick={onLogin}
            className="mt-6 w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition-all cursor-pointer border border-slate-800"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continuer avec Google</span>
          </button>

          <p className="mt-6 text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-500" />
            Les données de chaque commerce sont isolées et réservées à son équipe.
          </p>
        </div>
      </div>
    </div>
  );
}
