import crypto from 'crypto';
import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { bleepText, containsBlockedKeywords } from './shared/profanity';
import type { AudiencePolicy, CommentItem, DirectMessage, PostKind } from './shared/types';
import { inspectMediaForNudity } from './server/moderation';
import { DEFAULT_SAFETY, DEFAULT_THEME, hashPassword, store, StoredUser, verifyPassword } from './server/store';

const PORT = 3000;
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.bin';
    const safeExt = ext.replace(/[^a-z0-9.]/g, '');
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 28 * 1024 * 1024, // 28MB max for short videos & photos
  },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/webm',
      'video/quicktime',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported media format. Please upload JPG, PNG, WebP, GIF, MP4, MOV, or WebM.'));
    }
  },
});

interface AuthedRequest extends Request {
  currentUser?: StoredUser;
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    for (const part of cookieHeader.split(';')) {
      const [k, ...rest] = part.trim().split('=');
      if (k === 'oc_token') {
        return decodeURIComponent(rest.join('='));
      }
    }
  }
  return null;
}

function attachUser(req: AuthedRequest, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    const uid = store.verifyToken(token);
    if (uid) {
      const user = store.getState().users.find((u) => u.id === uid);
      if (user) req.currentUser = user;
    }
  }
  next();
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.currentUser) {
    res.status(401).json({ error: 'Please sign in or create an Open Circle account first.' });
    return;
  }
  next();
}

function sanitizeHandle(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 24);
}

function isValidPolicy(p: unknown): p is AudiencePolicy {
  return p === 'everyone' || p === 'followers' || p === 'off';
}

function removeFileQuietly(filePath: string) {
  fs.promises.unlink(filePath).catch(() => {});
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));
  app.use(attachUser);
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Health
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, app: 'Open Circle' });
  });

  // Auth: Register
  app.post('/api/auth/register', async (req: AuthedRequest, res: Response) => {
    const { name, handle, email, password, followerTitle, bio } = req.body ?? {};
    if (typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ error: 'Please enter a display name (at least 2 characters).' });
      return;
    }
    if (typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const db = store.getState();
    const normEmail = email.trim().toLowerCase();
    if (db.users.some((u) => u.email.toLowerCase() === normEmail)) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const baseHandle = sanitizeHandle(handle || name) || `member${Math.floor(100 + Math.random() * 900)}`;
    let finalHandle = baseHandle;
    let suffix = 1;
    while (db.users.some((u) => u.handle === finalHandle)) {
      finalHandle = `${baseHandle.slice(0, 20)}${suffix++}`;
    }

    const cleanName = bleepText(name.trim()).text;
    const cleanBio = bleepText((typeof bio === 'string' ? bio : '').trim().slice(0, 260)).text;
    const rawTitle = typeof followerTitle === 'string' && followerTitle.trim() ? followerTitle.trim() : 'Kindred';
    const cleanFollowerTitle = bleepText(rawTitle.slice(0, 24)).text;

    const { hash, salt } = hashPassword(password);
    const newUser: StoredUser = {
      id: `user-${crypto.randomUUID()}`,
      email: normEmail,
      passwordHash: hash,
      passwordSalt: salt,
      name: cleanName,
      handle: finalHandle,
      bio: cleanBio || 'Sharing helpful moments and stories on Open Circle.',
      avatarUrl: '',
      followerTitle: cleanFollowerTitle,
      followingIds: [],
      followerIds: [],
      theme: { ...DEFAULT_THEME },
      safety: { ...DEFAULT_SAFETY },
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    db.notifications.unshift({
      id: `notif-${crypto.randomUUID()}`,
      userId: newUser.id,
      type: 'safety',
      title: 'Welcome to Open Circle',
      body: `Your follower circle is named "${newUser.followerTitle}". Foul language is automatically bleeped and nudity is strictly blocked across all uploads.`,
      read: false,
      createdAt: new Date().toISOString(),
    });

    await store.save();
    const token = store.signToken(newUser.id);
    res.cookie('oc_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 3600 * 1000 });
    res.status(201).json({ token, user: store.toAuthUser(newUser) });
  });

  // Auth: Login
  app.post('/api/auth/login', async (req: AuthedRequest, res: Response) => {
    const { identifier, password } = req.body ?? {};
    if (typeof identifier !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Please enter your email or handle and password.' });
      return;
    }

    const key = identifier.trim().toLowerCase().replace(/^@/, '');
    const user = store
      .getState()
      .users.find((u) => u.email.toLowerCase() === key || u.handle.toLowerCase() === key);

    if (!user || !verifyPassword(password, user.passwordHash, user.passwordSalt)) {
      res.status(401).json({ error: 'Invalid email/handle or password.' });
      return;
    }

    const token = store.signToken(user.id);
    res.cookie('oc_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 3600 * 1000 });
    res.json({ token, user: store.toAuthUser(user) });
  });

  // Auth: Logout
  app.post('/api/auth/logout', (_req, res) => {
    res.clearCookie('oc_token');
    res.json({ ok: true });
  });

  // Auth: Me
  app.get('/api/auth/me', (req: AuthedRequest, res: Response) => {
    if (!req.currentUser) {
      res.json({ user: null });
      return;
    }
    res.json({ user: store.toAuthUser(req.currentUser) });
  });

  // Profile & Custom Follower Title & Theme & Safety Update
  app.patch('/api/profile', requireAuth, async (req: AuthedRequest, res: Response) => {
    const user = req.currentUser!;
    const { name, bio, followerTitle, avatarUrl, theme, safety, customApkUrl } = req.body ?? {};

    if (typeof name === 'string' && name.trim().length >= 2) {
      user.name = bleepText(name.trim().slice(0, 50), user.safety.bleepMode).text;
    }
    if (typeof bio === 'string') {
      user.bio = bleepText(bio.trim().slice(0, 260), user.safety.bleepMode).text;
    }
    if (typeof followerTitle === 'string' && followerTitle.trim().length >= 2) {
      const cleanTitle = bleepText(followerTitle.trim().slice(0, 24), user.safety.bleepMode).text;
      user.followerTitle = cleanTitle;
      // Sync authorFollowerTitle on user's posts
      for (const post of store.getState().posts) {
        if (post.authorId === user.id) {
          post.authorFollowerTitle = cleanTitle;
          post.authorName = user.name;
        }
      }
    }
    if (typeof avatarUrl === 'string') {
      user.avatarUrl = avatarUrl;
      for (const post of store.getState().posts) {
        if (post.authorId === user.id) {
          post.authorAvatarUrl = avatarUrl;
        }
      }
    }
    if (typeof customApkUrl === 'string') {
      const trimmed = customApkUrl.trim();
      if (!trimmed || /^https?:\/\//i.test(trimmed)) {
        user.customApkUrl = trimmed;
      }
    }
    if (theme && typeof theme === 'object') {
      user.theme = {
        mode: theme.mode === 'dark' ? 'dark' : 'light',
        backgroundColor: typeof theme.backgroundColor === 'string' ? theme.backgroundColor : user.theme.backgroundColor,
        surfaceColor: typeof theme.surfaceColor === 'string' ? theme.surfaceColor : user.theme.surfaceColor,
        accentColor: typeof theme.accentColor === 'string' ? theme.accentColor : user.theme.accentColor,
        pattern:
          theme.pattern === 'dots' || theme.pattern === 'grid' || theme.pattern === 'warm-glow'
            ? theme.pattern
            : 'none',
      };
    }
    if (safety && typeof safety === 'object') {
      user.safety = {
        commentPolicy: isValidPolicy(safety.commentPolicy) ? safety.commentPolicy : user.safety.commentPolicy,
        messagePolicy: isValidPolicy(safety.messagePolicy) ? safety.messagePolicy : user.safety.messagePolicy,
        bleepMode: safety.bleepMode === 'bleep-tag' ? 'bleep-tag' : 'asterisks',
        blockedKeywords: Array.isArray(safety.blockedKeywords)
          ? safety.blockedKeywords
              .filter((k: unknown) => typeof k === 'string')
              .map((k: string) => k.trim().toLowerCase())
              .filter(Boolean)
              .slice(0, 30)
          : user.safety.blockedKeywords,
        blockedUserIds: Array.isArray(safety.blockedUserIds)
          ? safety.blockedUserIds.filter((id: unknown) => typeof id === 'string')
          : user.safety.blockedUserIds,
      };
    }

    await store.save();
    res.json({ user: store.toAuthUser(user) });
  });

  // Upload media with Gemini Vision nudity screening
  app.post('/api/upload', requireAuth, (req: AuthedRequest, res: Response) => {
    upload.single('media')(req, res, async (err) => {
      if (err) {
        res.status(400).json({ error: err.message || 'Upload failed.' });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: 'No media file attached.' });
        return;
      }

      const filePath = req.file.path;
      const isVideo = req.file.mimetype.startsWith('video/');

      try {
        const frames: Array<{ mimeType: string; base64Data: string }> = [];

        if (!isVideo) {
          const buf = await fs.promises.readFile(filePath);
          frames.push({
            mimeType: req.file.mimetype,
            base64Data: buf.toString('base64'),
          });
        } else {
          const rawFrames = req.body?.videoFrames;
          let parsedFrames: Array<{ mimeType?: string; base64Data?: string }> = [];
          if (typeof rawFrames === 'string') {
            try {
              parsedFrames = JSON.parse(rawFrames);
            } catch {
              parsedFrames = [];
            }
          }
          for (const f of parsedFrames.slice(0, 3)) {
            if (f && typeof f.base64Data === 'string' && f.base64Data.length > 20) {
              frames.push({
                mimeType: f.mimeType || 'image/jpeg',
                base64Data: f.base64Data,
              });
            }
          }
        }

        const moderation = await inspectMediaForNudity(frames);
        if (!moderation.allowed) {
          removeFileQuietly(filePath);
          res.status(422).json({
            error: moderation.reason || 'This upload was blocked by Open Circle safety screening.',
            containsNudity: moderation.containsNudity,
          });
          return;
        }

        res.json({
          mediaUrl: `/uploads/${req.file.filename}`,
          mediaMime: req.file.mimetype,
          moderationReason: moderation.reason,
        });
      } catch (modErr) {
        removeFileQuietly(filePath);
        const msg = modErr instanceof Error ? modErr.message : 'Unable to verify media safety.';
        res.status(502).json({ error: `Media safety verification failed: ${msg}` });
      }
    });
  });

  // Public Community Users Directory
  app.get('/api/users', (req: AuthedRequest, res: Response) => {
    const blocked = new Set(req.currentUser?.safety.blockedUserIds || []);
    const users = store
      .getState()
      .users.filter((u) => !blocked.has(u.id))
      .map((u) => store.toPublicUser(u));
    res.json({ users });
  });

  app.get('/api/users/:id', (req: AuthedRequest, res: Response) => {
    const target = store.getState().users.find((u) => u.id === req.params.id || u.handle === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Profile not found.' });
      return;
    }
    res.json({ user: store.toPublicUser(target) });
  });

  // Follow / Unfollow (using the creator's custom followerTitle)
  app.post('/api/users/:id/follow', requireAuth, async (req: AuthedRequest, res: Response) => {
    const me = req.currentUser!;
    const target = store.getState().users.find((u) => u.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Member not found.' });
      return;
    }
    if (target.id === me.id) {
      res.status(400).json({ error: 'You cannot follow yourself.' });
      return;
    }
    if (target.safety.blockedUserIds.includes(me.id)) {
      res.status(403).json({ error: 'You cannot follow this member.' });
      return;
    }

    const alreadyFollowing = me.followingIds.includes(target.id);
    if (alreadyFollowing) {
      me.followingIds = me.followingIds.filter((id) => id !== target.id);
      target.followerIds = target.followerIds.filter((id) => id !== me.id);
    } else {
      me.followingIds.push(target.id);
      if (!target.followerIds.includes(me.id)) {
        target.followerIds.push(me.id);
      }
      store.getState().notifications.unshift({
        id: `notif-${crypto.randomUUID()}`,
        userId: target.id,
        type: 'follow',
        actorId: me.id,
        actorName: me.name,
        actorAvatarUrl: me.avatarUrl,
        title: `New ${target.followerTitle} member`,
        body: `${me.name} joined your ${target.followerTitle}!`,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    await store.save();
    res.json({
      following: !alreadyFollowing,
      followerTitle: target.followerTitle,
      followerCount: target.followerIds.length,
      me: store.toAuthUser(me),
    });
  });

  // Block / Unblock User
  app.post('/api/users/:id/block', requireAuth, async (req: AuthedRequest, res: Response) => {
    const me = req.currentUser!;
    const targetId = req.params.id;
    if (targetId === me.id) {
      res.status(400).json({ error: 'Cannot block yourself.' });
      return;
    }
    const isBlocked = me.safety.blockedUserIds.includes(targetId);
    if (isBlocked) {
      me.safety.blockedUserIds = me.safety.blockedUserIds.filter((id) => id !== targetId);
    } else {
      me.safety.blockedUserIds.push(targetId);
      me.followingIds = me.followingIds.filter((id) => id !== targetId);
      const target = store.getState().users.find((u) => u.id === targetId);
      if (target) {
        target.followerIds = target.followerIds.filter((id) => id !== me.id);
      }
    }
    await store.save();
    res.json({ blocked: !isBlocked, me: store.toAuthUser(me) });
  });

  // Global Feed (visible worldwide)
  app.get('/api/posts', (req: AuthedRequest, res: Response) => {
    const kind = req.query.kind as string | undefined;
    const authorId = req.query.authorId as string | undefined;
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const blocked = new Set(req.currentUser?.safety.blockedUserIds || []);

    const posts = store
      .getState()
      .posts.filter((p) => {
        if (blocked.has(p.authorId)) return false;
        if (kind && kind !== 'all' && p.kind !== kind) return false;
        if (authorId && p.authorId !== authorId) return false;
        if (q) {
          const hay = `${p.title} ${p.body} ${p.topic} ${p.authorName} ${p.authorHandle}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .map((post) => ({
        ...post,
        comments: post.comments.filter((c) => !blocked.has(c.authorId)),
      }));

    res.json({ posts });
  });

  // Create Post (picture, story, or short video) with automatic profanity bleeping
  app.post('/api/posts', requireAuth, async (req: AuthedRequest, res: Response) => {
    const me = req.currentUser!;
    const { kind, topic, title, body, mediaUrl, mediaMime } = req.body ?? {};
    const validKinds: PostKind[] = ['picture', 'story', 'video'];
    const postKind: PostKind = validKinds.includes(kind) ? kind : 'story';

    if (typeof title !== 'string' || title.trim().length < 3) {
      res.status(400).json({ error: 'Please include a clear title (at least 3 characters).' });
      return;
    }
    if (typeof body !== 'string' || body.trim().length < 5) {
      res.status(400).json({ error: 'Please share helpful details in your post (at least 5 characters).' });
      return;
    }
    if ((postKind === 'picture' || postKind === 'video') && !mediaUrl) {
      res.status(400).json({ error: `Please upload a ${postKind} before publishing.` });
      return;
    }

    const titleBleep = bleepText(title.trim().slice(0, 140), me.safety.bleepMode);
    const bodyBleep = bleepText(body.trim().slice(0, 3000), me.safety.bleepMode);
    const topicBleep = bleepText((typeof topic === 'string' && topic.trim() ? topic.trim() : 'Everyday Help').slice(0, 40), me.safety.bleepMode);

    const post = {
      id: `post-${crypto.randomUUID()}`,
      authorId: me.id,
      authorName: me.name,
      authorHandle: me.handle,
      authorAvatarUrl: me.avatarUrl,
      authorFollowerTitle: me.followerTitle,
      kind: postKind,
      topic: topicBleep.text,
      title: titleBleep.text,
      body: bodyBleep.text,
      mediaUrl: typeof mediaUrl === 'string' ? mediaUrl : undefined,
      mediaMime: typeof mediaMime === 'string' ? mediaMime : undefined,
      wasBleeped: titleBleep.wasBleeped || bodyBleep.wasBleeped || topicBleep.wasBleeped,
      helpfulCount: 0,
      helpfulUserIds: [],
      comments: [],
      createdAt: new Date().toISOString(),
    };

    store.getState().posts.unshift(post);
    await store.save();
    res.status(201).json({ post });
  });

  // Toggle Helpful Reaction
  app.post('/api/posts/:id/helpful', requireAuth, async (req: AuthedRequest, res: Response) => {
    const me = req.currentUser!;
    const post = store.getState().posts.find((p) => p.id === req.params.id);
    if (!post) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }

    const idx = post.helpfulUserIds.indexOf(me.id);
    if (idx >= 0) {
      post.helpfulUserIds.splice(idx, 1);
      post.helpfulCount = Math.max(0, post.helpfulCount - 1);
    } else {
      post.helpfulUserIds.push(me.id);
      post.helpfulCount += 1;
      if (post.authorId !== me.id) {
        store.getState().notifications.unshift({
          id: `notif-${crypto.randomUUID()}`,
          userId: post.authorId,
          type: 'helpful',
          actorId: me.id,
          actorName: me.name,
          actorAvatarUrl: me.avatarUrl,
          postId: post.id,
          title: `${me.name} found your post helpful`,
          body: `"${post.title}"`,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    }

    await store.save();
    res.json({ post });
  });

  // Add Comment with Author Safety Controls & Profanity Bleeping
  app.post('/api/posts/:id/comments', requireAuth, async (req: AuthedRequest, res: Response) => {
    const me = req.currentUser!;
    const post = store.getState().posts.find((p) => p.id === req.params.id);
    if (!post) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }

    const author = store.getState().users.find((u) => u.id === post.authorId);
    if (author && author.id !== me.id) {
      if (author.safety.blockedUserIds.includes(me.id)) {
        res.status(403).json({ error: 'You cannot comment on this member’s posts.' });
        return;
      }
      if (author.safety.commentPolicy === 'off') {
        res.status(403).json({ error: `${author.name} has turned off comments on their posts.` });
        return;
      }
      if (author.safety.commentPolicy === 'followers' && !author.followerIds.includes(me.id)) {
        res.status(403).json({
          error: `Only ${author.name}'s ${author.followerTitle} can comment here. Follow them first to join the conversation.`,
        });
        return;
      }
    }

    const rawText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (rawText.length < 1) {
      res.status(400).json({ error: 'Please write a comment before sending.' });
      return;
    }

    if (author) {
      const blockedKw = containsBlockedKeywords(rawText, author.safety.blockedKeywords);
      if (blockedKw) {
        res.status(422).json({
          error: `Your comment contains a word filtered by ${author.name}'s safety preferences ("${blockedKw}").`,
        });
        return;
      }
    }

    const bleeped = bleepText(rawText.slice(0, 600), author?.safety.bleepMode || me.safety.bleepMode);
    const comment: CommentItem = {
      id: `comment-${crypto.randomUUID()}`,
      postId: post.id,
      authorId: me.id,
      authorName: me.name,
      authorHandle: me.handle,
      authorAvatarUrl: me.avatarUrl,
      text: bleeped.text,
      wasBleeped: bleeped.wasBleeped,
      createdAt: new Date().toISOString(),
    };

    post.comments.push(comment);

    if (post.authorId !== me.id) {
      store.getState().notifications.unshift({
        id: `notif-${crypto.randomUUID()}`,
        userId: post.authorId,
        type: 'comment',
        actorId: me.id,
        actorName: me.name,
        actorAvatarUrl: me.avatarUrl,
        postId: post.id,
        title: `${me.name} commented on "${post.title.slice(0, 42)}"`,
        body: comment.text,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    await store.save();
    res.status(201).json({ comment, post });
  });

  // Delete own post
  app.delete('/api/posts/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
    const me = req.currentUser!;
    const db = store.getState();
    const idx = db.posts.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }
    if (db.posts[idx].authorId !== me.id) {
      res.status(403).json({ error: 'You can only delete your own posts.' });
      return;
    }
    db.posts.splice(idx, 1);
    await store.save();
    res.json({ ok: true });
  });

  // Direct Messages (conversations & sending with safety controls)
  app.get('/api/messages', requireAuth, (req: AuthedRequest, res: Response) => {
    const me = req.currentUser!;
    const db = store.getState();
    const blocked = new Set(me.safety.blockedUserIds);
    const relevant = db.messages.filter(
      (m) =>
        (m.senderId === me.id || m.recipientId === me.id) &&
        !blocked.has(m.senderId === me.id ? m.recipientId : m.senderId)
    );

    const threadMap = new Map<string, typeof relevant>();
    for (const msg of relevant) {
      const peerId = msg.senderId === me.id ? msg.recipientId : msg.senderId;
      if (!threadMap.has(peerId)) threadMap.set(peerId, []);
      threadMap.get(peerId)!.push(msg);
    }

    const threads = Array.from(threadMap.entries())
      .map(([peerId, msgs]) => {
        const peer = db.users.find((u) => u.id === peerId);
        if (!peer) return null;
        const sorted = [...msgs].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        const unreadCount = sorted.filter((m) => m.recipientId === me.id && !m.read).length;
        return {
          peer: store.toPublicUser(peer),
          messages: sorted,
          unreadCount,
          lastMessageAt: sorted[sorted.length - 1]?.createdAt || '',
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.lastMessageAt.localeCompare(a!.lastMessageAt));

    res.json({ threads });
  });

  app.post('/api/messages', requireAuth, async (req: AuthedRequest, res: Response) => {
    const me = req.currentUser!;
    const { recipientId, text } = req.body ?? {};
    if (typeof recipientId !== 'string' || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ error: 'Recipient and message text are required.' });
      return;
    }
    if (recipientId === me.id) {
      res.status(400).json({ error: 'Cannot send a direct message to yourself.' });
      return;
    }

    const recipient = store.getState().users.find((u) => u.id === recipientId);
    if (!recipient) {
      res.status(404).json({ error: 'Recipient not found.' });
      return;
    }
    if (recipient.safety.blockedUserIds.includes(me.id) || me.safety.blockedUserIds.includes(recipient.id)) {
      res.status(403).json({ error: 'Messaging is unavailable because one of you has blocked the other.' });
      return;
    }
    if (recipient.safety.messagePolicy === 'off') {
      res.status(403).json({ error: `${recipient.name} has paused incoming direct messages.` });
      return;
    }
    if (recipient.safety.messagePolicy === 'followers' && !recipient.followerIds.includes(me.id)) {
      res.status(403).json({
        error: `Only ${recipient.name}'s ${recipient.followerTitle} can message them directly.`,
      });
      return;
    }

    const blockedKw = containsBlockedKeywords(text, recipient.safety.blockedKeywords);
    if (blockedKw) {
      res.status(422).json({
        error: `Message blocked by recipient's keyword safety filter ("${blockedKw}").`,
      });
      return;
    }

    const bleeped = bleepText(text.trim().slice(0, 1200), recipient.safety.bleepMode);
    const msg: DirectMessage = {
      id: `msg-${crypto.randomUUID()}`,
      senderId: me.id,
      recipientId: recipient.id,
      text: bleeped.text,
      wasBleeped: bleeped.wasBleeped,
      createdAt: new Date().toISOString(),
      read: false,
    };

    store.getState().messages.push(msg);
    store.getState().notifications.unshift({
      id: `notif-${crypto.randomUUID()}`,
      userId: recipient.id,
      type: 'message',
      actorId: me.id,
      actorName: me.name,
      actorAvatarUrl: me.avatarUrl,
      title: `New message from ${me.name}`,
      body: msg.text.slice(0, 90),
      read: false,
      createdAt: new Date().toISOString(),
    });

    await store.save();
    res.status(201).json({ message: msg });
  });

  app.post('/api/messages/:peerId/read', requireAuth, async (req: AuthedRequest, res: Response) => {
    const me = req.currentUser!;
    let changed = false;
    for (const m of store.getState().messages) {
      if (m.senderId === req.params.peerId && m.recipientId === me.id && !m.read) {
        m.read = true;
        changed = true;
      }
    }
    if (changed) await store.save();
    res.json({ ok: true });
  });

  // Notifications
  app.get('/api/notifications', requireAuth, (req: AuthedRequest, res: Response) => {
    const me = req.currentUser!;
    const notifications = store
      .getState()
      .notifications.filter((n) => n.userId === me.id)
      .slice(0, 60);
    const unreadCount = notifications.filter((n) => !n.read).length;
    res.json({ notifications, unreadCount });
  });

  app.post('/api/notifications/read', requireAuth, async (req: AuthedRequest, res: Response) => {
    const me = req.currentUser!;
    for (const n of store.getState().notifications) {
      if (n.userId === me.id) n.read = true;
    }
    await store.save();
    res.json({ ok: true });
  });

  // Safety Reporting
  app.post('/api/reports', requireAuth, async (req: AuthedRequest, res: Response) => {
    const me = req.currentUser!;
    const { targetType, targetId, reason } = req.body ?? {};
    if (!targetType || !targetId || typeof reason !== 'string' || !reason.trim()) {
      res.status(400).json({ error: 'Report details are required.' });
      return;
    }
    store.getState().reports.push({
      id: `report-${crypto.randomUUID()}`,
      reporterId: me.id,
      targetType,
      targetId,
      reason: bleepText(reason.trim().slice(0, 400)).text,
      createdAt: new Date().toISOString(),
    });
    await store.save();
    res.status(201).json({ ok: true, message: 'Thank you. Your safety report has been recorded.' });
  });

  // Vite Dev Middleware or Static Production Build
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Open Circle server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Open Circle server:', err);
  process.exit(1);
});
