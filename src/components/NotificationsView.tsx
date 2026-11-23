import { Bell, CheckCheck, HeartHandshake, MessageCircle, ShieldCheck, UserPlus } from 'lucide-react';
import React from 'react';
import type { NotificationItem } from '../../shared/types';
import { Avatar } from './Avatar';

interface NotificationsViewProps {
  notifications: NotificationItem[];
  onMarkAllRead: () => Promise<void>;
  onOpenProfile: (userId: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  onMarkAllRead,
  onOpenProfile,
}) => {
  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'follow':
        return <UserPlus className="w-4 h-4" style={{ color: 'var(--oc-accent)' }} />;
      case 'helpful':
        return <HeartHandshake className="w-4 h-4" style={{ color: 'var(--oc-accent)' }} />;
      case 'comment':
      case 'message':
        return <MessageCircle className="w-4 h-4" style={{ color: 'var(--oc-accent)' }} />;
      default:
        return <ShieldCheck className="w-4 h-4" style={{ color: 'var(--oc-accent)' }} />;
    }
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: 'var(--oc-surface)',
        border: '1px solid var(--oc-border)',
      }}
    >
      <div
        className="p-5 flex items-center justify-between gap-4"
        style={{ borderBottom: '1px solid var(--oc-border)' }}
      >
        <div>
          <h2 className="font-display text-lg font-bold">Notifications</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--oc-muted)' }}>
            Activity across your circle, comments, helpful votes, and messages.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold min-h-[40px] whitespace-nowrap"
            style={{
              backgroundColor: 'var(--oc-accent-soft)',
              color: 'var(--oc-accent)',
            }}
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="p-10 text-center">
          <Bell className="w-7 h-7 mx-auto mb-2" style={{ color: 'var(--oc-muted)' }} />
          <p className="text-sm font-semibold">You are all caught up</p>
          <p className="text-xs mt-1" style={{ color: 'var(--oc-muted)' }}>
            When someone joins your follower circle or replies to your helpful posts, it appears here.
          </p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: 'var(--oc-border)' }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              className="p-4 flex items-start gap-3.5 transition-colors"
              style={{
                backgroundColor: n.read ? 'transparent' : 'var(--oc-accent-soft)',
              }}
            >
              {n.actorId && n.actorName ? (
                <button
                  type="button"
                  onClick={() => onOpenProfile(n.actorId!)}
                  className="shrink-0 rounded-full"
                >
                  <Avatar src={n.actorAvatarUrl} name={n.actorName} size="md" />
                </button>
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: 'var(--oc-surface-alt)',
                    border: '1px solid var(--oc-border)',
                  }}
                >
                  {getIcon(n.type)}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{n.title}</p>
                  <span className="text-xs shrink-0" style={{ color: 'var(--oc-muted)' }}>
                    {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--oc-muted)' }}>
                  {n.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
