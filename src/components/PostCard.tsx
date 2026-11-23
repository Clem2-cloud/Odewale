import {
  Flag,
  HeartHandshake,
  MessageCircle,
  MoreHorizontal,
  Send,
  ShieldBan,
  Trash2,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import React, { useState } from 'react';
import type { AuthUser, PostItem } from '../../shared/types';
import { Avatar } from './Avatar';

interface PostCardProps {
  post: PostItem;
  currentUser: AuthUser | null;
  onToggleHelpful: (postId: string) => Promise<void>;
  onAddComment: (postId: string, text: string) => Promise<void>;
  onFollowUser: (userId: string) => Promise<void>;
  onOpenProfile: (userId: string) => void;
  onMessageAuthor: (userId: string) => void;
  onBlockUser: (userId: string) => Promise<void>;
  onReportPost: (postId: string, reason: string) => Promise<void>;
  onDeletePost: (postId: string) => Promise<void>;
  onRequireAuth: () => void;
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUser,
  onToggleHelpful,
  onAddComment,
  onFollowUser,
  onOpenProfile,
  onMessageAuthor,
  onBlockUser,
  onReportPost,
  onDeletePost,
  onRequireAuth,
}) => {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);
  const [reportNotice, setReportNotice] = useState('');

  const isMe = currentUser?.id === post.authorId;
  const isFollowing = Boolean(currentUser?.followingIds.includes(post.authorId));
  const hasHelped = Boolean(currentUser && post.helpfulUserIds.includes(currentUser.id));

  const handleHelpful = async () => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    await onToggleHelpful(post.id);
  };

  const handleFollow = async () => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    await onFollowUser(post.authorId);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    if (!commentText.trim()) return;
    setCommentError('');
    setSubmittingComment(true);
    try {
      await onAddComment(post.id, commentText);
      setCommentText('');
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Unable to post comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const kindLabel =
    post.kind === 'video' ? 'Short video' : post.kind === 'picture' ? 'Picture' : 'Story';

  return (
    <article
      className="rounded-2xl overflow-hidden transition-colors"
      style={{
        backgroundColor: 'var(--oc-surface)',
        border: '1px solid var(--oc-border)',
      }}
    >
      {/* Header */}
      <div className="p-5 pb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => onOpenProfile(post.authorId)}
            className="shrink-0 rounded-full focus-visible:ring-2"
          >
            <Avatar src={post.authorAvatarUrl} name={post.authorName} size="md" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => onOpenProfile(post.authorId)}
                className="font-semibold text-sm hover:underline truncate"
              >
                {post.authorName}
              </button>
              <span className="text-xs truncate" style={{ color: 'var(--oc-muted)' }}>
                @{post.authorHandle}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs mt-0.5 flex-wrap" style={{ color: 'var(--oc-muted)' }}>
              <span>{kindLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{post.topic}</span>
              <span aria-hidden="true">·</span>
              <span>{formatRelative(post.createdAt)}</span>
              {post.wasBleeped && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Filtered</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 relative">
          {!isMe && (
            <button
              type="button"
              onClick={handleFollow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 min-h-[36px] transition-colors"
              style={
                isFollowing
                  ? {
                      backgroundColor: 'var(--oc-surface-alt)',
                      color: 'var(--oc-text)',
                      border: '1px solid var(--oc-border)',
                    }
                  : {
                      backgroundColor: 'var(--oc-accent-soft)',
                      color: 'var(--oc-accent)',
                    }
              }
            >
              {isFollowing ? (
                <>
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{post.authorFollowerTitle}</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Join {post.authorFollowerTitle}</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Post options"
            className="p-2 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center"
            style={{ color: 'var(--oc-muted)' }}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-10 z-20 w-52 rounded-xl p-1.5 shadow-lg text-xs font-medium"
              style={{
                backgroundColor: 'var(--oc-surface)',
                border: '1px solid var(--oc-border)',
              }}
            >
              {!isMe && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      if (!currentUser) return onRequireAuth();
                      onMessageAuthor(post.authorId);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:opacity-80"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Message {post.authorName}</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setMenuOpen(false);
                      if (!currentUser) return onRequireAuth();
                      await onReportPost(post.id, 'Reported by community member for safety review');
                      setReportNotice('Safety report submitted. Thank you for keeping Open Circle kind.');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:opacity-80"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Report Post</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setMenuOpen(false);
                      if (!currentUser) return onRequireAuth();
                      await onBlockUser(post.authorId);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-rose-600 hover:opacity-80"
                  >
                    <ShieldBan className="w-3.5 h-3.5" />
                    <span>Block {post.authorName}</span>
                  </button>
                </>
              )}
              {isMe && (
                <button
                  type="button"
                  onClick={async () => {
                    setMenuOpen(false);
                    await onDeletePost(post.id);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-rose-600 hover:opacity-80"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Post</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Text Content */}
      <div className="px-5 pb-4">
        <h3 className="font-display text-lg font-bold leading-snug">{post.title}</h3>
        <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-line" style={{ color: 'var(--oc-muted)' }}>
          {post.body}
        </p>
      </div>

      {/* Media Content (Picture or Short Video) */}
      {post.mediaUrl && (
        <div className="px-5 pb-4">
          {post.kind === 'video' || post.mediaMime?.startsWith('video/') ? (
            <div
              className="rounded-xl overflow-hidden bg-black"
              style={{ border: '1px solid var(--oc-border)' }}
            >
              <video
                src={post.mediaUrl}
                controls
                playsInline
                preload="metadata"
                className="w-full max-h-[460px] object-contain"
              />
            </div>
          ) : !mediaFailed ? (
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: '1px solid var(--oc-border)' }}
            >
              <img
                src={post.mediaUrl}
                alt={post.title}
                referrerPolicy="no-referrer"
                onError={() => setMediaFailed(true)}
                className="w-full max-h-[460px] object-cover"
              />
            </div>
          ) : (
            <div
              className="rounded-xl p-8 text-center text-xs"
              style={{
                backgroundColor: 'var(--oc-surface-alt)',
                border: '1px solid var(--oc-border)',
                color: 'var(--oc-muted)',
              }}
            >
              {post.title}
            </div>
          )}
        </div>
      )}

      {reportNotice && (
        <div className="mx-5 mb-3 px-3 py-2 rounded-xl text-xs font-medium" style={{ backgroundColor: 'var(--oc-accent-soft)', color: 'var(--oc-accent)' }}>
          {reportNotice}
        </div>
      )}

      {/* Action Bar */}
      <div
        className="px-5 py-3 flex items-center justify-between gap-4"
        style={{ borderTop: '1px solid var(--oc-border)' }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleHelpful}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold min-h-[40px] transition-colors"
            style={
              hasHelped
                ? { backgroundColor: 'var(--oc-accent-soft)', color: 'var(--oc-accent)' }
                : { color: 'var(--oc-muted)' }
            }
          >
            <HeartHandshake className="w-4 h-4 shrink-0" />
            <span>Helpful</span>
            <span className="font-mono-num">{post.helpfulCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setCommentsOpen((v) => !v)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold min-h-[40px] transition-colors"
            style={{ color: 'var(--oc-muted)' }}
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span>Comments</span>
            <span className="font-mono-num">{post.comments.length}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!currentUser) return onRequireAuth();
            onMessageAuthor(post.authorId);
          }}
          className="text-xs font-semibold px-3 py-2 rounded-xl min-h-[40px] whitespace-nowrap"
          style={{ color: 'var(--oc-accent)' }}
        >
          Message
        </button>
      </div>

      {/* Comments Drawer */}
      {commentsOpen && (
        <div
          className="px-5 py-4 space-y-4"
          style={{
            backgroundColor: 'var(--oc-surface-alt)',
            borderTop: '1px solid var(--oc-border)',
          }}
        >
          {post.comments.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--oc-muted)' }}>
              No comments yet. Share a supportive note or ask a helpful question.
            </p>
          ) : (
            <div className="space-y-3">
              {post.comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-2.5">
                  <Avatar src={comment.authorAvatarUrl} name={comment.authorName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold">{comment.authorName}</span>
                      <span style={{ color: 'var(--oc-muted)' }}>{formatRelative(comment.createdAt)}</span>
                      {comment.wasBleeped && <span style={{ color: 'var(--oc-muted)' }}>· Filtered</span>}
                    </div>
                    <p className="text-sm mt-0.5 leading-snug">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a kind, helpful comment (foul words are bleeped)..."
              className="flex-1 px-3.5 py-2 rounded-xl text-sm outline-none min-h-[42px]"
              style={{
                backgroundColor: 'var(--oc-surface)',
                border: '1px solid var(--oc-border)',
                color: 'var(--oc-text)',
              }}
            />
            <button
              type="submit"
              disabled={submittingComment}
              aria-label="Send comment"
              className="px-3.5 py-2 rounded-xl min-h-[42px] min-w-[42px] flex items-center justify-center shrink-0 disabled:opacity-60"
              style={{
                backgroundColor: 'var(--oc-accent)',
                color: 'var(--oc-accent-fg)',
              }}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {commentError && (
            <p className="text-xs font-medium text-rose-600">{commentError}</p>
          )}
        </div>
      )}
    </article>
  );
};
