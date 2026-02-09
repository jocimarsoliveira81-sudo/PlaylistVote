
import React, { useState, useMemo } from 'react';
import { Song } from '../types';
import { getYoutubeId, getYoutubeThumbnail, calculateAverageRating } from '../utils';
import StarRating from './StarRating';

interface SongCardProps {
  song: Song;
  onVote: (songId: string, rating: number) => void;
  currentUserRating?: number;
  isAdminView?: boolean;
  onDelete?: (id: string) => void;
}

const SongCard: React.FC<SongCardProps> = React.memo(({ 
  song, 
  onVote, 
  currentUserRating, 
  isAdminView = false,
  onDelete
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  
  const videoId = useMemo(() => getYoutubeId(song.youtubeUrl), [song.youtubeUrl]);
  const avgRating = useMemo(() => calculateAverageRating(song.ratings), [song.ratings]);
  const thumbnailUrl = useMemo(() => getYoutubeThumbnail(song.youtubeUrl), [song.youtubeUrl]);

  return (
    <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border border-slate-200 transition-all hover:shadow-xl hover:border-indigo-100 group">
      <div className="aspect-video w-full bg-slate-900 relative overflow-hidden">
        {!isPlaying ? (
          <div className="w-full h-full relative group/player cursor-pointer" onClick={() => setIsPlaying(true)}>
            <img 
              src={thumbnailUrl} 
              alt={song.title}
              loading="lazy"
              className="w-full h-full object-cover opacity-60 group-hover/player:opacity-80 transition-opacity"
              onError={(e) => {
                // Fallback to standard definition if maxres is not available
                (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-2xl group-hover/player:scale-110 transition-transform">
                <i className="fas fa-play text-xl ml-1"></i>
              </div>
            </div>
          </div>
        ) : (
          <iframe
            className="w-full h-full"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
            title={song.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        )}
      </div>

      <div className="p-8">
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-1">
            <h3 className="font-black text-xl text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">
              {song.title}
            </h3>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{song.artist}</p>
          </div>
          {isAdminView && onDelete && (
            <button 
              onClick={() => onDelete(song.id)}
              className="text-slate-300 hover:text-red-500 transition-all p-2 hover:bg-red-50 rounded-lg"
              title="Remover música"
            >
              <i className="fas fa-trash-alt"></i>
            </button>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between border border-slate-100">
             <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Nota Média</p>
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-black text-slate-800">{avgRating}</span>
                <i className="fas fa-star text-yellow-400 text-sm"></i>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Votos</p>
              <span className="text-sm font-bold text-slate-600">{song.ratings.length} membros</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Sua Avaliação
            </p>
            <div className="flex justify-center bg-white border border-slate-100 py-3 rounded-2xl shadow-inner">
              <StarRating 
                initialRating={currentUserRating} 
                onRate={(r) => onVote(song.id, r)} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default SongCard;
