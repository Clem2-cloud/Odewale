import { Camera, LogOut, Palette, Save, Shield, UserCheck, UserPlus, Users } from 'lucide-react';
import React, { useState } from 'react';
import type { AudiencePolicy, AuthUser, PostItem, UserPublic } from '../../shared/types';
import { api } from '../lib/api';
import { Avatar } from './Avatar';

interface ProfileViewProps {
  profile: UserPublic;
  currentUser: AuthUser | null;
  posts: PostItem[];
  allUsers: UserPublic[];
  onUpdatedMe: (user: AuthUser) => void;
  onFollowUser: (userId: string) => Promise<void>;
  onUnblockUser: (userId: string) => Promise<void>;
  onOpenCustomize: () => void;
  onMessageUser: (userId: string) => void;
  onLogout: () => Promise<void>;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  currentUser,
  posts,
  allUsers,
  onUpdatedMe,
  onFollowUser,
  onUnblockUser,
  onOpenCustomize,
  onMessageUser,
  onLogout,
}) => {
  const isMe = currentUser?.id === profile.id;
  const isFollowing = Boolean(currentUser?.followingIds.includes(profile.id));

  const [name, setName] = useState(currentUser?.name || profile.name);
  const [bio, setBio] = useState(currentUser?.bio || profile.bio);
  const [followerTitle, setFollowerTitle] = useState(currentUser?.followerTitle || profile.followerTitle);
  const [commentPolicy, setCommentPolicy] = useState<AudiencePolicy>(
    currentUser?.safety.commentPolicy || 'everyone'
  );
  const [messagePolicy, setMessagePolicy] = useState<AudiencePolicy>(
    currentUser?.safety.messagePolicy || 'everyone'
  );
  const [bleepMode, setBleepMode] = useState<'asterisks' | 'bleep-tag'>(
    currentUser?.safety.bleepMode || 'asterisks'
  );
  const [keywordsText, setKeywordsText] = useState(
    (currentUser?.safety.blockedKeywords || []).join(', ')
  );
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSaving(true);
    setStatusMsg('');
    setErrorMsg('');

    try {
      const blockedKeywords = keywordsText
        .split(',')
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);

      const res = await api.updateProfile({
        name,
        bio,
        followerTitle,
        safety: {
          ...currentUser.safety,
          commentPolicy,
          messagePolicy,
          bleepMode,
          blockedKeywords,
        },
      });
      onUpdatedMe(res.user);
      setStatusMsg('Profile, follower circle name, and safety preferences saved.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    setUploadingAvatar(true);
    setErrorMsg('');
    setStatusMsg('');
    try {
      const uploaded = await api.uploadMedia(file);
      const res = await api.updateProfile({ avatarUrl: uploaded.mediaUrl });
      onUpdatedMe(res.user);
      setStatusMsg('Profile picture verified and updated.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Avatar upload blocked.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const blockedProfiles = (currentUser?.safety.blockedUserIds || [])
    .map((id) => allUsers.find((u) => u.id === id) || { id, name: 'Blocked Member', handle: id })
    .filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Top Profile Banner Card */}
      <div
        className="rounded-2xl p-6"
        style={{
          backgroundColor: 'var(--oc-surface)',
          border: '1px solid var(--oc-border)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar src={profile.avatarUrl} name={profile.name} size="xl" />
              {isMe && (
                <label
                  title="Upload profile picture"
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer shadow-sm"
                  style={{
                    backgroundColor: 'var(--oc-accent)',
                    color: 'var(--oc-accent-fg)',
                  }}
                >
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="sr-only"
                    disabled={uploadingAvatar}
                  />
                </label>
              )}
            </div>

            <div>
              <h2 className="font-display text-2xl font-bold">{profile.name}</h2>
              <div className="text-sm mt-0.5" style={{ color: 'var(--oc-muted)' }}>
                @{profile.handle} · Followers called <strong>{profile.followerTitle}</strong>
              </div>
              <p className="text-sm mt-2 max-w-xl leading-relaxed">{profile.bio}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {isMe ? (
              <>
                <button
                  type="button"
                  onClick={onOpenCustomize}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold min-h-[42px]"
                  style={{
                    backgroundColor: 'var(--oc-surface-alt)',
                    border: '1px solid var(--oc-border)',
                  }}
                >
                  <Palette className="w-4 h-4" />
                  <span>Colors & Theme</span>
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold min-h-[42px] text-rose-600"
                  style={{
                    backgroundColor: 'var(--oc-surface-alt)',
                    border: '1px solid var(--oc-border)',
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onFollowUser(profile.id)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold min-h-[42px]"
                  style={
                    isFollowing
                      ? {
                          backgroundColor: 'var(--oc-surface-alt)',
                          border: '1px solid var(--oc-border)',
                        }
                      : {
                          backgroundColor: 'var(--oc-accent)',
                          color: 'var(--oc-accent-fg)',
                        }
                  }
                >
                  {isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  <span>
                    {isFollowing ? `One of ${profile.followerTitle}` : `Become a ${profile.followerTitle}`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onMessageUser(profile.id)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold min-h-[42px]"
                  style={{
                    backgroundColor: 'var(--oc-surface-alt)',
                    border: '1px solid var(--oc-border)',
                  }}
                >
                  Message
                </button>
              </>
            )}
          </div>
        </div>

        {/* Clean Unboxed Stats Strip */}
        <div
          className="mt-6 pt-5 grid grid-cols-3 gap-4"
          style={{ borderTop: '1px solid var(--oc-border)' }}
        >
          <div>
            <div className="font-mono-num text-xl font-bold">{profile.followerCount}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--oc-muted)' }}>
              {profile.followerTitle}
            </div>
          </div>
          <div>
            <div className="font-mono-num text-xl font-bold">{profile.followingCount}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--oc-muted)' }}>
              Circles Joined
            </div>
          </div>
          <div>
            <div className="font-mono-num text-xl font-bold">{profile.helpfulCount}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--oc-muted)' }}>
              Helpful Votes
            </div>
          </div>
        </div>
      </div>

      {/* Edit Own Profile, Unique Follower Name & Safety Controls */}
      {isMe && currentUser && (
        <form
          onSubmit={handleSaveProfile}
          className="rounded-2xl p-6 space-y-6"
          style={{
            backgroundColor: 'var(--oc-surface)',
            border: '1px solid var(--oc-border)',
          }}
        >
          <div>
            <h3 className="font-display text-lg font-bold flex items-center gap-2">
              <Users className="w-5 h-5" style={{ color: 'var(--oc-accent)' }} />
              <span>Identity & Unique Follower Name</span>
            </h3>
            <p className="text-xs mt-1" style={{ color: 'var(--oc-muted)' }}>
              Choose the special name your followers are called across Open Circle.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5">Display Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={{
                  backgroundColor: 'var(--oc-surface-alt)',
                  border: '1px solid var(--oc-border)',
                  color: 'var(--oc-text)',
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">
                What Are Your Followers Called?
              </label>
              <input
                type="text"
                required
                maxLength={24}
                value={followerTitle}
                onChange={(e) => setFollowerTitle(e.target.value)}
                placeholder="e.g., Sunbeams, Allies, Lifters"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={{
                  backgroundColor: 'var(--oc-surface-alt)',
                  border: '1px solid var(--oc-border)',
                  color: 'var(--oc-text)',
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5">Bio</label>
            <textarea
              rows={2}
              maxLength={260}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
              style={{
                backgroundColor: 'var(--oc-surface-alt)',
                border: '1px solid var(--oc-border)',
                color: 'var(--oc-text)',
              }}
            />
          </div>

          <div className="pt-4" style={{ borderTop: '1px solid var(--oc-border)' }}>
            <h3 className="font-display text-lg font-bold flex items-center gap-2">
              <Shield className="w-5 h-5" style={{ color: 'var(--oc-accent)' }} />
              <span>Comment & Message Safety Controls</span>
            </h3>
            <p className="text-xs mt-1" style={{ color: 'var(--oc-muted)' }}>
              Control who can comment on your posts, who can message you, and how foul language is bleeped.
            </p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5">Who Can Comment</label>
                <select
                  value={commentPolicy}
                  onChange={(e) => setCommentPolicy(e.target.value as AudiencePolicy)}
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-medium outline-none min-h-[42px]"
                  style={{
                    backgroundColor: 'var(--oc-surface-alt)',
                    border: '1px solid var(--oc-border)',
                    color: 'var(--oc-text)',
                  }}
                >
                  <option value="everyone">Everyone worldwide</option>
                  <option value="followers">Only my {followerTitle || 'followers'}</option>
                  <option value="off">Comments turned off</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5">Who Can Message Me</label>
                <select
                  value={messagePolicy}
                  onChange={(e) => setMessagePolicy(e.target.value as AudiencePolicy)}
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-medium outline-none min-h-[42px]"
                  style={{
                    backgroundColor: 'var(--oc-surface-alt)',
                    border: '1px solid var(--oc-border)',
                    color: 'var(--oc-text)',
                  }}
                >
                  <option value="everyone">Everyone worldwide</option>
                  <option value="followers">Only my {followerTitle || 'followers'}</option>
                  <option value="off">Direct messages off</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5">Profanity Bleep Style</label>
                <select
                  value={bleepMode}
                  onChange={(e) => setBleepMode(e.target.value as 'asterisks' | 'bleep-tag')}
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-medium outline-none min-h-[42px]"
                  style={{
                    backgroundColor: 'var(--oc-surface-alt)',
                    border: '1px solid var(--oc-border)',
                    color: 'var(--oc-text)',
                  }}
                >
                  <option value="asterisks">Masked (e.g. f***)</option>
                  <option value="bleep-tag">Tag ([bleep])</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold mb-1.5">
                Custom Blocked Words in Comments & Messages (comma-separated)
              </label>
              <input
                type="text"
                value={keywordsText}
                onChange={(e) => setKeywordsText(e.target.value)}
                placeholder="e.g., spamlink, scam, promo"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={{
                  backgroundColor: 'var(--oc-surface-alt)',
                  border: '1px solid var(--oc-border)',
                  color: 'var(--oc-text)',
                }}
              />
            </div>

            {blockedProfiles.length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-semibold mb-2">Blocked Accounts</div>
                <div className="space-y-2">
                  {blockedProfiles.map((bp) => (
                    <div
                      key={bp.id}
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-xs"
                      style={{
                        backgroundColor: 'var(--oc-surface-alt)',
                        border: '1px solid var(--oc-border)',
                      }}
                    >
                      <span>
                        {bp.name} (@{bp.handle})
                      </span>
                      <button
                        type="button"
                        onClick={() => onUnblockUser(bp.id)}
                        className="font-semibold underline"
                        style={{ color: 'var(--oc-accent)' }}
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {statusMsg && (
            <div
              className="p-3 rounded-xl text-xs font-medium"
              style={{ backgroundColor: 'var(--oc-accent-soft)', color: 'var(--oc-accent)' }}
            >
              {statusMsg}
            </div>
          )}
          {errorMsg && (
            <div className="p-3 rounded-xl text-xs font-medium text-rose-600">{errorMsg}</div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold min-h-[44px] disabled:opacity-60"
              style={{
                backgroundColor: 'var(--oc-accent)',
                color: 'var(--oc-accent-fg)',
              }}
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Profile & Safety'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Member's Published Posts Summary */}
      <div className="space-y-3">
        <h3 className="font-display text-base font-bold">
          Shared by {profile.name} ({posts.length})
        </h3>
        {posts.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center text-xs"
            style={{
              backgroundColor: 'var(--oc-surface)',
              border: '1px solid var(--oc-border)',
              color: 'var(--oc-muted)',
            }}
          >
            No pictures, stories, or short videos shared yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="rounded-2xl p-4"
                style={{
                  backgroundColor: 'var(--oc-surface)',
                  border: '1px solid var(--oc-border)',
                }}
              >
                <div className="text-xs" style={{ color: 'var(--oc-muted)' }}>
                  {post.kind === 'video' ? 'Short video' : post.kind === 'picture' ? 'Picture' : 'Story'} ·{' '}
                  {post.helpfulCount} helpful
                </div>
                <div className="font-display font-bold text-sm mt-1 line-clamp-2">{post.title}</div>
                <p className="text-xs mt-1.5 line-clamp-3" style={{ color: 'var(--oc-muted)' }}>
                  {post.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
