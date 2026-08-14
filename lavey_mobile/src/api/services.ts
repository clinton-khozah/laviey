import { api } from './axiosConfig';
import axios from 'axios';
import { endpoints } from './endpoints';
import { storage } from '../utils/storage';
import type { ApiResponse, AuthSession, AuthUser, ChatAssistResult, ChatCreditCatalog, ChatCreditCheckoutStatus, ChatMessage, ChatVideoCall, Conversation, DateInvite, DiscoverPayload, GroupChat, GroupChatMessage, MatchListItem, MatchResult, MeetupComment, NotificationEvent, OnboardingQuestion, OnboardingStatus, OnlineDate, PayfastCheckoutResponse, PlatinumCatalog, PlatinumStatus, PrivacySettings, Profile, ProfilePost, SubmitOnboardingPayload, UserProfile, VerificationStatus } from '../types';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Uploads can hit a transient "Network Error" (e.g. a backend redeploy cycling the server mid-request) — retry a couple of times before giving up. */
async function withNetworkRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (e) {
      const isNetworkError = e instanceof Error && e.message === 'Network Error';
      if (!isNetworkError || attempt === attempts - 1) throw e;
      await sleep(1500 * (attempt + 1));
    }
  }
  throw new Error('Something went wrong. Please try again.');
}

export const authApi = {
  google: async (idToken: string) => (await api.post<ApiResponse<AuthSession>>(endpoints.auth.google, { idToken })).data.data,
  login: async (email: string, password: string) => (await api.post<ApiResponse<AuthSession>>(endpoints.auth.login, { email, password })).data.data,
  register: async (displayName: string, email: string, password: string) => (await api.post<ApiResponse<AuthSession | { needsEmailVerification: true; email: string }>>(endpoints.auth.register, { displayName, email, password })).data.data,
  verifyOtp: async (email: string, code: string) => (await api.post<ApiResponse<AuthSession>>(endpoints.auth.verifyEmail, { email, code })).data.data,
  resendOtp: async (email: string) => { await api.post(endpoints.auth.resendVerification, { email }); },
  me: async () => (await api.get<ApiResponse<AuthUser>>(endpoints.auth.me)).data.data,
  logout: async () => { await api.post(endpoints.auth.logout); },
};

export const discoverApi = {
  list: async (params: Record<string, string | number | boolean | undefined> = {}) => {
    const response = await api.get<ApiResponse<DiscoverPayload | Profile[]>>(endpoints.profiles.discover, { params: { filter: 'for-you', limit: 30, ...params } });
    return Array.isArray(response.data.data) ? { profiles: response.data.data, nextCursor: null } : response.data.data;
  },
  profile: async (id: string) => (await api.get<ApiResponse<Profile>>(endpoints.profiles.byId(id))).data.data,
  recordView: async (id: string) => { await api.post(endpoints.profiles.view(id)); },
  like: async (profileId: string) => (await api.post<ApiResponse<MatchResult>>(endpoints.matches.flame, { profileId })).data.data,
  crush: async (profileId: string) => (await api.post<ApiResponse<MatchResult>>(endpoints.matches.crush, { profileId })).data.data,
  likePost: async (postId: string) => (await api.post<ApiResponse<{ liked: boolean; likeCount: number; matched?: boolean; ownerName?: string; ownerAvatar?: string; myAvatar?: string }>>(endpoints.posts.like(postId))).data.data,
  contactSearch: async (value: string, kind: 'phone' | 'email') => {
    const response = await api.post<ApiResponse<{ matches: Array<{ userId: string; displayName: string; avatarUrl: string }> }>>(endpoints.users.contactsSearch, { [kind]: value });
    return response.data.data.matches;
  },
};

export const onboardingApi = {
  questions: async () => (await api.get<ApiResponse<OnboardingQuestion[]>>(endpoints.onboarding.questions)).data.data,
  status: async () => (await api.get<ApiResponse<OnboardingStatus>>(endpoints.users.onboarding)).data.data,
  submit: async (payload: SubmitOnboardingPayload) => (await api.post<ApiResponse<OnboardingStatus>>(endpoints.users.onboarding, payload)).data.data,
};

/** Our own DB-backed geo reference data (see lavey-backend sql/068_geo_countries_cities.sql). */
export const geoApi = {
  countries: async () => (await api.get<ApiResponse<Array<{ name: string; iso2: string }>>>(endpoints.geo.countries)).data.data,
  cities: async (country: string) => (await api.get<ApiResponse<string[]>>(endpoints.geo.cities, { params: { country } })).data.data,
};

/** Web app calls this feature "paid discovery chat" — see lavey_frontend's paidChatService.ts. */
export const paidChatApi = {
  catalog: async () => (await api.get<ApiResponse<ChatCreditCatalog>>(endpoints.paidChat.catalog)).data.data,
  checkout: async (packId: string, targetProfileId: string) =>
    (await api.post<ApiResponse<PayfastCheckoutResponse>>(endpoints.paidChat.checkout, { packId, targetProfileId })).data.data,
  checkoutStatus: async (mPaymentId: string) =>
    (await api.get<ApiResponse<ChatCreditCheckoutStatus>>(endpoints.paidChat.checkoutStatus(mPaymentId))).data.data,
  unlock: async (profileId: string, initialMessage?: string) =>
    (await api.post<ApiResponse<{ conversationId: string; balance: number }>>(
      endpoints.paidChat.unlock(profileId),
      { initialMessage: initialMessage?.trim() || undefined },
    )).data.data,
  requestFree: async (profileId: string, initialMessage?: string) => {
    const message = initialMessage?.trim().slice(0, 500) || undefined;
    const result = (await api.post<ApiResponse<MatchResult>>(endpoints.matches.crush, {
      profileId,
      requestKind: 'chat',
      initialMessage: message,
    })).data.data;

    if (result.matched && result.conversationId && message) {
      await api.post(endpoints.messages.send(result.conversationId), { text: message });
    } else if (result.conversationId?.startsWith('icrush-')) {
      const inviteId = result.conversationId.slice('icrush-'.length);
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      const session = await storage.getSession();
      if (supabaseUrl && publishableKey && session?.token && inviteId) {
        await axios.patch(
          `${supabaseUrl.replace(/\/$/, '')}/rest/v1/i_crush_invites?id=eq.${encodeURIComponent(inviteId)}`,
          { request_kind: 'chat', initial_message: message ?? null },
          {
            headers: {
              apikey: publishableKey,
              Authorization: `Bearer ${session.token}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            timeout: 15_000,
          },
        );
      }
    }

    return {
      conversationId: result.conversationId ?? '',
      balance: 0,
      requestPending: !result.matched,
    };
  },
};

export const reportApi = {
  submit: async (input: { subjectUserId: string; contentType: string; contentId?: string | null; reason: string }) => {
    await api.post(endpoints.reports, input);
  },
};

export const matchApi = {
  list: async () => (await api.get<ApiResponse<MatchListItem[]>>(endpoints.matches.list, { params: { limit: 100 } })).data.data,
  acceptCrush: async (inviteId: string) => (await api.post<ApiResponse<{ conversationId: string }>>(endpoints.matches.crushAccept(inviteId), {})).data.data,
  rejectCrush: async (inviteId: string) => { await api.post(endpoints.matches.crushReject(inviteId), {}); },
  greetings: async (participantName: string, bio?: string, interests?: string[]) =>
    (await api.post<ApiResponse<{ suggestions: string[] }>>(endpoints.matches.greetings, { participantName, bio, interests })).data.data.suggestions,
};
export const subscriptionApi = {
  platinum: async () => (await api.get<ApiResponse<PlatinumCatalog>>(endpoints.subscription.platinum)).data.data,
  checkout: async (planId: string) => (await api.post<ApiResponse<PayfastCheckoutResponse>>(endpoints.subscription.checkout, { planId })).data.data,
  status: async () => (await api.get<ApiResponse<PlatinumStatus>>(endpoints.subscription.status)).data.data,
  cancel: async () => (await api.post<ApiResponse<PlatinumStatus & { emailSent: boolean }>>(endpoints.subscription.cancel)).data.data,
};
export const chatApi = {
  conversations: async () => (await api.get<ApiResponse<Conversation[]>>(endpoints.messages.conversations)).data.data,
  messages: async (id: string) => (await api.get<ApiResponse<ChatMessage[]>>(endpoints.messages.thread(id))).data.data,
  send: async (id: string, text: string) => (await api.post<ApiResponse<ChatMessage>>(endpoints.messages.send(id), { text })).data.data,
  read: async (id: string) => { await api.post(endpoints.messages.read(id)); },
  typing: async (id: string, isTyping: boolean) => { await api.post(endpoints.messages.typing(id), { isTyping }); },
  presence: async () => { await api.post(endpoints.messages.presence); },
  conversationByProfile: async (profileId: string) => (await api.get<ApiResponse<{ conversationId: string | null }>>(endpoints.messages.byProfile(profileId))).data.data,
  sendPhoto: async (id: string, uri: string) => { const form = new FormData(); form.append('photo', { uri, name: `chat-${Date.now()}.jpg`, type: 'image/jpeg' } as unknown as Blob); return (await api.post<ApiResponse<ChatMessage>>(endpoints.messages.photo(id), form, { headers: { 'Content-Type': 'multipart/form-data' } })).data.data; },
  pin: async (id: string, pinned: boolean) => { await api.patch(endpoints.messages.pin(id), { pinned }); },
  deleteConversation: async (id: string, scope: 'for_you' | 'for_everyone' = 'for_you') => { await api.delete(endpoints.messages.thread(id), { data: { scope } }); },
  react: async (id: string, messageId: string, reaction: string | null) => { await api.patch(endpoints.messages.message(id, messageId), { reaction }); },
  notifications: async () => (await api.get<ApiResponse<NotificationEvent[]>>(endpoints.messages.notifications)).data.data,
  markNotificationsRead: async () => { await api.post(endpoints.messages.notificationsRead); },
  officialInbox: async () => (await api.get<ApiResponse<unknown>>(endpoints.messages.officialInbox)).data.data,
  assist: async (id: string, participantName: string, messages: ChatMessage[]) => (await api.post<ApiResponse<ChatAssistResult>>(endpoints.messages.chatAssist(id), { participantName, messages: messages.filter((m) => m.kind !== 'image' && m.text.trim()).map((m) => ({ sender: m.senderId, text: m.text.trim() })) })).data.data,
  sendAudio: async (id: string, uri: string) => { const form = new FormData(); form.append('audio', { uri, name: `voice-${Date.now()}.m4a`, type: 'audio/mp4' } as unknown as Blob); return (await api.post<ApiResponse<ChatMessage>>(endpoints.messages.audio(id), form, { headers: { 'Content-Type': 'multipart/form-data' } })).data.data; },
  activeCall: async () => (await api.get<ApiResponse<ChatVideoCall | null>>(endpoints.messages.activeVideoCall)).data.data,
  startCall: async (id: string) => (await api.post<ApiResponse<ChatVideoCall>>(endpoints.messages.startVideoCall(id))).data.data,
  updateCall: async (id: string, action: 'answer' | 'decline' | 'end') => (await api.patch<ApiResponse<ChatVideoCall>>(endpoints.messages.updateVideoCall(id), { action })).data.data,
};
export const profileApi = {
  me: async () => (await api.get<ApiResponse<UserProfile>>(endpoints.users.me)).data.data,
  update: async (payload: {
    displayName?: string; bio?: string; headline?: string; city?: string; pronouns?: string;
    school?: string; degree?: string; occupation?: string; company?: string; hometown?: string;
    interestKeys?: string[];
  }) => (await api.patch<ApiResponse<UserProfile>>(endpoints.users.me, payload)).data.data,
  location: async (payload: {
    latitude: number;
    longitude: number;
    country?: string;
    province?: string;
    city?: string;
    suburb?: string;
  }) => { await api.patch(endpoints.users.location, payload); },
  uploadAvatar: async (uri: string) => {
    const form = new FormData();
    form.append('avatar', { uri, name: `avatar-${Date.now()}.jpg`, type: 'image/jpeg' } as unknown as Blob);
    return (await api.post<ApiResponse<{ avatarUrl: string }>>(endpoints.users.avatar, form, { headers: { 'Content-Type': 'multipart/form-data' } })).data.data;
  },
  setThemeSong: async (song: { spotifyId: string; title: string; artist: string; previewUrl: string | null; albumArtUrl: string | null }) =>
    (await api.put<ApiResponse<UserProfile>>(endpoints.users.themeSong, song)).data.data,
  clearThemeSong: async () => (await api.delete<ApiResponse<UserProfile>>(endpoints.users.themeSong)).data.data,
  completeVerification: async () => (await api.post<ApiResponse<UserProfile>>(endpoints.users.verification)).data.data,
  verificationStatus: async () =>
    (await api.get<ApiResponse<VerificationStatus>>(endpoints.users.verification)).data.data,
  submitVerification: async (referenceUri: string, liveUri: string) => {
    const form = new FormData();
    form.append('reference', { uri: referenceUri, name: `reference-${Date.now()}.jpg`, type: 'image/jpeg' } as unknown as Blob);
    form.append('live', { uri: liveUri, name: `live-${Date.now()}.jpg`, type: 'image/jpeg' } as unknown as Blob);
    return (
      await api.post<ApiResponse<VerificationStatus>>(endpoints.users.verificationSubmit, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60_000,
      })
    ).data.data;
  },
};

export const spotifyApi = {
  search: async (query?: string) => {
    type Track = { spotifyId: string; title: string; artist: string; albumArtUrl: string | null; previewUrl: string | null };
    type Experience = {
      tracks: Array<{ spotifyId: string; title: string; artist: string; albumArtUrl: string | null; previewUrl: string | null }>;
      suggestions: Array<{ label: string; query: string; reason: 'popular-near-you' | 'popular-in-country' | 'picked-for-you' }>;
      locationLabel: string | null;
    };
    const response = await api.get<ApiResponse<Experience | Track[]>>(endpoints.spotify.search, {
      params: query?.trim() ? { q: query.trim() } : undefined,
    });
    const data = response.data.data;
    // Keep the app compatible while the new recommendation backend is rolling out.
    return Array.isArray(data)
      ? { tracks: data, suggestions: [], locationLabel: null }
      : {
          tracks: Array.isArray(data?.tracks) ? data.tracks : [],
          suggestions: Array.isArray(data?.suggestions) ? data.suggestions : [],
          locationLabel: data?.locationLabel ?? null,
        };
  },
};

export const roomApi = {
  list: async () => (await api.get<ApiResponse<OnlineDate[]>>(endpoints.dates.list)).data.data,
  invites: async () => (await api.get<ApiResponse<DateInvite[]>>(endpoints.dates.invites)).data.data,
  create: async (payload: { title: string; topic?: string; visibility: 'public' | 'private'; startsAt: string; mode?: 'post' | 'invite'; inviteToProfileId?: string; inviteToName?: string; coverImageUrl?: string }) => (await api.post<ApiResponse<OnlineDate>>(endpoints.dates.create, payload)).data.data,
  update: async (id: string, payload: Partial<OnlineDate>) => (await api.patch<ApiResponse<OnlineDate>>(endpoints.dates.byId(id), payload)).data.data,
  remove: async (id: string) => { await api.delete(endpoints.dates.byId(id)); },
  join: async (id: string, accessCode?: string) => (await api.post<ApiResponse<{ joinUrl: string; date: OnlineDate }>>(endpoints.dates.join(id), { accessCode })).data.data,
  joinByCode: async (accessCode: string) => (await api.post<ApiResponse<{ joinUrl: string; date: OnlineDate }>>(endpoints.dates.joinByCode, { accessCode })).data.data,
  respond: async (id: string, action: 'accept' | 'decline') => (await api.post<ApiResponse<{ invite: DateInvite; date?: OnlineDate }>>(endpoints.dates.respond(id), { action })).data.data,
  like: async (id: string, active: boolean) => (await api.post<ApiResponse<{ userLiked: boolean; likeCount: number }>>(endpoints.dates.like(id), { active })).data.data,
  comments: async (id: string) => (await api.get<ApiResponse<MeetupComment[]>>(endpoints.dates.comments(id))).data.data,
  sendComment: async (id: string, body: string, replyToCommentId?: string, replyToName?: string) =>
    (await api.post<ApiResponse<MeetupComment>>(endpoints.dates.comments(id), { body, replyToCommentId, replyToName })).data.data,
  toggleCommentLike: async (commentId: string, active: boolean) =>
    (await api.post<ApiResponse<{ likeCount: number; likedByMe: boolean }>>(endpoints.dates.commentLike(commentId), { active })).data.data,
};

export const meetingApi = {
  turnCredentials: async () => (await api.get<ApiResponse<{ iceServers: RTCIceServer[]; ttlSeconds: number }>>(endpoints.meetings.turnCredentials)).data.data,
};

export const contentApi = {
  createPost: async (uri: string, caption?: string) => withNetworkRetry(async () => {
    const form = new FormData();
    form.append('media', { uri, name: `post-${Date.now()}.jpg`, type: 'image/jpeg' } as unknown as Blob);
    if (caption) {
      form.append('caption', caption);
      const tags = [...caption.matchAll(/#([A-Za-z][\w]*)/g)].map((m) => m[1]).slice(0, 4);
      if (tags.length) form.append('tags', JSON.stringify(tags));
    }
    return (await api.post<ApiResponse<ProfilePost>>(endpoints.users.posts, form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60_000 })).data.data;
  }),
  deletePost: async (id: string) => { await api.delete(endpoints.users.post(id)); },
  visibility: async (id: string, isVisible: boolean) => { await api.patch(endpoints.users.post(id), { isVisible }); },
  likePost: async (id: string) => (await api.post<ApiResponse<{ liked: boolean; likeCount: number; matched?: boolean; ownerName?: string; ownerAvatar?: string; myAvatar?: string }>>(endpoints.posts.like(id))).data.data,
  recordView: async (id: string, dwellMs: number) => { await api.post(endpoints.posts.view(id), { dwellMs }).catch(() => {}); },
  trendingHashtags: async () => (await api.get<ApiResponse<Array<{ tag: string; count: number }>>>(endpoints.users.trendingHashtags)).data.data,
  myLikedPostIds: async () => (await api.get<ApiResponse<string[]>>(endpoints.users.myPostLikes)).data.data,
  receivedPostLikes: async () =>
    (await api.get<ApiResponse<Array<{ userId: string; name: string; avatar: string; postId: string; postThumbnail: string; likedBack: boolean }>>>(endpoints.users.receivedLikes)).data.data,
  checkPhoto: async (uri: string) => withNetworkRetry(async () => {
    const form = new FormData();
    form.append('photo', { uri, name: `check-${Date.now()}.jpg`, type: 'image/jpeg' } as unknown as Blob);
    return (await api.post<ApiResponse<{ allowed: boolean; safeScore: number | null; flags: string[] }>>(endpoints.users.photoCheck, form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60_000 })).data.data;
  }),
  photoCompliment: async (uri: string, firstName?: string) => withNetworkRetry(async () => {
    const form = new FormData();
    form.append('photo', { uri, name: `compliment-${Date.now()}.jpg`, type: 'image/jpeg' } as unknown as Blob);
    if (firstName) form.append('firstName', firstName);
    return (await api.post<ApiResponse<{ compliment: string; source: 'ai' | 'fallback' }>>(endpoints.users.photoCompliment, form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60_000 })).data.data;
  }),
};

export type AppLanguageCode = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'ja' | 'ko' | 'zh' | 'af' | 'zu' | 'xh' | 'st';

export interface UserSettings {
  theme: 'night' | 'light';
  chatTypingStyle: 'romantic' | 'classic' | 'neon' | 'minimal';
  language: AppLanguageCode;
  pushNotificationsEnabled: boolean;
  likeFeedbackSoundEnabled: boolean;
  email: string;
  canChangePassword: boolean;
}

export interface AppLanguageOption {
  code: AppLanguageCode;
  label: string;
  qualityTier?: 'beta';
}

export const settingsApi = {
  get: async () => (await api.get<ApiResponse<UserSettings>>(endpoints.users.settings)).data.data,
  update: async (payload: Partial<Pick<UserSettings, 'theme' | 'chatTypingStyle' | 'language' | 'pushNotificationsEnabled' | 'likeFeedbackSoundEnabled'>>) =>
    (await api.patch<ApiResponse<UserSettings>>(endpoints.users.settings, payload)).data.data,
  privacy: async () => (await api.get<ApiResponse<PrivacySettings>>(endpoints.users.privacy)).data.data,
  updatePrivacy: async (payload: Partial<PrivacySettings> & { phone?: string }) => (await api.patch<ApiResponse<PrivacySettings>>(endpoints.users.privacy, payload)).data.data,
  blocked: async () => (await api.get<ApiResponse<Array<{ userId: string; displayName: string; avatarUrl: string }>>>(endpoints.users.blocked)).data.data,
  block: async (id: string) => { await api.post(endpoints.users.block(id)); },
  unblock: async (id: string) => { await api.delete(endpoints.users.block(id)); },
  changePassword: async (currentPassword: string, newPassword: string) => { await api.post(endpoints.auth.changePassword, { currentPassword, newPassword }); },
  deleteAccount: async () => { await api.delete(endpoints.users.me); },
  dataExport: async () => (await api.get<ApiResponse<Record<string, unknown>>>(endpoints.users.dataExport)).data.data,
};

export const translationApi = {
  languages: async () => (await api.get<ApiResponse<AppLanguageOption[]>>(endpoints.translation.languages)).data.data,
  translateUi: async (texts: string[], targetLanguage: AppLanguageCode) =>
    (await api.post<ApiResponse<{ translations: string[] }>>(endpoints.translation.ui, { texts, targetLanguage })).data.data.translations,
};

export interface SupportConfig {
  displayName: string; statusText: string; welcomeMessage: string; quickTopics: string[];
}
export interface SupportMessage {
  id: string; sender: 'me' | 'support'; text: string; sentAt: string; isAutoReply?: boolean; isAi?: boolean;
}
export interface SupportConversation {
  conversationId: string; status: string; supportMode: 'ai' | 'consultant'; messages: SupportMessage[]; config: SupportConfig;
}
export const supportApi = {
  conversation: async () => (await api.get<ApiResponse<SupportConversation>>(endpoints.support.conversation)).data.data,
  send: async (body: string) => (await api.post<ApiResponse<SupportConversation>>(endpoints.support.messages, { body })).data.data,
  consultant: async () => (await api.post<ApiResponse<SupportConversation>>(endpoints.support.consultant)).data.data,
};

export interface LegalDocument {
  title: string;
  intro: string;
  safetyNote: string;
  sections: Array<{ title: string; body: string[] }>;
  footer: string;
}

export const legalApi = {
  terms: async () => (await api.get<ApiResponse<LegalDocument>>(endpoints.legal.terms)).data.data,
  guidelines: async () => (await api.get<ApiResponse<LegalDocument>>(endpoints.legal.guidelines)).data.data,
};

export const groupChatApi = {
  list: async () => (await api.get<ApiResponse<GroupChat[]>>(endpoints.groupChats.list)).data.data,
  discover: async () => (await api.get<ApiResponse<GroupChat[]>>(endpoints.groupChats.discover)).data.data,
  create: async (payload: { name: string; description?: string; memberUserIds: string[]; coverImageUrl?: string; visibility: 'public' | 'private'; maxMembers: number }) =>
    (await api.post<ApiResponse<GroupChat>>(endpoints.groupChats.create, payload)).data.data,
  join: async (payload: { groupId?: string; inviteCode?: string }) =>
    (await api.post<ApiResponse<GroupChat>>(endpoints.groupChats.join, payload)).data.data,
  uploadCover: async (id: string, uri: string) => {
    const form = new FormData();
    form.append('cover', { uri, name: `group-${Date.now()}.jpg`, type: 'image/jpeg' } as unknown as Blob);
    return (await api.post<ApiResponse<GroupChat>>(endpoints.groupChats.cover(id), form, { headers: { 'Content-Type': 'multipart/form-data' } })).data.data;
  },
  messageMember: async (id: string, userId: string) =>
    (await api.post<ApiResponse<{ conversationId: string }>>(endpoints.groupChats.memberMessage(id, userId), {})).data.data,
  respond: async (id: string, action: 'accept' | 'decline') =>
    (await api.post<ApiResponse<GroupChat>>(endpoints.groupChats.respond(id), { action })).data.data,
  invite: async (id: string, memberUserIds: string[]) =>
    (await api.post<ApiResponse<GroupChat>>(endpoints.groupChats.invite(id), { memberUserIds })).data.data,
  leave: async (id: string) => { await api.post(endpoints.groupChats.leave(id)); },
  remove: async (id: string) => { await api.delete(endpoints.groupChats.remove(id)); },
  messages: async (id: string) => (await api.get<ApiResponse<GroupChatMessage[]>>(endpoints.groupChats.messages(id))).data.data,
  send: async (id: string, body: string, replyToMessageId?: string) =>
    (await api.post<ApiResponse<GroupChatMessage>>(endpoints.groupChats.messages(id), { body, replyToMessageId })).data.data,
  assist: async (id: string, groupName: string) =>
    (await api.post<ApiResponse<ChatAssistResult>>(endpoints.groupChats.assist(id), { groupName })).data.data,
};

export const pushApi = {
  subscribeExpo: async (token: string, deviceInfo?: string) => {
    await api.post(endpoints.users.pushExpoSubscribe, { token, deviceInfo });
  },
};

type AccessModeResponse = { mode: 'premium_enabled' | 'all_free'; allFree: boolean; updatedAt: string | null };
async function getAccessModeDirectly(): Promise<AccessModeResponse> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) throw new Error("Access mode is unavailable.");
  const response = await axios.post<boolean>(
    `${supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/is_all_free_mode`,
    {},
    {
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`,
        "Content-Type": "application/json",
      },
      timeout: 15_000,
    },
  );
  const allFree = response.data === true;
  return {
    mode: allFree ? "all_free" : "premium_enabled",
    allFree,
    updatedAt: null,
  };
}

const DEFAULT_ACCESS_MODE: AccessModeResponse = {
  mode: "all_free",
  allFree: true,
  updatedAt: null,
};

export const accessModeApi = {
  get: async (): Promise<AccessModeResponse> => {
    try {
      // This function is the source of truth used by the paid-feature SQL gates,
      // so reading it first keeps the UI and backend behavior exactly aligned.
      return await getAccessModeDirectly();
    } catch {
      try {
        return (await api.get<ApiResponse<AccessModeResponse>>(
          endpoints.meta.accessMode,
          { params: { _: Date.now() }, headers: { "Cache-Control": "no-cache" } },
        )).data.data;
      } catch {
        // Supabase and backend can both fail during cold starts or brief offline periods —
        // default to all-free so background polling never surfaces as an uncaught rejection.
        return DEFAULT_ACCESS_MODE;
      }
    }
  },
};
