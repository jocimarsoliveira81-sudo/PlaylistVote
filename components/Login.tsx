
import React, { useState } from 'react';

interface LoginProps {
  onLogin: (email: string, password: string) => void;
  error?: string;
}

const Login: React.FC<LoginProps> = ({ onLogin, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    alert('Por questões de segurança, entre em contato com o Diretor Musical do seu ministério para solicitar a redefinição da sua senha.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-200">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100 mb-8 transform -rotate-3 hover:rotate-0 transition-transform">
            <i className="fas fa-church text-4xl"></i>
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Playlist Vote</h2>
          <p className="mt-3 text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] ml-1">Portal do Ministério</p>
        </div>
        
        <form className="mt-12 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="relative group">
              <i className="fas fa-envelope absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors"></i>
              <input 
                type="email" 
                required 
                className="w-full pl-14 pr-6 py-4.5 border border-slate-200 bg-slate-50/50 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400" 
                placeholder="Seu e-mail cadastrado" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
              />
            </div>
            <div className="relative group">
              <i className="fas fa-lock absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors"></i>
              <input 
                type="password" 
                required 
                className="w-full pl-14 pr-6 py-4.5 border border-slate-200 bg-slate-50/50 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400" 
                placeholder="Sua senha" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>
          </div>

          <div className="flex justify-end">
            <a 
              href="#" 
              onClick={handleForgotPassword}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Esqueceu a senha?
            </a>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-[11px] font-bold leading-tight animate-in fade-in zoom-in-95">
              <i className="fas fa-exclamation-triangle mr-2"></i> {error}
            </div>
          )}

          <button 
            type="submit" 
            className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 transition-all uppercase tracking-widest text-xs mt-2"
          >
            Entrar no Painel
          </button>
        </form>

        <div className="pt-10 text-center border-t border-slate-100">
           <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
             Acesso restrito à equipe de louvor.<br/>
             <span className="text-slate-300 font-bold uppercase tracking-tighter mt-2 inline-block">v1.1 • Password Secure</span>
           </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
