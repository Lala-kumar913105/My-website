'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { authRequest } from '../../lib/auth';

type ForgotResponse = {
  message: string;
  reset_token?: string;
  reset_url?: string;
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [devUrl, setDevUrl] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await authRequest<ForgotResponse>('/api/v1/auth/forgot-password', {
        method: 'POST',
        body: { email },
      });

      setDevToken(data.reset_token || null);
      setDevUrl(data.reset_url || null);
      toast.success(data.message || 'Reset instructions generated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="bg-white w-full max-w-md rounded-2xl shadow p-6 space-y-4">
        <h1 className="text-2xl font-bold">Forgot Password</h1>
        <p className="text-sm text-gray-600">Enter your email to generate a reset link.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full border rounded-lg px-4 py-3"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white rounded-lg py-3 disabled:opacity-70"
          >
            {loading ? 'Submitting...' : 'Send reset link'}
          </button>
        </form>

        {(devToken || devUrl) && (
          <div className="text-xs bg-amber-50 border border-amber-200 rounded p-3 space-y-2">
            <p className="font-semibold text-amber-700">Development reset data</p>
            {devUrl && (
              <p className="break-all">
                URL: <a className="text-purple-700 underline" href={devUrl}>{devUrl}</a>
              </p>
            )}
            {devToken && <p className="break-all">Token: {devToken}</p>}
          </div>
        )}

        <p className="text-sm text-gray-600">
          Back to{' '}
          <Link href="/login" className="text-purple-600 font-medium">
            login
          </Link>
        </p>
      </div>
    </div>
  );
}
