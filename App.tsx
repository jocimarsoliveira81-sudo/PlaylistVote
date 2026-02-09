
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
  username: 'admin', // Mantido para compatibilidade interna, mas login usa email
  email: 'admin@louvor.com',
  password: 'adminadmin',
  role: UserRole.ADMIN,
  isApproved: true,
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
      if (!parsedUsers.find((u: User) => u.email === INITIAL_ADMIN.email)) {
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

  const handleLogin = (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    const user = users.find(u => 
      u.email?.trim().toLowerCase() === cleanEmail && 
      u.password === cleanPassword
    );

    if (user) {
      if (user.isApproved === false) {
        setAuthError('Sua conta ainda não foi aprovada. O administrador jocimarsoliveira81@gmail.com precisa autorizar seu acesso.');
        return;
      }
      setCurrentUser(user);
      localStorage.setItem(STORAGE_AUTH, JSON.stringify(user));
      setAuthError('');
    } else {
      setAuthError('E-mail ou senha incorretos neste dispositivo.');
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
      if (decoded.email && decoded.password) {
        if (users.find(u => u.email === decoded.email)) {
          alert('Este e-mail já está cadastrado na equipe.');
        } else {
          const approvedUser: User = { ...decoded, isApproved: true };
          setUsers(prev => [...prev, approvedUser]);
          setApprovalCode('');
          alert(`Membro ${decoded.name} aprovado! Lembre-se de gerar o Código da Igreja para que ele consiga entrar.`);
        }
      }
    } catch (err) {
      alert('Código de aprovação inválido.');
    }
  };

  const handleResetPassword = (userId: string) => {
    const newPassword = prompt('Nova senha para este membro:');
    if (newPassword && newPassword.trim().length >= 4) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, password: newPassword.trim() } : u));
      alert('Senha alterada! Sincronize com a equipe.');
    }
  };

  /**
   * Fix for: Error in file App.tsx on line 249: Cannot find name 'handleDeleteUser'.
   * Removes a user from the list after confirmation.
   */
  const handleDeleteUser = (userId: string) => {
    if (userId === INITIAL_ADMIN.id) {
      alert('Não é possível excluir o administrador principal.');
      return;
    }
    if (window.confirm('Tem certeza que deseja remover este membro da equipe?')) {
      setUsers(prev => prev.filter(u => u.id !== userId));
    }
  };

  const handleSyncGlobal = () => {
    const data = { users, songs };
    const code = btoa(JSON.stringify(data));
    navigator.clipboard.writeText(code);
    alert('Código da Igreja copiado! Envie no grupo para sincronizar todos os acessos.');
  };

  const handleImportSync = (syncCode: string) => {
    try {
      const decoded = JSON.parse(atob(syncCode));
      if (decoded.users && decoded.songs) {
        setUsers(decoded.users);
        setSongs(decoded.songs);
        alert('Dispositivo sincronizado com a Igreja!');
        return true;
      }
      return false;
    } catch (e) {
      alert('Código de sincronização inválido.');
      return false;
    }
  };

  /**
   * Fix for: Error in file App.tsx on line 275: Cannot find name 'handleAddSong'.
   * Adds a new song to the repertoire based on the form input.
   */
  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newSong.url || !newSong.title || !newSong.artist) {
      alert('Por favor, preencha todos os campos para adicionar a música.');
      return;
    }

    const song: Song = {
      id: crypto.randomUUID(),
      title: newSong.title,
      artist: newSong.artist,
      youtubeUrl: newSong.url,
      addedAt: Date.now(),
      ratings: []
    };

    setSongs(prev => [...prev, song]);
    setNewSong({ title: '', artist: '', url: '' });
    setIsAdding(false);
  };

  /**
   * Triggers the Gemini AI analysis to generate a suggested setlist order
   * based on the current votes and church context.
   */
  const handleGenerateAiInsight = async () => {
    if (songs.length === 0) {
      alert('Adicione músicas à lista para que a IA possa analisar!');
      return;
    }
    setIsLoadingAi(true);
    setAiInsight('');
    try {
      const insight = await generateSetlistInsight(songs);
      setAiInsight(insight);
    } catch (error) {
      console.error(error);
      setAiInsight('Ocorreu um erro ao gerar a sugestão. Tente novamente mais tarde.');
    } finally {
      setIsLoadingAi(false);
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

  const displayedSongs = useMemo(() => {
    const items = [...songs];
    if (currentUser?.role === UserRole.ADMIN) {
      const avgMap = new Map(items.map(s => [s.id, calculateAverageRating(s.ratings)]));
      return items.sort((a, b) => {
        const ratingA = avgMap.get(a.id) || 0;
        const ratingB = avgMap.get(b.id) || 0;
        return ratingB - ratingA || b.addedAt - a.addedAt;
      });
    }
    return items.sort((a, b) => b.addedAt - a.addedAt);
  }, [songs, currentUser]);

  if (!currentUser) {
    return <Login onLogin={handleLogin} onSync={handleImportSync} error={authError} />;
  }

  const isAdmin = currentUser.role === UserRole.ADMIN;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('songs')}>
            <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg">
              <i className="fas fa-church"></i>
            </div>
            <h1 className="font-bold text-xl text-slate-900 tracking-tight hidden sm:block">Playlist Vote</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-xs font-bold text-slate-800">{currentUser.name}</p>
              <p className="text-[9px] text-indigo-500 uppercase font-black">{isAdmin ? 'Diretor' : 'Equipe'}</p>
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 p-2"><i className="fas fa-sign-out-alt"></i></button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-10">
        {isAdmin && (
          <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 w-fit mb-8">
            <button onClick={() => setActiveTab('songs')} className={`px-6 py-2 rounded-xl text-sm font-bold ${activeTab === 'songs' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Músicas</button>
            <button onClick={() => setActiveTab('users')} className={`px-6 py-2 rounded-xl text-sm font-bold ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Gestão</button>
          </div>
        )}

        {isAdmin && activeTab === 'users' ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-3xl border border-slate-200">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center"><i className="fas fa-user-check mr-2 text-indigo-600"></i> Aprovar Novos Pedidos</h3>
                <form onSubmit={handleApproveFromCode} className="space-y-4">
                  <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono" rows={3} placeholder="Cole o código de aprovação aqui..." value={approvalCode} onChange={e => setApprovalCode(e.target.value)} />
                  <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700">Aprovar Membro</button>
                </form>
              </div>
              <div className="bg-indigo-600 p-8 rounded-3xl text-white">
                <h3 className="font-bold mb-4 flex items-center"><i className="fas fa-sync-alt mr-2"></i> Sincronização Mestra</h3>
                <p className="text-indigo-100 text-xs mb-6">Gere o código para atualizar as permissões e músicas de toda a equipe.</p>
                <button onClick={handleSyncGlobal} className="w-full py-4 bg-white text-indigo-600 font-black rounded-xl hover:bg-indigo-50">Copiar Código da Igreja</button>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
              <div className="px-8 py-5 bg-slate-50/50 border-b border-slate-100"><h3 className="font-bold text-slate-800">Equipe de Louvor</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-widest">
                    <tr>
                      <th className="px-8 py-4">Membro</th>
                      <th className="px-8 py-4">E-mail</th>
                      <th className="px-8 py-4">WhatsApp</th>
                      <th className="px-8 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/50">
                        <td className="px-8 py-4">
                          <p className="font-bold text-slate-700">{u.name}</p>
                          <span className="text-[9px] uppercase font-black text-indigo-400">{u.role === UserRole.ADMIN ? 'Líder' : 'Membro'}</span>
                        </td>
                        <td className="px-8 py-4 text-sm text-slate-500">{u.email}</td>
                        <td className="px-8 py-4 text-sm text-slate-500">{u.whatsapp}</td>
                        <td className="px-8 py-4 text-right space-x-2">
                          {u.id !== INITIAL_ADMIN.id && (
                            <>
                              <button onClick={() => handleResetPassword(u.id)} className="text-slate-400 hover:text-indigo-600 p-2"><i className="fas fa-key"></i></button>
                              <button onClick={() => handleDeleteUser(u.id)} className="text-slate-300 hover:text-red-500 p-2"><i className="fas fa-trash-alt"></i></button>
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
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Votação Semanal</h2>
                <p className="text-slate-500 text-sm">Avalie as canções sugeridas para o próximo repertório.</p>
              </div>
              <div className="flex gap-2">
                {isAdmin && (
                  <button 
                    onClick={handleGenerateAiInsight} 
                    disabled={isLoadingAi || songs.length === 0}
                    className="bg-amber-100 text-amber-700 border border-amber-200 px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-amber-200 transition-colors disabled:opacity-50"
                  >
                    <i className={`fas ${isLoadingAi ? 'fa-spinner fa-spin' : 'fa-sparkles'}`}></i>
                    {isLoadingAi ? 'Analisando...' : 'IA: Sugerir Setlist'}
                  </button>
                )}
                {isAdmin && (
                  <button onClick={() => setIsAdding(!isAdding)} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg">
                    <i className={`fas ${isAdding ? 'fa-times' : 'fa-plus'} mr-2`}></i> {isAdding ? 'Fechar' : 'Nova Música'}
                  </button>
                )}
              </div>
            </div>

            {aiInsight && (
              <div className="bg-white p-8 rounded-[2rem] border-2 border-amber-100 shadow-xl shadow-amber-50/50 animate-in fade-in slide-in-from-top-4">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-amber-200">
                      <i className="fas fa-robot"></i>
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 tracking-tight leading-none">Sugestão de Setlist</h3>
                      <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest mt-1">Gerado pelo Assistente Gemini</p>
                    </div>
                  </div>
                  <button onClick={() => setAiInsight('')} className="text-slate-300 hover:text-slate-500 transition-colors"><i className="fas fa-times"></i></button>
                </div>
                <div className="prose prose-slate max-w-none text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                  {aiInsight}
                </div>
              </div>
            )}

            {isAdding && isAdmin && (
              <form onSubmit={handleAddSong} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-4 animate-in zoom-in-95">
                <input type="url" required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none" placeholder="URL YouTube" value={newSong.url} onChange={e => setNewSong({...newSong, url: e.target.value})} />
                <input type="text" required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none" placeholder="Título" value={newSong.title} onChange={e => setNewSong({...newSong, title: e.target.value})} />
                <div className="flex gap-2">
                  <input type="text" className="flex-grow px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none" placeholder="Artista" value={newSong.artist} onChange={e => setNewSong({...newSong, artist: e.target.value})} />
                  <button type="submit" className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold">Salvar</button>
                </div>
              </form>
            )}

            <div className="flex flex-col gap-4">
              {displayedSongs.map(song => (
                <SongCard key={song.id} song={song} onVote={handleVote} currentUserRating={song.ratings.find(r => r.userId === currentUser.id)?.score} isAdminView={isAdmin} onDelete={(id) => { if(window.confirm('Excluir?')) setSongs(prev => prev.filter(s => s.id !== id)); }} />
              ))}
              {displayedSongs.length === 0 && <div className="text-center py-20 opacity-30 italic">Nenhuma música para avaliação.</div>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
