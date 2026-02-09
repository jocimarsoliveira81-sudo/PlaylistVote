
import React, { useState } from 'react';
import { User, UserRole } from '../types';

interface LoginProps {
  onLogin: (email: string, password: string) => void;
  onSync: (code: string) => boolean;
  error?: string;
}

const Login: React.FC<LoginProps> = ({ onLogin, onSync, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [view, setView] = useState<'login' | 'register' | 'pending' | 'sync'>('login');
  
  // Registration
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regWhatsApp, setRegWhatsApp] = useState('');
  const [regPass, setRegPass] = useState('');
  const [requestCode, setRequestCode] = useState('');
  const [syncCode, setSyncCode] = useState('');

  const ADMIN_EMAIL = 'jocimarsoliveira81@gmail.com';

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      id: crypto.randomUUID(),
      name: regName,
      username: regEmail.split('@')[0], // username interno gerado
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

  const handleSendEmail = () => {
    const subject = encodeURIComponent('Aprovação de Acesso - Playlist Vote');
    const body = encodeURIComponent(`Olá Administrador,\n\nSolicito acesso ao app Playlist Vote.\n\nDados:\nNome: ${regName}\nWhatsApp: ${regWhatsApp}\n\nCÓDIGO DE APROVAÇÃO (COLE NO APP):\n${requestCode}`);
    window.location.href = `mailto:${ADMIN_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-200">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg mb-6">
            <i className="fas fa-church text-3xl"></i>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Playlist Vote</h2>
          <p className="mt-2 text-[10px] text-slate-400 font-black uppercase tracking-widest">Acesso da Equipe</p>
        </div>
        
        {view === 'login' && (
          <form className="mt-10 space-y-6" onSubmit={handleLoginSubmit}>
            <div className="space-y-4">
              <div className="relative">
                <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                <input type="email" required className="w-full pl-12 pr-6 py-4 border border-slate-200 bg-slate-50 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Seu E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="relative">
                <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                <input type="password" required className="w-full pl-12 pr-6 py-4 border border-slate-200 bg-slate-50 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Sua senha" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>
            {error && <div className="text-red-500 text-[11px] bg-red-50 p-4 rounded-2xl border border-red-100 font-bold leading-tight">{error}</div>}
            <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all">Entrar no Painel</button>
            <div className="pt-6 border-t border-slate-100 flex flex-col gap-3">
              <button type="button" onClick={() => setView('register')} className="text-indigo-600 text-xs font-black uppercase tracking-widest">Ainda não tenho cadastro</button>
              <button type="button" onClick={() => setView('sync')} className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Sincronizar Dados da Igreja</button>
            </div>
          </form>
        )}

        {view === 'register' && (
          <form className="mt-10 space-y-4" onSubmit={handleRegister}>
            <div className="text-center mb-6">
              <h4 className="text-slate-800 font-black text-sm uppercase">Solicitar Acesso</h4>
              <p className="text-xs text-slate-400 mt-1">Preencha os dados abaixo para ser aprovado.</p>
            </div>
            <input type="text" required className="w-full px-6 py-4 border border-slate-200 bg-slate-50 rounded-2xl outline-none" placeholder="Nome Completo" value={regName} onChange={e => setRegName(e.target.value)} />
            <input type="email" required className="w-full px-6 py-4 border border-slate-200 bg-slate-50 rounded-2xl outline-none" placeholder="Seu melhor E-mail" value={regEmail} onChange={e => setRegEmail(e.target.value)} />
            <input type="tel" required className="w-full px-6 py-4 border border-slate-200 bg-slate-50 rounded-2xl outline-none" placeholder="WhatsApp (com DDD)" value={regWhatsApp} onChange={e => setRegWhatsApp(e.target.value)} />
            <input type="password" required className="w-full px-6 py-4 border border-slate-200 bg-slate-50 rounded-2xl outline-none" placeholder="Crie uma Senha" value={regPass} onChange={e => setRegPass(e.target.value)} />
            <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl mt-4">Próximo Passo</button>
            <button type="button" onClick={() => setView('login')} className="w-full text-slate-400 text-[10px] font-black uppercase tracking-widest">Cancelar</button>
          </form>
        )}

        {view === 'pending' && (
          <div className="mt-10 space-y-6 text-center animate-in fade-in zoom-in-95">
            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
              <i className="fas fa-paper-plane text-emerald-500 text-3xl mb-4"></i>
              <h4 className="text-emerald-800 font-black text-sm uppercase mb-2">Quase lá!</h4>
              <p className="text-emerald-600 text-[11px] leading-relaxed">Você precisa enviar seu pedido para aprovação. Clique no botão abaixo para mandar o e-mail automático para o líder.</p>
            </div>
            <button onClick={handleSendEmail} className="w-full py-5 bg-emerald-600 text-white font-black rounded-2xl shadow-lg shadow-emerald-100 flex items-center justify-center gap-3">
              <i className="fas fa-envelope"></i> Enviar E-mail de Aprovação
            </button>
            <p className="text-[10px] text-slate-300 font-medium">Após o líder te aprovar e enviar o "Código da Igreja", use a opção de Sincronização na tela inicial para liberar seu acesso.</p>
            <button onClick={() => setView('login')} className="w-full text-slate-400 text-[10px] font-black uppercase tracking-widest">Voltar ao Login</button>
          </div>
        )}

        {view === 'sync' && (
          <div className="mt-10 space-y-6 animate-in slide-in-from-right-4">
            <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
              <h4 className="text-indigo-700 font-black text-sm mb-2">Sincronizar Igreja</h4>
              <p className="text-indigo-600/70 text-xs leading-relaxed">Cole aqui o código mestre que o líder enviou no grupo da igreja.</p>
            </div>
            <textarea required rows={4} className="w-full px-5 py-4 border border-slate-200 bg-slate-50 rounded-2xl outline-none text-[10px] font-mono" placeholder="Cole o código aqui..." value={syncCode} onChange={e => setSyncCode(e.target.value)} />
            <div className="flex gap-3">
              <button type="button" onClick={() => setView('login')} className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl">Voltar</button>
              <button onClick={() => { if(onSync(syncCode)) setView('login'); }} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg">Confirmar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
