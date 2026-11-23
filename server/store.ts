import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type {
  AuthUser,
  CommentItem,
  DirectMessage,
  NotificationItem,
  PostItem,
  SafetyConfig,
  ThemeConfig,
  UserPublic,
} from '../shared/types';

export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  name: string;
  handle: string;
  bio: string;
  avatarUrl: string;
  followerTitle: string;
  followingIds: string[];
  followerIds: string[];
  theme: ThemeConfig;
  safety: SafetyConfig;
  customApkUrl?: string;
  createdAt: string;
}

export interface StoredReport {
  id: string;
  reporterId: string;
  targetType: 'post' | 'comment' | 'user' | 'message';
  targetId: string;
  reason: string;
  createdAt: string;
}

export interface DatabaseState {
  users: StoredUser[];
  posts: PostItem[];
  messages: DirectMessage[];
  notifications: NotificationItem[];
  reports: StoredReport[];
  sessionSecret: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'opencircle.json');

export const DEFAULT_THEME: ThemeConfig = {
  mode: 'light',
  backgroundColor: '#f8f9fa',
  surfaceColor: '#ffffff',
  accentColor: '#0f766e',
  pattern: 'none',
};

export const DEFAULT_SAFETY: SafetyConfig = {
  commentPolicy: 'everyone',
  messagePolicy: 'everyone',
  bleepMode: 'asterisks',
  blockedKeywords: [],
  blockedUserIds: [],
};

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, s, 64).toString('hex');
  return { hash, salt: s };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, 'hex');
  if (derived.length !== stored.length) return false;
  return crypto.timingSafeEqual(derived, stored);
}

function createInitialData(): DatabaseState {
  const now = Date.now();
  const iso = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString();

  const mayaPass = hashPassword('OpenCircle!2026');
  const marcusPass = hashPassword('OpenCircle!2026');

  const maya: StoredUser = {
    id: 'user-maya',
    email: 'maya@opencircle.app',
    passwordHash: mayaPass.hash,
    passwordSalt: mayaPass.salt,
    name: 'Maya Lin',
    handle: 'mayalin',
    bio: 'Urban gardener & community kitchen volunteer sharing practical starter guides so anyone can grow food on a windowsill.',
    avatarUrl: '/src/assets/images/avatar_maya_1795120127941.jpg',
    followerTitle: 'Sunbeams',
    followingIds: ['user-marcus'],
    followerIds: ['user-marcus'],
    theme: { ...DEFAULT_THEME },
    safety: { ...DEFAULT_SAFETY },
    createdAt: iso(1440),
  };

  const marcus: StoredUser = {
    id: 'user-marcus',
    email: 'marcus@opencircle.app',
    passwordHash: marcusPass.hash,
    passwordSalt: marcusPass.salt,
    name: 'Marcus Vance',
    handle: 'marcusfixes',
    bio: 'Weekend repair coach helping strangers fix bikes, small appliances, and study habits without buying new gear.',
    avatarUrl: '/src/assets/images/avatar_marcus_1795120128144.jpg',
    followerTitle: 'Fixers',
    followingIds: ['user-maya'],
    followerIds: ['user-maya'],
    theme: { ...DEFAULT_THEME, accentColor: '#2563eb' },
    safety: { ...DEFAULT_SAFETY },
    createdAt: iso(1300),
  };

  const posts: PostItem[] = [
    {
      id: 'post-garden-1',
      authorId: 'user-maya',
      authorName: maya.name,
      authorHandle: maya.handle,
      authorAvatarUrl: maya.avatarUrl,
      authorFollowerTitle: maya.followerTitle,
      kind: 'picture',
      topic: 'Community & Food',
      title: 'How to regrow kitchen herbs from grocery stems in 7 days',
      body: 'Cut 4 inches of fresh basil or mint, trim the bottom leaves, and place the stems in clean jar water near indirect sunlight. Change the water every two days—once roots reach 2 inches, pot them in light soil and share cuttings with a neighbor.',
      mediaUrl: '/src/assets/images/community_garden_story_1795120127065.jpg',
      mediaMime: 'image/jpeg',
      wasBleeped: false,
      helpfulCount: 38,
      helpfulUserIds: ['user-marcus'],
      comments: [
        {
          id: 'comment-1',
          postId: 'post-garden-1',
          authorId: 'user-marcus',
          authorName: marcus.name,
          authorHandle: marcus.handle,
          authorAvatarUrl: marcus.avatarUrl,
          text: 'Tried this with store-bought rosemary and basil last month—both took root cleanly. Appreciate the tip!',
          wasBleeped: false,
          createdAt: iso(95),
        },
      ],
      createdAt: iso(180),
    },
    {
      id: 'post-repair-2',
      authorId: 'user-marcus',
      authorName: marcus.name,
      authorHandle: marcus.handle,
      authorAvatarUrl: marcus.avatarUrl,
      authorFollowerTitle: marcus.followerTitle,
      kind: 'picture',
      topic: 'Hands-On Skills',
      title: 'True a wobbly bicycle wheel in 10 minutes with a spoke wrench',
      body: 'Before paying for a wheel rebuild, flip your bike upside down, spin the wheel slowly, and hold a zip-tie against the frame as a guide. Tighten the opposite spoke a quarter-turn at a time where the rim rubs. Small adjustments go a long way.',
      mediaUrl: '/src/assets/images/repair_workshop_photo_1795120128178.jpg',
      mediaMime: 'image/jpeg',
      wasBleeped: false,
      helpfulCount: 24,
      helpfulUserIds: ['user-maya'],
      comments: [],
      createdAt: iso(110),
    },
    {
      id: 'post-story-3',
      authorId: 'user-maya',
      authorName: maya.name,
      authorHandle: maya.handle,
      authorAvatarUrl: maya.avatarUrl,
      authorFollowerTitle: maya.followerTitle,
      kind: 'story',
      topic: 'Study & Career',
      title: 'The 20-minute handwritten summary method that saved my night exams',
      body: 'Whenever I felt overwhelmed preparing for finals while working part-time, I stopped re-reading chapters passively. Instead, I opened one blank page and wrote only formulas, cause-and-effect arrows, and three worked mistakes in plain ink. Explaining each box out loud to an empty room exposes every gap in ten minutes flat.',
      mediaUrl: '/src/assets/images/study_notes_photo_1795120128344.jpg',
      mediaMime: 'image/jpeg',
      wasBleeped: false,
      helpfulCount: 41,
      helpfulUserIds: ['user-marcus'],
      comments: [],
      createdAt: iso(45),
    },
  ];

  const messages: DirectMessage[] = [
    {
      id: 'msg-1',
      senderId: 'user-marcus',
      recipientId: 'user-maya',
      text: 'Hey Maya! Thanks for sharing the herb cuttings guide—our Saturday repair cafe folks loved it.',
      wasBleeped: false,
      createdAt: iso(60),
      read: true,
    },
  ];

  const notifications: NotificationItem[] = [
    {
      id: 'notif-1',
      userId: 'user-maya',
      type: 'follow',
      actorId: 'user-marcus',
      actorName: marcus.name,
      actorAvatarUrl: marcus.avatarUrl,
      title: 'New Sunbeam joined your circle',
      body: 'Marcus Vance became one of your Sunbeams.',
      read: false,
      createdAt: iso(120),
    },
    {
      id: 'notif-2',
      userId: 'user-maya',
      type: 'comment',
      actorId: 'user-marcus',
      actorName: marcus.name,
      actorAvatarUrl: marcus.avatarUrl,
      postId: 'post-garden-1',
      title: 'Marcus Vance commented on your picture',
      body: 'Tried this with store-bought rosemary and basil last month—both took root cleanly.',
      read: false,
      createdAt: iso(95),
    },
  ];

  return {
    users: [maya, marcus],
    posts,
    messages,
    notifications,
    reports: [],
    sessionSecret: crypto.randomBytes(32).toString('hex'),
  };
}

class Store {
  private state: DatabaseState;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(DB_PATH)) {
      try {
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        this.state = JSON.parse(raw) as DatabaseState;
        if (!this.state.sessionSecret) {
          this.state.sessionSecret = crypto.randomBytes(32).toString('hex');
        }
      } catch {
        this.state = createInitialData();
        this.persistSync();
      }
    } else {
      this.state = createInitialData();
      this.persistSync();
    }
  }

  private persistSync() {
    const tmp = `${DB_PATH}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.state, null, 2), 'utf8');
    fs.renameSync(tmp, DB_PATH);
  }

  async save(): Promise<void> {
    this.writeQueue = this.writeQueue.then(async () => {
      const tmp = `${DB_PATH}.tmp`;
      await fs.promises.writeFile(tmp, JSON.stringify(this.state, null, 2), 'utf8');
      await fs.promises.rename(tmp, DB_PATH);
    });
    return this.writeQueue;
  }

  getState(): DatabaseState {
    return this.state;
  }

  signToken(userId: string): string {
    const payload = Buffer.from(JSON.stringify({ uid: userId, iat: Date.now() })).toString('base64url');
    const sig = crypto.createHmac('sha256', this.state.sessionSecret).update(payload).digest('base64url');
    return `${payload}.${sig}`;
  }

  verifyToken(token: string): string | null {
    if (!token || !token.includes('.')) return null;
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const expected = crypto.createHmac('sha256', this.state.sessionSecret).update(payload).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    try {
      const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { uid?: string };
      return parsed.uid || null;
    } catch {
      return null;
    }
  }

  toPublicUser(user: StoredUser): UserPublic {
    const helpfulCount = this.state.posts
      .filter((p) => p.authorId === user.id)
      .reduce((sum, p) => sum + p.helpfulCount, 0);

    return {
      id: user.id,
      name: user.name,
      handle: user.handle,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      followerTitle: user.followerTitle || 'Followers',
      followerCount: user.followerIds.length,
      followingCount: user.followingIds.length,
      helpfulCount,
      createdAt: user.createdAt,
      safety: user.safety,
    };
  }

  toAuthUser(user: StoredUser): AuthUser {
    return {
      ...this.toPublicUser(user),
      email: user.email,
      theme: user.theme,
      followingIds: user.followingIds,
      customApkUrl: user.customApkUrl,
    };
  }
}

export const store = new Store();
