"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Shield, UserMinus, UserPlus, LogOut, Search } from 'lucide-react';
import { Conversation, User } from '@/lib/types';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useChatStore } from '@/lib/store/useChatStore';
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
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const { removeConversation } = useChatStore();
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [error, setError] = useState('');

  const currentMember = conversation.members.find((m) => Number(m.user_id) === Number(currentUser?.id));
  const isAdmin = currentMember?.role === 'admin';

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        apiClient.getUsers().catch(() => []),
        apiClient.searchUsers(searchQuery).catch(() => []),
        apiClient.getContacts().catch(() => []),
      ]).then(([allUsers, searched, contacts]) => {
        const contactUsers = (contacts as any[]).map((c) => c.contact_user || c);
        const combined = [...allUsers, ...searched, ...contactUsers];
        const uniqueUsersMap = new Map<number, User>();
        combined.forEach((u) => {
          if (u && u.id && Number(u.id) !== Number(currentUser?.id)) {
            uniqueUsersMap.set(Number(u.id), u);
          }
        });
        setAvailableUsers(Array.from(uniqueUsersMap.values()));
      });
    }
  }, [isOpen, searchQuery, currentUser?.id]);

  const handleRemove = async (targetUserId: number) => {
    try {
      const isSelf = Number(targetUserId) === Number(currentUser?.id);
      const updated = await apiClient.removeGroupMember(conversation.id, targetUserId);
      if (isSelf) {
        removeConversation(conversation.id);
        onClose();
        router.push('/');
      } else {
        onUpdateGroup(updated);
      }
    } catch (err: unknown) {
      const isSelf = Number(targetUserId) === Number(currentUser?.id);
      if (isSelf) {
        removeConversation(conversation.id);
        onClose();
        router.push('/');
        return;
      }
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
      setSearchQuery('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add members';
      setError(msg);
    }
  };

  if (!isOpen) return null;

  // Filter users not already in group and matching search query if typed
  const existingMemberUserIds = new Set(conversation.members.map((m) => Number(m.user_id)));
  const addableUsers = availableUsers.filter((u) => {
    if (!u || !u.id || existingMemberUserIds.has(Number(u.id))) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const name = (u.display_name || u.username || u.phone_number || '').toLowerCase();
    const phone = (u.phone_number || '').toLowerCase();
    return name.includes(q) || phone.includes(q);
  });

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
              <span className="text-xs font-semibold text-gray-300">Add member to group:</span>
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or phone number..."
                  className="w-full bg-signal-sidebar text-signal-text-primary text-xs rounded-xl pl-9 pr-3 py-2 outline-none border border-signal-border focus:border-signal-blue"
                />
              </div>

              {addableUsers.length === 0 ? (
                <p className="text-xs text-gray-500 py-2 text-center">
                  {searchQuery.trim() ? `No users matching "${searchQuery}"` : 'No new users available to add'}
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pt-1">
                  {addableUsers.map((u) => (
                    <label
                      key={u.id}
                      className="flex items-center justify-between p-2 hover:bg-signal-hover rounded-xl text-xs text-gray-300 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center space-x-2.5">
                        <Avatar
                          name={u.display_name || u.username || u.phone_number}
                          src={u.avatar_url}
                          size="sm"
                        />
                        <div>
                          <div className="font-semibold text-signal-text-primary">
                            {u.display_name || u.username || u.phone_number}
                          </div>
                          <div className="text-[10px] text-gray-400">{u.phone_number}</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(Number(u.id))}
                        onChange={(e) => {
                          const uid = Number(u.id);
                          setSelectedUserIds((prev) =>
                            e.target.checked ? [...prev, uid] : prev.filter((id) => id !== uid)
                          );
                        }}
                        className="rounded border-gray-600 w-4 h-4 text-signal-blue"
                      />
                    </label>
                  ))}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2 border-t border-signal-border/40">
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setSearchQuery('');
                  }}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMembers}
                  disabled={selectedUserIds.length === 0}
                  className="px-4 py-1.5 bg-signal-blue text-white text-xs rounded-xl font-semibold disabled:opacity-40 hover:bg-blue-600 transition-colors"
                >
                  Add Selected ({selectedUserIds.length})
                </button>
              </div>
            </div>
          )}

          {conversation.members.map((mem) => {
            const isMe = Number(mem.user_id) === Number(currentUser?.id);
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
                    <span className="flex items-center space-x-1 px-2 py-0.5 bg-signal-blue/20 text-signal-blue text-[10px] rounded-full font-medium">
                      <Shield className="w-3 h-3" />
                      <span>Admin</span>
                    </span>
                  )}

                  {isAdmin && !isMe && (
                    <button
                      onClick={() => handleRemove(mem.user_id)}
                      className="p-1 text-gray-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition-colors"
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

        <div className="p-4 border-t border-signal-border bg-signal-card/30">
          <button
            onClick={() => handleRemove(currentUser!.id)}
            className="w-full flex items-center justify-center space-x-2 py-2 text-rose-500 hover:bg-rose-950/30 rounded-xl text-xs font-semibold transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Leave Group</span>
          </button>
        </div>
      </div>
    </div>
  );
};
