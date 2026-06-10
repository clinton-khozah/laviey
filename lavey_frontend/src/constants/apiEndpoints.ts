/**
 * API route definitions. Keep paths in one place for easy backend alignment.
 */
export const API_ENDPOINTS = {
  auth: {
    google: '/auth/google',
    login: '/auth/login',
    register: '/auth/register',
    verifyEmail: '/auth/verify-email',
    resendVerification: '/auth/resend-verification',
    me: '/auth/me',
    logout: '/auth/logout',
    changePassword: '/auth/change-password',
  },
  profiles: {
    discover: '/profiles/discover',
    byId: (id: string) => `/profiles/${id}`,
  },
  matches: {
    flame: '/matches/flame',
    list: '/matches',
  },
  subscription: {
    flameQuota: '/subscription/flame-quota',
    platinum: '/subscription/platinum',
  },
  messages: {
    conversations: '/messages/conversations',
    conversationByProfile: (profileId: string) => `/messages/conversations/by-profile/${profileId}`,
    thread: (id: string) => `/messages/conversations/${id}`,
    sendMessage: (id: string) => `/messages/conversations/${id}/messages`,
    markRead: (id: string) => `/messages/conversations/${id}/read`,
    typing: (id: string) => `/messages/conversations/${id}/typing`,
    delete: (id: string) => `/messages/conversations/${id}`,
    pin: (id: string) => `/messages/conversations/${id}/pin`,
    presence: '/messages/presence',
    message: (conversationId: string, messageId: string) =>
      `/messages/conversations/${conversationId}/messages/${messageId}`,
  },
  rooms: {
    list: '/rooms/vibe-check',
    join: (id: string) => `/rooms/vibe-check/${id}/join`,
  },
  dates: {
    list: '/rooms/vibe-check',
    create: '/dates',
    invites: '/dates/invites',
    respondToInvite: (id: string) => `/dates/invites/${id}`,
    joinByCode: '/dates/join-by-code',
    join: (id: string) => `/rooms/vibe-check/${id}/join`,
  },
  users: {
    me: '/users/me',
    verification: '/users/me/verification',
    location: '/users/me/location',
    onboarding: '/users/me/onboarding',
    privacy: '/users/me/privacy',
    settings: '/users/me/settings',
    blocked: '/users/me/blocked',
    blockUser: (userId: string) => `/users/me/blocked/${userId}`,
    contactsImport: '/users/me/contacts/import',
    dataExport: '/users/me/data-export',
    deleteAccount: '/users/me',
  },
  content: {
    posts: '/users/me/posts',
    postById: (id: string) => `/users/me/posts/${id}`,
    postLikes: (id: string) => `/users/me/posts/${id}/likes`,
    receivedPostLikes: '/users/me/received-post-likes',
    avatar: '/users/me/avatar',
  },
  posts: {
    like: (postId: string) => `/posts/${postId}/like`,
  },
  onboarding: {
    questions: '/onboarding/questions',
    interests: '/onboarding/interests',
  },
  gifts: {
    send: '/gifts',
    payoutCatalog: '/gifts/payout-catalog',
    wallet: '/users/me/gifts/wallet',
    payoutAccount: '/users/me/gifts/payout-account',
    withdraw: '/users/me/gifts/withdraw',
  },
  admin: {
    auth: {
      registrationStatus: '/admin/auth/registration-status',
      register: '/admin/auth/register',
      login: '/admin/auth/login',
      me: '/admin/auth/me',
    },
    users: '/admin/users',
    userById: (id: string) => `/admin/users/${id}`,
    supportTickets: '/admin/support/tickets',
    supportTicket: (id: string) => `/admin/support/tickets/${id}`,
    supportTicketMessages: (id: string) => `/admin/support/tickets/${id}/messages`,
  },
  support: {
    config: '/support/config',
    conversation: '/support/conversation',
    messages: '/support/messages',
  },
  legal: {
    terms: '/legal/terms',
    guidelines: '/legal/guidelines',
  },
} as const;
