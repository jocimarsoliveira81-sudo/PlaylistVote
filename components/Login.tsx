
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
  const [regEmail, setRegEmail] = useState('');
  const [regWhatsApp, setRegWhatsApp] = useState('');
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
      email: regEmail.trim().toLowerCase(),
      whatsapp: regWhatsApp.replace(/\D/g, ''),
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
          <p className="mt-2 text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Ministério de Louvor</p>
        </div>
        
        {view === 'login' && (
          <form className="mt-10 space-y-6" onSubmit={handleLoginSubmit}>
            <div className="space-y-4">
              <div className="relative">
                <i className="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm"></i>
                <input type="text" required className="w-full pl-12 pr-6 py-4 border border-slate-200 bg-slate-50 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Usuário" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div className="relative">
                <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm"></i>
                <input type="password" required className="w-full pl-12 pr-6 py-4 border border-slate-200 bg-slate-50 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Sua senha" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>
            {error && <div className="text-red-500 text-xs bg-red-50 p-4 rounded-2xl border border-red-100 font-medium animate-pulse">{error}</div>}
            <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all">Entrar</button>
            <div className="pt-6 border-t border-slate-100 flex flex-col gap-3">
              <button type="button" onClick={() => setView('register')} className="text-indigo-600 text-xs font-black uppercase tracking-widest">Solicitar Acesso à Equipe</button>
              <button type="button" onClick={() => setView('sync')} className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Código Sincronização da Igreja</button>
            </div>
          </form>
        )}

        {view === 'register' && (
          <form className="mt-10 space-y-5" onSubmit={handleRegister}>
            <div className="text-center mb-6">
              <h4 className="text-slate-800 font-black text-sm uppercase tracking-widest">Novo Cadastro</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">Preencha seus dados para que o líder te aprove.</p>
            </div>
            <div className="space-y-4">
              <input type="text" required className="w-full px-6 py-4 border border-slate-200 bg-slate-50 rounded-2xl outline-none" placeholder="Seu Nome Completo" value={regName} onChange={e => setRegName(e.target.value)} />
              <input type="text" required className="w-full px-6 py-4 border border-slate-200 bg-slate-50 rounded-2xl outline-none" placeholder="Username (para login)" value={regUser} onChange={e => setRegUser(e.target.value)} />
              
              <div className="relative">
                <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                <input type="email" required className="w-full pl-12 pr-6 py-4 border border-slate-200 bg-slate-50 rounded-2xl outline-none" placeholder="Seu E-mail" value={regEmail} onChange={e => setRegEmail(e.target.value)} />
              </div>
              
              <div className="relative">
                <i className="fab fa-whatsapp absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                <input type="tel" required className="w-full pl-12 pr-6 py-4 border border-slate-200 bg-slate-50 rounded-2xl outline-none" placeholder="WhatsApp (com DDD)" value={regWhatsApp} onChange={e => setRegWhatsApp(e.target.value)} />
              </div>

              <input type="password" required className="w-full px-6 py-4 border border-slate-200 bg-slate-50 rounded-2xl outline-none" placeholder="Crie uma Senha" value={regPass} onChange={e => setRegPass(e.target.value)} />
            </div>
            <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl">Gerar Solicitação</button>
            <button type="button" onClick={() => setView('login')} className="w-full text-slate-400 text-[10px] font-black uppercase tracking-widest">Cancelar</button>
          </form>
        )}

        {view === 'pending' && (
          <div className="mt-10 space-y-6 text-center animate-in fade-in zoom-in-95">
            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
              <i className="fab fa-whatsapp text-emerald-500 text-3xl mb-4"></i>
              <h4 className="text-emerald-800 font-black text-sm uppercase mb-2">Solicitação Criada!</h4>
              <p className="text-emerald-600 text-[11px] leading-relaxed">Copie o código abaixo e mande para o seu líder no WhatsApp. Assim que ele aprovar e mandar o código da igreja, você poderá logar.</p>
            </div>
            <textarea readOnly className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-mono" rows={5} value={requestCode} onClick={e => (e.target as any).select()} />
            <button onClick={() => { navigator.clipboard.writeText(requestCode); alert('Código de solicitação copiado!'); }} className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-100">Copiar Código</button>
            <button onClick={() => setView('login')} className="w-full text-slate-400 text-[10px] font-black uppercase tracking-widest">Voltar ao Início</button>
          </div>
        )}

        {view === 'sync' && (
          <div className="mt-10 space-y-6 animate-in slide-in-from-right-4">
            <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
              <h4 className="text-indigo-700 font-black text-sm mb-2">Sincronizar Igreja</h4>
              <p className="text-indigo-600/70 text-xs leading-relaxed">Cole o código mestre que o líder enviou para atualizar os membros e as músicas.</p>
            </div>
            <textarea required rows={4} className="w-full px-5 py-4 border border-slate-200 bg-slate-50 rounded-2xl outline-none text-[10px] font-mono" placeholder="Cole o código mestre aqui..." value={syncCode} onChange={e => setSyncCode(e.target.value)} />
            <div className="flex gap-3">
              <button type="button" onClick={() => setView('login')} className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl">Sair</button>
              <button onClick={() => { if(onSync(syncCode)) setView('login'); }} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg">Confirmar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
