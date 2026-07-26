"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Shield,
  Bell,
  Palette,
  Laptop,
  Lock,
  Camera,
  Check,
  PhoneCall,
  Tv,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { apiClient } from '@/lib/api-client';
import { Avatar } from '@/components/ui/Avatar';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'privacy' | 'notifications' | 'appearance' | 'devices' | 'stories' | 'calls'>('profile');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    setIsSaving(true);
    try {
      const updated = await apiClient.updateMe({
        display_name: displayName.trim(),
        avatar_url: avatarUrl.trim() || undefined,
      });
      updateUser(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update settings profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 h-full bg-signal-dark flex flex-col border-l border-signal-border overflow-hidden">
      {/* Header */}
      <div className="h-16 px-6 bg-signal-sidebar border-b border-signal-border flex items-center space-x-4 flex-shrink-0">
        <Link
          href="/"
          className="p-2 hover:bg-signal-hover rounded-full text-gray-300 transition-colors"
          title="Back to Chats"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-base font-bold text-signal-text-primary">Signal Settings</h1>
      </div>

      {/* Main Settings Shell */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Settings Sidebar */}
        <div className="w-64 border-r border-signal-border p-3 space-y-1 bg-signal-sidebar flex-shrink-0">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
              activeTab === 'profile' ? 'bg-signal-hover text-white' : 'text-gray-400 hover:text-white hover:bg-signal-hover/50'
            }`}
          >
            <User className="w-4 h-4 text-signal-blue" />
            <span>Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
              activeTab === 'privacy' ? 'bg-signal-hover text-white' : 'text-gray-400 hover:text-white hover:bg-signal-hover/50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Privacy</span>
            </div>
            <span className="text-[10px] bg-signal-card text-gray-400 px-1.5 py-0.5 rounded border border-signal-border">Coming Soon</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
              activeTab === 'notifications' ? 'bg-signal-hover text-white' : 'text-gray-400 hover:text-white hover:bg-signal-hover/50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Bell className="w-4 h-4 text-amber-400" />
              <span>Notifications</span>
            </div>
            <span className="text-[10px] bg-signal-card text-gray-400 px-1.5 py-0.5 rounded border border-signal-border">Coming Soon</span>
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
              activeTab === 'appearance' ? 'bg-signal-hover text-white' : 'text-gray-400 hover:text-white hover:bg-signal-hover/50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Palette className="w-4 h-4 text-purple-400" />
              <span>Appearance</span>
            </div>
            <span className="text-[10px] bg-signal-card text-gray-400 px-1.5 py-0.5 rounded border border-signal-border">Coming Soon</span>
          </button>

          <button
            onClick={() => setActiveTab('devices')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
              activeTab === 'devices' ? 'bg-signal-hover text-white' : 'text-gray-400 hover:text-white hover:bg-signal-hover/50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Laptop className="w-4 h-4 text-blue-400" />
              <span>Linked Devices</span>
            </div>
            <span className="text-[10px] bg-signal-card text-gray-400 px-1.5 py-0.5 rounded border border-signal-border">Coming Soon</span>
          </button>

          <button
            onClick={() => setActiveTab('stories')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
              activeTab === 'stories' ? 'bg-signal-hover text-white' : 'text-gray-400 hover:text-white hover:bg-signal-hover/50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Tv className="w-4 h-4 text-rose-400" />
              <span>Stories</span>
            </div>
            <span className="text-[10px] bg-signal-card text-gray-400 px-1.5 py-0.5 rounded border border-signal-border">Coming Soon</span>
          </button>

          <button
            onClick={() => setActiveTab('calls')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
              activeTab === 'calls' ? 'bg-signal-hover text-white' : 'text-gray-400 hover:text-white hover:bg-signal-hover/50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <PhoneCall className="w-4 h-4 text-teal-400" />
              <span>Voice / Video Calls</span>
            </div>
            <span className="text-[10px] bg-signal-card text-gray-400 px-1.5 py-0.5 rounded border border-signal-border">Coming Soon</span>
          </button>
        </div>

        {/* Right Settings Content */}
        <div className="flex-1 p-8 overflow-y-auto max-w-xl">
          {activeTab === 'profile' ? (
            <div>
              <h2 className="text-lg font-bold text-signal-text-primary">Profile Settings</h2>
              <p className="text-xs text-gray-400 mt-1">
                Your profile is end-to-end encrypted and visible to your contacts.
              </p>

              <form onSubmit={handleSaveProfile} className="mt-6 space-y-5">
                <div className="flex items-center space-x-4">
                  <Avatar name={displayName || 'User'} src={avatarUrl} size="xl" />
                  <div>
                    <span className="text-xs font-semibold text-gray-300 block">Avatar Preview</span>
                    <span className="text-[11px] text-gray-500">Provide an image URL below</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-signal-card text-signal-text-primary text-sm rounded-xl px-4 py-2.5 outline-none border border-signal-border focus:border-signal-blue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Phone Number (Read-only)</label>
                  <input
                    type="text"
                    value={user?.phone_number || ''}
                    disabled
                    className="w-full bg-signal-card/50 text-gray-400 text-sm rounded-xl px-4 py-2.5 outline-none border border-signal-border cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Avatar Image URL</label>
                  <input
                    type="text"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-signal-card text-signal-text-primary text-xs rounded-xl px-4 py-2.5 outline-none border border-signal-border focus:border-signal-blue"
                  />
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-signal-blue text-white text-xs font-semibold rounded-xl hover:bg-signal-blue-hover transition-colors shadow-lg"
                  >
                    {isSaving ? 'Saving...' : 'Save Profile'}
                  </button>
                  {savedSuccess && (
                    <span className="text-xs text-emerald-400 flex items-center space-x-1">
                      <Check className="w-4 h-4" />
                      <span>Saved successfully!</span>
                    </span>
                  )}
                </div>
              </form>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-signal-card/30 rounded-3xl border border-signal-border">
              <div className="w-14 h-14 rounded-2xl bg-signal-sidebar border border-signal-border flex items-center justify-center text-signal-blue mb-4">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-signal-text-primary uppercase tracking-wide">
                {activeTab} - Coming Soon
              </h3>
              <p className="text-xs text-gray-400 max-w-sm mt-2">
                This feature section is mocked per assignment specification. Full implementation will be available in future releases.
              </p>
              <span className="mt-4 px-3 py-1 bg-signal-blue/20 border border-signal-blue/40 text-signal-blue text-xs font-medium rounded-full">
                🔒 Mocked Encrypted Placeholder
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
