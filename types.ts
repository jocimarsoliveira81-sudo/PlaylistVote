
export interface Rating {
  userId: string;
  score: number; // 1 to 5
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  youtubeUrl: string;
  addedAt: number;
  ratings: Rating[];
}

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: UserRole;
  isApproved?: boolean; // Novo campo para controle de acesso
}
