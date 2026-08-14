import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Conversation, DiscoverPayload, OnlineDate, Profile, UserProfile } from '../types';

const PREFIX = '@lavey/cache';

function key(userId: string, suffix: string): string {
  return `${PREFIX}:${userId}:${suffix}`;
}

export const appDataCache = {
  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const raw = await AsyncStorage.getItem(key(userId, 'profile'));
      return raw ? (JSON.parse(raw) as UserProfile) : null;
    } catch {
      return null;
    }
  },
  setProfile(userId: string, profile: UserProfile): Promise<void> {
    return AsyncStorage.setItem(key(userId, 'profile'), JSON.stringify(profile));
  },

  async getLikers(userId: string): Promise<{ profiles: Profile[]; likedBackIds: string[] } | null> {
    try {
      const raw = await AsyncStorage.getItem(key(userId, 'likers'));
      return raw ? (JSON.parse(raw) as { profiles: Profile[]; likedBackIds: string[] }) : null;
    } catch {
      return null;
    }
  },
  setLikers(userId: string, profiles: Profile[], likedBackIds: string[]): Promise<void> {
    return AsyncStorage.setItem(key(userId, 'likers'), JSON.stringify({ profiles, likedBackIds }));
  },

  async getDates(userId: string): Promise<OnlineDate[] | null> {
    try {
      const raw = await AsyncStorage.getItem(key(userId, 'dates'));
      return raw ? (JSON.parse(raw) as OnlineDate[]) : null;
    } catch {
      return null;
    }
  },
  setDates(userId: string, dates: OnlineDate[]): Promise<void> {
    return AsyncStorage.setItem(key(userId, 'dates'), JSON.stringify(dates));
  },

  async getFeed(userId: string, filtersKey: string): Promise<DiscoverPayload | null> {
    try {
      const raw = await AsyncStorage.getItem(key(userId, `feed:${filtersKey}`));
      return raw ? (JSON.parse(raw) as DiscoverPayload) : null;
    } catch {
      return null;
    }
  },
  setFeed(userId: string, filtersKey: string, payload: DiscoverPayload): Promise<void> {
    return AsyncStorage.setItem(key(userId, `feed:${filtersKey}`), JSON.stringify(payload));
  },

  async getConversations(userId: string): Promise<Conversation[] | null> {
    try {
      const raw = await AsyncStorage.getItem(key(userId, 'conversations'));
      return raw ? (JSON.parse(raw) as Conversation[]) : null;
    } catch {
      return null;
    }
  },
  setConversations(userId: string, conversations: Conversation[]): Promise<void> {
    return AsyncStorage.setItem(key(userId, 'conversations'), JSON.stringify(conversations));
  },
};
