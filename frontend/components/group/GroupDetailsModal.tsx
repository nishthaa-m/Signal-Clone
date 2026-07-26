"use client";

import React, { useState, useEffect } from 'react';
import { X, Shield, UserMinus, UserPlus, LogOut } from 'lucide-react';
import { Conversation, Contact } from '@/lib/types';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { Avatar } from '../ui/Avatar';

interface GroupDetailsModalProps {
  isOpen: boolean;
  conversation: Conversation;
  onClose: () => void;
  onUpdateGroup: (updatedGroup: Conversation) => void;
}

export const GroupDetailsModal: React.FC<GroupDetailsModalProps> = ({
  isOpen,
  conversation,
  onClose,
  onUpdateGroup,
}) => {
  const { user: currentUser } = useAuthStore();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [error, setError] = useState('');

  const currentMember = conversation.members.find((m) => m.user_id === currentUser?.id);
  const isAdmin = currentMember?.role === 'admin';

  useEffect(() => {
    if (isOpen) {
      apiClient.getContacts().then(setContacts).catch(console.error);
    }
  }, [isOpen]);

  const handleRemove = async (targetUserId: number) => {
    try {
      const updated = await apiClient.removeGroupMember(conversation.id, targetUserId);
      onUpdateGroup(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove member';
      setError(msg);
    }
  };

  const handleAddMembers = async () => {
    if (selectedUserIds.length === 0) return;
    try {
      const updated = await apiClient.addGroupMembers(conversation.id, selectedUserIds);
      onUpdateGroup(updated);
      setSelectedUserIds([]);
      setIsAdding(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add members';
      setError(msg);
    }
  };

  if (!isOpen) return null;

  // Filter contacts not already in group
  const existingMemberUserIds = new Set(conversation.members.map((m) => m.user_id));
  const availableContacts = contacts.filter((c) => !existingMemberUserIds.has(c.contact_user_id));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-signal-sidebar border border-signal-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-signal-border flex items-center justify-between">
          <h3 className="text-base font-semibold text-signal-text-primary">Group Details</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center border-b border-signal-border bg-signal-card/50">
          <Avatar name={conversation.name} src={conversation.avatar_url} size="xl" />
          <h2 className="mt-3 font-semibold text-lg text-signal-text-primary">{conversation.name}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{conversation.members.length} members</p>
        </div>

        {error && <div className="p-3 bg-rose-950/40 text-rose-400 text-xs text-center">{error}</div>}

        {/* Member List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-gray-400 uppercase">Members</span>
            {isAdmin && !isAdding && (
              <button
                onClick={() => setIsAdding(true)}
                className="flex items-center space-x-1 text-xs text-signal-blue font-medium hover:text-blue-400"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Member</span>
              </button>
            )}
          </div>

          {isAdding && (
            <div className="p-3 bg-signal-card rounded-xl border border-signal-border mb-3 space-y-2">
              <span className="text-xs font-semibold text-gray-300">Select contact to add:</span>
              {availableContacts.length === 0 ? (
                <p className="text-xs text-gray-500">No new contacts available to add</p>
              ) : (
                availableContacts.map((c) => (
                  <label key={c.id} className="flex items-center space-x-2 text-xs text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(c.contact_user_id)}
                      onChange={(e) => {
                        const uid = c.contact_user_id;
                        setSelectedUserIds((prev) =>
                          e.target.checked ? [...prev, uid] : prev.filter((id) => id !== uid)
                        );
                      }}
                      className="rounded border-gray-600"
                    />
                    <span>{c.nickname || c.contact_user.display_name || c.contact_user.username}</span>
                  </label>
                ))
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setIsAdding(false)}
                  className="px-2 py-1 text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMembers}
                  disabled={selectedUserIds.length === 0}
                  className="px-3 py-1 bg-signal-blue text-white text-xs rounded-lg font-medium disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {conversation.members.map((mem) => {
            const isMe = mem.user_id === currentUser?.id;
            return (
              <div
                key={mem.id}
                className="flex items-center justify-between p-2.5 bg-signal-card/30 rounded-xl border border-signal-border/40"
              >
                <div className="flex items-center space-x-3">
                  <Avatar
                    name={mem.user?.display_name || mem.user?.username || mem.user?.phone_number}
                    src={mem.user?.avatar_url}
                    size="md"
                  />
                  <div>
                    <div className="text-xs font-semibold text-signal-text-primary flex items-center space-x-1.5">
                      <span>{mem.user?.display_name || mem.user?.username || mem.user?.phone_number}</span>
                      {isMe && <span className="text-[10px] text-gray-400">(You)</span>}
                    </div>
                    <div className="text-[11px] text-gray-400">{mem.user?.phone_number}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {mem.role === 'admin' && (
                    <span className="flex items-center space-x-1 text-[10px] bg-blue-950/60 border border-blue-800/60 text-blue-400 px-2 py-0.5 rounded-md font-medium">
                      <Shield className="w-3 h-3" />
                      <span>Admin</span>
                    </span>
                  )}

                  {isAdmin && !isMe && (
                    <button
                      onClick={() => handleRemove(mem.user_id)}
                      className="p-1.5 text-gray-400 hover:text-rose-400 transition-colors"
                      title="Remove member"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-signal-border flex justify-between">
          <button
            onClick={() => currentUser && handleRemove(currentUser.id)}
            className="flex items-center space-x-1.5 text-xs font-medium text-rose-400 hover:text-rose-300"
          >
            <LogOut className="w-4 h-4" />
            <span>Leave Group</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-signal-card text-xs font-medium text-gray-300 hover:text-white rounded-lg border border-signal-border"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
