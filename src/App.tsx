import {
  Bell,
  BookOpen,
  Compass,
  Home,
  Image as ImageIcon,
  Mail,
  MessageCircle,
  MessageSquareShare,
  Palette,
  PlusSquare,
  Search,
  Share2,
  ShieldCheck,
  User,
  Video,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  AuthUser,
  NotificationItem,
  PostItem,
  ThemeConfig,
  UserPublic,
} from '../shared/types';
import { AuthModal } from './components/AuthModal';
import { Avatar } from './components/Avatar';
import { CreatePostModal } from './components/CreatePostModal';
import { MessagesView } from './components/MessagesView';
import { NotificationsView } from './components/NotificationsView';
import { PostCard } from './components/PostCard';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallButton';
import { ProfileView } from './components/ProfileView';
import { ShareAppModal } from './components/ShareAppModal';
import { ThemeCustomizerModal } from './components/ThemeCustomizerModal';
import { api, setAuthToken } from './lib/api';
import { applyThemeToDocument, loadSavedTheme, saveLocalTheme } from './lib/theme';

type AppView = 'feed' | 'messages' | 'notifications' | 'profile';
type KindFilter = 'all' | 'picture' | 'story' | 'video';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const [activeView, setActiveView] = useState<AppView>('feed');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedChatPeerId, setSelectedChatPeerId] = useState<string | null>(null);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('register');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const [theme, setTheme] = useState<ThemeConfig>(() => loadSavedTheme());
  const [loadingFeed, setLoadingFeed] = useState(true);

  useEffect(() => {
    applyThemeToDocument(theme);
    saveLocalTheme(theme);
  }, [theme]);

  const refreshCounts = useCallback(async (userPresent: boolean) => {
    if (!userPresent) {
      setNotifications([]);
      setUnreadNotifs(0);
      setUnreadMessages(0);
      return;
    }
    try {
      const [nRes, mRes] = await Promise.all([api.getNotifications(), api.getMessages()]);
      setNotifications(nRes.notifications);
      setUnreadNotifs(nRes.unreadCount);
      setUnreadMessages(mRes.threads.reduce((sum, t) => sum + t.unreadCount, 0));
    } catch {
      // ignore background count failures
    }
  }, []);

  const loadFeedAndUsers = useCallback(async () => {
    setLoadingFeed(true);
    try {
      const [pRes, uRes] = await Promise.all([
        api.getPosts({ kind: kindFilter, q: searchQuery }),
        api.getUsers(),
      ]);
      setPosts(pRes.posts);
      setUsers(uRes.users);
    } finally {
      setLoadingFeed(false);
    }
  }, [kindFilter, searchQuery]);

  useEffect(() => {
    api
      .getMe()
      .then((res) => {
        setCurrentUser(res.user);
        if (res.user?.theme) {
          setTheme(res.user.theme);
        }
        return refreshCounts(Boolean(res.user));
      })
      .catch(() => {})
      .finally(() => setAuthLoaded(true));
  }, [refreshCounts]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadFeedAndUsers();
    }, 140);
    return () => clearTimeout(timer);
  }, [loadFeedAndUsers]);

  const handleAuthSuccess = async (user: AuthUser) => {
    setCurrentUser(user);
    if (user.theme) setTheme(user.theme);
    setShowAuthModal(false);
    await Promise.all([loadFeedAndUsers(), refreshCounts(true)]);
  };

  const handleLogout = async () => {
    await api.logout().catch(() => {});
    setAuthToken(null);
    setCurrentUser(null);
    setActiveView('feed');
    await Promise.all([loadFeedAndUsers(), refreshCounts(false)]);
  };

  const handleToggleHelpful = async (postId: string) => {
    const { post } = await api.toggleHelpful(postId);
    setPosts((prev) => prev.map((p) => (p.id === post.id ? post : p)));
  };

  const handleAddComment = async (postId: string, text: string) => {
    const { post } = await api.addComment(postId, text);
    setPosts((prev) => prev.map((p) => (p.id === post.id ? post : p)));
  };

  const handleFollowUser = async (userId: string) => {
    const res = await api.followUser(userId);
    setCurrentUser(res.me);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, followerCount: res.followerCount } : u))
    );
  };

  const handleBlockUser = async (userId: string) => {
    const res = await api.blockUser(userId);
    setCurrentUser(res.me);
    await loadFeedAndUsers();
  };

  const handleReportPost = async (postId: string, reason: string) => {
    await api.reportContent({ targetType: 'post', targetId: postId, reason });
  };

  const handleDeletePost = async (postId: string) => {
    await api.deletePost(postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handleSaveTheme = async (next: ThemeConfig) => {
    setTheme(next);
    saveLocalTheme(next);
    if (currentUser) {
      const res = await api.updateProfile({ theme: next });
      setCurrentUser(res.user);
    }
    setShowThemeModal(false);
  };

  const handleSaveCustomApk = async (url: string) => {
    if (!currentUser) return;
    const res = await api.updateProfile({ customApkUrl: url });
    setCurrentUser(res.user);
  };

  const openProfile = (userId: string) => {
    setSelectedProfileId(userId);
    setActiveView('profile');
  };

  const openMessagesWith = (userId?: string) => {
    if (!currentUser) {
      setAuthModalMode('register');
      setShowAuthModal(true);
      return;
    }
    if (userId) setSelectedChatPeerId(userId);
    setActiveView('messages');
  };

  const viewedProfile = useMemo(() => {
    const id = selectedProfileId || currentUser?.id;
    if (!id) return null;
    if (currentUser && currentUser.id === id) return currentUser;
    return users.find((u) => u.id === id) || null;
  }, [selectedProfileId, currentUser, users]);

  const patternClass =
    theme.pattern === 'dots'
      ? 'oc-pattern-dots'
      : theme.pattern === 'grid'
        ? 'oc-pattern-grid'
        : theme.pattern === 'warm-glow'
          ? 'oc-pattern-warm-glow'
          : '';

  const shareOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const quickShareText = encodeURIComponent(
    `Join me on Open Circle! Share helpful pictures, stories & short videos on Windows, iOS, and Android: ${
      currentUser?.customApkUrl || shareOrigin
    }`
  );

  return (
    <div className={`min-h-screen flex flex-col pb-20 md:pb-10 ${patternClass}`}>
      {/* 3-Zone Top Bar Contract */}
      <header
        className="sticky top-0 z-30 backdrop-blur-md"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--oc-surface) 88%, transparent)',
          borderBottom: '1px solid var(--oc-border)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 md:h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-element brand wordmark */}
          <button
            type="button"
            onClick={() => {
              setActiveView('feed');
              setSelectedProfileId(null);
            }}
            className="font-display text-lg md:text-xl font-bold tracking-tight whitespace-nowrap shrink-0 text-left"
          >
            Open Circle
          </button>

          {/* Zone 2: Clean single-line navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveView('feed')}
              className="whitespace-nowrap shrink-0 py-1 transition-colors hover:opacity-80"
              style={{
                color: activeView === 'feed' ? 'var(--oc-accent)' : 'var(--oc-muted)',
                fontWeight: activeView === 'feed' ? 600 : 500,
              }}
            >
              Feed
            </button>
            <button
              type="button"
              onClick={() => openMessagesWith()}
              className="whitespace-nowrap shrink-0 py-1 transition-colors hover:opacity-80"
              style={{
                color: activeView === 'messages' ? 'var(--oc-accent)' : 'var(--oc-muted)',
                fontWeight: activeView === 'messages' ? 600 : 500,
              }}
            >
              Messages{unreadMessages > 0 ? ` (${unreadMessages})` : ''}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!currentUser) {
                  setAuthModalMode('register');
                  setShowAuthModal(true);
                  return;
                }
                setActiveView('notifications');
              }}
              className="whitespace-nowrap shrink-0 py-1 transition-colors hover:opacity-80"
              style={{
                color: activeView === 'notifications' ? 'var(--oc-accent)' : 'var(--oc-muted)',
                fontWeight: activeView === 'notifications' ? 600 : 500,
              }}
            >
              Notifications{unreadNotifs > 0 ? ` (${unreadNotifs})` : ''}
            </button>
            <button
              type="button"
              onClick={() => setShowThemeModal(true)}
              className="whitespace-nowrap shrink-0 py-1 transition-colors hover:opacity-80"
              style={{ color: 'var(--oc-muted)' }}
            >
              Customize
            </button>
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="whitespace-nowrap shrink-0 py-1 transition-colors hover:opacity-80"
              style={{ color: 'var(--oc-muted)' }}
            >
              Share App
            </button>
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (!currentUser) {
                  setAuthModalMode('login');
                  setShowAuthModal(true);
                } else {
                  setShowCreateModal(true);
                }
              }}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 min-h-[40px] transition-opacity hover:opacity-90"
              style={{
                backgroundColor: 'var(--oc-accent)',
                color: 'var(--oc-accent-fg)',
              }}
            >
              {currentUser ? 'Share Post' : 'Sign In'}
            </button>
          </div>
        </div>
      </header>

      {/* Main 1440px Multi-Column Responsive Workspace */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Rail */}
          <aside className="hidden lg:block lg:col-span-3 space-y-5 sticky top-22">
            {/* User Account / Join Card */}
            <div
              className="rounded-2xl p-5"
              style={{
                backgroundColor: 'var(--oc-surface)',
                border: '1px solid var(--oc-border)',
              }}
            >
              {currentUser ? (
                <div>
                  <button
                    type="button"
                    onClick={() => openProfile(currentUser.id)}
                    className="w-full flex items-center gap-3 text-left group"
                  >
                    <Avatar src={currentUser.avatarUrl} name={currentUser.name} size="md" />
                    <div className="min-w-0">
                      <div className="font-display font-bold text-sm truncate group-hover:underline">
                        {currentUser.name}
                      </div>
                      <div className="text-xs truncate" style={{ color: 'var(--oc-muted)' }}>
                        @{currentUser.handle} · {currentUser.followerCount}{' '}
                        {currentUser.followerTitle}
                      </div>
                    </div>
                  </button>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => openProfile(currentUser.id)}
                      className="px-3 py-2 rounded-xl text-xs font-semibold min-h-[38px]"
                      style={{
                        backgroundColor: 'var(--oc-surface-alt)',
                        border: '1px solid var(--oc-border)',
                      }}
                    >
                      My Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowThemeModal(true)}
                      className="px-3 py-2 rounded-xl text-xs font-semibold min-h-[38px]"
                      style={{
                        backgroundColor: 'var(--oc-surface-alt)',
                        border: '1px solid var(--oc-border)',
                      }}
                    >
                      Colors
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="font-display font-bold text-base">Help Someone Worldwide</h2>
                  <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--oc-muted)' }}>
                    Register to share pictures, stories, and short videos—and choose a unique name
                    for your followers.
                  </p>
                  <div className="mt-4 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthModalMode('register');
                        setShowAuthModal(true);
                      }}
                      className="w-full py-2.5 rounded-xl text-xs font-semibold min-h-[40px]"
                      style={{
                        backgroundColor: 'var(--oc-accent)',
                        color: 'var(--oc-accent-fg)',
                      }}
                    >
                      Create Account
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthModalMode('login');
                        setShowAuthModal(true);
                      }}
                      className="w-full py-2 rounded-xl text-xs font-semibold min-h-[38px]"
                      style={{
                        backgroundColor: 'var(--oc-surface-alt)',
                        border: '1px solid var(--oc-border)',
                      }}
                    >
                      Sign In
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Format Navigation */}
            <div
              className="rounded-2xl p-3 space-y-1"
              style={{
                backgroundColor: 'var(--oc-surface)',
                border: '1px solid var(--oc-border)',
              }}
            >
              {(
                [
                  { id: 'all', label: 'All Worldwide Posts', Icon: Compass },
                  { id: 'picture', label: 'Helpful Pictures', Icon: ImageIcon },
                  { id: 'story', label: 'True Stories', Icon: BookOpen },
                  { id: 'video', label: 'Short Videos', Icon: Video },
                ] as const
              ).map(({ id, label, Icon }) => {
                const active = activeView === 'feed' && kindFilter === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setActiveView('feed');
                      setKindFilter(id);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-left min-h-[42px] transition-colors"
                    style={
                      active
                        ? { backgroundColor: 'var(--oc-accent-soft)', color: 'var(--oc-accent)' }
                        : { color: 'var(--oc-text)' }
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Install App Card */}
            <div
              className="rounded-2xl p-4 space-y-3"
              style={{
                backgroundColor: 'var(--oc-surface)',
                border: '1px solid var(--oc-border)',
              }}
            >
              <div className="text-xs font-semibold">Windows · iOS · Android</div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--oc-muted)' }}>
                Install Open Circle on your phone or desktop for full-screen access.
              </p>
              <PWAInstallButton />
            </div>
          </aside>

          {/* Center Main Content */}
          <section className="lg:col-span-6 space-y-5 min-w-0">
            {activeView === 'feed' && (
              <>
                {/* Search + Filter Controls */}
                <div
                  className="rounded-2xl p-4 space-y-3"
                  style={{
                    backgroundColor: 'var(--oc-surface)',
                    border: '1px solid var(--oc-border)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="flex-1 flex items-center gap-2 px-3.5 py-2 rounded-xl min-h-[42px]"
                      style={{
                        backgroundColor: 'var(--oc-surface-alt)',
                        border: '1px solid var(--oc-border)',
                      }}
                    >
                      <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--oc-muted)' }} />
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search helpful guides, stories, or people..."
                        className="w-full bg-transparent text-sm outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowThemeModal(true)}
                      aria-label="Customize background and colors"
                      className="md:hidden p-2.5 rounded-xl min-h-[42px] min-w-[42px] flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: 'var(--oc-surface-alt)',
                        border: '1px solid var(--oc-border)',
                      }}
                    >
                      <Palette className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowShareModal(true)}
                      aria-label="Share Open Circle link"
                      className="md:hidden p-2.5 rounded-xl min-h-[42px] min-w-[42px] flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: 'var(--oc-surface-alt)',
                        border: '1px solid var(--oc-border)',
                      }}
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Interactive Filter Tabs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                    {(
                      [
                        { id: 'all', label: 'Everything' },
                        { id: 'picture', label: 'Pictures' },
                        { id: 'story', label: 'Stories' },
                        { id: 'video', label: 'Short Videos' },
                      ] as const
                    ).map((tab) => {
                      const active = kindFilter === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setKindFilter(tab.id)}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 min-h-[36px] transition-colors"
                          style={
                            active
                              ? { backgroundColor: 'var(--oc-accent)', color: 'var(--oc-accent-fg)' }
                              : {
                                  backgroundColor: 'var(--oc-surface-alt)',
                                  color: 'var(--oc-muted)',
                                }
                          }
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Share Composer Prompt */}
                <button
                  type="button"
                  onClick={() => {
                    if (!currentUser) {
                      setAuthModalMode('register');
                      setShowAuthModal(true);
                    } else {
                      setShowCreateModal(true);
                    }
                  }}
                  className="w-full rounded-2xl p-4 flex items-center gap-3 text-left transition-opacity hover:opacity-95"
                  style={{
                    backgroundColor: 'var(--oc-surface)',
                    border: '1px solid var(--oc-border)',
                  }}
                >
                  <Avatar
                    src={currentUser?.avatarUrl}
                    name={currentUser?.name || 'You'}
                    size="md"
                  />
                  <span className="flex-1 text-sm truncate" style={{ color: 'var(--oc-muted)' }}>
                    {currentUser
                      ? `Share a helpful picture, story, or short video, ${currentUser.name.split(' ')[0]}...`
                      : 'Sign up to share a helpful picture, story, or short video worldwide...'}
                  </span>
                  <span
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0"
                    style={{
                      backgroundColor: 'var(--oc-accent-soft)',
                      color: 'var(--oc-accent)',
                    }}
                  >
                    Upload Media
                  </span>
                </button>

                {/* Worldwide Posts Feed */}
                {loadingFeed ? (
                  <div
                    className="rounded-2xl p-8 text-center text-sm"
                    style={{
                      backgroundColor: 'var(--oc-surface)',
                      border: '1px solid var(--oc-border)',
                      color: 'var(--oc-muted)',
                    }}
                  >
                    Loading Open Circle worldwide feed...
                  </div>
                ) : posts.length === 0 ? (
                  <div
                    className="rounded-2xl p-10 text-center"
                    style={{
                      backgroundColor: 'var(--oc-surface)',
                      border: '1px solid var(--oc-border)',
                    }}
                  >
                    <p className="font-display text-base font-bold">No matching posts yet</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--oc-muted)' }}>
                      Be the first to share something helpful in this category!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {posts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        currentUser={currentUser}
                        onToggleHelpful={handleToggleHelpful}
                        onAddComment={handleAddComment}
                        onFollowUser={handleFollowUser}
                        onOpenProfile={openProfile}
                        onMessageAuthor={(uid) => openMessagesWith(uid)}
                        onBlockUser={handleBlockUser}
                        onReportPost={handleReportPost}
                        onDeletePost={handleDeletePost}
                        onRequireAuth={() => {
                          setAuthModalMode('register');
                          setShowAuthModal(true);
                        }}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {activeView === 'messages' && currentUser && (
              <MessagesView
                currentUser={currentUser}
                users={users}
                initialRecipientId={selectedChatPeerId}
                onBlockUser={handleBlockUser}
                onRefreshCounts={() => refreshCounts(true)}
              />
            )}

            {activeView === 'notifications' && currentUser && (
              <NotificationsView
                notifications={notifications}
                onMarkAllRead={async () => {
                  await api.markNotificationsRead();
                  await refreshCounts(true);
                }}
                onOpenProfile={openProfile}
              />
            )}

            {activeView === 'profile' && viewedProfile && (
              <ProfileView
                profile={viewedProfile}
                currentUser={currentUser}
                posts={posts.filter((p) => p.authorId === viewedProfile.id)}
                allUsers={users}
                onUpdatedMe={(u) => {
                  setCurrentUser(u);
                  loadFeedAndUsers();
                }}
                onFollowUser={handleFollowUser}
                onUnblockUser={handleBlockUser}
                onOpenCustomize={() => setShowThemeModal(true)}
                onMessageUser={(uid) => openMessagesWith(uid)}
                onLogout={handleLogout}
              />
            )}

            {activeView === 'profile' && !viewedProfile && authLoaded && (
              <div
                className="rounded-2xl p-8 text-center"
                style={{
                  backgroundColor: 'var(--oc-surface)',
                  border: '1px solid var(--oc-border)',
                }}
              >
                <p className="font-display text-lg font-bold">Sign in to view your profile</p>
                <p className="text-xs mt-1" style={{ color: 'var(--oc-muted)' }}>
                  Create your account, customize your follower name, and configure safety controls.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalMode('register');
                    setShowAuthModal(true);
                  }}
                  className="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold min-h-[44px]"
                  style={{
                    backgroundColor: 'var(--oc-accent)',
                    color: 'var(--oc-accent-fg)',
                  }}
                >
                  Create Account
                </button>
              </div>
            )}
          </section>

          {/* Right Rail */}
          <aside className="hidden lg:block lg:col-span-3 space-y-5 sticky top-22">
            {/* Share APK / App Link Widget */}
            <div
              className="rounded-2xl p-5 space-y-3"
              style={{
                backgroundColor: 'var(--oc-surface)',
                border: '1px solid var(--oc-border)',
              }}
            >
              <h2 className="font-display text-sm font-bold">Share Open Circle</h2>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--oc-muted)' }}>
                Send the app & install link directly to friends on WhatsApp or Google Mail.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://wa.me/?text=${quickShareText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold min-h-[40px]"
                  style={{ backgroundColor: '#15803d', color: '#ffffff' }}
                >
                  <MessageSquareShare className="w-3.5 h-3.5 shrink-0" />
                  <span>WhatsApp</span>
                </a>
                <a
                  href={`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(
                    'Join me on Open Circle'
                  )}&body=${quickShareText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold min-h-[40px]"
                  style={{ backgroundColor: '#b91c1c', color: '#ffffff' }}
                >
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span>Gmail</span>
                </a>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="w-full py-2 rounded-xl text-xs font-semibold min-h-[38px]"
                style={{
                  backgroundColor: 'var(--oc-surface-alt)',
                  border: '1px solid var(--oc-border)',
                }}
              >
                QR Code & APK Link Hub
              </button>
            </div>

            {/* Community Safety Promise */}
            <div
              className="rounded-2xl p-5 space-y-2.5"
              style={{
                backgroundColor: 'var(--oc-surface)',
                border: '1px solid var(--oc-border)',
              }}
            >
              <div className="flex items-center gap-2 font-display text-sm font-bold">
                <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: 'var(--oc-accent)' }} />
                <span>Kindness & Safety Built In</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--oc-muted)' }}>
                Foul language is automatically bleeped across posts, comments, messages, and follower
                names. All uploaded photos and short videos are screened to block nudity.
              </p>
            </div>

            {/* Creators & Custom Follower Circles */}
            <div
              className="rounded-2xl p-5 space-y-3"
              style={{
                backgroundColor: 'var(--oc-surface)',
                border: '1px solid var(--oc-border)',
              }}
            >
              <h2 className="font-display text-sm font-bold">Circles Worldwide</h2>
              <div className="space-y-3">
                {users.slice(0, 5).map((member) => {
                  const isMe = currentUser?.id === member.id;
                  const following = Boolean(currentUser?.followingIds.includes(member.id));
                  return (
                    <div key={member.id} className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => openProfile(member.id)}
                        className="flex items-center gap-2.5 min-w-0 text-left group"
                      >
                        <Avatar src={member.avatarUrl} name={member.name} size="sm" />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate group-hover:underline">
                            {member.name}
                          </div>
                          <div className="text-[11px] truncate" style={{ color: 'var(--oc-muted)' }}>
                            {member.followerCount} {member.followerTitle}
                          </div>
                        </div>
                      </button>

                      {!isMe && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!currentUser) {
                              setAuthModalMode('register');
                              setShowAuthModal(true);
                              return;
                            }
                            handleFollowUser(member.id);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap shrink-0 min-h-[32px]"
                          style={
                            following
                              ? {
                                  backgroundColor: 'var(--oc-surface-alt)',
                                  border: '1px solid var(--oc-border)',
                                }
                              : {
                                  backgroundColor: 'var(--oc-accent-soft)',
                                  color: 'var(--oc-accent)',
                                }
                          }
                        >
                          {following ? 'Joined' : 'Join'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Mobile Bottom Thumb-Zone Navigation (iOS & Android PWA ergonomics) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 grid grid-cols-5 items-center backdrop-blur-md"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--oc-surface) 92%, transparent)',
          borderTop: '1px solid var(--oc-border)',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveView('feed')}
          className="flex flex-col items-center justify-center h-full text-[10px] font-semibold"
          style={{ color: activeView === 'feed' ? 'var(--oc-accent)' : 'var(--oc-muted)' }}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span>Feed</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (!currentUser) {
              setAuthModalMode('register');
              setShowAuthModal(true);
            } else {
              setShowCreateModal(true);
            }
          }}
          className="flex flex-col items-center justify-center h-full text-[10px] font-semibold"
          style={{ color: 'var(--oc-accent)' }}
        >
          <PlusSquare className="w-5 h-5 mb-0.5" />
          <span>Post</span>
        </button>

        <button
          type="button"
          onClick={() => openMessagesWith()}
          className="flex flex-col items-center justify-center h-full text-[10px] font-semibold relative"
          style={{ color: activeView === 'messages' ? 'var(--oc-accent)' : 'var(--oc-muted)' }}
        >
          <MessageCircle className="w-5 h-5 mb-0.5" />
          <span>Messages</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (!currentUser) {
              setAuthModalMode('register');
              setShowAuthModal(true);
              return;
            }
            setActiveView('notifications');
          }}
          className="flex flex-col items-center justify-center h-full text-[10px] font-semibold relative"
          style={{ color: activeView === 'notifications' ? 'var(--oc-accent)' : 'var(--oc-muted)' }}
        >
          <Bell className="w-5 h-5 mb-0.5" />
          <span>Alerts{unreadNotifs > 0 ? ` (${unreadNotifs})` : ''}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (!currentUser) {
              setAuthModalMode('register');
              setShowAuthModal(true);
              return;
            }
            openProfile(currentUser.id);
          }}
          className="flex flex-col items-center justify-center h-full text-[10px] font-semibold"
          style={{ color: activeView === 'profile' ? 'var(--oc-accent)' : 'var(--oc-muted)' }}
        >
          <User className="w-5 h-5 mb-0.5" />
          <span>Profile</span>
        </button>
      </nav>

      {/* Modals */}
      {showAuthModal && (
        <AuthModal
          initialMode={authModalMode}
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      )}

      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(post) => {
            setPosts((prev) => [post, ...prev]);
            setShowCreateModal(false);
            setActiveView('feed');
          }}
        />
      )}

      {showThemeModal && (
        <ThemeCustomizerModal
          theme={theme}
          onChange={setTheme}
          onSave={handleSaveTheme}
          onClose={() => setShowThemeModal(false)}
        />
      )}

      {showShareModal && (
        <ShareAppModal
          currentUser={currentUser}
          onSaveCustomApkUrl={handleSaveCustomApk}
          onClose={() => setShowShareModal(false)}
        />
      )}

      <OfflineIndicator />
    </div>
  );
}
