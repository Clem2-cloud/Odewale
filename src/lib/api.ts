import type {
  AuthUser,
  ConversationThread,
  DirectMessage,
  NotificationItem,
  PostItem,
  PostKind,
  SafetyConfig,
  ThemeConfig,
  UserPublic,
} from '../../shared/types';

const TOKEN_KEY = 'oc_token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(path, {
    ...init,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function extractVideoFrames(
  file: File
): Promise<{ duration: number; frames: Array<{ mimeType: string; base64Data: string }> }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    const cleanup = () => URL.revokeObjectURL(url);

    video.onerror = () => {
      cleanup();
      reject(new Error('Could not read video file. Please try an MP4 or WebM short clip.'));
    };

    video.onloadedmetadata = async () => {
      const duration = video.duration || 0;
      if (duration > 90) {
        cleanup();
        reject(new Error('Short videos on Open Circle can be up to 90 seconds long.'));
        return;
      }

      const times = duration > 2 ? [0.3, duration * 0.45, duration * 0.8] : [0.1];
      const frames: Array<{ mimeType: string; base64Data: string }> = [];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      for (const t of times) {
        try {
          await new Promise<void>((resSeek) => {
            video.currentTime = Math.min(Math.max(0, t), Math.max(0, duration - 0.1));
            video.onseeked = () => resSeek();
            setTimeout(resSeek, 900);
          });
          const w = Math.min(480, video.videoWidth || 480);
          const h = Math.round(w * ((video.videoHeight || 270) / (video.videoWidth || 480)));
          canvas.width = w;
          canvas.height = h;
          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
            const base64Data = dataUrl.split(',')[1];
            if (base64Data) {
              frames.push({ mimeType: 'image/jpeg', base64Data });
            }
          }
        } catch {
          // continue capturing remaining frames
        }
      }

      cleanup();
      resolve({ duration, frames });
    };
  });
}

export const api = {
  getMe: () => request<{ user: AuthUser | null }>('/api/auth/me'),

  register: (payload: {
    name: string;
    handle: string;
    email: string;
    password: string;
    followerTitle: string;
    bio: string;
  }) =>
    request<{ token: string; user: AuthUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { identifier: string; password: string }) =>
    request<{ token: string; user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),

  updateProfile: (payload: {
    name?: string;
    bio?: string;
    followerTitle?: string;
    avatarUrl?: string;
    theme?: ThemeConfig;
    safety?: SafetyConfig;
    customApkUrl?: string;
  }) =>
    request<{ user: AuthUser }>('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  uploadMedia: async (file: File) => {
    const form = new FormData();
    if (file.type.startsWith('video/')) {
      const { frames } = await extractVideoFrames(file);
      form.append('videoFrames', JSON.stringify(frames));
    }
    form.append('media', file);
    return request<{ mediaUrl: string; mediaMime: string; moderationReason: string }>('/api/upload', {
      method: 'POST',
      body: form,
    });
  },

  getUsers: () => request<{ users: UserPublic[] }>('/api/users'),

  followUser: (userId: string) =>
    request<{ following: boolean; followerTitle: string; followerCount: number; me: AuthUser }>(
      `/api/users/${userId}/follow`,
      { method: 'POST' }
    ),

  blockUser: (userId: string) =>
    request<{ blocked: boolean; me: AuthUser }>(`/api/users/${userId}/block`, { method: 'POST' }),

  getPosts: (params?: { kind?: string; authorId?: string; q?: string }) => {
    const qs = new URLSearchParams();
    if (params?.kind && params.kind !== 'all') qs.set('kind', params.kind);
    if (params?.authorId) qs.set('authorId', params.authorId);
    if (params?.q) qs.set('q', params.q);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<{ posts: PostItem[] }>(`/api/posts${suffix}`);
  },

  createPost: (payload: {
    kind: PostKind;
    topic: string;
    title: string;
    body: string;
    mediaUrl?: string;
    mediaMime?: string;
  }) =>
    request<{ post: PostItem }>('/api/posts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  toggleHelpful: (postId: string) =>
    request<{ post: PostItem }>(`/api/posts/${postId}/helpful`, { method: 'POST' }),

  addComment: (postId: string, text: string) =>
    request<{ post: PostItem }>(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  deletePost: (postId: string) =>
    request<{ ok: boolean }>(`/api/posts/${postId}`, { method: 'DELETE' }),

  getMessages: () => request<{ threads: ConversationThread[] }>('/api/messages'),

  sendMessage: (recipientId: string, text: string) =>
    request<{ message: DirectMessage }>('/api/messages', {
      method: 'POST',
      body: JSON.stringify({ recipientId, text }),
    }),

  markMessagesRead: (peerId: string) =>
    request<{ ok: boolean }>(`/api/messages/${peerId}/read`, { method: 'POST' }),

  getNotifications: () =>
    request<{ notifications: NotificationItem[]; unreadCount: number }>('/api/notifications'),

  markNotificationsRead: () =>
    request<{ ok: boolean }>('/api/notifications/read', { method: 'POST' }),

  reportContent: (payload: {
    targetType: 'post' | 'comment' | 'user' | 'message';
    targetId: string;
    reason: string;
  }) =>
    request<{ ok: boolean; message: string }>('/api/reports', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
