
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
