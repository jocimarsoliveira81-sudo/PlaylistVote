
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
  role: UserRole.ADMIN
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
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: UserRole.USER });

  // Bootstrapping with hydration check
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

  // Efeito para buscar metadados automaticamente
  useEffect(() => {
    const triggerMetadataFetch = async () => {
      if (newSong.url && getYoutubeId(newSong.url)) {
        setIsFetchingMetadata(true);
        const meta = await fetchYoutubeMetadata(newSong.url);
        if (meta) {
          setNewSong(prev => ({
            ...prev,
            title: meta.title,
            artist: meta.author
          }));
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
      setCurrentUser(user);
      localStorage.setItem(STORAGE_AUTH, JSON.stringify(user));
      setAuthError('');
    } else {
      setAuthError('Usuário ou senha incorretos neste dispositivo. Peça ao líder o "Código de Sincronização" para atualizar seu acesso.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_AUTH);
  };

  const handleSyncData = (syncCode: string) => {
    try {
      const decoded = atob(syncCode);
      const data = JSON.parse(decoded);
      
      if (data.users && data.songs) {
        setUsers(data.users);
        setSongs(data.songs);
        alert('Dados sincronizados com sucesso! Você já pode tentar o login.');
        return true;
      }
      return false;
    } catch (e) {
      alert('Código de sincronização inválido. Verifique se copiou o texto completo.');
      return false;
    }
  };

  const generateSyncCode = () => {
    const data = { users, songs };
    const code = btoa(JSON.stringify(data));
    navigator.clipboard.writeText(code);
    alert('Código copiado! Envie para sua equipe pelo WhatsApp.');
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

  const handleRegisterUser = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = newUser.username.trim().toLowerCase();
    
    if (users.find(u => u.username.toLowerCase() === cleanUsername)) {
      alert('Este nome de usuário já está em uso pela equipe.');
      return;
    }

    const created: User = { 
      ...newUser, 
      id: crypto.randomUUID(),
      username: cleanUsername,
      password: newUser.password?.trim()
    };

    setUsers(prev => [...prev, created]);
    setNewUser({ name: '', username: '', password: '', role: UserRole.USER });
    alert('Membro cadastrado! Lembre-se de sincronizar os dispositivos para que ele possa logar no celular dele.');
  };

  const handleDeleteUser = (id: string) => {
    if (id === INITIAL_ADMIN.id) return alert('O administrador principal é protegido pelo sistema.');
    if (window.confirm('Deseja remover este membro da equipe?')) {
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

  const getAiSetlist = async () => {
    setIsLoadingAi(true);
    try {
      const insight = await generateSetlistInsight(songs);
      setAiInsight(insight);
    } finally {
      setIsLoadingAi(false);
    }
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} onSync={handleSyncData} error={authError} />;
  }

  const isAdmin = currentUser.role === UserRole.ADMIN;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('songs')}>
            <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-200">
              <i className="fas fa-play text-lg"></i>
            </div>
            <div>
              <h1 className="font-bold text-xl text-slate-900 tracking-tight">Playlist Vote</h1>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Team Portal</p>
            </div>
          </div>

          <div className="flex items-center space-x-5">
            <div className="text-right hidden sm:block border-r border-slate-200 pr-5">
              <p className="text-sm font-bold text-slate-800">{currentUser.name}</p>
              <p className="text-[10px] text-indigo-500 uppercase font-bold">{isAdmin ? 'Liderança' : 'Equipe'}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-500 transition-all p-2 rounded-xl hover:bg-red-50"
              title="Encerrar Sessão"
            >
              <i className="fas fa-sign-out-alt text-xl"></i>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-10">
        {isAdmin && (
          <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 w-fit mb-10 overflow-x-auto">
            <button 
              onClick={() => setActiveTab('songs')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center shrink-0 ${activeTab === 'songs' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <i className="fas fa-music mr-2.5"></i> Músicas
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center shrink-0 ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <i className="fas fa-users-cog mr-2.5"></i> Equipe
            </button>
            <button 
              onClick={() => setActiveTab('sync')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center shrink-0 ${activeTab === 'sync' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <i className="fas fa-sync-alt mr-2.5"></i> Sincronizar
            </button>
          </div>
        )}

        {isAdmin && activeTab === 'sync' ? (
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-200 text-center">
              <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8">
                <i className="fas fa-cloud-upload-alt text-3xl"></i>
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-4">Exportar Dados da Igreja</h3>
              <p className="text-slate-500 mb-10 leading-relaxed">
                Como este app não usa um servidor de internet para salvar seus dados (por privacidade), você precisa enviar este código para seus membros. Assim, o celular deles ficará igual ao seu.
              </p>
              
              <div className="space-y-6">
                <button 
                  onClick={generateSyncCode}
                  className="w-full py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center space-x-3"
                >
                  <i className="fab fa-whatsapp text-xl"></i>
                  <span>Gerar e Copiar Código</span>
                </button>
                
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Como funciona?</p>
                  <ol className="text-left text-xs text-slate-500 space-y-2 list-decimal ml-4">
                    <li>Clique no botão acima para copiar o código.</li>
                    <li>Envie para o WhatsApp do membro da equipe.</li>
                    <li>Peça para ele clicar em <b>"Sincronizar"</b> na tela de login e colar o texto.</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        ) : isAdmin && activeTab === 'users' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="lg:col-span-4">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
                  <i className="fas fa-plus-circle mr-3 text-indigo-600"></i> Novo Membro
                </h3>
                <form onSubmit={handleRegisterUser} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nome</label>
                    <input 
                      type="text" required placeholder="Ex: João Silva"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
                      value={newUser.name}
                      onChange={e => setNewUser({...newUser, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Usuário (Login)</label>
                    <input 
                      type="text" required placeholder="Ex: joao123"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
                      value={newUser.username}
                      onChange={e => setNewUser({...newUser, username: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Senha</label>
                    <input 
                      type="password" required placeholder="Crie uma senha"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
                      value={newUser.password}
                      onChange={e => setNewUser({...newUser, password: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Permissão</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                      value={newUser.role}
                      onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                    >
                      <option value={UserRole.USER}>Membro (Vota apenas)</option>
                      <option value={UserRole.ADMIN}>Admin (Gerencia tudo)</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all">
                    Registrar na Equipe
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-8">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-slate-800">Membros Ativos</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-400">
                      <tr>
                        <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest">Membro</th>
                        <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest">Username</th>
                        <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-center">Senha</th>
                        <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-5">
                            <p className="font-bold text-slate-700">{u.name}</p>
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${u.role === UserRole.ADMIN ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                              {u.role === UserRole.ADMIN ? 'Admin' : 'Equipe'}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-slate-500 font-medium">@{u.username}</td>
                          <td className="px-8 py-5 text-center font-mono text-xs text-slate-400">
                            {u.id === INITIAL_ADMIN.id ? '********' : u.password}
                          </td>
                          <td className="px-8 py-5 text-right">
                            {u.id !== INITIAL_ADMIN.id && (
                              <button 
                                onClick={() => handleDeleteUser(u.id)}
                                className="text-slate-300 hover:text-red-500 transition-all p-2"
                              >
                                <i className="fas fa-trash-alt"></i>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-10 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-slate-900 leading-none">
                  {isAdmin ? 'Ranking de Avaliações' : 'Músicas da Semana'}
                </h2>
                <p className="text-slate-500 font-medium">
                  {isAdmin ? 'Ordenado automaticamente pelo feedback da equipe.' : 'Sua opinião é fundamental para o próximo setlist.'}
                </p>
              </div>
              
              {isAdmin && (
                <div className="flex gap-3">
                  <button
                    onClick={getAiSetlist}
                    disabled={isLoadingAi || songs.length === 0}
                    className="bg-white text-slate-700 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm hover:border-indigo-500 hover:text-indigo-600 transition-all flex items-center shadow-sm"
                  >
                    <i className={`fas fa-wand-sparkles mr-2.5 ${isLoadingAi ? 'animate-pulse' : ''}`}></i>
                    {isLoadingAi ? 'IA Analisando...' : 'IA Setlist'}
                  </button>
                  <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all flex items-center shadow-lg shadow-indigo-100"
                  >
                    <i className={`fas ${isAdding ? 'fa-times' : 'fa-plus'} mr-2.5`}></i>
                    {isAdding ? 'Cancelar' : 'Nova Música'}
                  </button>
                </div>
              )}
            </div>

            {aiInsight && isAdmin && (
              <div className="bg-indigo-600 rounded-3xl p-8 relative shadow-2xl shadow-indigo-200 overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-10">
                  <i className="fas fa-robot text-9xl text-white"></i>
                </div>
                <button 
                  onClick={() => setAiInsight('')} 
                  className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
                >
                  <i className="fas fa-times"></i>
                </button>
                <div className="relative flex items-start space-x-5">
                  <div className="bg-white/20 p-3 rounded-2xl text-white shrink-0">
                    <i className="fas fa-magic text-xl"></i>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-white font-black uppercase tracking-widest text-xs">Sugestão da Inteligência Artificial</h4>
                    <div className="text-indigo-50 leading-relaxed whitespace-pre-line text-lg font-medium italic">
                      {aiInsight}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isAdding && isAdmin && (
              <form onSubmit={handleAddSong} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl grid grid-cols-1 md:grid-cols-12 gap-6 animate-in zoom-in-95 duration-300">
                <div className="md:col-span-5 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL do YouTube</label>
                  <div className="relative">
                    <input 
                      type="url" required placeholder="Cole o link do vídeo aqui..."
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none pr-12"
                      value={newSong.url} 
                      onChange={e => setNewSong({...newSong, url: e.target.value})} 
                    />
                    {isFetchingMetadata && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <i className="fas fa-circle-notch animate-spin text-indigo-500"></i>
                      </div>
                    )}
                  </div>
                </div>
                <div className="md:col-span-3 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título</label>
                  <input 
                    type="text" required placeholder="Carregando..."
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newSong.title} 
                    onChange={e => setNewSong({...newSong, title: e.target.value})} 
                  />
                </div>
                <div className="md:col-span-4 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Artista</label>
                  <div className="flex gap-3">
                    <input 
                      type="text" placeholder="Ministério / Cantor"
                      className="flex-grow px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={newSong.artist} 
                      onChange={e => setNewSong({...newSong, artist: e.target.value})} 
                    />
                    <button 
                      type="submit" 
                      disabled={isFetchingMetadata || !newSong.title}
                      className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              </form>
            )}

            {displayedSongs.length === 0 ? (
              <div className="text-center py-32 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                <div className="bg-slate-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-compact-disc text-3xl text-slate-300"></i>
                </div>
                <h3 className="text-xl font-bold text-slate-800">Nenhuma música para votação</h3>
                <p className="text-slate-400 mt-2">Peça ao administrador para adicionar novas sugestões.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {displayedSongs.map(song => (
                  <SongCard
                    key={song.id}
                    song={song}
                    onVote={handleVote}
                    currentUserRating={song.ratings.find(r => r.userId === currentUser.id)?.score}
                    isAdminView={isAdmin}
                    onDelete={(id) => {
                      if(window.confirm('Excluir esta música permanentemente?')) {
                        setSongs(prev => prev.filter(s => s.id !== id));
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-100 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3 opacity-50">
            <div className="bg-slate-200 p-2 rounded-lg">
              <i className="fas fa-play text-xs"></i>
            </div>
            <span className="font-bold text-sm tracking-tight">Playlist Vote</span>
          </div>
          <p className="text-slate-400 text-sm font-medium">
            &copy; {new Date().getFullYear()} Curadoria de Louvor Inteligente.
          </p>
          <div className="flex space-x-4">
            <a href="#" className="text-slate-300 hover:text-indigo-500 transition-colors"><i className="fab fa-github"></i></a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
