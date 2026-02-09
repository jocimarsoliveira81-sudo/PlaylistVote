
import React, { useState } from 'react';
import { User, UserRole } from '../types';

interface LoginProps {
  onLogin: (username: string, password: string) => void;
  onSync: (code: string) => boolean;
  error?: string;
}

const Login: React.FC<LoginProps> = ({ onLogin, onSync, error }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [view, setView] = useState<'login' | 'register' | 'pending' | 'sync'>('login');
  
  // Registration state
  const [regName, setRegName] = useState('');
  const [regUser, setRegUser] = useState('');
  const [regPass, setRegPass] = useState('');
  const [requestCode, setRequestCode] = useState('');
  const [syncCode, setSyncCode] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(username, password);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      id: crypto.randomUUID(),
      name: regName,
      username: regUser.trim().toLowerCase(),
      password: regPass,
      role: UserRole.USER,
      isApproved: false
    };
    const code = btoa(JSON.stringify(newUser));
    setRequestCode(code);
    setView('pending');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-12">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-200">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg mb-6">
            <i className="fas fa-church text-3xl"></i>
          </div>
          <h2 className="text-3xl font-black text-slate-900 leading-tight">Playlist Vote</h2>
          <p className="mt-2 text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Louvor & Curadoria</p>
        </div>
        
        {view === 'login' && (
          <form className="mt-10 space-y-6" onSubmit={handleLoginSubmit}>
            <div className="space-y-4">
              <input type="text" required className="w-full px-6 py-4 border border-slate-200 bg-slate-50 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Usuário" value={username} onChange={(e) => setUsername(e.target.value)} />
              <input type="password" required className="w-full px-6 py-4 border border-slate-200 bg-slate-50 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Sua senha" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <div className="text-red-500 text-xs bg-red-50 p-4 rounded-2xl border border-red-100 font-medium">{error}</div>}
            <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">Acessar Painel</button>
            <div className="pt-6 border-t border-slate-100 flex flex-col gap-3">
              <button type="button" onClick={() => setView('register')} className="text-indigo-600 text-xs font-black uppercase tracking-widest">Não tenho conta / Cadastrar</button>
              <button type="button" onClick={() => setView('sync')} className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Recebi o Código da Igreja</button>
            </div>
          </form>
        )}

        {view === 'register' && (
          <form className="mt-10 space-y-6" onSubmit={handleRegister}>
            <h4 className="text-slate-800 font-bold text-center">Solicitar Acesso à Equipe</h4>
            <div className="space-y-4">
              <input type="text" required className="w-full px-6 py-4 border border-slate-200 bg-slate-50 rounded-2xl outline-none" placeholder="Seu Nome Completo" value={regName} onChange={e => setRegName(e.target.value)} />
              <input type="text" required className="w-full px-6 py-4 border border-slate-200 bg-slate-50 rounded-2xl outline-none" placeholder="Nome de Usuário (login)" value={regUser} onChange={e => setRegUser(e.target.value)} />
              <input type="password" required className="w-full px-6 py-4 border border-slate-200 bg-slate-50 rounded-2xl outline-none" placeholder="Crie uma Senha" value={regPass} onChange={e => setRegPass(e.target.value)} />
            </div>
            <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl">Gerar Solicitação</button>
            <button type="button" onClick={() => setView('login')} className="w-full text-slate-400 text-xs font-bold">Voltar</button>
          </form>
        )}

        {view === 'pending' && (
          <div className="mt-10 space-y-6 text-center animate-in fade-in zoom-in-95">
            <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
              <i className="fas fa-clock text-amber-500 text-3xl mb-4"></i>
              <h4 className="text-amber-800 font-black text-sm uppercase mb-2">Solicitação Criada</h4>
              <p className="text-amber-600 text-xs leading-relaxed">Envie o código abaixo para o seu líder no WhatsApp. Ele precisa te aprovar para você conseguir logar.</p>
            </div>
            <textarea readOnly className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-mono" rows={5} value={requestCode} onClick={e => (e.target as any).select()} />
            <button onClick={() => { navigator.clipboard.writeText(requestCode); alert('Código copiado!'); }} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl">Copiar Código</button>
            <button onClick={() => setView('login')} className="w-full text-slate-400 text-xs font-bold">Voltar ao Login</button>
          </div>
        )}

        {view === 'sync' && (
          <div className="mt-10 space-y-6 animate-in slide-in-from-right-4">
            <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
              <h4 className="text-indigo-700 font-black text-sm mb-2">Sincronizar com a Igreja</h4>
              <p className="text-indigo-600/70 text-xs leading-relaxed">Cole aqui o código mestre enviado pelo seu líder para atualizar os acessos e a lista de músicas.</p>
            </div>
            <textarea required rows={4} className="w-full px-5 py-4 border border-slate-200 bg-slate-50 rounded-2xl outline-none text-[10px] font-mono" placeholder="Cole o código aqui..." value={syncCode} onChange={e => setSyncCode(e.target.value)} />
            <div className="flex gap-3">
              <button type="button" onClick={() => setView('login')} className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl">Voltar</button>
              <button onClick={() => { if(onSync(syncCode)) setView('login'); }} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg">Atualizar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
