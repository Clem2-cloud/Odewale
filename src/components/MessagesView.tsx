import { Flag, MessageSquarePlus, Send, ShieldAlert, ShieldBan } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { AuthUser, ConversationThread, UserPublic } from '../../shared/types';
import { api } from '../lib/api';
import { Avatar } from './Avatar';

interface MessagesViewProps {
  currentUser: AuthUser;
  users: UserPublic[];
  initialRecipientId?: string | null;
  onBlockUser: (userId: string) => Promise<void>;
  onRefreshCounts: () => Promise<void>;
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  currentUser,
  users,
  initialRecipientId,
  onBlockUser,
  onRefreshCounts,
}) => {
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(initialRecipientId || null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadThreads = async () => {
    try {
      const res = await api.getMessages();
      setThreads(res.threads);
      if (!selectedPeerId && res.threads.length > 0 && !initialRecipientId) {
        setSelectedPeerId(res.threads[0].peer.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load messages.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadThreads();
  }, []);

  useEffect(() => {
    if (initialRecipientId) {
      setSelectedPeerId(initialRecipientId);
    }
  }, [initialRecipientId]);

  useEffect(() => {
    if (!selectedPeerId) return;
    const thread = threads.find((t) => t.peer.id === selectedPeerId);
    if (thread && thread.unreadCount > 0) {
      api.markMessagesRead(selectedPeerId).then(() => {
        loadThreads();
        onRefreshCounts();
      });
    }
  }, [selectedPeerId]);

  const activeThread = threads.find((t) => t.peer.id === selectedPeerId) || null;
  const selectedPeer =
    activeThread?.peer || users.find((u) => u.id === selectedPeerId && u.id !== currentUser.id) || null;

  const otherUsers = users.filter((u) => u.id !== currentUser.id);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPeer || !draft.trim()) return;
    setError('');
    setNotice('');
    setSending(true);
    try {
      await api.sendMessage(selectedPeer.id, draft);
      setDraft('');
      await loadThreads();
      await onRefreshCounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Message could not be sent.');
    } finally {
      setSending(false);
    }
  };

  const handleReport = async () => {
    if (!selectedPeer) return;
    await api.reportContent({
      targetType: 'user',
      targetId: selectedPeer.id,
      reason: 'Reported from Direct Messages for safety review.',
    });
    setNotice('Safety report submitted.');
  };

  return (
    <div
      className="rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[520px]"
      style={{
        backgroundColor: 'var(--oc-surface)',
        border: '1px solid var(--oc-border)',
      }}
    >
      {/* Conversation List */}
      <div
        className="md:col-span-5 flex flex-col"
        style={{ borderRight: '1px solid var(--oc-border)' }}
      >
        <div className="p-4" style={{ borderBottom: '1px solid var(--oc-border)' }}>
          <h2 className="font-display text-base font-bold">Direct Messages</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--oc-muted)' }}>
            Protected by automatic profanity bleeping & privacy controls.
          </p>

          <div className="mt-3">
            <label className="sr-only" htmlFor="new-chat-select">
              Message a member
            </label>
            <div className="flex items-center gap-2">
              <MessageSquarePlus className="w-4 h-4 shrink-0" style={{ color: 'var(--oc-accent)' }} />
              <select
                id="new-chat-select"
                value={selectedPeerId || ''}
                onChange={(e) => setSelectedPeerId(e.target.value || null)}
                className="w-full px-3 py-2 rounded-xl text-xs font-medium outline-none min-h-[38px]"
                style={{
                  backgroundColor: 'var(--oc-surface-alt)',
                  border: '1px solid var(--oc-border)',
                  color: 'var(--oc-text)',
                }}
              >
                <option value="">Start conversation with a member...</option>
                {otherUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} (@{u.handle})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: 'var(--oc-border)' }}>
          {loading ? (
            <div className="p-5 text-xs" style={{ color: 'var(--oc-muted)' }}>
              Loading conversations...
            </div>
          ) : threads.length === 0 ? (
            <div className="p-5 text-xs" style={{ color: 'var(--oc-muted)' }}>
              No messages yet. Pick a member above or click Message on any helpful post.
            </div>
          ) : (
            threads.map((thread) => {
              const active = thread.peer.id === selectedPeerId;
              const last = thread.messages[thread.messages.length - 1];
              return (
                <button
                  key={thread.peer.id}
                  type="button"
                  onClick={() => setSelectedPeerId(thread.peer.id)}
                  className="w-full p-4 flex items-center gap-3 text-left transition-colors"
                  style={{
                    backgroundColor: active ? 'var(--oc-accent-soft)' : 'transparent',
                  }}
                >
                  <Avatar src={thread.peer.avatarUrl} name={thread.peer.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm truncate">{thread.peer.name}</span>
                      {thread.unreadCount > 0 && (
                        <span
                          className="font-mono-num text-[11px] font-bold px-1.5 py-0.5 rounded-md"
                          style={{
                            backgroundColor: 'var(--oc-accent)',
                            color: 'var(--oc-accent-fg)',
                          }}
                        >
                          {thread.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--oc-muted)' }}>
                      {last?.text || 'Start chatting'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Thread */}
      <div className="md:col-span-7 flex flex-col">
        {selectedPeer ? (
          <>
            <div
              className="p-4 flex items-center justify-between gap-3"
              style={{ borderBottom: '1px solid var(--oc-border)' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar src={selectedPeer.avatarUrl} name={selectedPeer.name} size="sm" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{selectedPeer.name}</div>
                  <div className="text-xs truncate" style={{ color: 'var(--oc-muted)' }}>
                    @{selectedPeer.handle} · {selectedPeer.followerCount} {selectedPeer.followerTitle}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleReport}
                  title="Report user"
                  className="p-2 rounded-lg min-h-[38px] min-w-[38px] flex items-center justify-center"
                  style={{ color: 'var(--oc-muted)' }}
                >
                  <Flag className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await onBlockUser(selectedPeer.id);
                    setSelectedPeerId(null);
                    await loadThreads();
                  }}
                  title="Block user"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 min-h-[38px]"
                >
                  <ShieldBan className="w-3.5 h-3.5" />
                  <span>Block</span>
                </button>
              </div>
            </div>

            {notice && (
              <div
                className="mx-4 mt-3 px-3 py-2 rounded-xl text-xs font-medium"
                style={{ backgroundColor: 'var(--oc-accent-soft)', color: 'var(--oc-accent)' }}
              >
                {notice}
              </div>
            )}

            <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[360px]">
              {!activeThread || activeThread.messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-10">
                  <ShieldAlert className="w-6 h-6 mb-2" style={{ color: 'var(--oc-accent)' }} />
                  <p className="text-sm font-semibold">Say hello to {selectedPeer.name}</p>
                  <p className="text-xs mt-1 max-w-xs" style={{ color: 'var(--oc-muted)' }}>
                    Messages follow {selectedPeer.name}’s safety rules and automatically bleep foul language.
                  </p>
                </div>
              ) : (
                activeThread.messages.map((msg) => {
                  const mine = msg.senderId === currentUser.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className="max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
                        style={
                          mine
                            ? {
                                backgroundColor: 'var(--oc-accent)',
                                color: 'var(--oc-accent-fg)',
                              }
                            : {
                                backgroundColor: 'var(--oc-surface-alt)',
                                color: 'var(--oc-text)',
                                border: '1px solid var(--oc-border)',
                              }
                        }
                      >
                        {msg.text}
                      </div>
                      {msg.wasBleeped && (
                        <span className="text-[11px] mt-1" style={{ color: 'var(--oc-muted)' }}>
                          Foul language bleeped
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <form
              onSubmit={handleSend}
              className="p-4 space-y-2"
              style={{ borderTop: '1px solid var(--oc-border)' }}
            >
              {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`Message ${selectedPeer.name}...`}
                  className="flex-1 px-3.5 py-2.5 rounded-xl text-sm outline-none min-h-[44px]"
                  style={{
                    backgroundColor: 'var(--oc-surface-alt)',
                    border: '1px solid var(--oc-border)',
                    color: 'var(--oc-text)',
                  }}
                />
                <button
                  type="submit"
                  disabled={sending}
                  aria-label="Send message"
                  className="px-4 py-2.5 rounded-xl min-h-[44px] flex items-center justify-center gap-1.5 text-sm font-semibold shrink-0 disabled:opacity-60"
                  style={{
                    backgroundColor: 'var(--oc-accent)',
                    color: 'var(--oc-accent-fg)',
                  }}
                >
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 text-center">
            <div>
              <p className="font-display text-base font-bold">Select a Conversation</p>
              <p className="text-xs mt-1" style={{ color: 'var(--oc-muted)' }}>
                Choose a member from the left to send a safe direct message.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
