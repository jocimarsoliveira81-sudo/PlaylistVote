
import React, { useState } from 'react';
import { User } from '../types';

interface LoginProps {
  onLogin: (username: string, password: string) => void;
  error?: string;
}

const Login: React.FC<LoginProps> = ({ onLogin, error }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(username, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-12">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-slate-200">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg mb-4">
            <i className="fas fa-church text-3xl"></i>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900">Playlist Vote</h2>
          <p className="mt-2 text-sm text-slate-600 font-medium uppercase tracking-widest">Acesso Restrito</p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Usuário</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <i className="fas fa-user"></i>
                </div>
                <input
                  type="text"
                  required
                  autoCapitalize="none"
                  className="appearance-none relative block w-full px-10 py-3 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all bg-slate-50"
                  placeholder="Seu nome de usuário"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <i className="fas fa-lock"></i>
                </div>
                <input
                  type="password"
                  required
                  className="appearance-none relative block w-full px-10 py-3 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all bg-slate-50"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100 flex items-start">
              <i className="fas fa-exclamation-circle mt-1 mr-2 shrink-0"></i>
              <span className="leading-tight">{error}</span>
            </div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-lg shadow-indigo-100 active:scale-95"
            >
              Entrar
            </button>
          </div>
        </form>
        
        <div className="mt-8 pt-6 border-t border-slate-100 text-center space-y-4">
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
             <p className="text-[10px] text-amber-700 font-bold uppercase mb-1">Nota Importante:</p>
             <p className="text-xs text-amber-600 leading-relaxed">
               Este app utiliza armazenamento local. Você só consegue logar em dispositivos onde o administrador realizou o cadastro.
             </p>
          </div>
          <p className="text-xs text-slate-400 font-medium">Se você é novo, peça ao seu líder para te cadastrar neste aparelho.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
