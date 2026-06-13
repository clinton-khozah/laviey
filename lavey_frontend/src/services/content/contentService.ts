import { usesBackendApi } from '@/config/env';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { httpClient } from '@/services/api/httpClient';
import type { ApiResponse, LikePostResponse, PostLiker, ProfilePost, ReceivedPostLike } from '@/types';
import { createComplimentThumbnail } from '@/utils/media/createComplimentThumbnail';
import { localPhotoCompliment } from '@/utils/media/localPhotoCompliment';
import { sleep } from '@/utils/sleep';

function usesBackendContent(): boolean {
  return usesBackendApi();
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isPersistedPostId(postId: string): boolean {
  return UUID_RE.test(postId);
}

export interface PhotoComplimentResult {
  compliment: string;
  source: 'ai' | 'fallback';
}

export interface CreatePostInput {
  file: File;
  caption?: string;
  tags?: string[];
  durationSec?: number;
  posterFile?: File;
}

export const contentService = {
  async createPost(input: CreatePostInput): Promise<ProfilePost> {
    if (!input.file.type.startsWith('image/')) {
      throw new Error('Only photos are allowed. Please choose an image.');
    }

    if (!usesBackendContent()) {
      await sleep(400);
      const url = URL.createObjectURL(input.file);
      return {
        id: `local-${Date.now()}`,
        type: 'image',
        src: url,
        likeCount: 0,
        caption: input.caption,
      };
    }

    const formData = new FormData();
    formData.append('media', input.file);
    if (input.posterFile) {
      formData.append('poster', input.posterFile);
    }
    if (input.caption) {
      formData.append('caption', input.caption);
    }
    if (input.tags?.length) {
      formData.append('tags', JSON.stringify(input.tags));
    }
    if (input.durationSec) {
      formData.append('durationSec', String(input.durationSec));
    }

    const res = await httpClient.postForm<ApiResponse<ProfilePost>>(API_ENDPOINTS.content.posts, formData);
    return res.data;
  },

  async getPhotoCompliment(file: File, displayName = ''): Promise<PhotoComplimentResult> {
    if (!usesBackendContent()) {
      await sleep(350);
      return {
        compliment: localPhotoCompliment(displayName),
        source: 'fallback',
      };
    }

    try {
      const thumb = await createComplimentThumbnail(file);
      const formData = new FormData();
      formData.append('photo', thumb);
      const trimmedName = displayName.trim();
      if (trimmedName) {
        formData.append('firstName', trimmedName.split(/\s+/)[0] ?? trimmedName);
      }

      const res = await httpClient.postForm<ApiResponse<PhotoComplimentResult>>(
        API_ENDPOINTS.content.photoCompliment,
        formData,
        { skipErrorPage: true },
      );
      return res.data;
    } catch {
      return {
        compliment: localPhotoCompliment(displayName),
        source: 'fallback',
      };
    }
  },

  async uploadAvatar(file: File): Promise<string> {
    if (!usesBackendContent()) {
      await sleep(300);
      return URL.createObjectURL(file);
    }

    const formData = new FormData();
    formData.append('avatar', file);
    const res = await httpClient.postForm<ApiResponse<{ avatarUrl: string }>>(
      API_ENDPOINTS.content.avatar,
      formData,
    );
    return res.data.avatarUrl;
  },

  async updatePostVisibility(postId: string, isVisible: boolean): Promise<void> {
    if (!usesBackendContent() || !isPersistedPostId(postId)) {
      await sleep(150);
      return;
    }

    await httpClient.patch(API_ENDPOINTS.content.postById(postId), {
      body: { isVisible },
    });
  },

  async deletePost(postId: string): Promise<void> {
    if (!usesBackendContent() || !isPersistedPostId(postId)) {
      return;
    }

    await httpClient.delete<ApiResponse<{ deleted: boolean }>>(
      API_ENDPOINTS.content.postById(postId),
    );
  },

  async likePost(postId: string): Promise<LikePostResponse> {
    if (!usesBackendContent() || !isPersistedPostId(postId)) {
      await sleep(200);
      return {
        liked: true,
        likeCount: 1,
        matched: false,
        ownerUserId: '',
        ownerName: 'Someone',
        ownerAvatar: '',
        myAvatar: '',
      };
    }

    const res = await httpClient.post<ApiResponse<LikePostResponse>>(
      API_ENDPOINTS.posts.like(postId),
      {},
    );
    return res.data;
  },

  async getPostLikers(postId: string): Promise<PostLiker[]> {
    if (!usesBackendContent() || !isPersistedPostId(postId)) {
      return [];
    }

    const res = await httpClient.get<ApiResponse<PostLiker[]>>(
      API_ENDPOINTS.content.postLikes(postId),
    );
    return res.data;
  },

  async getReceivedPostLikes(): Promise<ReceivedPostLike[]> {
    if (!usesBackendContent()) {
      return [];
    }

    const res = await httpClient.get<ApiResponse<ReceivedPostLike[]>>(
      API_ENDPOINTS.content.receivedPostLikes,
    );
    return res.data;
  },
};
