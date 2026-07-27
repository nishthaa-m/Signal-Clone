"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Check, ArrowLeft } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/store/useAuthStore';

export default function VerifyOtpPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [pendingPhone, setPendingPhone] = useState('');
  const [mockOtp, setMockOtp] = useState('123456');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const phone = sessionStorage.getItem('pending_phone');
      const savedOtp = sessionStorage.getItem('mock_otp');
      if (!phone) {
        router.push('/register');
        return;
      }
      setPendingPhone(phone);
      if (savedOtp) setMockOtp(savedOtp);
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otp.length !== 6) {
      setError('Please enter the 6-digit verification code (123456)');
      return;
    }

    setIsLoading(true);

    try {
      const res = await apiClient.verifyOtp(pendingPhone, otp);
      setAuth(res.user, res.access_token);
      // Execute full page refresh navigation to ensure clean state hydration
      window.location.href = '/';
    } catch (err: any) {
      setError(err.detail || 'Invalid verification code. Please try 123456.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-signal-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-signal-sidebar border border-signal-border rounded-3xl p-8 shadow-2xl space-y-6">
        <button
          onClick={() => router.push('/register')}
          className="flex items-center space-x-1 text-xs text-gray-400 hover:text-signal-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Login</span>
        </button>

        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl flex items-center justify-center text-emerald-400 shadow-lg">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-signal-text-primary tracking-tight">
            Verify Code
          </h1>
          <p className="text-xs text-signal-text-secondary max-w-xs">
            Code sent to <span className="font-semibold text-signal-text-primary">{pendingPhone}</span>
          </p>
        </div>

        {/* Demo Hint Banner */}
        <div className="bg-signal-blue/10 border border-signal-blue/30 text-signal-blue text-xs p-3 rounded-2xl text-center space-y-1">
          <div className="font-bold">Demo Mode Active</div>
          <div>Your verification code is: <span className="font-extrabold text-white bg-signal-blue px-2 py-0.5 rounded-md">{mockOtp}</span></div>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-2xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-signal-text-secondary mb-1.5 pl-1">
              6-Digit Verification Code
            </label>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              required
              className="w-full bg-signal-card text-signal-text-primary border border-signal-border rounded-2xl px-4 py-3 text-center text-xl tracking-[0.5em] font-mono focus:outline-none focus:border-signal-blue transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-signal-blue text-white py-3 rounded-2xl font-semibold text-sm hover:bg-blue-600 active:scale-[0.99] disabled:opacity-50 transition-all shadow-lg flex items-center justify-center space-x-2"
          >
            <span>{isLoading ? 'Verifying...' : 'Verify & Sign In'}</span>
            <Check className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
