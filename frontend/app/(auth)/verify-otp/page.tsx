"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/store/useAuthStore';

export default function VerifyOtpPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const pendingPhone = sessionStorage.getItem('signal_pending_phone');
    if (!pendingPhone) {
      router.push('/register');
      return;
    }
    setPhoneNumber(pendingPhone);
    const mockOtp = sessionStorage.getItem('signal_pending_otp');
    if (mockOtp) {
      setOtp(mockOtp); // Pre-fill fixed OTP 123456 for convenience
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otp.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiClient.verifyOtp(phoneNumber, otp.trim());
      setAuth(res.user, res.access_token);
      router.push('/profile-setup');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid verification code';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-signal-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-signal-sidebar border border-signal-border rounded-3xl p-8 shadow-2xl flex flex-col items-center">
        <div className="w-16 h-16 rounded-3xl bg-blue-950/80 border border-signal-blue flex items-center justify-center text-signal-blue shadow-lg mb-6">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-bold text-signal-text-primary text-center">Verify Code</h1>
        <p className="text-xs text-gray-400 text-center mt-2">
          Enter the 6-digit verification code sent to <span className="font-semibold text-gray-200">{phoneNumber}</span>
        </p>

        <form onSubmit={handleSubmit} className="w-full mt-8 space-y-4">
          <div>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              required
              className="w-full bg-signal-card text-center tracking-[0.5em] text-xl font-bold text-signal-text-primary placeholder-gray-600 rounded-xl px-4 py-3 outline-none border border-signal-border focus:border-signal-blue transition-colors"
            />
          </div>

          {error && <p className="text-xs text-rose-400 text-center">{error}</p>}

          <button
            type="submit"
            disabled={isLoading || !otp.trim()}
            className="w-full bg-signal-blue hover:bg-signal-blue-hover text-white font-semibold text-sm rounded-xl py-3 flex items-center justify-center space-x-2 transition-all disabled:opacity-40 shadow-lg shadow-blue-900/30"
          >
            <span>{isLoading ? 'Verifying...' : 'Verify & Continue'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <button
          onClick={() => router.push('/register')}
          className="flex items-center space-x-1 text-xs text-gray-400 hover:text-white mt-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Change phone number</span>
        </button>
      </div>
    </div>
  );
}
