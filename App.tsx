
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
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const isInitialized = useRef(false);
  
  const [activeTab, setActiveTab] = useState<'songs' | 'users'>('songs');
  const [isAdding, setIsAdding] = useState(false);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);

  const [newSong, setNewSong] = useState({ title: '', artist: '', url: '' });
  const [newMember, setNewMember] = useState({ email: '', whatsapp: '', password: '', name: '' });

  // Bootstrapping and Invite Link Handling
  useEffect(() => {
    const savedSongs = JSON.parse(localStorage.getItem(STORAGE_SONGS) || '[]');
    const savedUsers = JSON.parse(localStorage.getItem(STORAGE_USERS) || '[]');
    const savedAuth = JSON.parse(localStorage.getItem(STORAGE_AUTH) || 'null');

    // Handle Invite Link
    const params = new URLSearchParams(window.location.search);
    const inviteData = params.get('invite');

    if (inviteData) {
      try {
        const decoded = JSON.parse(atob(inviteData));
        if (decoded.user && decoded.songs) {
          const updatedUsers = [...savedUsers];
          if (!updatedUsers.find(u => u.email === decoded.user.email)) {
            updatedUsers.push({ ...decoded.user, isApproved: true });
          }
          
          setUsers(updatedUsers.length ? updatedUsers : [INITIAL_ADMIN]);
          setSongs(decoded.songs);
          
          localStorage.setItem(STORAGE_USERS, JSON.stringify(updatedUsers));
          localStorage.setItem(STORAGE_SONGS, JSON.stringify(decoded.songs));
          
          setInviteMessage({ type: 'success', text: 'Acesso aprovado com sucesso! Agora você pode fazer login com seu e-mail e senha.' });
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (e) {
        setInviteMessage({ type: 'error', text: 'Link de convite inválido ou expirado.' });
      }
    } else {
      setSongs(savedSongs);
      if (savedUsers.length === 0 || !savedUsers.find((u: User) => u.email === INITIAL_ADMIN.email)) {
        setUsers([INITIAL_ADMIN, ...savedUsers]);
      } else {
        setUsers(savedUsers);
      }
    }

    if (savedAuth) setCurrentUser(savedAuth);
    isInitialized.current = true;
  }, []);

  // Auto-fetch YouTube Metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      const videoId = getYoutubeId(newSong.url);
      if (videoId && !newSong.title) {
        setIsFetchingMetadata(true);
        const metadata = await fetchYoutubeMetadata(newSong.url);
        if (metadata) {
          setNewSong(prev => ({
            ...prev,
            title: metadata.title,
            artist: metadata.author
          }));
        }
        setIsFetchingMetadata(false);
      }
    };

    const timer = setTimeout(() => {
      fetchMetadata();
    }, 800);

    return () => clearTimeout(timer);
  }, [newSong.url]);

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
    const user = users.find(u => u.email?.trim().toLowerCase() === cleanEmail && u.password === password.trim());

    if (user) {
      if (user.isApproved === false) {
        setAuthError('Sua conta ainda não foi ativada. Peça ao administrador o link de acesso.');
        return;
      }
      setCurrentUser(user);
      localStorage.setItem(STORAGE_AUTH, JSON.stringify(user));
      setAuthError('');
    } else {
      setAuthError('E-mail ou senha incorretos.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_AUTH);
  };

  const handleRegisterMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.email || !newMember.password) return;

    if (users.find(u => u.email === newMember.email.toLowerCase())) {
      alert('Este e-mail já está cadastrado.');
      return;
    }

    const created: User = {
      id: crypto.randomUUID(),
      name: newMember.name || newMember.email.split('@')[0],
      username: newMember.email.split('@')[0],
      email: newMember.email.toLowerCase(),
      whatsapp: newMember.whatsapp,
      password: newMember.password,
      role: UserRole.USER,
      isApproved: true
    };

    setUsers(prev => [...prev, created]);
    setNewMember({ email: '', whatsapp: '', password: '', name: '' });
    alert('Membro cadastrado! Agora gere o link de acesso para enviar a ele.');
  };

  const generateInviteLink = (user: User) => {
    const data = { user, songs };
    const encoded = btoa(JSON.stringify(data));
    const link = `${window.location.origin}${window.location.pathname}?invite=${encoded}`;
    navigator.clipboard.writeText(link);
    alert('Link de acesso copiado!');
  };

  const handleDeleteUser = (id: string) => {
    if (id === INITIAL_ADMIN.id) return;
    if (window.confirm('Excluir membro?')) {
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSong.url) return;

    let finalTitle = newSong.title;
    let finalArtist = newSong.artist;

    // Se o título estiver vazio, tenta buscar uma última vez (caso o clique tenha sido rápido)
    if (!finalTitle) {
      setIsFetchingMetadata(true);
      const metadata = await fetchYoutubeMetadata(newSong.url);
      if (metadata) {
        finalTitle = metadata.title;
        finalArtist = metadata.author;
      }
      setIsFetchingMetadata(false);
    }

    if (!finalTitle) {
      alert('Não foi possível identificar o título do vídeo automaticamente. Por favor, preencha manualmente ou verifique o link.');
      return;
    }
    
    const created: Song = {
      id: crypto.randomUUID(),
      title: finalTitle,
      artist: finalArtist || 'Artista desconhecido',
      youtubeUrl: newSong.url,
      addedAt: Date.now(),
      ratings: []
    };
    setSongs(prev => [created, ...prev]);
    setNewSong({ title: '', artist: '', url: '' });
    setIsAdding(false);
  };

  const handleVote = (songId: string, score: number) => {
    if (!currentUser) return;
    setSongs(prev => prev.map(song => {
      if (song.id !== songId) return song;
      const filtered = song.ratings.filter(r => r.userId !== currentUser.id);
      return { ...song, ratings: [...filtered, { userId: currentUser.id, score }] };
    }));
  };

  const handleGenerateAiInsight = async () => {
    setIsLoadingAi(true);
    try {
      const insight = await generateSetlistInsight(songs);
      setAiInsight(insight);
    } catch (e) {
      setAiInsight('Erro ao gerar sugestão.');
    } finally {
      setIsLoadingAi(false);
    }
  };

  const displayedSongs = useMemo(() => {
    const items = [...songs];
    if (currentUser?.role === UserRole.ADMIN) {
      const avgMap = new Map(items.map(s => [s.id, calculateAverageRating(s.ratings)]));
      return items.sort((a, b) => (avgMap.get(b.id) || 0) - (avgMap.get(a.id) || 0) || b.addedAt - a.addedAt);
    }
    return items.sort((a, b) => b.addedAt - a.addedAt);
  }, [songs, currentUser]);

  if (!currentUser) {
    return (
      <>
        {inviteMessage && (
          <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md p-4 rounded-2xl shadow-2xl animate-in slide-in-from-top-10 ${inviteMessage.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
             <div className="flex items-center gap-3">
               <i className={`fas ${inviteMessage.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
               <p className="text-sm font-bold">{inviteMessage.text}</p>
               <button onClick={() => setInviteMessage(null)} className="ml-auto opacity-70"><i className="fas fa-times"></i></button>
             </div>
          </div>
        )}
        <Login onLogin={handleLogin} error={authError} />
      </>
    );
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
            <button onClick={() => setActiveTab('songs')} className={`px-6 py-2 rounded-xl text-sm font-bold ${activeTab === 'songs' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}>Músicas</button>
            <button onClick={() => setActiveTab('users')} className={`px-6 py-2 rounded-xl text-sm font-bold ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}>Membros</button>
          </div>
        )}

        {isAdmin && activeTab === 'users' ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* ... Admin users view remains the same ... */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-2xl">
              <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                <i className="fas fa-user-plus text-indigo-600"></i> Registrar Novo Membro
              </h3>
              <form onSubmit={handleRegisterMember} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Nome do Membro" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} />
                <input type="email" required placeholder="E-mail" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} />
                <input type="tel" placeholder="WhatsApp" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={newMember.whatsapp} onChange={e => setNewMember({...newMember, whatsapp: e.target.value})} />
                <input type="text" required placeholder="Definir Senha" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={newMember.password} onChange={e => setNewMember({...newMember, password: e.target.value})} />
                <button type="submit" className="md:col-span-2 w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">Registrar e Ativar</button>
              </form>
            </div>
            
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
               <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between">
                 <h3 className="font-bold text-slate-800">Equipe Ativa</h3>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total: {users.length}</p>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                      <tr>
                        <th className="px-8 py-4">Membro</th>
                        <th className="px-8 py-4">Login</th>
                        <th className="px-8 py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-8 py-5">
                            <p className="font-bold text-slate-700">{u.name}</p>
                            <p className="text-[11px] text-slate-400">{u.whatsapp || 'Sem WhatsApp'}</p>
                          </td>
                          <td className="px-8 py-5">
                             <p className="text-sm text-slate-500">{u.email}</p>
                             <p className="text-[10px] font-mono text-slate-300">Senha: {u.password}</p>
                          </td>
                          <td className="px-8 py-5 text-right space-x-2">
                            <button onClick={() => generateInviteLink(u)} className="px-4 py-2 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase rounded-lg hover:bg-indigo-100" title="Gerar Link de Acesso">
                              <i className="fas fa-link mr-1"></i> Link de Acesso
                            </button>
                            {u.id !== INITIAL_ADMIN.id && (
                              <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-slate-300 hover:text-red-500"><i className="fas fa-trash-alt"></i></button>
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
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
               <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Votação Semanal</h2>
                  <p className="text-slate-500 text-sm">Escute e avalie as músicas sugeridas para o repertório.</p>
               </div>
               <div className="flex gap-3">
                 {isAdmin && (
                   <button onClick={handleGenerateAiInsight} disabled={isLoadingAi} className="bg-amber-100 text-amber-700 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-amber-200 transition-all flex items-center gap-2">
                     <i className={`fas ${isLoadingAi ? 'fa-spinner fa-spin' : 'fa-sparkles'}`}></i> IA: Sugerir Ordem
                   </button>
                 )}
                 {isAdmin && (
                   <button onClick={() => setIsAdding(!isAdding)} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:bg-indigo-700">
                     <i className={`fas ${isAdding ? 'fa-times' : 'fa-plus'} mr-2`}></i> {isAdding ? 'Fechar' : 'Nova Música'}
                   </button>
                 )}
               </div>
            </div>

            {aiInsight && (
              <div className="bg-white p-8 rounded-[2rem] border-2 border-amber-100 shadow-xl shadow-amber-50/50 animate-in slide-in-from-top-4">
                <div className="flex items-center justify-between mb-4">
                   <h4 className="font-black text-slate-800 flex items-center gap-2"><i className="fas fa-robot text-amber-500"></i> Sugestão do Assistente</h4>
                   <button onClick={() => setAiInsight('')} className="text-slate-300 hover:text-slate-500"><i className="fas fa-times"></i></button>
                </div>
                <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{aiInsight}</div>
              </div>
            )}

            {isAdding && isAdmin && (
              <form onSubmit={handleAddSong} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-4 animate-in zoom-in-95">
                <div className="relative">
                  <input 
                    type="url" 
                    required 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                    placeholder="Cole o link do YouTube aqui" 
                    value={newSong.url} 
                    onChange={e => setNewSong({...newSong, url: e.target.value, title: '', artist: ''})} 
                  />
                  {isFetchingMetadata && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <i className="fas fa-spinner fa-spin text-indigo-500"></i>
                    </div>
                  )}
                </div>
                {/* Removido o 'required' do HTML para deixar o JavaScript cuidar do preenchimento automático sem travas de validação do browser */}
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder={isFetchingMetadata ? "Buscando título..." : "Título da Música"} 
                  value={newSong.title} 
                  onChange={e => setNewSong({...newSong, title: e.target.value})} 
                />
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="flex-grow px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                    placeholder={isFetchingMetadata ? "Buscando artista..." : "Artista / Ministério"} 
                    value={newSong.artist} 
                    onChange={e => setNewSong({...newSong, artist: e.target.value})} 
                  />
                  <button 
                    type="submit" 
                    disabled={isFetchingMetadata || !newSong.url}
                    className={`bg-slate-900 text-white px-6 py-3 rounded-xl font-bold transition-all ${isFetchingMetadata || !newSong.url ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-800'}`}
                  >
                    {isFetchingMetadata ? <i className="fas fa-spinner fa-spin mr-2"></i> : null}
                    Salvar
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 gap-4">
               {displayedSongs.map(song => (
                 <SongCard key={song.id} song={song} onVote={handleVote} currentUserRating={song.ratings.find(r => r.userId === currentUser.id)?.score} isAdminView={isAdmin} onDelete={(id) => { if(window.confirm('Excluir?')) setSongs(prev => prev.filter(s => s.id !== id)); }} />
               ))}
               {displayedSongs.length === 0 && <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400 italic">Nenhuma música cadastrada.</div>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
