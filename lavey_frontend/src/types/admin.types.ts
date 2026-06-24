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
  headline?: string;
  city?: string;
  dateOfBirth?: string | null;
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
  isVerified: boolean;
  accountStatus: 'active' | 'restricted' | 'banned';
  showOnDiscover: boolean;
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

export type AdminUsersStatusFilter = 'all' | 'active' | 'restricted' | 'banned';
export type AdminUsersRecordFilter = 'all' | 'verified' | 'platinum';

export type AdminUserAction =
  | 'ban'
  | 'unban'
  | 'restrict_chat'
  | 'lift_chat_restriction'
  | 'hide_discover'
  | 'show_discover'
  | 'grant_platinum'
  | 'revoke_platinum'
  | 'hide_post';

export interface AdminUpdateUserInput {
  displayName?: string;
  email?: string;
  bio?: string;
  headline?: string;
  city?: string;
  pronouns?: string;
  dateOfBirth?: string | null;
  isPremium?: boolean;
  isVerified?: boolean;
  showOnDiscover?: boolean;
  accountStatus?: 'active' | 'restricted' | 'banned';
}

export interface AdminUserLiker {
  id: string;
  name: string;
  handle: string;
  email: string;
  avatarUrl?: string;
  age: number | null;
  gender: string;
  city?: string;
  plan: 'Platinum' | 'Free';
  isVerified: boolean;
  likedAt: string;
  likedAtLabel: string;
  source: 'profile_like' | 'post_like';
  bio: string;
}

export interface AdminUserMatch {
  id: string;
  name: string;
  handle: string;
  email: string;
  avatarUrl?: string;
  age: number | null;
  gender: string;
  city?: string;
  plan: 'Platinum' | 'Free';
  isVerified: boolean;
  matchedAt: string;
  matchedAtLabel: string;
  bio: string;
}

export interface AdminUserMeeting {
  id: string;
  title: string;
  startsAt: string;
  startsAtLabel: string;
  accessCode: string;
  status: string;
  participantCount: number;
}

export interface AdminUserInsight {
  summary: string;
  safetyScore: number | null;
  flags: string[];
  source: string;
}
