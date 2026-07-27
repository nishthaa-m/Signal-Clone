"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, ArrowRight, User, ShieldCheck } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

const MOCK_USERS = [
  { name: 'Alice Smith', identifier: '5550001001', username: 'alice_smith' },
  { name: 'Bob Jones', identifier: '5550001002', username: 'bob_jones' },
  { name: 'Charlie Brown', identifier: '5550001003', username: 'charlie_brown' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanInput = identifier.trim();
    if (!cleanInput) {
      setError('Please enter a 10-digit phone number or a username');
      return;
    }

    setIsLoading(true);

    try {
      const res = await apiClient.register(cleanInput);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('pending_phone', cleanInput);
        sessionStorage.setItem('mock_otp', res.otp);
      }
      router.push('/verify-otp');
    } catch (err: any) {
      setError(err.detail || 'Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (val: string) => {
    setIdentifier(val);
    setError(null);
  };

  return (
    <div className="min-h-screen w-screen bg-signal-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-signal-sidebar border border-signal-border rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 bg-signal-blue rounded-3xl flex items-center justify-center shadow-lg text-white">
            <MessageSquare className="w-8 h-8 fill-current" />
          </div>
          <h1 className="text-2xl font-bold text-signal-text-primary tracking-tight">
            Welcome to Signal
          </h1>
          <p className="text-xs text-signal-text-secondary max-w-xs leading-relaxed">
            Enter your 10-digit phone number or username to get started.
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-2xl text-center">
            {error}
          </div>
        )}

        {/* Quick Demo Accounts */}
        <div className="bg-signal-card/60 border border-signal-border p-3.5 rounded-2xl space-y-2">
          <div className="text-[11px] font-bold text-signal-text-secondary flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-signal-blue" />
            <span>Click Demo User Account to Quick-Fill:</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {MOCK_USERS.map((u) => (
              <button
                key={u.identifier}
                type="button"
                onClick={() => handleQuickFill(u.identifier)}
                className="bg-signal-hover hover:bg-signal-blue hover:text-white border border-signal-border rounded-xl py-2 px-1 text-center transition-all text-xs font-medium"
              >
                <div className="truncate font-semibold">{u.name}</div>
                <div className="text-[10px] opacity-75">{u.identifier}</div>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-signal-text-secondary mb-1.5 pl-1">
              Phone Number (10 digits) OR Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="5550001001 or alice_smith"
                required
                className="w-full bg-signal-card text-signal-text-primary border border-signal-border rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-signal-blue transition-colors placeholder:text-gray-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-signal-blue text-white py-3 rounded-2xl font-semibold text-sm hover:bg-blue-600 active:scale-[0.99] disabled:opacity-50 transition-all shadow-lg flex items-center justify-center space-x-2"
          >
            <span>{isLoading ? 'Sending Code...' : 'Continue'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-[11px] text-center text-gray-500 leading-normal">
          Demo verification code is fixed to <span className="font-bold text-signal-blue">123456</span>.
        </p>
      </div>
    </div>
  );
}
