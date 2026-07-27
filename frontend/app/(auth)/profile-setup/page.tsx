"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Check, Sparkles } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/store/useAuthStore';

export default function ProfileSetupPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [avatarUrl, setAvatarUrl] = useState(
    user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || Date.now()}`
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    if (username.trim()) {
      const usernameRegex = /^[a-zA-Z0-9_]{3,32}$/;
      if (!usernameRegex.test(username.trim())) {
        setError('Username must be 3-32 characters long and contain only letters, numbers, and underscores');
        return;
      }
    }

    setIsLoading(true);

    try {
      const updatedUser = await apiClient.profileSetup(displayName.trim(), avatarUrl);

      if (username.trim()) {
        await apiClient.updateMe({ username: username.trim() });
        updatedUser.username = username.trim();
      }

      setUser(updatedUser);
      router.push('/');
    } catch (err: any) {
      setError(err.detail || 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-signal-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-signal-sidebar border border-signal-border rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative group cursor-pointer" onClick={() => setAvatarUrl(`https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`)}>
            <img
              src={avatarUrl}
              alt="Avatar Preview"
              className="w-20 h-20 rounded-full bg-signal-card border-2 border-signal-blue object-cover shadow-lg"
            />
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-signal-text-primary tracking-tight">
            Profile Setup
          </h1>
          <p className="text-xs text-signal-text-secondary">
            Set your display name and optional username for contacts.
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-2xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-signal-text-secondary mb-1.5 pl-1">
              Display Name *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alice Smith"
                required
                className="w-full bg-signal-card text-signal-text-primary border border-signal-border rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-signal-blue transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-signal-text-secondary mb-1.5 pl-1">
              Username (Optional - 3 to 32 alphanumeric chars)
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="alice_smith"
              className="w-full bg-signal-card text-signal-text-primary border border-signal-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-signal-blue transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-signal-blue text-white py-3 rounded-2xl font-semibold text-sm hover:bg-blue-600 active:scale-[0.99] disabled:opacity-50 transition-all shadow-lg flex items-center justify-center space-x-2"
          >
            <span>{isLoading ? 'Saving Profile...' : 'Finish Setup'}</span>
            <Check className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
