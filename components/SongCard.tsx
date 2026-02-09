
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
  const formattedDate = useMemo(() => new Date(song.addedAt).toLocaleDateString('pt-BR'), [song.addedAt]);

  return (
    <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-slate-200 transition-all hover:shadow-md hover:border-indigo-200 group flex flex-col md:flex-row items-center p-4 md:p-6 gap-6">
      
      {/* Thumbnail Area - Smaller in List View */}
      <div className="w-full md:w-48 lg:w-64 aspect-video bg-slate-900 relative rounded-2xl overflow-hidden shrink-0 shadow-inner">
        {!isPlaying ? (
          <div className="w-full h-full relative group/player cursor-pointer" onClick={() => setIsPlaying(true)}>
            <img 
              src={thumbnailUrl} 
              alt={song.title}
              loading="lazy"
              className="w-full h-full object-cover opacity-70 group-hover/player:opacity-90 transition-opacity"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center text-white shadow-xl group-hover/player:scale-110 transition-transform">
                <i className="fas fa-play text-sm ml-1"></i>
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

      {/* Info Area */}
      <div className="flex-grow flex flex-col lg:flex-row items-start lg:items-center justify-between w-full gap-6">
        <div className="space-y-1 min-w-0 max-w-full">
          <div className="flex items-center gap-2">
            <h3 className="font-black text-lg text-slate-900 truncate leading-tight group-hover:text-indigo-600 transition-colors">
              {song.title}
            </h3>
            <span className="hidden sm:inline-block text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
              • {formattedDate}
            </span>
          </div>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest truncate">{song.artist}</p>
        </div>

        {/* Stats and Voting in a row */}
        <div className="flex flex-wrap items-center gap-4 md:gap-8 w-full lg:w-auto">
          {/* Average Rating */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-2xl">
            <div className="text-center">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-1">Média</p>
              <div className="flex items-center gap-1">
                <span className="text-lg font-black text-slate-800">{avgRating}</span>
                <i className="fas fa-star text-yellow-400 text-xs"></i>
              </div>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div className="text-center">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-1">Votos</p>
              <span className="text-sm font-bold text-slate-600">{song.ratings.length}</span>
            </div>
          </div>

          {/* User Voting Area */}
          <div className="flex flex-col gap-1 shrink-0">
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Sua Nota</p>
             <div className="bg-white border border-slate-100 px-3 py-1.5 rounded-xl shadow-sm">
                <StarRating 
                  initialRating={currentUserRating} 
                  onRate={(r) => onVote(song.id, r)} 
                />
             </div>
          </div>

          {/* Admin Actions */}
          {isAdminView && onDelete && (
            <div className="ml-auto lg:ml-0">
              <button 
                onClick={() => onDelete(song.id)}
                className="text-slate-300 hover:text-red-500 transition-all p-3 hover:bg-red-50 rounded-2xl group/del"
                title="Remover música"
              >
                <i className="fas fa-trash-alt group-hover/del:scale-110 transition-transform"></i>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default SongCard;
