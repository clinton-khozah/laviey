export interface ApiResponse<T> { success: boolean; data: T; message?: string }
export interface AuthUser { id: string; email: string; displayName: string; avatarUrl?: string; provider: 'google' | 'email' }
export interface AuthSession { token: string; refreshToken?: string; user: AuthUser }
export interface ProfilePost { id: string; type: 'video' | 'image'; src: string; poster?: string; caption?: string; likeCount?: number; viewCount?: number; impressionCount?: number }
export interface ThemeSong { spotifyId: string; title: string; artist: string; previewUrl: string | null; albumArtUrl: string | null }
export interface Profile {
  id: string; name: string; age: number; bio: string; distance: string; locationName?: string;
  verified: boolean; vibeScore: number; interests: string[]; languages?: string[]; avatar: string; posts: ProfilePost[];
  distanceKm?: number; gender?: 'woman' | 'man' | 'nonbinary'; likedYou?: boolean;
  religion?: string; interestedIn?: string; orientation?: string; purpose?: string;
  school?: string; degree?: string; occupation?: string; company?: string; hometown?: string;
  isMatch?: boolean; themeSong?: ThemeSong | null; lastActiveAt?: string; createdAt?: string; isOnline?: boolean;
  isAiCompanion?: boolean; aiDisclosureLabel?: string;
}
export interface DiscoverPayload { profiles: Profile[]; nextCursor: string | null; myLikedProfileIds?: string[]; isRecycling?: boolean; canExpandDistance?: boolean }
export interface MatchResult { matched: boolean; matchId?: string; profileName?: string; profileAvatar?: string; myAvatar?: string; pending?: boolean; alreadySent?: boolean; conversationId?: string; mutualAccepted?: boolean }
export interface MatchListItem { id: string; userId?: string; profileId?: string; name?: string; avatar?: string; matchedAt?: string; vibeScore?: number; [key: string]: unknown }
export interface ChatCreditPack { id: string; label: string; description: string; credits: number; amountZar: number }
export interface ChatCreditCatalog { balance: number; packs: ChatCreditPack[] }
export interface PayfastCheckoutResponse { actionUrl: string; fields: Record<string, string>; mPaymentId: string }
export interface ChatCreditCheckoutStatus { status: string; credits: number; balance: number; targetProfileId: string | null; conversationId: string | null }
export interface MeetingChatMessage { id: string; fromUserId: string; fromName: string; fromAvatarUrl?: string; text: string; sentAt: string; replyToId?: string; replyToName?: string; likeUserIds?: string[]; isLocal?: boolean }
export interface MeetupComment {
  id: string; meetupId: string; senderUserId: string; senderName: string; senderAvatar: string;
  body: string; replyToCommentId: string | null; replyToName: string | null;
  likeCount: number; likedByMe: boolean; createdAt: string;
}
export interface MeetingParticipant {
  id: string;
  profileId: string;
  name: string;
  avatarUrl: string;
  isHost?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  stream?: import('react-native-webrtc').MediaStream | null;
  isConnecting?: boolean;
}
export interface Conversation {
  id: string; participantProfileId: string; participantName: string; participantAvatar: string;
  lastMessage: string; lastMessageAt: string; unreadCount: number; isOnline: boolean;
  isTyping?: boolean; lastSeenLabel?: string | null; matchedAt: string; vibeScore: number;
  conversationKind?: 'match' | 'i_crush_incoming' | 'i_crush_outgoing' | 'chat_request_incoming' | 'chat_request_outgoing';
  iCrushInviteId?: string;
  isAiCompanion?: boolean; aiDisclosureLabel?: string;
}
export interface ChatMessage {
  id: string; conversationId: string; senderId: 'me' | 'them'; text: string; sentAt: string;
  read: boolean; kind?: 'text' | 'image' | 'audio'; imageUrl?: string; audioUrl?: string; expiresAt?: string; expired?: boolean; sending?: boolean; reaction?: string; replyTo?: { id: string; senderId: 'me' | 'them'; text: string; kind: 'text' | 'image' | 'audio' };
}
export interface ChatAssistResult { moodLabel: string; moodExplanation: string; suggestions: string[] }
export type NotificationKind = 'like' | 'crush' | 'post_like' | 'verified' | 'match' | 'system' | 'profile_view' | 'meetup_like' | 'meetup_join';
export interface NotificationEvent {
  id: string; actorUserId: string | null; actorName: string; actorAvatar: string;
  kind: NotificationKind; title: string | null; body: string | null; text: string;
  sentAt: string; read: boolean; actionable: boolean; postId: string | null; meetupId: string | null;
  actorAge?: number | null; actorLocation?: string | null; actorVibeScore?: number | null;
}
export interface ChatVideoCall { id: string; conversationId: string; direction: 'incoming' | 'outgoing'; status: 'ringing' | 'active' | 'declined' | 'ended' | 'missed'; participantName: string; participantAvatar: string; createdAt: string; answeredAt?: string | null; endedAt?: string | null }
export interface OnlineDate { id: string; title: string; topic?: string; hostName: string; hostAvatar?: string; hostUserId?: string; status: string; visibility: 'public' | 'private'; accessCode?: string; participantCount?: number; maxParticipants?: number; startsAt?: string; startsInMinutes?: number; scheduledLabel?: string; coverImage?: string; tags?: string[]; isHostedByYou?: boolean; liked?: boolean; likeCount?: number }
export interface DateInvite { id: string; dateId: string; fromName: string; fromAvatar?: string; title: string; topic?: string; status: 'pending' | 'accepted' | 'declined'; accessCode?: string }
export interface GroupMember { userId: string; name: string; avatar: string; role: 'owner' | 'member'; status: 'invited' | 'joined' | 'left' }
export interface GroupChat {
  id: string; hostUserId: string; name: string; description: string; coverImage: string | null;
  memberCount: number; members: GroupMember[]; myStatus: 'invited' | 'joined' | 'left' | 'none'; isHostedByYou: boolean;
  visibility: 'public' | 'private'; maxMembers: number; spotsRemaining: number; isFull: boolean;
  inviteCode: string | null; inviteLink: string | null; createdAt: string;
}
export interface GroupChatMessage {
  id: string; groupId: string; senderUserId: string; senderName: string; senderAvatar: string;
  body: string; replyToMessageId: string | null; createdAt: string;
}
export interface PrivacySettings { showInDiscover: boolean; hideFromPeople: boolean; readReceipts: boolean; contactsCanFindMe: boolean; hasPhoneLinked?: boolean }
export interface PlatinumCatalog { sheetTitle: string; heroTitle: string; heroTagline: string; starEmoji: string; defaultPlanId: string; oneTimeFinePrint: string; recurringFinePrint: string; displayCurrency: string; billingCurrency: string; pricingNote?: string | null; plans: Array<{ id: string; label: string; price: string; originalPrice?: string; period: string; badge?: string; popular?: boolean }>; features: Array<{ id: string; title: string; description: string }>; welcomeDiscount?: { percent: number; expiresAt: string } | null }
export interface PlatinumStatus {
  isPremium: boolean;
  premiumExpiresAt: string | null;
  activeCheckout: { planKey: string; planLabel: string; price: string; period: string; status: string; isRecurring: boolean; cancelAtPeriodEnd: boolean } | null;
}
export interface VerificationStatus {
  status: 'none' | 'pending' | 'approved' | 'rejected';
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}
export interface UserProfile {
  id: string; displayName: string; email: string; avatarUrl?: string; bio: string; verified: boolean;
  headline?: string; city?: string; country?: string; pronouns?: string; school?: string; degree?: string;
  occupation?: string; company?: string; hometown?: string;
  interests: Array<{ key: string; label: string; emoji: string }>;
  stats: { crushesReceived: number; matches: number; vibeScore: number; profileViews: number; giftEarnings: number };
  posts: ProfilePost[];
  themeSong?: ThemeSong | null;
}
export interface OnboardingOption { key: string; label: string; hint: string; emoji: string; sortOrder: number }
export interface OnboardingQuestion {
  stepKey: string; kind: 'single' | 'multi' | 'input'; sortOrder: number; heroEmoji: string;
  title: string; subtitle: string; minSelections: number | null; maxSelections: number | null;
  options: OnboardingOption[];
}
export interface OnboardingStatus { completed: boolean; completedAt: string | null }
export interface OnboardingLocationInput {
  latitude: number; longitude: number; country: string; province: string; city: string; suburb?: string;
}
export interface SubmitOnboardingPayload {
  purpose: string; agePreference: string; interestedIn: string;
  gender: 'man' | 'woman' | 'nonbinary' | 'prefer-not-to-say';
  orientation: string; religion: string; interests: string[]; dateOfBirth: string;
  languages?: string[]; location: OnboardingLocationInput;
}
