
export const getYoutubeId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export const getYoutubeThumbnail = (url: string): string => {
  const id = getYoutubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : '';
};

export const calculateAverageRating = (ratings: { score: number }[]): number => {
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((acc, curr) => acc + curr.score, 0);
  return parseFloat((sum / ratings.length).toFixed(1));
};

export interface YoutubeMetadata {
  title: string;
  author: string;
}

export const fetchYoutubeMetadata = async (url: string): Promise<YoutubeMetadata | null> => {
  const videoId = getYoutubeId(url);
  if (!videoId) return null;

  try {
    // Usando o proxy noembed para buscar metadados do YouTube sem problemas de CORS
    const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    const data = await response.json();
    
    if (data && data.title) {
      return {
        title: data.title,
        author: data.author_name || 'Artista desconhecido'
      };
    }
    return null;
  } catch (error) {
    console.error("Erro ao buscar metadados do YouTube:", error);
    return null;
  }
};
