"use client";

import React, { useState, useEffect } from 'react';
import { X, Search, UserPlus } from 'lucide-react';
import { User, Contact } from '@/lib/types';
import { apiClient } from '@/lib/api-client';
import { Avatar } from '../ui/Avatar';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (userId: number) => Promise<void>;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  onSelectUser,
}) => {
  const [query, setQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [addPhoneOrUsername, setAddPhoneOrUsername] = useState('');
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      apiClient.getContacts().then(setContacts).catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim()) {
      apiClient.searchUsers(query).then(setSearchResults).catch(console.error);
    } else {
      setSearchResults([]);
    }
  }, [query]);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!addPhoneOrUsername.trim()) return;

    try {
      const newContact = await apiClient.addContact(addPhoneOrUsername.trim());
      setContacts((prev) => [newContact, ...prev]);
      setAddPhoneOrUsername('');
      setIsAddingContact(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add contact';
      setError(msg);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-signal-sidebar border border-signal-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-signal-border flex items-center justify-between">
          <h3 className="text-base font-semibold text-signal-text-primary">New Signal Chat</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search / Add Bar */}
        <div className="p-4 border-b border-signal-border space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by phone, username, or name..."
              className="w-full bg-signal-card text-signal-text-primary placeholder-gray-500 text-xs rounded-lg pl-9 pr-3 py-2 outline-none border border-signal-border focus:border-signal-blue"
            />
          </div>

          {!isAddingContact ? (
            <button
              onClick={() => setIsAddingContact(true)}
              className="flex items-center space-x-2 text-xs font-medium text-signal-blue hover:text-blue-400 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add contact by phone or username</span>
            </button>
          ) : (
            <form onSubmit={handleAddContact} className="flex flex-col space-y-2 pt-1">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={addPhoneOrUsername}
                  onChange={(e) => setAddPhoneOrUsername(e.target.value)}
                  placeholder="+15550002 or username"
                  className="flex-1 bg-signal-card text-signal-text-primary placeholder-gray-500 text-xs rounded-lg px-3 py-1.5 outline-none border border-signal-border focus:border-signal-blue"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-signal-blue text-white text-xs rounded-lg font-medium hover:bg-signal-blue-hover"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingContact(false)}
                  className="px-2 py-1.5 text-gray-400 hover:text-white text-xs"
                >
                  Cancel
                </button>
              </div>
              {error && <p className="text-[11px] text-rose-400">{error}</p>}
            </form>
          )}
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto p-2">
          {query.trim() ? (
            <div>
              <div className="text-[11px] font-semibold text-gray-400 px-3 py-1 uppercase">Search Results</div>
              {searchResults.length === 0 ? (
                <div className="text-xs text-gray-500 p-4 text-center">No users found matching "{query}"</div>
              ) : (
                searchResults.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => onSelectUser(u.id)}
                    className="flex items-center space-x-3 p-2.5 hover:bg-signal-hover rounded-xl cursor-pointer"
                  >
                    <Avatar name={u.display_name || u.username || u.phone_number} src={u.avatar_url} size="md" />
                    <div>
                      <div className="text-xs font-semibold text-signal-text-primary">{u.display_name || u.username || u.phone_number}</div>
                      <div className="text-[11px] text-gray-400">{u.phone_number}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div>
              <div className="text-[11px] font-semibold text-gray-400 px-3 py-1 uppercase">Your Contacts</div>
              {contacts.length === 0 ? (
                <div className="text-xs text-gray-500 p-4 text-center">No contacts yet. Search or add a contact above!</div>
              ) : (
                contacts.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => onSelectUser(c.contact_user_id)}
                    className="flex items-center space-x-3 p-2.5 hover:bg-signal-hover rounded-xl cursor-pointer"
                  >
                    <Avatar
                      name={c.nickname || c.contact_user.display_name || c.contact_user.username}
                      src={c.contact_user.avatar_url}
                      size="md"
                    />
                    <div>
                      <div className="text-xs font-semibold text-signal-text-primary">
                        {c.nickname || c.contact_user.display_name || c.contact_user.username}
                      </div>
                      <div className="text-[11px] text-gray-400">{c.contact_user.phone_number}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
