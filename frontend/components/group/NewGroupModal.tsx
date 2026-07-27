"use client";

import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { User } from '@/lib/types';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { Avatar } from '../ui/Avatar';

interface NewGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (name: string, memberIds: number[], avatarUrl?: string) => Promise<void>;
}

export const NewGroupModal: React.FC<NewGroupModalProps> = ({
  isOpen,
  onClose,
  onCreateGroup,
}) => {
  const { user: currentUser } = useAuthStore();
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        apiClient.searchUsers('').catch(() => []),
        apiClient.getContacts().catch(() => []),
      ]).then(([searched, contacts]) => {
        const contactUsers = (contacts as any[]).map((c) => c.contact_user || c);
        const combined = [...searched, ...contactUsers];
        const uniqueUsersMap = new Map<number, User>();
        combined.forEach((u) => {
          if (u && u.id && Number(u.id) !== Number(currentUser?.id)) {
            uniqueUsersMap.set(Number(u.id), u);
          }
        });
        setAvailableUsers(Array.from(uniqueUsersMap.values()));
      });
    }
  }, [isOpen, currentUser?.id]);

  const toggleSelect = (userId: number) => {
    const uid = Number(userId);
    setSelectedUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateGroup(name.trim(), selectedUserIds, avatarUrl.trim() || undefined);
      setName('');
      setAvatarUrl('');
      setSelectedUserIds([]);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create group';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-signal-sidebar border border-signal-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-signal-border flex items-center justify-between">
          <h3 className="text-base font-semibold text-signal-text-primary">Create Signal Group</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-signal-border space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Group Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Signal Core Dev Team"
                required
                className="w-full bg-signal-card text-signal-text-primary text-xs rounded-lg px-3 py-2 outline-none border border-signal-border focus:border-signal-blue"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Group Icon URL (Optional)</label>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-signal-card text-signal-text-primary text-xs rounded-lg px-3 py-2 outline-none border border-signal-border focus:border-signal-blue"
              />
            </div>

            {error && <p className="text-[11px] text-rose-400">{error}</p>}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <div className="text-[11px] font-semibold text-gray-400 px-1 mb-2 uppercase">Select Group Members ({selectedUserIds.length})</div>
            {availableUsers.length === 0 ? (
              <div className="text-xs text-gray-500 p-4 text-center">No available users found</div>
            ) : (
              availableUsers.map((u) => {
                const uid = Number(u.id);
                const isSelected = selectedUserIds.includes(uid);
                return (
                  <div
                    key={uid}
                    onClick={() => toggleSelect(uid)}
                    className={`flex items-center justify-between p-2.5 my-1 rounded-xl cursor-pointer transition-colors ${
                      isSelected ? 'bg-signal-hover border border-signal-blue/50' : 'hover:bg-signal-hover/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar
                        name={u.display_name || u.username || u.phone_number}
                        src={u.avatar_url}
                        size="md"
                      />
                      <div>
                        <div className="text-xs font-semibold text-signal-text-primary">
                          {u.display_name || u.username || u.phone_number}
                        </div>
                        <div className="text-[11px] text-gray-400">{u.phone_number}</div>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                        isSelected ? 'bg-signal-blue border-signal-blue text-white' : 'border-gray-500'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-4 border-t border-signal-border flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-2 bg-signal-blue text-white text-xs font-semibold rounded-xl hover:bg-signal-blue-hover disabled:opacity-40"
            >
              {isSubmitting ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
