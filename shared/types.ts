export type PostKind = 'picture' | 'story' | 'video';

export type AudiencePolicy = 'everyone' | 'followers' | 'off';

export interface ThemeConfig {
  mode: 'light' | 'dark';
  backgroundColor: string;
  surfaceColor: string;
  accentColor: string;
  pattern: 'none' | 'dots' | 'grid' | 'warm-glow';
}

export interface SafetyConfig {
  commentPolicy: AudiencePolicy;
  messagePolicy: AudiencePolicy;
  bleepMode: 'asterisks' | 'bleep-tag';
  blockedKeywords: string[];
  blockedUserIds: string[];
}

export interface UserPublic {
  id: string;
  name: string;
  handle: string;
  bio: string;
  avatarUrl: string;
  followerTitle: string; // e.g., "Sunbeams", "Fixers", "Kindred"
  followerCount: number;
  followingCount: number;
  helpfulCount: number;
  createdAt: string;
  safety: SafetyConfig;
}

export interface AuthUser extends UserPublic {
  email: string;
  theme: ThemeConfig;
  followingIds: string[];
  customApkUrl?: string;
}

export interface CommentItem {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatarUrl: string;
  text: string;
  wasBleeped: boolean;
  createdAt: string;
}

export interface PostItem {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatarUrl: string;
  authorFollowerTitle: string;
  kind: PostKind;
  topic: string;
  title: string;
  body: string;
  mediaUrl?: string;
  mediaMime?: string;
  wasBleeped: boolean;
  helpfulCount: number;
  helpfulUserIds: string[];
  comments: CommentItem[];
  createdAt: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  wasBleeped: boolean;
  createdAt: string;
  read: boolean;
}

export interface ConversationThread {
  peer: UserPublic;
  messages: DirectMessage[];
  unreadCount: number;
  lastMessageAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: 'follow' | 'comment' | 'helpful' | 'message' | 'safety';
  actorId?: string;
  actorName?: string;
  actorAvatarUrl?: string;
  postId?: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}
