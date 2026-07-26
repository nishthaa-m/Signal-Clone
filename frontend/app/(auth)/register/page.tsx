"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, MessageSquare, ArrowRight } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function RegisterPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanPhone = phoneNumber.trim();
    if (!cleanPhone) {
      setError('Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiClient.register(cleanPhone);
      sessionStorage.setItem('signal_pending_phone', cleanPhone);
      sessionStorage.setItem('signal_pending_otp', res.otp);
      router.push('/verify-otp');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-signal-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-signal-sidebar border border-signal-border rounded-3xl p-8 shadow-2xl flex flex-col items-center">
        {/* Signal Logo Badge */}
        <div className="w-16 h-16 rounded-3xl bg-signal-blue flex items-center justify-center text-white shadow-lg mb-6">
          <MessageSquare className="w-8 h-8 fill-current" />
        </div>

        <h1 className="text-2xl font-bold text-signal-text-primary text-center">Welcome to Signal</h1>
        <p className="text-xs text-gray-400 text-center mt-2 max-w-xs">
          Take privacy with you. Be yourself in every message.
        </p>

        <form onSubmit={handleSubmit} className="w-full mt-8 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Phone Number</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1 555 000 0001"
              required
              className="w-full bg-signal-card text-signal-text-primary placeholder-gray-500 text-sm rounded-xl px-4 py-3 outline-none border border-signal-border focus:border-signal-blue transition-colors"
            />
          </div>

          {error && <p className="text-xs text-rose-400 text-center">{error}</p>}

          <button
            type="submit"
            disabled={isLoading || !phoneNumber.trim()}
            className="w-full bg-signal-blue hover:bg-signal-blue-hover text-white font-semibold text-sm rounded-xl py-3 flex items-center justify-center space-x-2 transition-all disabled:opacity-40 shadow-lg shadow-blue-900/30"
          >
            <span>{isLoading ? 'Sending OTP...' : 'Continue'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="flex items-center space-x-1.5 text-[11px] text-gray-500 mt-8">
          <Shield className="w-3.5 h-3.5 text-signal-blue" />
          <span>Fixed OTP authentication enabled: use 123456</span>
        </div>
      </div>
    </div>
  );
}
