export type AdminUsersView = 'all' | 'subscribed' | 'new' | 'matches' | 'top';

export interface AdminQuizAnswer {
  question: string;
  answer: string;
}

export interface AdminUserRecord {
  id: string;
  name: string;
  handle: string;
  email: string;
  avatarUrl?: string;
  bio: string;
  city?: string;
  likes: number;
  clickthrough: number;
  age: number | null;
  gender: string;
  totalMatches: number;
  matches: number;
  plan: 'Platinum' | 'Free';
  lastSeen: string;
  subscribed: boolean;
  isNew: boolean;
  topUser: boolean;
  quizCompletion: number;
  quizAnswers: AdminQuizAnswer[];
  posts: string[];
  meetings: string[];
}

export interface AdminUsersSummary {
  activeUsers: number;
  subscribedMembers: number;
  highMatchUsers: number;
}

export interface AdminUsersListResponse {
  users: AdminUserRecord[];
  summary: AdminUsersSummary;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminProfilePost {
  id: string;
  type: 'image' | 'video';
  src: string;
  poster?: string;
  caption?: string;
}

export interface AdminUserDetail extends AdminUserRecord {
  profilePosts: AdminProfilePost[];
}
