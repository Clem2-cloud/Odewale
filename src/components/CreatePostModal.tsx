import { BookOpen, Image as ImageIcon, ShieldAlert, ShieldCheck, Upload, Video, X } from 'lucide-react';
import React, { useState } from 'react';
import { bleepText } from '../../shared/profanity';
import type { PostItem, PostKind } from '../../shared/types';
import { api } from '../lib/api';

interface CreatePostModalProps {
  onClose: () => void;
  onCreated: (post: PostItem) => void;
}

const TOPICS = [
  'Everyday Help',
  'Hands-On Skills',
  'Community & Food',
  'Study & Career',
  'Tech & Tools',
  'Wellness & Encouragement',
];

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ onClose, onCreated }) => {
  const [kind, setKind] = useState<PostKind>('picture');
  const [topic, setTopic] = useState('Everyday Help');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploadedMedia, setUploadedMedia] = useState<{ mediaUrl: string; mediaMime: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stageText, setStageText] = useState('');
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploadedMedia(null);
    setSelectedFile(file);

    if (file.type.startsWith('video/')) {
      setKind('video');
    } else if (file.type.startsWith('image/') && kind === 'video') {
      setKind('picture');
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const titleCheck = bleepText(title);
  const bodyCheck = bleepText(body);
  const hasProfanityWarning = titleCheck.wasBleeped || bodyCheck.wasBleeped;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      let media = uploadedMedia;
      if (selectedFile && !media) {
        setStageText('Screening media for safety & nudity...');
        const res = await api.uploadMedia(selectedFile);
        media = { mediaUrl: res.mediaUrl, mediaMime: res.mediaMime };
        setUploadedMedia(media);
      }

      if ((kind === 'picture' || kind === 'video') && !media) {
        throw new Error(`Please choose a ${kind} file to upload.`);
      }

      setStageText('Publishing to Open Circle worldwide...');
      const { post } = await api.createPost({
        kind,
        topic,
        title,
        body,
        mediaUrl: media?.mediaUrl,
        mediaMime: media?.mediaMime,
      });

      onCreated(post);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to publish post.');
    } finally {
      setSubmitting(false);
      setStageText('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        className="w-full max-w-xl rounded-2xl p-6 shadow-xl my-auto"
        style={{
          backgroundColor: 'var(--oc-surface)',
          color: 'var(--oc-text)',
          border: '1px solid var(--oc-border)',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold">Share Something Helpful</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--oc-muted)' }}>
              Your post will be visible to people worldwide on Open Circle.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close post composer"
            className="p-2 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center"
            style={{ color: 'var(--oc-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Post Type Selector */}
        <div
          className="mt-5 grid grid-cols-3 gap-1 p-1 rounded-xl"
          style={{ backgroundColor: 'var(--oc-surface-alt)' }}
        >
          {(
            [
              { id: 'picture', label: 'Picture', Icon: ImageIcon },
              { id: 'story', label: 'Story', Icon: BookOpen },
              { id: 'video', label: 'Short Video', Icon: Video },
            ] as const
          ).map(({ id, label, Icon }) => {
            const active = kind === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setKind(id);
                  setError('');
                }}
                className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold min-h-[40px] whitespace-nowrap"
                style={
                  active
                    ? { backgroundColor: 'var(--oc-surface)', color: 'var(--oc-text)' }
                    : { color: 'var(--oc-muted)' }
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Media File Upload */}
          <div>
            <label className="block text-xs font-semibold mb-1.5">
              {kind === 'video'
                ? 'Upload Short Video (MP4 / WebM, up to 90s)'
                : kind === 'picture'
                  ? 'Upload Picture (JPG / PNG / WebP)'
                  : 'Optional Cover Picture'}
            </label>
            <label
              className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl cursor-pointer text-center transition-colors"
              style={{
                backgroundColor: 'var(--oc-surface-alt)',
                border: '1px dashed var(--oc-border)',
              }}
            >
              <Upload className="w-5 h-5" style={{ color: 'var(--oc-accent)' }} />
              <span className="text-xs font-semibold">
                {selectedFile
                  ? `${selectedFile.name} (${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)`
                  : kind === 'video'
                    ? 'Choose a short video from your device'
                    : 'Choose a picture from your phone or computer'}
              </span>
              <input
                type="file"
                accept={kind === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/*,video/mp4,video/webm'}
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>

            {previewUrl && (
              <div
                className="mt-3 rounded-xl overflow-hidden max-h-64 flex items-center justify-center"
                style={{
                  backgroundColor: '#09090b',
                  border: '1px solid var(--oc-border)',
                }}
              >
                {selectedFile?.type.startsWith('video/') ? (
                  <video src={previewUrl} controls playsInline className="w-full max-h-64 object-contain" />
                ) : (
                  <img src={previewUrl} alt="Upload preview" className="w-full max-h-64 object-contain" />
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1.5">Headline</label>
              <input
                type="text"
                required
                maxLength={140}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., How to jump-start a dead car battery safely"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none focus-visible:ring-2"
                style={{
                  backgroundColor: 'var(--oc-surface-alt)',
                  border: '1px solid var(--oc-border)',
                  color: 'var(--oc-text)',
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5">Topic</label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none min-h-[42px]"
                style={{
                  backgroundColor: 'var(--oc-surface-alt)',
                  border: '1px solid var(--oc-border)',
                  color: 'var(--oc-text)',
                }}
              >
                {TOPICS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5">
              {kind === 'story' ? 'Your Story or Lesson' : 'Helpful Steps or Caption'}
            </label>
            <textarea
              required
              rows={4}
              maxLength={3000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write clear steps or encouragement that could help a stranger today..."
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none focus-visible:ring-2 resize-y"
              style={{
                backgroundColor: 'var(--oc-surface-alt)',
                border: '1px solid var(--oc-border)',
                color: 'var(--oc-text)',
              }}
            />
          </div>

          {hasProfanityWarning && (
            <div
              className="flex items-start gap-2 p-3 rounded-xl text-xs"
              style={{
                backgroundColor: 'rgba(217, 119, 6, 0.12)',
                color: '#b45309',
                border: '1px solid rgba(217, 119, 6, 0.25)',
              }}
            >
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Foul language detected — Open Circle will automatically bleep it before publishing.
              </span>
            </div>
          )}

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

          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--oc-muted)' }}>
              <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: 'var(--oc-accent)' }} />
              <span>No nudity · Profanity bleeped</span>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold min-h-[44px] whitespace-nowrap disabled:opacity-60"
              style={{
                backgroundColor: 'var(--oc-accent)',
                color: 'var(--oc-accent-fg)',
              }}
            >
              {submitting ? stageText || 'Publishing...' : 'Publish Worldwide'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
