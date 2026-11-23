import { ShieldCheck, X } from 'lucide-react';
import React, { useState } from 'react';
import { bleepText } from '../../shared/profanity';
import type { AuthUser } from '../../shared/types';
import { api, setAuthToken } from '../lib/api';

interface AuthModalProps {
  initialMode?: 'login' | 'register';
  onClose: () => void;
  onSuccess: (user: AuthUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  initialMode = 'register',
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [followerTitle, setFollowerTitle] = useState('Sunbeams');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        const res = await api.register({
          name,
          handle,
          email,
          password,
          followerTitle: followerTitle.trim() || 'Kindred',
          bio,
        });
        setAuthToken(res.token);
        onSuccess(res.user);
      } else {
        const res = await api.login({ identifier, password });
        setAuthToken(res.token);
        onSuccess(res.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to authenticate.');
    } finally {
      setLoading(false);
    }
  };

  const previewTitle = bleepText(followerTitle || 'Kindred').text;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-xl my-auto"
        style={{
          backgroundColor: 'var(--oc-surface)',
          color: 'var(--oc-text)',
          border: '1px solid var(--oc-border)',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight">
              {mode === 'register' ? 'Join Open Circle' : 'Sign In to Open Circle'}
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--oc-muted)' }}>
              {mode === 'register'
                ? 'Share helpful pictures, stories, and short videos worldwide.'
                : 'Welcome back. Pick up right where you left off.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication dialog"
            className="p-2 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center"
            style={{ color: 'var(--oc-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          className="mt-5 grid grid-cols-2 gap-1 p-1 rounded-xl"
          style={{ backgroundColor: 'var(--oc-surface-alt)' }}
        >
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
            }}
            className="py-2 rounded-lg text-sm font-semibold transition-colors min-h-[40px]"
            style={
              mode === 'register'
                ? { backgroundColor: 'var(--oc-surface)', color: 'var(--oc-text)' }
                : { color: 'var(--oc-muted)' }
            }
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className="py-2 rounded-lg text-sm font-semibold transition-colors min-h-[40px]"
            style={
              mode === 'login'
                ? { backgroundColor: 'var(--oc-surface)', color: 'var(--oc-text)' }
                : { color: 'var(--oc-muted)' }
            }
          >
            Sign In
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {mode === 'register' ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5">Display Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Rivera"
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none focus-visible:ring-2"
                    style={{
                      backgroundColor: 'var(--oc-surface-alt)',
                      border: '1px solid var(--oc-border)',
                      color: 'var(--oc-text)',
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5">Username Handle</label>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="alexhelps"
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none focus-visible:ring-2"
                    style={{
                      backgroundColor: 'var(--oc-surface-alt)',
                      border: '1px solid var(--oc-border)',
                      color: 'var(--oc-text)',
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none focus-visible:ring-2"
                  style={{
                    backgroundColor: 'var(--oc-surface-alt)',
                    border: '1px solid var(--oc-border)',
                    color: 'var(--oc-text)',
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  Name Your Followers (Unique Title)
                </label>
                <input
                  type="text"
                  required
                  maxLength={24}
                  value={followerTitle}
                  onChange={(e) => setFollowerTitle(e.target.value)}
                  placeholder="e.g., Sunbeams, Allies, Fixers, Kindred"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none focus-visible:ring-2"
                  style={{
                    backgroundColor: 'var(--oc-surface-alt)',
                    border: '1px solid var(--oc-border)',
                    color: 'var(--oc-text)',
                  }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--oc-muted)' }}>
                  People who follow you will be called your <strong>{previewTitle}</strong>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5">Short Bio (Optional)</label>
                <input
                  type="text"
                  maxLength={200}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="What do you love helping strangers with?"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none focus-visible:ring-2"
                  style={{
                    backgroundColor: 'var(--oc-surface-alt)',
                    border: '1px solid var(--oc-border)',
                    color: 'var(--oc-text)',
                  }}
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-semibold mb-1.5">Email or Username</label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="maya@opencircle.app or mayalin"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none focus-visible:ring-2"
                style={{
                  backgroundColor: 'var(--oc-surface-alt)',
                  border: '1px solid var(--oc-border)',
                  color: 'var(--oc-text)',
                }}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold mb-1.5">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none focus-visible:ring-2"
              style={{
                backgroundColor: 'var(--oc-surface-alt)',
                border: '1px solid var(--oc-border)',
                color: 'var(--oc-text)',
              }}
            />
          </div>

          {error && (
            <div
              className="p-3 rounded-xl text-xs font-medium"
              style={{
                backgroundColor: 'rgba(225, 29, 72, 0.1)',
                color: '#e11d48',
                border: '1px solid rgba(225, 29, 72, 0.25)',
              }}
            >
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--oc-muted)' }}>
            <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: 'var(--oc-accent)' }} />
            <span>Open Circle automatically bleeps foul language and blocks nude uploads.</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold min-h-[44px] transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{
              backgroundColor: 'var(--oc-accent)',
              color: 'var(--oc-accent-fg)',
            }}
          >
            {loading
              ? 'Please wait...'
              : mode === 'register'
                ? 'Create Open Circle Account'
                : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
