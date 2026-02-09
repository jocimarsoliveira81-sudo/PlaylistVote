
import React, { useState } from 'react';
import { User } from '../types';

interface LoginProps {
  onLogin: (username: string, password: string) => void;
  onSync: (code: string) => boolean;
  error?: string;
}

const Login: React.FC<LoginProps> = ({ onLogin, onSync, error }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showSync, setShowSync] = useState(false);
  const [syncCode, setSyncCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(username, password);
  };

  const handleSyncSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSync(syncCode)) {
      setSyncCode('');
      setShowSync(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-12">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-200">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg mb-6">
            <i className="fas fa-church text-3xl"></i>
          </div>
          <h2 className="text-3xl font-black text-slate-900 leading-tight">Playlist Vote</h2>
          <p className="mt-2 text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Curadoria Musical</p>
        </div>
        
        {!showSync ? (
          <>
            <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Usuário</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300">
                      <i className="fas fa-user"></i>
                    </div>
                    <input
                      type="text"
                      required
                      autoCapitalize="none"
                      className="appearance-none relative block w-full px-12 py-4 border border-slate-200 placeholder-slate-300 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-slate-50 font-medium"
                      placeholder="Nome de usuário"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Senha</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300">
                      <i className="fas fa-lock"></i>
                    </div>
                    <input
                      type="password"
                      required
                      className="appearance-none relative block w-full px-12 py-4 border border-slate-200 placeholder-slate-300 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-slate-50 font-medium"
                      placeholder="Sua senha secreta"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="text-red-500 text-xs bg-red-50 p-4 rounded-2xl border border-red-100 flex items-start animate-in fade-in zoom-in-95 duration-200">
                  <i className="fas fa-exclamation-circle mt-0.5 mr-3 shrink-0"></i>
                  <span className="leading-tight font-medium">{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all"
              >
                Acessar Painel
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-slate-100 text-center">
              <button 
                onClick={() => setShowSync(true)}
                className="text-indigo-600 text-xs font-black uppercase tracking-widest hover:text-indigo-800 transition-colors"
              >
                <i className="fas fa-sync-alt mr-2"></i>
                Sincronizar com o Líder
              </button>
            </div>
          </>
        ) : (
          <div className="mt-10 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-indigo-50 p-6 rounded-3xl mb-8 border border-indigo-100">
              <h4 className="text-indigo-700 font-black text-sm mb-2 flex items-center">
                <i className="fas fa-info-circle mr-2"></i> Sincronização
              </h4>
              <p className="text-indigo-600/70 text-xs leading-relaxed font-medium">
                Cole abaixo o código que o seu líder gerou no painel de administração dele. Isso atualizará seus acessos neste celular.
              </p>
            </div>

            <form onSubmit={handleSyncSubmit} className="space-y-6">
              <textarea
                required
                rows={4}
                className="w-full px-5 py-4 border border-slate-200 bg-slate-50 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-mono break-all"
                placeholder="Cole o código gigante aqui..."
                value={syncCode}
                onChange={(e) => setSyncCode(e.target.value)}
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSync(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        )}
        
        <div className="mt-10 text-center">
          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
            © {new Date().getFullYear()} Equipe de Louvor
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
