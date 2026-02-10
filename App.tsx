
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Song, UserRole, Rating, User } from './types';
import { generateSetlistInsight } from './services/geminiService';
import { calculateAverageRating, fetchYoutubeMetadata, getYoutubeId } from './utils';
import SongCard from './components/SongCard';
import Login from './components/Login';

const STORAGE_SONGS = 'playlist_vote_songs_v1';
const STORAGE_USERS = 'playlist_vote_users_v1';
const STORAGE_AUTH = 'playlist_vote_auth_v1';

// Funções auxiliares para codificação segura de caracteres especiais (Unicode) no Base64
const encodeBase64 = (str: string) => {
  try {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch (e) {
    return "";
  }
};

const decodeBase64 = (base64: string) => {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (e) {
    return "";
  }
};

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
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const isInitialized = useRef(false);
  
  const [activeTab, setActiveTab] = useState<'songs' | 'users'>('songs');
  const [isAdding, setIsAdding] = useState(false);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);

  const [newSong, setNewSong] = useState({ title: '', artist: '', url: '', isPublic: true });
  const [newMember, setNewMember] = useState({ email: '', whatsapp: '', password: '', name: '', role: UserRole.USER });

  // Bootstrapping e Captura de Sync via URL
  useEffect(() => {
    const savedSongs = JSON.parse(localStorage.getItem(STORAGE_SONGS) || '[]');
    const savedUsers = JSON.parse(localStorage.getItem(STORAGE_USERS) || '[]');
    const savedAuth = JSON.parse(localStorage.getItem(STORAGE_AUTH) || 'null');

    const params = new URLSearchParams(window.location.search);
    const inviteData = params.get('invite');
    const playlistData = params.get('playlist');

    let processedUsers = savedUsers.length === 0 || !savedUsers.find((u: User) => u.email === INITIAL_ADMIN.email) 
      ? [INITIAL_ADMIN, ...savedUsers] 
      : savedUsers;

    // 1. Lógica de Convite (Usuário + Músicas)
    if (inviteData) {
      try {
        const jsonStr = decodeBase64(inviteData);
        const decoded = JSON.parse(jsonStr);
        if (decoded.user) {
          const userExists = processedUsers.find((u: any) => u.email === decoded.user.email);
          if (!userExists) {
            processedUsers = [...processedUsers, { ...decoded.user, isApproved: true }];
            localStorage.setItem(STORAGE_USERS, JSON.stringify(processedUsers));
          }
          if (decoded.songs && decoded.songs.length > 0) {
            setSongs(decoded.songs);
            localStorage.setItem(STORAGE_SONGS, JSON.stringify(decoded.songs));
          }
          setSyncMessage({ type: 'success', text: `Bem-vindo, ${decoded.user.name}! Acesso configurado.` });
        }
      } catch (e) {
        setSyncMessage({ type: 'error', text: 'Link de acesso inválido ou corrompido.' });
      }
    } 
    // 2. Lógica de Sincronização de Playlist
    else if (playlistData) {
      try {
        const jsonStr = decodeBase64(playlistData);
        const decodedSongs: Song[] = JSON.parse(jsonStr);
        const mergedSongs = decodedSongs.map(newS => {
          const existing = savedSongs.find((s: Song) => s.id === newS.id);
          return existing ? { ...newS, ratings: [...new Set([...newS.ratings, ...existing.ratings])] } : newS;
        });
        setSongs(mergedSongs);
        localStorage.setItem(STORAGE_SONGS, JSON.stringify(mergedSongs));
        setSyncMessage({ type: 'success', text: 'Playlist atualizada com sucesso!' });
      } catch (e) {
        setSyncMessage({ type: 'error', text: 'Não foi possível ler a playlist.' });
      }
    } else {
      setSongs(savedSongs);
    }

    setUsers(processedUsers);
    if (savedAuth) setCurrentUser(savedAuth);
    isInitialized.current = true;

    if (inviteData || playlistData) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Sync to LocalStorage
  useEffect(() => {
    if (isInitialized.current) localStorage.setItem(STORAGE_SONGS, JSON.stringify(songs));
  }, [songs]);

  useEffect(() => {
    if (isInitialized.current) {
      localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
      if (currentUser) {
        const updatedSelf = users.find(u => u.id === currentUser.id);
        if (updatedSelf) localStorage.setItem(STORAGE_AUTH, JSON.stringify(updatedSelf));
      }
    }
  }, [users]);

  // Auto-fetch YouTube Metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      const videoId = getYoutubeId(newSong.url);
      if (videoId && !newSong.title) {
        setIsFetchingMetadata(true);
        const metadata = await fetchYoutubeMetadata(newSong.url);
        if (metadata) {
          setNewSong(prev => ({ ...prev, title: metadata.title, artist: metadata.author }));
        }
        setIsFetchingMetadata(false);
      }
    };
    const timer = setTimeout(fetchMetadata, 800);
    return () => clearTimeout(timer);
  }, [newSong.url]);

  const handleLogin = (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const user = users.find(u => u.email?.trim().toLowerCase() === cleanEmail && u.password === password.trim());
    if (user) {
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

  const handleResetPassword = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const newPass = prompt(`Digite a nova senha para ${user.name}:`);
    if (newPass && newPass.trim().length > 0) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, password: newPass.trim() } : u));
      alert('Senha alterada com sucesso!');
    }
  };

  const handleSelfChangePassword = () => {
    if (!currentUser) return;
    const newPass = prompt('Digite sua nova senha:');
    if (newPass && newPass.trim().length > 0) {
      setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, password: newPass.trim() } : u));
      alert('Senha alterada com sucesso.');
    }
  };

  const handleRegisterMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.email || !newMember.password) return;
    if (users.find(u => u.email === newMember.email.toLowerCase())) {
      alert('E-mail já cadastrado.');
      return;
    }
    const created: User = {
      id: crypto.randomUUID(),
      name: newMember.name || newMember.email.split('@')[0],
      username: newMember.email.split('@')[0],
      email: newMember.email.toLowerCase(),
      whatsapp: newMember.whatsapp,
      password: newMember.password,
      role: newMember.role,
      isApproved: true
    };
    setUsers(prev => [...prev, created]);
    setNewMember({ email: '', whatsapp: '', password: '', name: '', role: UserRole.USER });
  };

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSong.url) return;
    let finalTitle = newSong.title;
    let finalArtist = newSong.artist;

    if (!finalTitle) {
      setIsFetchingMetadata(true);
      const metadata = await fetchYoutubeMetadata(newSong.url);
      if (metadata) {
        finalTitle = metadata.title;
        finalArtist = metadata.author;
      }
      setIsFetchingMetadata(false);
    }
    
    const created: Song = {
      id: crypto.randomUUID(),
      title: finalTitle || 'Sem Título',
      artist: finalArtist || 'Artista desconhecido',
      youtubeUrl: newSong.url,
      addedAt: Date.now(),
      ratings: [],
      isPublic: newSong.isPublic
    };
    setSongs(prev => [created, ...prev]);
    setNewSong({ title: '', artist: '', url: '', isPublic: true });
    setIsAdding(false);
  };

  const toggleSongPrivacy = (songId: string) => {
    setSongs(prev => prev.map(s => s.id === songId ? { ...s, isPublic: !s.isPublic } : s));
  };

  const handleVote = (songId: string, score: number) => {
    if (!currentUser) return;
    setSongs(prev => prev.map(song => {
      if (song.id !== songId) return song;
      const filtered = song.ratings.filter(r => r.userId !== currentUser.id);
      return { ...song, ratings: [...filtered, { userId: currentUser.id, score }] };
    }));
  };

  const publishPlaylist = () => {
    const encoded = encodeBase64(JSON.stringify(songs));
    const link = `${window.location.origin}${window.location.pathname}?playlist=${encoded}`;
    navigator.clipboard.writeText(link);
    alert('Link da Playlist copiado!');
  };

  const generateInviteLink = (user: User) => {
    const data = { user, songs };
    const encoded = encodeBase64(JSON.stringify(data));
    const link = `${window.location.origin}${window.location.pathname}?invite=${encoded}`;
    navigator.clipboard.writeText(link);
    alert(`Link de acesso para ${user.name} copiado!`);
  };

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const displayedSongs = useMemo(() => {
    let items = [...songs];
    
    // Regra de Negócio: Membros só veem músicas PÚBLICAS e que AINDA NÃO VOTARAM
    if (!isAdmin) {
      items = items.filter(s => 
        s.isPublic && 
        !s.ratings.some(r => r.userId === currentUser?.id)
      );
    }

    if (isAdmin) {
      // Admins veem tudo e ordenado por popularidade
      const avgMap = new Map(items.map(s => [s.id, calculateAverageRating(s.ratings)]));
      return items.sort((a, b) => (avgMap.get(b.id) || 0) - (avgMap.get(a.id) || 0) || b.addedAt - a.addedAt);
    }
    
    return items.sort((a, b) => b.addedAt - a.addedAt);
  }, [songs, currentUser, isAdmin]);

  if (!currentUser) return (
    <>
      {syncMessage && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl font-bold animate-in slide-in-from-top-10 ${syncMessage.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          <i className={`fas ${syncMessage.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-2`}></i> 
          {syncMessage.text}
        </div>
      )}
      <Login onLogin={handleLogin} error={authError} />
    </>
  );

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
            <div className="text-right group relative cursor-pointer" onClick={handleSelfChangePassword}>
              <p className="text-xs font-bold text-slate-800 hover:text-indigo-600 transition-colors">{currentUser.name}</p>
              <p className="text-[9px] text-indigo-500 uppercase font-black">{isAdmin ? 'Diretor Musical' : 'Equipe'}</p>
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 p-2 transition-colors"><i className="fas fa-sign-out-alt"></i></button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-10">
        {syncMessage && (
          <div className={`mb-6 border px-6 py-4 rounded-2xl flex items-center justify-between ${syncMessage.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
            <p className="text-sm font-bold"><i className={`fas ${syncMessage.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'} mr-2`}></i> {syncMessage.text}</p>
            <button onClick={() => setSyncMessage(null)} className="opacity-50"><i className="fas fa-times"></i></button>
          </div>
        )}

        {isAdmin && (
          <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 w-fit mb-8">
            <button onClick={() => setActiveTab('songs')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'songs' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Músicas</button>
            <button onClick={() => setActiveTab('users')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Gestão de Equipe</button>
          </div>
        )}

        {isAdmin && activeTab === 'users' ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-2xl">
              <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                <i className="fas fa-user-plus text-indigo-600"></i> Registrar Novo Acesso
              </h3>
              <form onSubmit={handleRegisterMember} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Nome" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} />
                <input type="email" required placeholder="E-mail" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} />
                <input type="tel" placeholder="WhatsApp" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={newMember.whatsapp} onChange={e => setNewMember({...newMember, whatsapp: e.target.value})} />
                <input type="text" required placeholder="Senha" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={newMember.password} onChange={e => setNewMember({...newMember, password: e.target.value})} />
                <div className="md:col-span-2 space-y-2">
                  <p className="text-[10px] font-black uppercase text-slate-400 ml-1">Tipo de Acesso</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setNewMember({...newMember, role: UserRole.USER})} className={`flex-grow py-3 rounded-xl border font-bold text-sm transition-all ${newMember.role === UserRole.USER ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}>Membro</button>
                    <button type="button" onClick={() => setNewMember({...newMember, role: UserRole.ADMIN})} className={`flex-grow py-3 rounded-xl border font-bold text-sm transition-all ${newMember.role === UserRole.ADMIN ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}>Diretor</button>
                  </div>
                </div>
                <button type="submit" className="md:col-span-2 w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">Registrar Usuário</button>
              </form>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
               <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
                 <h3 className="font-bold text-slate-800 text-lg">Membros</h3>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                      <tr>
                        <th className="px-8 py-4">Membro</th>
                        <th className="px-8 py-4">Acesso / Senha</th>
                        <th className="px-8 py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-8 py-6">
                            <p className="font-bold text-slate-800 flex items-center gap-2 text-base">
                              {u.name}
                              {u.role === UserRole.ADMIN && <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-black uppercase tracking-tighter">Diretor</span>}
                            </p>
                            <p className="text-xs text-slate-400 font-medium">{u.email}</p>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex flex-col gap-1">
                              <button onClick={() => generateInviteLink(u)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1.5 group/link">
                                <i className="fas fa-link text-[10px] group-hover/link:rotate-45 transition-transform"></i> Link de Acesso
                              </button>
                              <p className="text-[10px] font-mono text-slate-300">Senha: {u.password}</p>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right space-x-3">
                            <button 
                              onClick={() => handleResetPassword(u.id)} 
                              className="p-2.5 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all"
                              title="Redefinir Senha"
                            >
                              <i className="fas fa-key text-sm"></i>
                            </button>
                            {u.id !== INITIAL_ADMIN.id && (
                              <button 
                                onClick={() => {if(window.confirm('Excluir membro?')) setUsers(prev => prev.filter(usr => usr.id !== u.id))}} 
                                className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                title="Excluir"
                              >
                                <i className="fas fa-trash-alt text-sm"></i>
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
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
               <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Votação de Repertório</h2>
                  <p className="text-slate-500 text-sm">{!isAdmin ? 'Músicas que ainda aguardam o seu voto.' : 'Escute e gerencie o repertório sugerido.'}</p>
               </div>
               {isAdmin && (
                 <div className="flex gap-3">
                    <button onClick={publishPlaylist} className="bg-amber-100 text-amber-700 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-amber-200 transition-all shadow-md">
                      <i className="fas fa-share-nodes mr-2"></i> Compartilhar Playlist
                    </button>
                    <button onClick={() => setIsAdding(!isAdding)} className={`px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all ${isAdding ? 'bg-slate-200 text-slate-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                      <i className={`fas ${isAdding ? 'fa-times' : 'fa-plus'} mr-2`}></i> {isAdding ? 'Cancelar' : 'Nova Música'}
                    </button>
                 </div>
               )}
            </div>

            {isAdding && isAdmin && (
              <form onSubmit={handleAddSong} className="bg-white p-6 rounded-3xl border-2 border-indigo-100 shadow-xl grid grid-cols-1 md:grid-cols-4 gap-4 animate-in zoom-in-95">
                <div className="relative">
                  <input type="url" required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Link do YouTube" value={newSong.url} onChange={e => setNewSong({...newSong, url: e.target.value, title: '', artist: ''})} />
                  {isFetchingMetadata && <div className="absolute right-3 top-1/2 -translate-y-1/2"><i className="fas fa-spinner fa-spin text-indigo-500"></i></div>}
                </div>
                <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder={isFetchingMetadata ? "Lendo..." : "Título"} value={newSong.title} onChange={e => setNewSong({...newSong, title: e.target.value})} />
                <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Artista" value={newSong.artist} onChange={e => setNewSong({...newSong, artist: e.target.value})} />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setNewSong(prev => ({ ...prev, isPublic: !prev.isPublic }))} className={`flex-grow px-4 py-3 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-2 ${newSong.isPublic ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                    <i className={`fas ${newSong.isPublic ? 'fa-eye' : 'fa-eye-slash'}`}></i> {newSong.isPublic ? 'Pública' : 'Privada'}
                  </button>
                  <button type="submit" disabled={isFetchingMetadata || !newSong.url} className={`bg-slate-900 text-white px-6 py-3 rounded-xl font-bold transition-all ${isFetchingMetadata || !newSong.url ? 'opacity-50' : 'hover:bg-slate-800'}`}>Salvar</button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 gap-6">
               {displayedSongs.map(song => (
                 <SongCard key={song.id} song={song} onVote={handleVote} currentUserRating={song.ratings.find(r => r.userId === currentUser.id)?.score} isAdminView={isAdmin} onDelete={(id) => { if(window.confirm('Excluir música?')) setSongs(prev => prev.filter(s => s.id !== id)); }} onToggleVisibility={() => toggleSongPrivacy(song.id)} />
               ))}
               {displayedSongs.length === 0 && (
                 <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 flex flex-col items-center animate-in fade-in duration-700">
                    <i className="fas fa-check-circle text-emerald-100 text-6xl mb-4"></i>
                    <p className="text-slate-400 font-medium">
                      {!isAdmin 
                        ? 'Você já votou em todas as músicas disponíveis! Bom trabalho.' 
                        : 'Nenhuma música cadastrada no momento.'}
                    </p>
                 </div>
               )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
