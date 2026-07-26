"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Sparkles, Check } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { Avatar } from '@/components/ui/Avatar';

export default function ProfileSetupPage() {
  const { user: currentUser, updateUser } = useAuthStore();
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.display_name || '');
      setAvatarUrl(currentUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.id}`);
    }
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanName = displayName.trim();
    if (!cleanName) {
      setError('Please enter a display name');
      return;
    }

    setIsLoading(true);
    try {
      const updated = await apiClient.profileSetup(cleanName, avatarUrl.trim() || undefined);
      updateUser(updated);
      router.push('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Profile setup failed';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-signal-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-signal-sidebar border border-signal-border rounded-3xl p-8 shadow-2xl flex flex-col items-center">
        <h1 className="text-2xl font-bold text-signal-text-primary text-center">Set Up Profile</h1>
        <p className="text-xs text-gray-400 text-center mt-2">
          Choose your display name and avatar for friends to recognize you.
        </p>

        <div className="my-6">
          <Avatar name={displayName || 'Signal User'} src={avatarUrl} size="xl" />
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Display Name *</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Alice Smith"
              required
              className="w-full bg-signal-card text-signal-text-primary text-sm rounded-xl px-4 py-3 outline-none border border-signal-border focus:border-signal-blue"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Avatar Image URL (Optional)</label>
            <input
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-signal-card text-signal-text-primary text-sm rounded-xl px-4 py-3 outline-none border border-signal-border focus:border-signal-blue text-xs"
            />
          </div>

          {error && <p className="text-xs text-rose-400 text-center">{error}</p>}

          <button
            type="submit"
            disabled={isLoading || !displayName.trim()}
            className="w-full bg-signal-blue hover:bg-signal-blue-hover text-white font-semibold text-sm rounded-xl py-3 flex items-center justify-center space-x-2 transition-all disabled:opacity-40 shadow-lg shadow-blue-900/30"
          >
            <span>{isLoading ? 'Saving...' : 'Finish Setup'}</span>
            <Check className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
