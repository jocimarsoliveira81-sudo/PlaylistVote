
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Song, UserRole, Rating, User } from './types';
import { generateSetlistInsight } from './services/geminiService';
import { calculateAverageRating, fetchYoutubeMetadata, getYoutubeId } from './utils';
import SongCard from './components/SongCard';
import Login from './components/Login';

const STORAGE_SONGS = 'playlist_vote_songs_v1';
const STORAGE_USERS = 'playlist_vote_users_v1';
const STORAGE_AUTH = 'playlist_vote_auth_v1';

const INITIAL_ADMIN: User = {
  id: 'admin_primary',
  name: 'Diretor Musical',
  username: 'admin',
  password: 'adminadmin',
  role: UserRole.ADMIN,
  isApproved: true,
  email: 'admin@igreja.com',
  whatsapp: '00000000000'
};

const App: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState('');
  const isInitialized = useRef(false);
  
  const [activeTab, setActiveTab] = useState<'songs' | 'users' | 'sync'>('songs');
  const [isAdding, setIsAdding] = useState(false);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  const [newSong, setNewSong] = useState({ title: '', artist: '', url: '' });
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [approvalCode, setApprovalCode] = useState('');

  // Bootstrapping
  useEffect(() => {
    const savedSongs = localStorage.getItem(STORAGE_SONGS);
    const savedUsers = localStorage.getItem(STORAGE_USERS);
    const savedAuth = localStorage.getItem(STORAGE_AUTH);

    if (savedSongs) setSongs(JSON.parse(savedSongs));
    
    if (savedUsers) {
      const parsedUsers = JSON.parse(savedUsers);
      if (!parsedUsers.find((u: User) => u.username === 'admin')) {
        setUsers([INITIAL_ADMIN, ...parsedUsers]);
      } else {
        setUsers(parsedUsers);
      }
    } else {
      setUsers([INITIAL_ADMIN]);
    }

    if (savedAuth) setCurrentUser(JSON.parse(savedAuth));
    isInitialized.current = true;
  }, []);

  // Sync to LocalStorage
  useEffect(() => {
    if (!isInitialized.current) return;
    localStorage.setItem(STORAGE_SONGS, JSON.stringify(songs));
  }, [songs]);

  useEffect(() => {
    if (!isInitialized.current) return;
    localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
  }, [users]);

  // Busca de metadados YouTube
  useEffect(() => {
    const triggerMetadataFetch = async () => {
      if (newSong.url && getYoutubeId(newSong.url)) {
        setIsFetchingMetadata(true);
        const meta = await fetchYoutubeMetadata(newSong.url);
        if (meta) {
          setNewSong(prev => ({ ...prev, title: meta.title, artist: meta.author }));
        }
        setIsFetchingMetadata(false);
      }
    };
    const timeoutId = setTimeout(triggerMetadataFetch, 500);
    return () => clearTimeout(timeoutId);
  }, [newSong.url]);

  const handleLogin = (username: string, password: string) => {
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    const user = users.find(u => 
      u.username.trim().toLowerCase() === cleanUsername && 
      u.password === cleanPassword
    );

    if (user) {
      if (user.isApproved === false) {
        setAuthError('Sua conta ainda não foi aprovada pelo administrador. Envie seu código de solicitação para ele.');
        return;
      }
      setCurrentUser(user);
      localStorage.setItem(STORAGE_AUTH, JSON.stringify(user));
      setAuthError('');
    } else {
      setAuthError('Usuário ou senha incorretos neste dispositivo.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_AUTH);
  };

  const handleApproveFromCode = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const decoded = JSON.parse(atob(approvalCode));
      if (decoded.username && decoded.password) {
        if (users.find(u => u.username === decoded.username)) {
          alert('Este usuário já existe na equipe.');
        } else {
          const approvedUser: User = { ...decoded, isApproved: true };
          setUsers(prev => [...prev, approvedUser]);
          setApprovalCode('');
          alert(`Membro ${decoded.name} aprovado! Agora gere o Código da Igreja para sincronizar.`);
        }
      }
    } catch (err) {
      alert('Código de solicitação inválido.');
    }
  };

  const handleResetPassword = (userId: string) => {
    const newPassword = prompt('Digite a nova senha para este membro:');
    if (newPassword && newPassword.trim().length >= 4) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, password: newPassword.trim() } : u));
      alert('Senha alterada com sucesso!');
    } else if (newPassword) {
      alert('A senha deve ter pelo menos 4 caracteres.');
    }
  };

  const handleSyncGlobal = () => {
    const data = { users, songs };
    const code = btoa(JSON.stringify(data));
    navigator.clipboard.writeText(code);
    alert('Código da Igreja copiado! Envie no grupo para sincronizar os acessos de todos.');
  };

  const handleImportSync = (syncCode: string) => {
    try {
      const decoded = JSON.parse(atob(syncCode));
      if (decoded.users && decoded.songs) {
        setUsers(decoded.users);
        setSongs(decoded.songs);
        alert('Dados sincronizados com sucesso!');
        return true;
      }
      return false;
    } catch (e) {
      alert('Código inválido.');
      return false;
    }
  };

  const displayedSongs = useMemo(() => {
    const items = [...songs];
    if (currentUser?.role === UserRole.ADMIN) {
      const avgMap = new Map(items.map(s => [s.id, calculateAverageRating(s.ratings)]));
      return items.sort((a, b) => {
        const ratingA = avgMap.get(a.id) || 0;
        const ratingB = avgMap.get(b.id) || 0;
        if (ratingB !== ratingA) return ratingB - ratingA;
        return b.addedAt - a.addedAt;
      });
    }
    return items.sort((a, b) => b.addedAt - a.addedAt);
  }, [songs, currentUser]);

  const handleAddSong = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSong.title || !newSong.url) return;
    const created: Song = {
      id: crypto.randomUUID(),
      title: newSong.title,
      artist: newSong.artist || 'Artista não informado',
      youtubeUrl: newSong.url,
      addedAt: Date.now(),
      ratings: []
    };
    setSongs(prev => [created, ...prev]);
    setNewSong({ title: '', artist: '', url: '' });
    setIsAdding(false);
  };

  const handleDeleteUser = (id: string) => {
    if (id === INITIAL_ADMIN.id) return alert('O administrador principal não pode ser removido.');
    if (window.confirm('Excluir este membro permanentemente?')) {
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  const handleVote = (songId: string, score: number) => {
    if (!currentUser) return;
    setSongs(prev => prev.map(song => {
      if (song.id !== songId) return song;
      const filtered = song.ratings.filter(r => r.userId !== currentUser.id);
      return { ...song, ratings: [...filtered, { userId: currentUser.id, score }] };
    }));
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} onSync={handleImportSync} error={authError} />;
  }

  const isAdmin = currentUser.role === UserRole.ADMIN;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('songs')}>
            <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-200">
              <i className="fas fa-church text-lg"></i>
            </div>
            <div>
              <h1 className="font-bold text-xl text-slate-900 tracking-tight">Playlist Vote</h1>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Portal da Equipe</p>
            </div>
          </div>
          <div className="flex items-center space-x-5">
            <div className="text-right hidden sm:block border-r border-slate-200 pr-5">
              <p className="text-sm font-bold text-slate-800">{currentUser.name}</p>
              <p className="text-[10px] text-indigo-500 uppercase font-bold">{isAdmin ? 'Liderança' : 'Votante'}</p>
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-all p-2 rounded-xl hover:bg-red-50" title="Sair">
              <i className="fas fa-sign-out-alt text-xl"></i>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-10">
        {isAdmin && (
          <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 w-fit mb-10 overflow-x-auto">
            <button onClick={() => setActiveTab('songs')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center shrink-0 ${activeTab === 'songs' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
              <i className="fas fa-music mr-2.5"></i> Músicas
            </button>
            <button onClick={() => setActiveTab('users')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center shrink-0 ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
              <i className="fas fa-users-cog mr-2.5"></i> Gestão da Equipe
            </button>
          </div>
        )}

        {isAdmin && activeTab === 'users' ? (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
                  <i className="fas fa-user-plus mr-3 text-indigo-600"></i> Aprovar Membro
                </h3>
                <form onSubmit={handleApproveFromCode} className="space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed">Cole aqui o código de solicitação que o membro enviou.</p>
                  <textarea 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-mono"
                    rows={3} placeholder="Paste code here..."
                    value={approvalCode} onChange={e => setApprovalCode(e.target.value)}
                  />
                  <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                    Aprovar na Equipe
                  </button>
                </form>
              </div>

              <div className="bg-indigo-600 p-8 rounded-3xl shadow-xl text-white flex flex-col justify-center">
                <h3 className="text-xl font-bold mb-4 flex items-center">
                  <i className="fas fa-sync-alt mr-3"></i> Sincronização Mestra
                </h3>
                <p className="text-indigo-100 text-sm mb-6 leading-relaxed">Sempre que aprovar alguém ou mudar uma senha, gere este código e mande no grupo da igreja.</p>
                <button onClick={handleSyncGlobal} className="w-full py-4 bg-white text-indigo-600 font-black rounded-2xl shadow-2xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-3">
                  <i className="fab fa-whatsapp text-xl"></i> Gerar Código da Igreja
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-800">Membros da Equipe</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400">
                    <tr>
                      <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest">Membro / Contato</th>
                      <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest">Username</th>
                      <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest">Senha</th>
                      <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex flex-col">
                            <p className="font-bold text-slate-700">{u.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-slate-400 font-medium">{u.email}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-[10px] text-indigo-500 font-bold">{u.whatsapp}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-slate-500 font-medium">@{u.username}</td>
                        <td className="px-8 py-5 font-mono text-xs text-slate-400">{u.id === INITIAL_ADMIN.id ? '********' : u.password}</td>
                        <td className="px-8 py-5 text-right space-x-2">
                          {u.whatsapp && (
                            <a href={`https://wa.me/55${u.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-600 p-2" title="WhatsApp">
                              <i className="fab fa-whatsapp"></i>
                            </a>
                          )}
                          {u.id !== INITIAL_ADMIN.id && (
                            <>
                              <button onClick={() => handleResetPassword(u.id)} className="text-slate-400 hover:text-indigo-600 p-2" title="Mudar Senha">
                                <i className="fas fa-key"></i>
                              </button>
                              <button onClick={() => handleDeleteUser(u.id)} className="text-slate-300 hover:text-red-500 p-2" title="Excluir">
                                <i className="fas fa-trash-alt"></i>
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-10 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-slate-900 leading-none">Ranking de Músicas</h2>
                <p className="text-slate-500 font-medium">As canções preferidas da equipe de louvor.</p>
              </div>
              {isAdmin && (
                <div className="flex gap-3">
                  <button onClick={() => setIsAdding(!isAdding)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all flex items-center shadow-lg">
                    <i className={`fas ${isAdding ? 'fa-times' : 'fa-plus'} mr-2.5`}></i>
                    {isAdding ? 'Fechar' : 'Nova Música'}
                  </button>
                </div>
              )}
            </div>

            {isAdding && isAdmin && (
              <form onSubmit={handleAddSong} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl grid grid-cols-1 md:grid-cols-12 gap-6 animate-in zoom-in-95">
                <div className="md:col-span-5 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">YouTube Link</label>
                  <input type="url" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none" value={newSong.url} onChange={e => setNewSong({...newSong, url: e.target.value})} placeholder="https://..." />
                </div>
                <div className="md:col-span-3 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Título</label>
                  <input type="text" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none" value={newSong.title} onChange={e => setNewSong({...newSong, title: e.target.value})} />
                </div>
                <div className="md:col-span-4 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Artista</label>
                  <div className="flex gap-3">
                    <input type="text" className="flex-grow px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none" value={newSong.artist} onChange={e => setNewSong({...newSong, artist: e.target.value})} placeholder="Cantor..." />
                    <button type="submit" className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-black transition-all">Salvar</button>
                  </div>
                </div>
              </form>
            )}

            <div className="flex flex-col gap-6">
              {displayedSongs.map(song => (
                <SongCard key={song.id} song={song} onVote={handleVote} currentUserRating={song.ratings.find(r => r.userId === currentUser.id)?.score} isAdminView={isAdmin} onDelete={(id) => { if(window.confirm('Excluir música?')) setSongs(prev => prev.filter(s => s.id !== id)); }} />
              ))}
              {displayedSongs.length === 0 && <div className="text-center py-20 opacity-40 italic">Ainda não há músicas para votação.</div>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
